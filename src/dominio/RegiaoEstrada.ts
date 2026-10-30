import { Regiao } from './Regiao';

export class RegiaoEstrada extends Regiao {
    // Vale 1 por cartela, concluída ou no fim do jogo.
    calcularPontos(_fimDeJogo: boolean): number {
        return this.numCartelasDistintas();
    }
}
