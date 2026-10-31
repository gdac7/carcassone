import Phaser from 'phaser';
import { Cartela } from '../dominio/Cartela';
import { Lado } from '../dominio/Lado';
import { PontoBorda } from '../dominio/PontoBorda';
import type { Segmento } from '../dominio/Segmento';
import type { Jogador } from '../dominio/Jogador';
import { MonteDeCartelas } from '../dominio/MonteDeCartelas';
import { Posicao } from '../dominio/Posicao';
import { Tabuleiro } from '../dominio/Tabuleiro';
import { TipoTerreno } from '../dominio/TipoTerreno';
import { COR_HEX, IMAGEM_POR_TIPO, MOVIMENTO_REDUZIDO, POSICAO_DO_PONTO, TAMANHO_CARTELA } from './aparencia';
import { som } from './Som';

const DURACAO = MOVIMENTO_REDUZIDO ? 0 : 180;
const ZOOM_MIN = 0.35;
const ZOOM_MAX = 2;
const DISTANCIA_PARA_ARRASTAR = 5;
const VERDE_SUAVE = 0x8fd19e;
const VERMELHO_SUAVE = 0xe39486;
const DURACAO_AVISO = 3500;
const NOME_DO_TIPO: Record<TipoTerreno, string> = {
    [TipoTerreno.ESTRADA]: 'Estrada',
    [TipoTerreno.CIDADE]: 'Cidade',
    [TipoTerreno.CAMPO]: 'Campo',
    [TipoTerreno.MOSTEIRO]: 'Mosteiro',
};

// Provisório até a etapa 9: a cena usa o domínio diretamente; depois passará a observar o Jogo.
export class TelaPartida extends Phaser.Scene {
    private monte = new MonteDeCartelas();
    private tabuleiro = new Tabuleiro();
    // Só para desenhar: quem decide onde uma cartela cabe é o Tabuleiro.
    private desenhadas = new Map<string, { posicao: Posicao; cartela: Cartela }>();
    private validas = new Set<string>();
    private jogadores: Jogador[] = [];
    private pontuacaoExibida = new Map<Jogador, number>();
    private cartelaAtual: Cartela | null = null;
    // Prévia da cartela da vez sob o mouse: imagem e brasão giram juntos dentro do container.
    private fantasma!: Phaser.GameObjects.Container;
    private fantasmaImagem!: Phaser.GameObjects.Image;
    private fantasmaBrasao!: Phaser.GameObjects.Image;
    private destaques: Phaser.GameObjects.Image[] = [];
    private realceRegiao!: Phaser.GameObjects.Graphics;
    private depuracao = false;
    private arrastando = false;
    private casaSobMouse: Posicao | null = null;
    // Cada turno tem duas fases: colocar a cartela e, depois, o seguidor (opcional).
    private fase: 'cartela' | 'seguidor' = 'cartela';
    private daVez = 0;
    private opcoesSeguidor: Phaser.GameObjects.GameObject[] = [];
    private seguidores: { segmento: Segmento; imagem: Phaser.GameObjects.Container }[] = [];
    private temporizadorAviso: number | undefined;

    constructor() {
        super('TelaPartida');
    }

    // As imagens já foram carregadas pelo MenuInicial.
    init(dados: { jogadores: Jogador[] }): void {
        this.jogadores = dados.jogadores;
        this.pontuacaoExibida = new Map();
        this.monte = new MonteDeCartelas();
        this.tabuleiro = new Tabuleiro();
        this.desenhadas = new Map();
        this.validas = new Set();
        this.destaques = [];
        this.depuracao = false;
        this.fase = 'cartela';
        this.daVez = 0;
        this.opcoesSeguidor = [];
        this.seguidores = [];
        this.cartelaAtual = null;
    }

    create(): void {
        document.getElementById('painel')!.hidden = false;
        this.realceRegiao = this.add.graphics().setDepth(5);
        this.fantasmaImagem = this.add.image(0, 0, '__DEFAULT');
        this.fantasmaBrasao = this.add.image(0, 0, 'brasao').setScale(0.6).setVisible(false);
        this.fantasma = this.add.container(0, 0, [this.fantasmaImagem, this.fantasmaBrasao])
            .setAlpha(0.6).setVisible(false).setDepth(10);

        this.monte.criarCartelasPadrao();
        this.monte.embaralhar();
        const inicial = this.monte.retirarCartelaInicial();
        this.tabuleiro.colocarCartela(inicial, new Posicao(0, 0));
        this.desenharCartela(inicial, new Posicao(0, 0), false);

        this.centralizarNaAreaVisivel();
        this.manterCentroAoRedimensionar();
        this.configurarArrastoEZoom();
        this.configurarColocacao();
        this.configurarGiros();
        this.configurarAjuda();
        this.configurarDepuracao();
        this.configurarSeguidor();

        this.puxarCartela();
        this.exibirPlacar();
    }

