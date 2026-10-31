import type { Cartela } from '../dominio/Cartela';
import { Jogada } from '../dominio/Jogada';
import type { Jogador } from '../dominio/Jogador';
import type { Posicao } from '../dominio/Posicao';
import type { Segmento } from '../dominio/Segmento';
import type { Tabuleiro } from '../dominio/Tabuleiro';
import { TipoTerreno } from '../dominio/TipoTerreno';
import { colocacoesPossiveis, type EstrategiaIA } from './EstrategiaIA';

// Valor de pôr um seguidor em cada tipo de zona: cidade rende mais; o fazendeiro fica preso até o fim.
const VALOR_DO_SEGUIDOR: Record<TipoTerreno, number> = {
    [TipoTerreno.CIDADE]: 4,
    [TipoTerreno.MOSTEIRO]: 3,
    [TipoTerreno.ESTRADA]: 2,
    [TipoTerreno.CAMPO]: -1,
};

// Dá uma nota a cada jogada possível (colocação + seguidor ou não) e escolhe a maior.
// Heurística: não simula a jogada, só olha o tabuleiro em volta da posição.
export class IADificil implements EstrategiaIA {
    escolherJogada(c: Cartela, t: Tabuleiro, j: Jogador): Jogada {
        const rotacaoOriginal = c.getRotacao();
        let melhor = { nota: -Infinity, jogada: null as Jogada | null };

        for (const { posicao, rotacao } of colocacoesPossiveis(c, t)) {
            while (c.getRotacao() !== rotacao) c.girar();
            const notaDaColocacao = this.notaDaColocacao(c, posicao, t, j);

            const opcoes: (Segmento | null)[] = [null];
            if (j.getQuantidadeNaReserva() > 0) {
                opcoes.push(...c.getSegmentos().filter((s) => t.regioesQueSeLigam(s, posicao).every((r) => !r.estaOcupada())));
            }
            for (const segmento of opcoes) {
                const nota = notaDaColocacao + this.notaDoSeguidor(segmento, posicao, t, j) + Math.random() * 0.1;
                if (nota > melhor.nota) melhor = { nota, jogada: new Jogada(posicao, rotacao, segmento) };
            }
        }

        while (c.getRotacao() !== rotacaoOriginal) c.girar();
        return melhor.jogada!;
    }

    // Encostar em mais cartelas ajuda a fechar zonas; estender zona própria é bom; a de outro, ruim.
    private notaDaColocacao(c: Cartela, p: Posicao, t: Tabuleiro, j: Jogador): number {
        let nota = 2 * t.vizinhas(p).length;
        for (const s of c.getSegmentos()) {
            if (s.getTipo() === TipoTerreno.CAMPO) continue;
            for (const regiao of t.regioesQueSeLigam(s, p)) {
                if (!regiao.estaOcupada()) continue;
                nota += regiao.jogadoresComMaioria().includes(j) ? 3 : -1;
            }
        }
        return nota;
    }

    private notaDoSeguidor(s: Segmento | null, p: Posicao, t: Tabuleiro, j: Jogador): number {
        if (!s) return 0;
        let nota = VALOR_DO_SEGUIDOR[s.getTipo()];
        if (s.getTipo() === TipoTerreno.MOSTEIRO) nota += t.vizinhas(p).length;
        if (s.getTipo() === TipoTerreno.CIDADE && s.getTemBrasao()) nota += 1;
        // Com poucos seguidores na reserva, só vale a pena gastar em cidade.
        if (j.getQuantidadeNaReserva() <= 2 && s.getTipo() !== TipoTerreno.CIDADE) nota -= 3;
        return nota;
    }
}
