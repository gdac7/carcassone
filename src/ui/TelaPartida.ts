import Phaser from 'phaser';
import type { Cartela } from '../dominio/Cartela';
import { Jogada } from '../dominio/Jogada';
import type { Jogador } from '../dominio/Jogador';
import { JogadorIA } from '../dominio/JogadorIA';
import type { Jogo } from '../dominio/Jogo';
import { Lado } from '../dominio/Lado';
import { PontoBorda } from '../dominio/PontoBorda';
import { Posicao } from '../dominio/Posicao';
import type { Segmento } from '../dominio/Segmento';
import { TipoTerreno } from '../dominio/TipoTerreno';
import type { ObservadorJogo } from '../servicos/ObservadorJogo';
import { COR_HEX, IMAGEM_POR_TIPO, MOVIMENTO_REDUZIDO, POSICAO_DO_PONTO, TAMANHO_CARTELA } from './aparencia';
import { som } from './Som';

const DURACAO = MOVIMENTO_REDUZIDO ? 0 : 180;
const ZOOM_MIN = 0.35;
const ZOOM_MAX = 2;
const DISTANCIA_PARA_ARRASTAR = 5;
const VERDE_SUAVE = 0x8fd19e;
const VERMELHO_SUAVE = 0xe39486;
const DURACAO_AVISO = 3500;
const PAUSA_DA_IA = 800;
const MAXIMO_DE_REGISTROS = 8;
const NOME_DO_TIPO: Record<TipoTerreno, string> = {
    [TipoTerreno.ESTRADA]: 'Estrada',
    [TipoTerreno.CIDADE]: 'Cidade',
    [TipoTerreno.CAMPO]: 'Campo',
    [TipoTerreno.MOSTEIRO]: 'Mosteiro',
};
const NOME_DO_PAPEL: Record<TipoTerreno, string> = {
    [TipoTerreno.ESTRADA]: 'um ladrão',
    [TipoTerreno.CIDADE]: 'um cavaleiro',
    [TipoTerreno.CAMPO]: 'um fazendeiro',
    [TipoTerreno.MOSTEIRO]: 'um monge',
};

// Observer: a tela observa o Jogo e se redesenha a cada aviso. As jogadas passam pelo Jogo (Facade).
export class TelaPartida extends Phaser.Scene implements ObservadorJogo {
    private jogo!: Jogo;
    private jogadoresDoMenu: Jogador[] = [];
    // O que já está desenhado; as regras vêm do Tabuleiro, pelo Jogo.
    private desenhadas = new Map<string, { posicao: Posicao; cartela: Cartela }>();
    private validas = new Set<string>();
    private pontuacaoExibida = new Map<Jogador, number>();
    // Prévia da cartela da vez sob o mouse: imagem e brasão giram juntos dentro do container.
    private fantasma!: Phaser.GameObjects.Container;
    private fantasmaImagem!: Phaser.GameObjects.Image;
    private fantasmaBrasao!: Phaser.GameObjects.Image;
    private destaques: Phaser.GameObjects.Image[] = [];
    private realceRegiao!: Phaser.GameObjects.Graphics;
    private realceUltima!: Phaser.GameObjects.Graphics;
    private depuracao = false;
    private arrastando = false;
    private casaSobMouse: Posicao | null = null;
    // O turno do humano tem duas fases: colocar a cartela e, depois, o seguidor (opcional).
    // Na vez da IA, e entre um aviso e outro do Jogo, a tela fica esperando.
    private fase: 'cartela' | 'seguidor' | 'espera' = 'espera';
    // Cartela que o humano já pôs na mesa, mas que só vai para o Jogo junto com a escolha do seguidor.
    private pendente: { cartela: Cartela; posicao: Posicao } | null = null;
    private opcoesSeguidor: Phaser.GameObjects.GameObject[] = [];
    private seguidores: { segmento: Segmento; imagem: Phaser.GameObjects.Container }[] = [];
    private jogadasExibidas = 0;
    private rodadaExibida = 0;
    private cartelasNoMonte = 0;
    private registros: { texto: string; cor: string | null }[] = [];
    private temporizadorAviso: number | undefined;

    constructor() {
        super('TelaPartida');
    }

