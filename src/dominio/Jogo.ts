import type { ObservadorJogo } from '../servicos/ObservadorJogo';
import type { Cartela } from './Cartela';
import type { Jogada } from './Jogada';
import type { Jogador } from './Jogador';
import type { Segmento } from './Segmento';
import { MonteDeCartelas } from './MonteDeCartelas';
import { Posicao } from './Posicao';
import { Tabuleiro } from './Tabuleiro';

// Controller e Facade: a interface fala só com o Jogo, que coordena o domínio.
// Também é o sujeito do Observer: avisa os observadores a cada mudança.
export class Jogo {
    private rodadaAtual: number;
    private jogadores: Jogador[];
    private jogadorDaVez: Jogador | null;
    private cartelaAtual: Cartela | null;
    private tabuleiro: Tabuleiro;
    private monte: MonteDeCartelas;
    private observadores: ObservadorJogo[];
    private historico: Jogada[];

    constructor() {
        this.rodadaAtual = 0;
        this.jogadores = [];
        this.jogadorDaVez = null;
        this.cartelaAtual = null;
        this.tabuleiro = new Tabuleiro();
        this.monte = new MonteDeCartelas();
        this.observadores = [];
        this.historico = [];
    }

    iniciarPartida(jogadores: Jogador[]): void {
        if (jogadores.length < 2 || jogadores.length > 5) {
            throw new Error('A partida precisa de 2 a 5 jogadores');
        }
        this.jogadores = [...jogadores];
        this.tabuleiro = new Tabuleiro();
        this.monte = new MonteDeCartelas();
        this.historico = [];
        this.rodadaAtual = 0;
        this.jogadorDaVez = null;

        this.monte.criarCartelasPadrao();
        this.monte.embaralhar();
        this.tabuleiro.colocarCartela(this.monte.retirarCartelaInicial(), new Posicao(0, 0));
        this.sortearOrdem();
        this.proximoTurno();
    }

    // O manual manda começar pelo mais jovem; o sistema não sabe a idade, então sorteia.
    sortearOrdem(): void {
        for (let i = this.jogadores.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.jogadores[i], this.jogadores[j]] = [this.jogadores[j], this.jogadores[i]];
        }
    }

    // Puxa a próxima cartela que caiba em algum lugar (descartando as outras) e passa a vez.
    // Não chama iniciarTurno: quem dispara o turno é iniciarTurnoDaVez, para a tela poder pausar entre jogadas.
    proximoTurno(): void {
        this.cartelaAtual = null;
        while (!this.monte.estaVazio()) {
            this.cartelaAtual = this.monte.puxarCartela();
            if (this.tabuleiro.posicoesValidas(this.cartelaAtual).length > 0) break;
            this.descartarCartelaAtual();
        }
        if (!this.cartelaAtual) {
            this.finalizarPartida();
            return;
        }

        const indice = this.jogadorDaVez ? this.jogadores.indexOf(this.jogadorDaVez) : -1;
        this.jogadorDaVez = this.jogadores[(indice + 1) % this.jogadores.length];
        this.rodadaAtual++;
        this.notificarObservadores();
    }

    // Polymorphism: o humano não faz nada (espera a tela); a IA escolhe e executa a jogada.
    iniciarTurnoDaVez(): void {
        if (this.jogadorDaVez && this.cartelaAtual) this.jogadorDaVez.iniciarTurno(this);
    }

    // Valida tudo antes de mudar o tabuleiro; se algo não vale, nada acontece e devolve false.
    executarJogada(j: Jogada): boolean {
        const cartela = this.cartelaAtual;
        const jogador = this.jogadorDaVez;
        if (!cartela || !jogador) return false;

        while (cartela.getRotacao() !== j.getRotacao()) cartela.girar();
        if (!this.tabuleiro.podeColocar(cartela, j.getPosicao())) return false;
        const segmento = j.getSegmentoDoMeeple();
        if (segmento && !this.seguidorPermitido(cartela, j.getPosicao(), segmento, jogador)) return false;

        this.tabuleiro.colocarCartela(cartela, j.getPosicao());
        if (segmento) {
            this.tabuleiro.regiaoDe(segmento).adicionarMeeple(jogador.retirarMeeple()!);
        }
        this.cartelaAtual = null;
        this.pontuarRegioes(false);
        this.historico.push(j);
        this.notificarObservadores();

        if (this.verificarFimDeJogo()) {
            this.finalizarPartida();
        } else {
            this.proximoTurno();
        }
        return true;
    }

    descartarCartelaAtual(): void {
        this.cartelaAtual = null;
    }

    private pontuarRegioes(fimDeJogo: boolean): void {
        const regioes = fimDeJogo ? this.tabuleiro.regioesComMeeples() : this.tabuleiro.regioesConcluidas();
        for (const regiao of regioes) regiao.pontuar(fimDeJogo);
    }

    verificarFimDeJogo(): boolean {
        return this.cartelaAtual === null && this.monte.estaVazio();
    }

    // Pontua as regiões incompletas que ainda têm seguidores, inclusive os campos.
    finalizarPartida(): void {
        this.cartelaAtual = null;
        this.jogadorDaVez = null;
        this.pontuarRegioes(true);
        this.notificarObservadores();
    }

    adicionarObservador(o: ObservadorJogo): void {
        this.observadores.push(o);
    }

    private notificarObservadores(): void {
        for (const o of this.observadores) o.aoAtualizar(this);
    }

    // O segmento é da cartela da vez, o jogador tem seguidor e a zona (já ligada às vizinhas) está livre.
    private seguidorPermitido(c: Cartela, p: Posicao, s: Segmento, jogador: Jogador): boolean {
        return c.getSegmentos().includes(s)
            && jogador.getQuantidadeNaReserva() > 0
            && this.tabuleiro.regioesQueSeLigam(s, p).every((r) => !r.estaOcupada());
    }

    getRodadaAtual(): number {
        return this.rodadaAtual;
    }

    getJogadores(): Jogador[] {
        return this.jogadores;
    }

    getJogadorDaVez(): Jogador | null {
        return this.jogadorDaVez;
    }

    getCartelaAtual(): Cartela | null {
        return this.cartelaAtual;
    }

    getTabuleiro(): Tabuleiro {
        return this.tabuleiro;
    }

    getQuantidadeNoMonte(): number {
        return this.monte.getQuantidade();
    }

    getHistorico(): Jogada[] {
        return this.historico;
    }
}