    exibirPlacar(): void {
        const lista = document.getElementById('lista-jogadores')!;
        lista.replaceChildren(...this.jogadores.map((jogador, i) => {
            const pontos = jogador.getPontuacao();
            const reserva = jogador.getQuantidadeNaReserva();
            const item = document.createElement('li');
            item.className = i === this.daVez ? 'jogador da-vez' : 'jogador';
            item.style.setProperty('--cor-jogador', COR_HEX[jogador.getCor()]);
            item.innerHTML = `
                <span class="meeple" aria-hidden="true"></span>
                <span class="nome"></span>
                <span class="pontos"><span class="valor"></span><small>${pontos === 1 ? 'ponto' : 'pontos'}</small></span>
                <span class="reserva"></span>`;
            item.querySelector('.nome')!.textContent = jogador.getNome();
            item.querySelector('.valor')!.textContent = String(pontos);
            item.querySelector('.reserva')!.textContent = reserva === 1 ? '1 seguidor' : `${reserva} seguidores`;

            const anterior = this.pontuacaoExibida.get(jogador);
            if (anterior !== undefined && pontos > anterior) {
                item.querySelector('.pontos')!.classList.add('subiu');
            }
            this.pontuacaoExibida.set(jogador, pontos);
            return item;
        }));
    }

    exibirAjuda(): void {
        const dialogo = document.getElementById('ajuda') as HTMLDialogElement;
        if (dialogo.open) return;
        dialogo.showModal();
        dialogo.scrollTop = 0; // o foco vai para o botão do fim e rolaria o texto até lá
    }

    destacarPosicoesValidas(posicoes: Posicao[]): void {
        this.validas = new Set(posicoes.map((p) => p.chave()));
        this.destaques.forEach((d) => d.destroy());
        this.destaques = this.casasLivresEncostadas().map((casa) =>
            this.add.image(casa.getX() * TAMANHO_CARTELA, casa.getY() * TAMANHO_CARTELA, 'destaque'));
        this.pintarDestaques();
    }

    // Verde: cabe assim como está. Verde apagado: cabe girando. Vermelho: não cabe de jeito nenhum.
    private pintarDestaques(): void {
        for (const destaque of this.destaques) {
            const casa = new Posicao(destaque.x / TAMANHO_CARTELA, destaque.y / TAMANHO_CARTELA);
            if (this.cartelaAtual && this.tabuleiro.podeColocar(this.cartelaAtual, casa)) {
                destaque.setTint(VERDE_SUAVE).setAlpha(0.85);
            } else if (this.validas.has(casa.chave())) {
                destaque.setTint(VERDE_SUAVE).setAlpha(0.3);
            } else {
                destaque.setTint(VERMELHO_SUAVE).setAlpha(0.45);
            }
        }
    }

    // Puxa até sair uma cartela que caiba em algum lugar; as outras são descartadas.
    private puxarCartela(): void {
        this.cartelaAtual = null;
        const descartadas: string[] = [];
        while (!this.monte.estaVazio()) {
            const cartela = this.monte.puxarCartela();
            const posicoes = this.tabuleiro.posicoesValidas(cartela);
            if (posicoes.length > 0) {
                this.cartelaAtual = cartela;
                this.destacarPosicoesValidas(posicoes);
                break;
            }
            descartadas.push(cartela.getId());
        }
        if (!this.cartelaAtual) this.destacarPosicoesValidas([]);
        if (descartadas.length > 0) {
            const nomes = descartadas.join(', ');
            this.avisar(descartadas.length === 1
                ? `A cartela ${nomes} não cabia em lugar nenhum e foi descartada.`
                : `As cartelas ${nomes} não cabiam em lugar nenhum e foram descartadas.`);
        }
        this.atualizarCartelaDaVez(0);
        this.fantasma.setVisible(false);
    }

    private desenharCartela(cartela: Cartela, posicao: Posicao, animar: boolean): void {
        this.desenhadas.set(posicao.chave(), { posicao, cartela });

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
    }