    // As imagens já foram carregadas pelo MenuInicial, que também cria o Jogo.
    init(dados: { jogo: Jogo; jogadores: Jogador[] }): void {
        this.jogo = dados.jogo;
        this.jogadoresDoMenu = dados.jogadores;
        this.desenhadas = new Map();
        this.validas = new Set();
        this.pontuacaoExibida = new Map();
        this.destaques = [];
        this.depuracao = false;
        this.fase = 'espera';
        this.pendente = null;
        this.opcoesSeguidor = [];
        this.seguidores = [];
        this.jogadasExibidas = 0;
        this.rodadaExibida = 0;
        this.cartelasNoMonte = 71;
        this.registros = [];
    }

    create(): void {
        document.getElementById('painel')!.hidden = false;
        this.realceUltima = this.add.graphics().setDepth(4);
        this.realceRegiao = this.add.graphics().setDepth(5);
        this.fantasmaImagem = this.add.image(0, 0, '__DEFAULT');
        this.fantasmaBrasao = this.add.image(0, 0, 'brasao').setScale(0.6).setVisible(false);
        this.fantasma = this.add.container(0, 0, [this.fantasmaImagem, this.fantasmaBrasao])
            .setAlpha(0.6).setVisible(false).setDepth(10);

        this.centralizarNaAreaVisivel();
        this.manterCentroAoRedimensionar();
        this.configurarArrastoEZoom();
        this.configurarColocacao();
        this.configurarGiros();
        this.configurarAjuda();
        this.configurarDepuracao();
        this.configurarSeguidor();
        this.configurarSaida();
        this.exibirRegistros();

        this.jogo.adicionarObservador(this);
        this.jogo.iniciarPartida(this.jogadoresDoMenu);
    }

    // Chamado pelo Jogo a cada mudança: depois de cada jogada, a cada novo turno e no fim da partida.
    aoAtualizar(jogo: Jogo): void {
        this.desenharCartelasNovas();
        this.mostrarJogadasNovas();
        this.retirarSeguidoresDevolvidos();
        this.registrarPontos(jogo.verificarFimDeJogo());
        this.exibirPlacar();

        if (jogo.verificarFimDeJogo()) {
            this.exibirResultadoFinal();
        } else if (jogo.getRodadaAtual() !== this.rodadaExibida) {
            this.rodadaExibida = jogo.getRodadaAtual();
            this.comecarTurno();
        }
    }

    exibirTabuleiro(): void {
        this.desenharCartelasNovas();
    }

