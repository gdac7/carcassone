import Phaser from 'phaser';
import { Cartela } from '../dominio/Cartela';
import type { Jogador } from '../dominio/Jogador';
import { MonteDeCartelas } from '../dominio/MonteDeCartelas';
import { Posicao } from '../dominio/Posicao';
import { COR_HEX, IMAGEM_POR_TIPO, MOVIMENTO_REDUZIDO, POSICAO_DO_PONTO, TAMANHO_CARTELA } from './aparencia';
import { som } from './Som';

const DURACAO = MOVIMENTO_REDUZIDO ? 0 : 180;
const ZOOM_MIN = 0.35;
const ZOOM_MAX = 2;
const DISTANCIA_PARA_ARRASTAR = 5;

// Provisório até a etapa 9: a cena usa o domínio diretamente; depois passará a observar o Jogo.
export class TelaPartida extends Phaser.Scene {
    private monte = new MonteDeCartelas();
    private cartelasNaMesa = new Map<string, Cartela>(); // até a etapa 7 (Tabuleiro)
    private jogadores: Jogador[] = [];
    private cartelaAtual: Cartela | null = null;
    private fantasma!: Phaser.GameObjects.Image;
    private casasLivres!: Phaser.GameObjects.Graphics;
    private arrastando = false;

    constructor() {
        super('TelaPartida');
    }

    // As imagens já foram carregadas pelo MenuInicial.
    init(dados: { jogadores: Jogador[] }): void {
        this.jogadores = dados.jogadores;
        this.monte = new MonteDeCartelas();
        this.cartelasNaMesa = new Map();
        this.cartelaAtual = null;
    }

    create(): void {
        document.getElementById('painel')!.hidden = false;
        this.casasLivres = this.add.graphics();
        this.fantasma = this.add.image(0, 0, '__DEFAULT').setAlpha(0.6).setVisible(false).setDepth(10);

        this.monte.criarCartelasPadrao();
        this.monte.embaralhar();
        this.colocarNaMesa(this.monte.retirarCartelaInicial(), new Posicao(0, 0), false);

        this.centralizarNaAreaVisivel();
        this.manterCentroAoRedimensionar();
        this.configurarArrastoEZoom();
        this.configurarColocacao();
        this.configurarGiros();

        this.puxarCartela();
        this.exibirPlacar();
    }

    exibirPlacar(): void {
        const lista = document.getElementById('lista-jogadores')!;
        lista.replaceChildren(...this.jogadores.map((jogador, i) => {
            const item = document.createElement('li');
            item.className = i === 0 ? 'jogador da-vez' : 'jogador';
            item.style.setProperty('--cor-jogador', COR_HEX[jogador.getCor()]);
            item.innerHTML = `
                <span class="meeple" aria-hidden="true"></span>
                <span class="nome"></span>
                <span class="pontos"></span>
                <span class="reserva"></span>`;
            item.querySelector('.nome')!.textContent = jogador.getNome();
            item.querySelector('.pontos')!.textContent = String(jogador.getPontuacao());
            item.querySelector('.reserva')!.textContent = `${jogador.getQuantidadeNaReserva()} seguidores`;
            return item;
        }));
    }

    private puxarCartela(): void {
        this.cartelaAtual = this.monte.estaVazio() ? null : this.monte.puxarCartela();
        this.atualizarCartelaDaVez(0);
        this.fantasma.setVisible(false);
    }

    private colocarNaMesa(cartela: Cartela, posicao: Posicao, animar: boolean): void {
        this.cartelasNaMesa.set(posicao.chave(), cartela);

        const x = posicao.getX() * TAMANHO_CARTELA;
        const y = posicao.getY() * TAMANHO_CARTELA;
        const sombra = this.add.rectangle(3, 4, TAMANHO_CARTELA, TAMANHO_CARTELA, 0x000000, 0.35);
        const imagem = this.add.image(0, 0, chaveDaImagem(cartela));
        const pecas: Phaser.GameObjects.GameObject[] = [sombra, imagem];

        const brasao = posicaoDoBrasao(cartela);
        if (brasao) {
            pecas.push(this.add.image(brasao[0] * TAMANHO_CARTELA, brasao[1] * TAMANHO_CARTELA, 'brasao').setScale(0.6));
        }

        const peca = this.add.container(x, y, pecas);
        if (animar) {
            peca.setScale(1.12).setAlpha(0);
            this.tweens.add({ targets: peca, scale: 1, alpha: 1, duration: DURACAO, ease: 'Quad.Out' });
        }
        this.desenharCasasLivres();
    }