    // Casas vazias encostadas nas cartelas desenhadas: recebem o destaque verde ou vermelho.
    private casasLivresEncostadas(): Posicao[] {
        const livres = new Map<string, Posicao>();
        for (const { posicao } of this.desenhadas.values()) {
            for (const lado of [Lado.NORTE, Lado.LESTE, Lado.SUL, Lado.OESTE]) {
                const vizinha = posicao.vizinha(lado);
                if (!this.desenhadas.has(vizinha.chave())) livres.set(vizinha.chave(), vizinha);
            }
        }
        return [...livres.values()];
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
            if (this.depuracao) this.realcarRegiaoSob(ponteiro);
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
            if (this.arrastando || !this.cartelaAtual || this.fase !== 'cartela') return;
            const casa = this.casaSob(ponteiro);
            if (this.desenhadas.has(casa.chave())) return;

            if (!this.casasLivresEncostadas().some((livre) => livre.igual(casa))) {
                this.recusar('A cartela precisa encostar em outra pelo lado.');
                return;
            }
            if (!this.validas.has(casa.chave())) {
                this.recusar('A cartela não encaixa nesta casa em nenhuma rotação.');
                return;
            }
            if (!this.tabuleiro.podeColocar(this.cartelaAtual, casa)) {
                this.recusar('Nesta casa ela só encaixa girada. Use Q ou E.');
                return;
            }
            this.tabuleiro.colocarCartela(this.cartelaAtual, casa);

            this.desenharCartela(this.cartelaAtual, casa, true);
            som.tocarColocar();
            this.iniciarFaseSeguidor(this.cartelaAtual, casa);
        });
    }

    private configurarSeguidor(): void {
        const pular = document.getElementById('pular')!;
        const aoPular = () => {
            if (this.fase === 'seguidor') this.encerrarTurno();
        };
        pular.addEventListener('click', aoPular);
        this.input.keyboard?.on('keydown-SPACE', () => {
            if (!algumDialogoAberto()) aoPular();
        });
        this.events.once('shutdown', () => {
            pular.removeEventListener('click', aoPular);
            document.getElementById('fase-seguidor')!.hidden = true;
        });
    }

    // Um círculo em cada segmento da cartela recém-colocada; os de zona já ocupada ficam apagados.
    private iniciarFaseSeguidor(cartela: Cartela, casa: Posicao): void {
        const jogador = this.jogadores[this.daVez];
        if (jogador.getQuantidadeNaReserva() === 0) {
            this.avisar(`${jogador.getNome()} não tem seguidores na reserva.`);
            this.encerrarTurno();
            return;
        }

        this.fase = 'seguidor';
        this.fantasma.setVisible(false);
        this.destaques.forEach((d) => d.destroy());
        this.destaques = [];
        document.querySelectorAll<HTMLButtonElement>('.botao-giro').forEach((b) => (b.disabled = true));
        document.getElementById('fase-seguidor-texto')!.textContent =
            `${jogador.getNome()}, coloque um seguidor na cartela ou pule.`;
        document.getElementById('fase-seguidor')!.hidden = false;

        const cx = casa.getX() * TAMANHO_CARTELA;
        const cy = casa.getY() * TAMANHO_CARTELA;
        for (const [segmento, [px, py]] of posicoesDosSeguidores(cartela)) {
            const x = cx + px * TAMANHO_CARTELA;
            const y = cy + py * TAMANHO_CARTELA;
            const livre = !this.tabuleiro.regiaoDe(segmento).estaOcupada();
            const circulo = this.add.circle(0, 0, 13, livre ? 0xc8a66a : 0x2b2f33, livre ? 0.95 : 0.6)
                .setStrokeStyle(2, livre ? 0x2b2f33 : 0xe39486, 1);
            const icone = this.add.image(0, 0, `seguidor-${segmento.getTipo()}`).setScale(0.7)
                .setTintFill(livre ? 0x2b2f33 : 0xe39486);
            const opcao = this.add.container(x, y, [circulo, icone]).setDepth(20).setSize(30, 30);
            if (livre) {
                opcao.setInteractive({ useHandCursor: true })
                    .on('pointerover', () => opcao.setScale(1.15))
                    .on('pointerout', () => opcao.setScale(1))
                    .on('pointerup', () => this.colocarSeguidor(segmento, x, y));
            }
            this.opcoesSeguidor.push(opcao);
        }
    }

    private colocarSeguidor(segmento: Segmento, x: number, y: number): void {
        if (this.arrastando || this.fase !== 'seguidor') return;
        const jogador = this.jogadores[this.daVez];
        const meeple = jogador.retirarMeeple();
        if (!meeple) return;
        this.tabuleiro.regiaoDe(segmento).adicionarMeeple(meeple);

        const textura = `seguidor-${segmento.getTipo()}`;
        const sombra = this.add.image(1.5, 2, textura).setTintFill(0x000000).setAlpha(0.5);
        const figura = this.add.image(0, 0, textura).setTintFill(Number.parseInt(COR_HEX[jogador.getCor()].slice(1), 16));
        const imagem = this.add.container(x, y, [sombra, figura]).setDepth(15).setScale(1.1);
        if (DURACAO > 0) {
            imagem.setScale(1.6).setAlpha(0);
            this.tweens.add({ targets: imagem, scale: 1.1, alpha: 1, duration: DURACAO, ease: 'Back.Out' });
        }
        this.seguidores.push({ segmento, imagem });
        som.tocarColocar();
        this.encerrarTurno();
    }

    // Provisório até o Jogo: a tela pontua as regiões concluídas e passa a vez.
    private encerrarTurno(): void {
        this.fase = 'cartela';
        this.opcoesSeguidor.forEach((o) => o.destroy());
        this.opcoesSeguidor = [];
        document.getElementById('fase-seguidor')!.hidden = true;
        document.querySelectorAll<HTMLButtonElement>('.botao-giro').forEach((b) => (b.disabled = false));

        const pontuacoes: string[] = [];
        for (const regiao of this.tabuleiro.regioesConcluidas()) {
            if (!regiao.estaOcupada()) continue;
            const nomes = regiao.jogadoresComMaioria().map((j) => j.getNome()).join(' e ');
            const tipo = NOME_DO_TIPO[regiao.getSegmentos()[0].getTipo()];
            pontuacoes.push(`${tipo} concluída: ${nomes} +${regiao.calcularPontos(false)}`);
            regiao.pontuar(false);
        }
        this.retirarSeguidoresDevolvidos();
        if (pontuacoes.length > 0) this.avisar(pontuacoes.join('. ') + '.', true);

        this.daVez = (this.daVez + 1) % this.jogadores.length;
        this.exibirPlacar();
        this.puxarCartela();
    }

    // Depois de pontuar, a região fica sem meeples: as figuras dela saem do tabuleiro.
    private retirarSeguidoresDevolvidos(): void {
        this.seguidores = this.seguidores.filter(({ segmento, imagem }) => {
            if (this.tabuleiro.regiaoDe(segmento).estaOcupada()) return true;
            if (DURACAO > 0) {
                this.tweens.add({
                    targets: imagem, y: imagem.y - 24, alpha: 0, duration: DURACAO * 3, ease: 'Quad.In',
                    onComplete: () => imagem.destroy(),
                });
            } else {
                imagem.destroy();
            }
            return false;
        });
    }

    private configurarAjuda(): void {
        const dialogo = document.getElementById('ajuda') as HTMLDialogElement;
        const abrir = document.getElementById('abrir-ajuda')!;
        const fechar = document.getElementById('fechar-ajuda')!;
        const aoAbrir = () => this.exibirAjuda();
        const aoFechar = () => dialogo.close();

        abrir.addEventListener('click', aoAbrir);
        fechar.addEventListener('click', aoFechar);
        this.input.keyboard?.on('keydown-H', () => {
            if (!algumDialogoAberto()) this.exibirAjuda();
        });

        // A cena é recriada a cada partida; sem isso os cliques se acumulariam.
        this.events.once('shutdown', () => {
            abrir.removeEventListener('click', aoAbrir);
            fechar.removeEventListener('click', aoFechar);
        });
    }

    private configurarGiros(): void {
        const girar = (vezes: number) => {
            if (!this.cartelaAtual || this.fase !== 'cartela' || algumDialogoAberto()) return;
            for (let i = 0; i < vezes; i++) this.cartelaAtual.girar();
            som.tocarGirar();
            this.atualizarCartelaDaVez(vezes === 1 ? -90 : 90);
            this.pintarDestaques();
            this.pintarFantasma();
        };

        document.getElementById('girar-direita')!.onclick = () => girar(1);
        document.getElementById('girar-esquerda')!.onclick = () => girar(3);
        this.input.keyboard?.on('keydown-E', () => girar(1));
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

        this.fantasmaImagem.setTexture(chaveDaImagem(this.cartelaAtual));
        this.fantasmaBrasao.setVisible(posicaoBrasao !== null);
        if (posicaoBrasao) {
            this.fantasmaBrasao.setPosition(posicaoBrasao[0] * TAMANHO_CARTELA, posicaoBrasao[1] * TAMANHO_CARTELA);
        }

        if (anguloDeSaida !== 0 && DURACAO > 0) {
            imagem.animate(
                [{ transform: `rotate(${anguloDeSaida}deg)` }, { transform: 'rotate(0deg)' }],
                { duration: DURACAO, easing: 'ease-out' },
            );
            this.fantasma.setAngle(anguloDeSaida);
            this.tweens.add({ targets: this.fantasma, angle: 0, duration: DURACAO, ease: 'Quad.Out' });
        }
    }

    private mostrarFantasma(ponteiro: Phaser.Input.Pointer): void {
        const casa = this.casaSob(ponteiro);
        this.casaSobMouse = casa;
        const livre = this.cartelaAtual !== null && this.fase === 'cartela' && !this.desenhadas.has(casa.chave());
        this.fantasma
            .setVisible(livre)
            .setPosition(casa.getX() * TAMANHO_CARTELA, casa.getY() * TAMANHO_CARTELA);
        this.pintarFantasma();
    }

    // A prévia fica avermelhada quando a cartela, do jeito que está girada, não encaixa na casa.
    private pintarFantasma(): void {
        const casa = this.casaSobMouse;
        if (this.cartelaAtual && casa && this.tabuleiro.podeColocar(this.cartelaAtual, casa)) {
            this.fantasmaImagem.clearTint();
        } else {
            this.fantasmaImagem.setTint(VERMELHO_SUAVE);
        }
    }

    private recusar(mensagem: string): void {
        this.avisar(mensagem);
        if (DURACAO > 0) {
            this.tweens.add({ targets: this.fantasma, x: this.fantasma.x + 6, duration: 50, yoyo: true, repeat: 2 });
        }
    }

    private avisar(mensagem: string, informativo = false): void {
        const aviso = document.getElementById('aviso')!;
        aviso.textContent = mensagem;
        aviso.classList.toggle('informativo', informativo);
        aviso.hidden = false;
        window.clearTimeout(this.temporizadorAviso);
        this.temporizadorAviso = window.setTimeout(() => (aviso.hidden = true), DURACAO_AVISO);
    }

    // Alt + Shift + D: ao passar o mouse sobre uma cartela, realça a região do segmento mais próximo.
    private configurarDepuracao(): void {
        const indicador = document.getElementById('depuracao')!;
        indicador.hidden = true;
        this.input.keyboard?.on('keydown-D', (evento: KeyboardEvent) => {
            if (!evento.altKey || !evento.shiftKey || algumDialogoAberto()) return;
            this.depuracao = !this.depuracao;
            indicador.hidden = !this.depuracao;
            if (!this.depuracao) this.realceRegiao.clear();
        });
        this.events.once('shutdown', () => (indicador.hidden = true));
    }

    private realcarRegiaoSob(ponteiro: Phaser.Input.Pointer): void {
        this.realceRegiao.clear();
        const casa = this.casaSob(ponteiro);
        const item = this.desenhadas.get(casa.chave());
        const texto = document.getElementById('depuracao-regiao')!;
        if (!item) {
            texto.textContent = 'Passe o mouse sobre uma cartela.';
            return;
        }

        const segmento = segmentoMaisProximo(item.cartela, this.cameras.main.getWorldPoint(ponteiro.x, ponteiro.y), casa);
        const tipo = NOME_DO_TIPO[segmento.getTipo()];
        const regiao = this.tabuleiro.regiaoDe(segmento);
        const cartelas = regiao.numCartelasDistintas();
        texto.textContent = `${tipo} · ${cartelas} ${cartelas === 1 ? 'cartela' : 'cartelas'} · `
            + `${regiao.estaConcluida() ? 'concluída' : 'aberta'}${regiao.estaOcupada() ? ' · com seguidor' : ''}`;

        const cor = regiao.estaConcluida() ? VERDE_SUAVE : 0xc8a66a;
        for (const seg of regiao.getSegmentos()) {
            const posicao = [...this.desenhadas.values()].find((d) => d.cartela === seg.getCartela())!.posicao;
            const cx = posicao.getX() * TAMANHO_CARTELA;
            const cy = posicao.getY() * TAMANHO_CARTELA;
            this.realceRegiao.lineStyle(3, cor, 0.9)
                .strokeRect(cx - TAMANHO_CARTELA / 2 + 2, cy - TAMANHO_CARTELA / 2 + 2, TAMANHO_CARTELA - 4, TAMANHO_CARTELA - 4);
            for (const ponto of seg.pontosAtuais()) {
                const [px, py] = POSICAO_DO_PONTO[String(ponto)];
                const x = cx + px * TAMANHO_CARTELA * 0.85;
                const y = cy + py * TAMANHO_CARTELA * 0.85;
                this.realceRegiao.fillStyle(cor, 1).fillCircle(x, y, 6)
                    .lineStyle(2, 0x2b2f33, 1).strokeCircle(x, y, 6);
            }
        }
    }

    private casaSob(ponteiro: Phaser.Input.Pointer): Posicao {
        const ponto = this.cameras.main.getWorldPoint(ponteiro.x, ponteiro.y);
        return new Posicao(Math.round(ponto.x / TAMANHO_CARTELA), Math.round(ponto.y / TAMANHO_CARTELA));
    }
}

