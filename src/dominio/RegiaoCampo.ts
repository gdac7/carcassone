import { Regiao } from './Regiao';
import type { Tabuleiro } from './Tabuleiro';

export class RegiaoCampo extends Regiao {
    private readonly tabuleiro: Tabuleiro;

    constructor(tabuleiro: Tabuleiro) {
        super();
        this.tabuleiro = tabuleiro;
    }

    // O campo nunca fecha: pelo template, só pontua no fim do jogo.
    estaConcluida(): boolean {
        return false;
    }

    calcularPontos(_fimDeJogo: boolean): number {
        return 3 * this.cidadesConcluidasAdjacentes();
    }

    // Conta regiões, não segmentos: a mesma cidade tocada em vários pontos vale uma vez só.
    private cidadesConcluidasAdjacentes(): number {
        const cidades = new Set<Regiao>();
        for (const campo of this.getSegmentos()) {
            for (const cidade of campo.getCidadesAdjacentes()) {
                cidades.add(this.tabuleiro.regiaoDe(cidade));
            }
        }
        return [...cidades].filter((cidade) => cidade.estaConcluida()).length;
    }
}