    // Contorno discreto nas casas vazias vizinhas às cartelas já colocadas.
    private desenharCasasLivres(): void {
        const livres = new Map<string, Posicao>();
        for (const chave of this.cartelasNaMesa.keys()) {
            const [x, y] = chave.split(',').map(Number);
            for (const vizinha of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
                const p = new Posicao(vizinha[0], vizinha[1]);
                if (!this.cartelasNaMesa.has(p.chave())) livres.set(p.chave(), p);
            }
        }

        const margem = 6;
        this.casasLivres.clear().lineStyle(1, 0xc9a227, 0.22);
        for (const p of livres.values()) {
            this.casasLivres.strokeRoundedRect(
                p.getX() * TAMANHO_CARTELA - TAMANHO_CARTELA / 2 + margem,
                p.getY() * TAMANHO_CARTELA - TAMANHO_CARTELA / 2 + margem,
                TAMANHO_CARTELA - 2 * margem, TAMANHO_CARTELA - 2 * margem, 6,
            );
        }
    }

    // O painel cobre parte do tabuleiro: a cartela inicial fica no centro do que sobra visível.
    private centralizarNaAreaVisivel(): void {
        const camera = this.cameras.main;
        const painel = document.getElementById('painel')!.getBoundingClientRect();
        camera.centerOn(0, 0);
        if (painel.left > 0) {
            camera.scrollX += painel.width / 2;
        } else {
            camera.scrollY += painel.height / 2;
        }
    }

    // Quando a janela muda de tamanho, o centro visível do tabuleiro continua o mesmo.
    private manterCentroAoRedimensionar(): void {
        const aoRedimensionar = (tamanho: Phaser.Structs.Size, _base: unknown, _tela: unknown,
            larguraAnterior: number, alturaAnterior: number) => {
            this.cameras.main.scrollX += (larguraAnterior - tamanho.width) / 2;
            this.cameras.main.scrollY += (alturaAnterior - tamanho.height) / 2;
        };
        this.scale.on('resize', aoRedimensionar);
        this.events.once('shutdown', () => this.scale.off('resize', aoRedimensionar));
    }

    private configurarArrastoEZoom(): void {
        const camera = this.cameras.main;

        this.input.on('pointerdown', () => {
            this.arrastando = false;
        });

        this.input.on('pointermove', (ponteiro: Phaser.Input.Pointer) => {
            if (ponteiro.isDown) {
                const distancia = Phaser.Math.Distance.Between(ponteiro.downX, ponteiro.downY, ponteiro.x, ponteiro.y);
                if (distancia > DISTANCIA_PARA_ARRASTAR) this.arrastando = true;
                if (this.arrastando) {
                    camera.scrollX -= (ponteiro.x - ponteiro.prevPosition.x) / camera.zoom;
                    camera.scrollY -= (ponteiro.y - ponteiro.prevPosition.y) / camera.zoom;
                    this.fantasma.setVisible(false);
                    return;
                }
            }
            this.mostrarFantasma(ponteiro);
        });

        // Aproxima mantendo fixo o ponto do tabuleiro que está sob o mouse.
        this.input.on('wheel', (ponteiro: Phaser.Input.Pointer, _objs: unknown, _dx: number, dy: number) => {
            const antes = camera.getWorldPoint(ponteiro.x, ponteiro.y);
            const zoom = Phaser.Math.Clamp(camera.zoom * (dy > 0 ? 0.9 : 1.1), ZOOM_MIN, ZOOM_MAX);
            camera.setZoom(zoom);
            camera.preRender();
            const depois = camera.getWorldPoint(ponteiro.x, ponteiro.y);
            camera.scrollX += antes.x - depois.x;
            camera.scrollY += antes.y - depois.y;
        });

        this.input.on('gameout', () => this.fantasma.setVisible(false));
    }

    private configurarColocacao(): void {
        this.input.on('pointerup', (ponteiro: Phaser.Input.Pointer) => {
            if (this.arrastando || !this.cartelaAtual) return;
            const casa = this.casaSob(ponteiro);
            if (this.cartelasNaMesa.has(casa.chave())) return;

            this.colocarNaMesa(this.cartelaAtual, casa, true);
            som.tocarColocar();
            this.puxarCartela();
        });
    }

