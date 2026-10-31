import type { Cor } from './Cor';
import { Jogador } from './Jogador';
import type { Jogo } from './Jogo';
import type { EstrategiaIA } from '../servicos/EstrategiaIA';

export class JogadorIA extends Jogador {
    private readonly estrategia: EstrategiaIA;

    constructor(nome: string, cor: Cor, estrategia: EstrategiaIA) {
        super(nome, cor);
        this.estrategia = estrategia;
    }

    // A estratégia escolhe; o Jogo valida e aplica, como faria com a jogada de um humano.
    iniciarTurno(jogo: Jogo): void {
        const cartela = jogo.getCartelaAtual();
        if (!cartela) return;
        jogo.executarJogada(this.estrategia.escolherJogada(cartela, jogo.getTabuleiro(), this));
    }

    getEstrategia(): EstrategiaIA {
        return this.estrategia;
    }
}
