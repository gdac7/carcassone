import { Regiao } from './Regiao';
import type { Tabuleiro } from './Tabuleiro';

export class RegiaoMosteiro extends Regiao {
    private readonly tabuleiro: Tabuleiro;

    constructor(tabuleiro: Tabuleiro) {
        super();
        this.tabuleiro = tabuleiro;
    }

    // Concluído com as 8 casas ao redor ocupadas, incluindo as diagonais.
    estaConcluida(): boolean {
        return this.numVizinhas() === 8;
    }

    // 1 pela própria cartela + 1 por vizinha: 9 quando completo.
    calcularPontos(_fimDeJogo: boolean): number {
        return 1 + this.numVizinhas();
    }

    // A região de um mosteiro tem um segmento só.
    private numVizinhas(): number {
        return this.tabuleiro.numVizinhasComDiagonais(this.getSegmentos()[0].getCartela());
    }
}