// Com um diálogo aberto, as teclas do jogo não devem agir no tabuleiro por trás dele.
function algumDialogoAberto(): boolean {
    return document.querySelector('dialog[open]') !== null;
}

// Onde fica o seguidor de cada segmento: perto do centro do terreno, sem dois no mesmo lugar.
// O mosteiro fica no meio; se o lugar já estiver tomado, vai para o ponto de borda mais livre.
function posicoesDosSeguidores(cartela: Cartela): Map<Segmento, [number, number]> {
    const prioridade = { [TipoTerreno.MOSTEIRO]: 0, [TipoTerreno.CIDADE]: 1, [TipoTerreno.ESTRADA]: 1, [TipoTerreno.CAMPO]: 2 };
    const segmentos = [...cartela.getSegmentos()].sort((a, b) => prioridade[a.getTipo()] - prioridade[b.getTipo()]);
    const usadas: [number, number][] = [];
    const distanciaAteUsadas = ([x, y]: [number, number]) =>
        Math.min(Infinity, ...usadas.map(([ux, uy]) => Math.hypot(x - ux, y - uy)));

    const posicoes = new Map<Segmento, [number, number]>();
    for (const segmento of segmentos) {
        const pontos = segmento.pontosAtuais().map((p) => POSICAO_DO_PONTO[String(p)]);
        let posicao: [number, number] = [0, 0];
        if (pontos.length > 0) {
            const media = (i: 0 | 1) => pontos.reduce((soma, ponto) => soma + ponto[i], 0) / pontos.length;
            posicao = [media(0) * 0.6, media(1) * 0.6];
            if (distanciaAteUsadas(posicao) < 0.2) {
                const candidatas = pontos.map(([x, y]): [number, number] => [x * 0.7, y * 0.7]);
                posicao = candidatas.reduce((melhor, c) => (distanciaAteUsadas(c) > distanciaAteUsadas(melhor) ? c : melhor));
            }
        }
        usadas.push(posicao);
        posicoes.set(segmento, posicao);
    }
    return posicoes;
}

// O ponto de borda mais perto do mouse escolhe o segmento; no miolo de um mosteiro, o próprio mosteiro.
function segmentoMaisProximo(cartela: Cartela, mouse: Phaser.Math.Vector2, casa: Posicao): Segmento {
    const dx = (mouse.x - casa.getX() * TAMANHO_CARTELA) / TAMANHO_CARTELA;
    const dy = (mouse.y - casa.getY() * TAMANHO_CARTELA) / TAMANHO_CARTELA;
    const mosteiro = cartela.getSegmentos().find((s) => s.getTipo() === TipoTerreno.MOSTEIRO);
    if (mosteiro && Math.hypot(dx, dy) < 0.2) return mosteiro;

    let maisPerto = PontoBorda.N;
    let menorDistancia = Infinity;
    for (const ponto of Lado.NORTE.pontos().concat(Lado.LESTE.pontos(), Lado.SUL.pontos(), Lado.OESTE.pontos())) {
        const [px, py] = POSICAO_DO_PONTO[String(ponto)];
        const distancia = Math.hypot(dx - px, dy - py);
        if (distancia < menorDistancia) {
            menorDistancia = distancia;
            maisPerto = ponto;
        }
    }
    return cartela.segmentoNoPonto(maisPerto);
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