    private configurarGiros(): void {
        const girar = (vezes: number) => {
            if (!this.cartelaAtual) return;
            for (let i = 0; i < vezes; i++) this.cartelaAtual.girar();
            som.tocarGirar();
            this.atualizarCartelaDaVez(vezes === 1 ? -90 : 90);
        };

        document.getElementById('girar-direita')!.onclick = () => girar(1);
        document.getElementById('girar-esquerda')!.onclick = () => girar(3);
        this.input.keyboard?.on('keydown-E', () => girar(1));
        this.input.keyboard?.on('keydown-R', () => girar(1));
        this.input.keyboard?.on('keydown-Q', () => girar(3));
    }

    // `anguloDeSaida` é de onde a imagem parte na animação: a nova rotação já está aplicada.
    private atualizarCartelaDaVez(anguloDeSaida: number): void {
        const imagem = document.getElementById('cartela-atual') as HTMLImageElement;
        const brasao = document.getElementById('brasao-atual') as HTMLImageElement;
        const texto = document.getElementById('monte')!;
        const botoes = document.querySelectorAll<HTMLButtonElement>('.botao-giro');

        if (!this.cartelaAtual) {
            imagem.hidden = true;
            brasao.hidden = true;
            texto.textContent = 'O monte acabou.';
            botoes.forEach((b) => (b.disabled = true));
            return;
        }

        imagem.hidden = false;
        imagem.src = `tiles/${chaveDaImagem(this.cartelaAtual)}.png`;
        imagem.alt = `Cartela do tipo ${this.cartelaAtual.getId()}`;
        const restantes = this.monte.getQuantidade();
        const posicaoBrasao = posicaoDoBrasao(this.cartelaAtual);
        brasao.hidden = posicaoBrasao === null;
        if (posicaoBrasao) {
            brasao.style.left = `${50 + posicaoBrasao[0] * 86}%`;
            brasao.style.top = `${50 + posicaoBrasao[1] * 86}%`;
        }
        texto.textContent = restantes === 1 ? '1 cartela no monte' : `${restantes} cartelas no monte`;

        if (anguloDeSaida !== 0 && DURACAO > 0) {
            imagem.animate(
                [{ transform: `rotate(${anguloDeSaida}deg)` }, { transform: 'rotate(0deg)' }],
                { duration: DURACAO, easing: 'ease-out' },
            );
            this.fantasma.setTexture(chaveDaImagem(this.cartelaAtual)).setAngle(anguloDeSaida);
            this.tweens.add({ targets: this.fantasma, angle: 0, duration: DURACAO, ease: 'Quad.Out' });
        } else {
            this.fantasma.setTexture(chaveDaImagem(this.cartelaAtual));
        }
    }

    private mostrarFantasma(ponteiro: Phaser.Input.Pointer): void {
        const casa = this.casaSob(ponteiro);
        const livre = this.cartelaAtual !== null && !this.cartelasNaMesa.has(casa.chave());
        this.fantasma
            .setVisible(livre)
            .setPosition(casa.getX() * TAMANHO_CARTELA, casa.getY() * TAMANHO_CARTELA);
    }

    private casaSob(ponteiro: Phaser.Input.Pointer): Posicao {
        const ponto = this.cameras.main.getWorldPoint(ponteiro.x, ponteiro.y);
        return new Posicao(Math.round(ponto.x / TAMANHO_CARTELA), Math.round(ponto.y / TAMANHO_CARTELA));
    }
}

function chaveDaImagem(cartela: Cartela): string {
    return `${IMAGEM_POR_TIPO[cartela.getId()]}${cartela.getRotacao()}`;
}

// Centro da cidade com brasão, puxado para dentro da cartela; null se a cartela não tem brasão.
function posicaoDoBrasao(cartela: Cartela): [number, number] | null {
    const cidade = cartela.getSegmentos().find((s) => s.getTemBrasao());
    if (!cidade) return null;
    const pontos = cidade.pontosAtuais().map((p) => POSICAO_DO_PONTO[String(p)]);
    const x = pontos.reduce((soma, [px]) => soma + px, 0) / pontos.length;
    const y = pontos.reduce((soma, [, py]) => soma + py, 0) / pontos.length;
    return [x * 0.6, y * 0.6];
}
