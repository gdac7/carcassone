import { Posicao } from './Posicao';
import { Segmento } from './Segmento';

export class Jogada {
    private readonly posicao: Posicao;
    private readonly rotacao: number;
    private readonly segmentoDoMeeple: Segmento | null;

    constructor(posicao: Posicao, rotacao: number, segmentoDoMeeple: Segmento | null = null) {
        this.posicao = posicao;
        this.rotacao = rotacao;
        this.segmentoDoMeeple = segmentoDoMeeple;
    }

    temMeeple(): boolean {
        return this.segmentoDoMeeple !== null;
    }

    getPosicao(): Posicao {
        return this.posicao;
    }

    getRotacao(): number {
        return this.rotacao;
    }

    getSegmentoDoMeeple(): Segmento | null {
        return this.segmentoDoMeeple;
    }
}