    exibirPlacar(): void {
        const lista = document.getElementById('lista-jogadores')!;
        const daVez = this.jogo.getJogadorDaVez();
        lista.replaceChildren(...this.jogo.getJogadores().map((jogador) => {
            const pontos = jogador.getPontuacao();
            const reserva = jogador.getQuantidadeNaReserva();
            const item = document.createElement('li');
            item.className = jogador === daVez ? 'jogador da-vez' : 'jogador';
            item.style.setProperty('--cor-jogador', COR_HEX[jogador.getCor()]);
            item.innerHTML = `
                <span class="meeple" aria-hidden="true"></span>
                <span class="nome"></span>
                <span class="pontos"><span class="valor"></span><small>${pontos === 1 ? 'ponto' : 'pontos'}</small></span>
                <span class="reserva"></span>`;
            item.querySelector('.nome')!.textContent = jogador.getNome() + (jogador instanceof JogadorIA ? ' (IA)' : '');
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

    // Placar final, do maior para o menor; empate no topo é vitória compartilhada.
    exibirResultadoFinal(): void {
        this.fase = 'espera';
        this.limparDestaques();
        this.fantasma.setVisible(false);
        this.atualizarCartelaDaVez(0);
        document.getElementById('vez')!.textContent = 'Fim da partida';

        const jogadores = [...this.jogo.getJogadores()].sort((a, b) => b.getPontuacao() - a.getPontuacao());
        const maior = jogadores[0].getPontuacao();
        const vencedores = jogadores.filter((j) => j.getPontuacao() === maior);
        document.getElementById('resultado-titulo')!.textContent = vencedores.length > 1
            ? `Vitória compartilhada: ${vencedores.map((v) => v.getNome()).join(' e ')}`
            : `${vencedores[0].getNome()} venceu!`;
        document.getElementById('resultado-lista')!.replaceChildren(...jogadores.map((jogador) => {
            const item = document.createElement('li');
            item.style.setProperty('--cor-jogador', COR_HEX[jogador.getCor()]);
            if (vencedores.includes(jogador)) item.classList.add('vencedor');
            item.innerHTML = '<span class="meeple" aria-hidden="true"></span><span class="nome"></span><span class="pontos"></span>';
            item.querySelector('.nome')!.textContent = jogador.getNome();
            item.querySelector('.pontos')!.textContent = `${jogador.getPontuacao()} pontos`;
            return item;
        }));
        this.registrar('Fim da partida.', null);
        this.time.delayedCall(DURACAO * 4, () => (document.getElementById('resultado') as HTMLDialogElement).showModal());
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
            const cartela = this.jogo.getCartelaAtual();
            if (cartela && this.jogo.getTabuleiro().podeColocar(cartela, casa)) {
                destaque.setTint(VERDE_SUAVE).setAlpha(0.85);
            } else if (this.validas.has(casa.chave())) {
                destaque.setTint(VERDE_SUAVE).setAlpha(0.3);
            } else {
                destaque.setTint(VERMELHO_SUAVE).setAlpha(0.45);
            }
        }
    }

    private limparDestaques(): void {
        this.destaques.forEach((d) => d.destroy());
        this.destaques = [];
        this.validas = new Set();
    }

    // Humano: libera a mesa e espera o clique. IA: pausa para o jogador acompanhar e pede o turno ao Jogo.
    private comecarTurno(): void {
        const jogador = this.jogo.getJogadorDaVez()!;
        const cartela = this.jogo.getCartelaAtual()!;
        this.registrarDescartes();
        this.atualizarCartelaDaVez(0);
        document.getElementById('vez')!.textContent = `Vez de ${jogador.getNome()}`;

        if (jogador instanceof JogadorIA) {
            this.fase = 'espera';
            this.limparDestaques();
            this.fantasma.setVisible(false);
            this.habilitarGiros(false);
            this.time.delayedCall(PAUSA_DA_IA, () => this.jogo.iniciarTurnoDaVez());
            return;
        }
        this.fase = 'cartela';
        this.habilitarGiros(true);
        this.destacarPosicoesValidas(this.jogo.getTabuleiro().posicoesValidas(cartela));
        this.jogo.iniciarTurnoDaVez(); // para o humano não faz nada: o turno segue com os cliques
    }

    // O Jogo descarta sozinho as cartelas sem lugar; a tela percebe pelo tamanho do monte.
    private registrarDescartes(): void {
        const restantes = this.jogo.getQuantidadeNoMonte();
        const descartadas = this.cartelasNoMonte - 1 - restantes;
        this.cartelasNoMonte = restantes;
        if (descartadas <= 0) return;
        const texto = descartadas === 1
            ? 'Uma cartela não cabia em lugar nenhum e foi descartada.'
            : `${descartadas} cartelas não cabiam em lugar nenhum e foram descartadas.`;
        this.avisar(texto);
        this.registrar(texto, null);
    }

    // Desenha as cartelas que estão no tabuleiro e ainda não estão na tela (a inicial e as jogadas da IA).
    private desenharCartelasNovas(): void {
        for (const { posicao, cartela } of this.jogo.getTabuleiro().getCartelasPorPosicao()) {
            if (!this.desenhadas.has(posicao.chave())) {
                this.desenharCartela(cartela, posicao, this.jogadasExibidas > 0);
                if (this.jogadasExibidas > 0) som.tocarColocar();
            }
        }
        this.pendente = null;
    }

    // Cada jogada nova no histórico: desenha o seguidor, realça a cartela e escreve no registro.
    private mostrarJogadasNovas(): void {
        const historico = this.jogo.getHistorico();
        const autor = this.jogo.getJogadorDaVez();
        for (const jogada of historico.slice(this.jogadasExibidas)) {
            const segmento = jogada.getSegmentoDoMeeple();
            if (segmento && autor) this.desenharSeguidor(segmento, jogada.getPosicao(), autor);
            if (autor) {
                this.realcarUltima(jogada.getPosicao(), autor);
                const papel = segmento ? ` e ${NOME_DO_PAPEL[segmento.getTipo()]}` : '';
                this.registrar(`${autor.getNome()} colocou uma cartela${papel}.`, COR_HEX[autor.getCor()]);
            }
        }
        this.jogadasExibidas = historico.length;
    }

    // A última cartela jogada ganha uma moldura na cor de quem a colocou.
    private realcarUltima(posicao: Posicao, jogador: Jogador): void {
        const cor = Number.parseInt(COR_HEX[jogador.getCor()].slice(1), 16);
        const x = posicao.getX() * TAMANHO_CARTELA - TAMANHO_CARTELA / 2;
        const y = posicao.getY() * TAMANHO_CARTELA - TAMANHO_CARTELA / 2;
        this.realceUltima.clear().lineStyle(4, cor, 0.95).strokeRect(x - 2, y - 2, TAMANHO_CARTELA + 4, TAMANHO_CARTELA + 4);
    }

    // Quem ganhou pontos desde o último aviso.
    private registrarPontos(fimDeJogo: boolean): void {
        const ganhos: string[] = [];
        for (const jogador of this.jogo.getJogadores()) {
            const ganho = jogador.getPontuacao() - (this.pontuacaoExibida.get(jogador) ?? 0);
            if (ganho <= 0) continue;
            const texto = `${jogador.getNome()} ganhou ${ganho} ${ganho === 1 ? 'ponto' : 'pontos'}${fimDeJogo ? ' na contagem final' : ''}.`;
            ganhos.push(texto);
            this.registrar(texto, COR_HEX[jogador.getCor()]);
        }
        if (ganhos.length > 0) this.avisar(ganhos.join(' '), true);
    }

    private registrar(texto: string, cor: string | null): void {
        this.registros.unshift({ texto, cor });
        this.registros = this.registros.slice(0, MAXIMO_DE_REGISTROS);
        this.exibirRegistros();
    }

    private exibirRegistros(): void {
        const lista = document.getElementById('registro')!;
        if (this.registros.length === 0) {
            const vazio = document.createElement('li');
            vazio.className = 'registro-vazio';
            vazio.textContent = 'As jogadas aparecem aqui.';
            lista.replaceChildren(vazio);
            return;
        }
        lista.replaceChildren(...this.registros.map(({ texto, cor }) => {
            const item = document.createElement('li');
            if (cor) item.style.setProperty('--cor-jogador', cor);
            item.textContent = texto;
            return item;
        }));
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
            const cartela = this.jogo.getCartelaAtual();
            if (this.arrastando || !cartela || this.fase !== 'cartela') return;
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
            if (!this.jogo.getTabuleiro().podeColocar(cartela, casa)) {
                this.recusar('Nesta casa ela só encaixa girada. Use Q ou E.');
                return;
            }

            this.pendente = { cartela, posicao: casa };
            this.desenharCartela(cartela, casa, true);
            som.tocarColocar();
            this.iniciarFaseSeguidor(cartela, casa);
        });
    }

    private configurarSeguidor(): void {
        const pular = document.getElementById('pular')!;
        const aoPular = () => {
            if (this.fase === 'seguidor') this.confirmarJogada(null);
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

    // Um círculo em cada segmento da cartela colocada; os de zona já ocupada ficam apagados.
    // A cartela ainda não está no Tabuleiro: regioesQueSeLigam diz em que zonas cada segmento vai entrar.
    private iniciarFaseSeguidor(cartela: Cartela, casa: Posicao): void {
        const jogador = this.jogo.getJogadorDaVez()!;
        if (jogador.getQuantidadeNaReserva() === 0) {
            this.avisar(`${jogador.getNome()} não tem seguidores na reserva.`);
            this.confirmarJogada(null);
            return;
        }

        this.fase = 'seguidor';
        this.fantasma.setVisible(false);
        this.limparDestaques();
        this.habilitarGiros(false);
        document.getElementById('fase-seguidor-texto')!.textContent =
            `${jogador.getNome()}, coloque um seguidor na cartela ou pule.`;
        document.getElementById('fase-seguidor')!.hidden = false;

        const tabuleiro = this.jogo.getTabuleiro();
        for (const [segmento, [x, y]] of this.posicoesNaMesa(cartela, casa)) {
            const livre = tabuleiro.regioesQueSeLigam(segmento, casa).every((r) => !r.estaOcupada());
            const circulo = this.add.circle(0, 0, 13, livre ? 0xc8a66a : 0x2b2f33, livre ? 0.95 : 0.6)
                .setStrokeStyle(2, livre ? 0x2b2f33 : 0xe39486, 1);
            const icone = this.add.image(0, 0, `seguidor-${segmento.getTipo()}`).setScale(0.7)
                .setTintFill(livre ? 0x2b2f33 : 0xe39486);
            const opcao = this.add.container(x, y, [circulo, icone]).setDepth(20).setSize(30, 30);
            if (livre) {
                opcao.setInteractive({ useHandCursor: true })
                    .on('pointerover', () => opcao.setScale(1.15))
                    .on('pointerout', () => opcao.setScale(1))
                    .on('pointerup', () => {
                        if (!this.arrastando && this.fase === 'seguidor') this.confirmarJogada(segmento);
                    });
            }
            this.opcoesSeguidor.push(opcao);
        }
    }

    // A jogada do humano vai inteira para o Jogo, que valida, coloca, pontua e avisa a tela.
    private confirmarJogada(segmento: Segmento | null): void {
        const pendente = this.pendente;
        if (!pendente) return;
        this.fase = 'espera';
        this.opcoesSeguidor.forEach((o) => o.destroy());
        this.opcoesSeguidor = [];
        document.getElementById('fase-seguidor')!.hidden = true;

        const jogada = new Jogada(pendente.posicao, pendente.cartela.getRotacao(), segmento);
        if (!this.jogo.executarJogada(jogada)) {
            this.avisar('O jogo recusou a jogada.');
        }
    }

    private desenharSeguidor(segmento: Segmento, posicao: Posicao, jogador: Jogador): void {
        const [x, y] = this.posicoesNaMesa(segmento.getCartela(), posicao).get(segmento)!;
        const textura = `seguidor-${segmento.getTipo()}`;
        const sombra = this.add.image(1.5, 2, textura).setTintFill(0x000000).setAlpha(0.5);
        const figura = this.add.image(0, 0, textura).setTintFill(Number.parseInt(COR_HEX[jogador.getCor()].slice(1), 16));
        const imagem = this.add.container(x, y, [sombra, figura]).setDepth(15).setScale(1.1);
        if (DURACAO > 0) {
            imagem.setScale(1.6).setAlpha(0);
            this.tweens.add({ targets: imagem, scale: 1.1, alpha: 1, duration: DURACAO, ease: 'Back.Out' });
        }
        this.seguidores.push({ segmento, imagem });
    }

    // Onde fica, em pixels, o seguidor de cada segmento da cartela posta em `casa`.
    private posicoesNaMesa(cartela: Cartela, casa: Posicao): Map<Segmento, [number, number]> {
        const cx = casa.getX() * TAMANHO_CARTELA;
        const cy = casa.getY() * TAMANHO_CARTELA;
        const posicoes = new Map<Segmento, [number, number]>();
        for (const [segmento, [px, py]] of posicoesDosSeguidores(cartela)) {
            posicoes.set(segmento, [cx + px * TAMANHO_CARTELA, cy + py * TAMANHO_CARTELA]);
        }
        return posicoes;
    }

    // Depois de pontuar, a região fica sem meeples: as figuras dela saem do tabuleiro.
    private retirarSeguidoresDevolvidos(): void {
        const tabuleiro = this.jogo.getTabuleiro();
        this.seguidores = this.seguidores.filter(({ segmento, imagem }) => {
            if (tabuleiro.regiaoDe(segmento).estaOcupada()) return true;
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

    // Reiniciar e abandonar voltam ao MenuInicial, que é quem cria o Jogo.
    private configurarSaida(): void {
        const confirmar = document.getElementById('confirmar') as HTMLDialogElement;
        const resultado = document.getElementById('resultado') as HTMLDialogElement;
        let acao: () => void = () => {};
        const perguntar = (titulo: string, texto: string, rotulo: string, aoConfirmar: () => void) => {
            document.getElementById('confirmar-titulo')!.textContent = titulo;
            document.getElementById('confirmar-texto')!.textContent = texto;
            document.getElementById('confirmar-sim')!.textContent = rotulo;
            acao = aoConfirmar;
            confirmar.showModal();
        };
        const reiniciar = () => this.scene.start('MenuInicial', { reiniciar: true });
        const sair = () => this.scene.start('MenuInicial');

        const botoes: [string, () => void][] = [
            ['reiniciar', () => perguntar('Reiniciar a partida?', 'A partida atual será perdida e outra começa com os mesmos jogadores.', 'Reiniciar', reiniciar)],
            ['abandonar', () => perguntar('Abandonar a partida?', 'A partida atual será perdida e você volta ao menu.', 'Abandonar', sair)],
            ['confirmar-sim', () => { confirmar.close(); acao(); }],
            ['confirmar-nao', () => confirmar.close()],
            ['resultado-de-novo', () => { resultado.close(); reiniciar(); }],
            ['resultado-menu', () => { resultado.close(); sair(); }],
        ];
        for (const [id, aoClicar] of botoes) document.getElementById(id)!.onclick = aoClicar;

        this.events.once('shutdown', () => {
            document.getElementById('painel')!.hidden = true;
            document.getElementById('aviso')!.hidden = true;
            if (confirmar.open) confirmar.close();
            if (resultado.open) resultado.close();
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
            const cartela = this.jogo.getCartelaAtual();
            if (!cartela || this.fase !== 'cartela' || algumDialogoAberto()) return;
            for (let i = 0; i < vezes; i++) cartela.girar();
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

    private habilitarGiros(habilitar: boolean): void {
        document.querySelectorAll<HTMLButtonElement>('.botao-giro').forEach((b) => (b.disabled = !habilitar));
    }

    // `anguloDeSaida` é de onde a imagem parte na animação: a nova rotação já está aplicada.
    private atualizarCartelaDaVez(anguloDeSaida: number): void {
        const imagem = document.getElementById('cartela-atual') as HTMLImageElement;
        const brasao = document.getElementById('brasao-atual') as HTMLImageElement;
        const texto = document.getElementById('monte')!;
        const botoes = document.querySelectorAll<HTMLButtonElement>('.botao-giro');

        const cartela = this.jogo.getCartelaAtual();
        if (!cartela) {
            imagem.hidden = true;
            brasao.hidden = true;
            texto.textContent = 'O monte acabou.';
            botoes.forEach((b) => (b.disabled = true));
            return;
        }

        imagem.hidden = false;
        imagem.src = `tiles/${chaveDaImagem(cartela)}.png`;
        imagem.alt = `Cartela do tipo ${cartela.getId()}`;
        const restantes = this.jogo.getQuantidadeNoMonte();
        const posicaoBrasao = posicaoDoBrasao(cartela);
        brasao.hidden = posicaoBrasao === null;
        if (posicaoBrasao) {
            brasao.style.left = `${50 + posicaoBrasao[0] * 86}%`;
            brasao.style.top = `${50 + posicaoBrasao[1] * 86}%`;
        }
        texto.textContent = restantes === 1 ? '1 cartela no monte' : `${restantes} cartelas no monte`;

        this.fantasmaImagem.setTexture(chaveDaImagem(cartela));
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
        const livre = this.jogo.getCartelaAtual() !== null && this.fase === 'cartela' && !this.desenhadas.has(casa.chave());
        this.fantasma
            .setVisible(livre)
            .setPosition(casa.getX() * TAMANHO_CARTELA, casa.getY() * TAMANHO_CARTELA);
        this.pintarFantasma();
    }

    // A prévia fica avermelhada quando a cartela, do jeito que está girada, não encaixa na casa.
    private pintarFantasma(): void {
        const casa = this.casaSobMouse;
        const cartela = this.jogo.getCartelaAtual();
        if (cartela && casa && this.jogo.getTabuleiro().podeColocar(cartela, casa)) {
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
        if (this.pendente?.posicao.igual(casa)) {
            texto.textContent = 'Esta cartela ainda não foi confirmada.';
            return;
        }

        const segmento = segmentoMaisProximo(item.cartela, this.cameras.main.getWorldPoint(ponteiro.x, ponteiro.y), casa);
        const tipo = NOME_DO_TIPO[segmento.getTipo()];
        const regiao = this.jogo.getTabuleiro().regiaoDe(segmento);
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
