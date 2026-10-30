import { Regiao } from './Regiao';

export class RegiaoCidade extends Regiao {
    // Concluída vale o dobro do que vale incompleta no fim do jogo.
    calcularPontos(fimDeJogo: boolean): number {
        const multiplicador = fimDeJogo ? 1 : 2;
        return multiplicador * (this.numCartelasDistintas() + this.numBrasoes());
    }

    private numBrasoes(): number {
        return this.getSegmentos().filter((segmento) => segmento.getTemBrasao()).length;
    }
}
