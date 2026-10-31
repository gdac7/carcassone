import type { Cartela } from '../dominio/Cartela';
import type { Jogada } from '../dominio/Jogada';
import type { Jogador } from '../dominio/Jogador';
import type { Posicao } from '../dominio/Posicao';
import type { Tabuleiro } from '../dominio/Tabuleiro';

// Strategy: cada nível de dificuldade escolhe a jogada do seu jeito.
export interface EstrategiaIA {
    escolherJogada(c: Cartela, t: Tabuleiro, j: Jogador): Jogada;
}

// Todas as combinações de posição e rotação em que a cartela cabe.
// Gira a cartela 4 vezes, então ela termina na rotação em que começou.
export function colocacoesPossiveis(c: Cartela, t: Tabuleiro): { posicao: Posicao; rotacao: number }[] {
    const colocacoes: { posicao: Posicao; rotacao: number }[] = [];
    const posicoes = t.posicoesValidas(c);
    for (let i = 0; i < 4; i++) {
        for (const posicao of posicoes) {
            if (t.podeColocar(c, posicao)) colocacoes.push({ posicao, rotacao: c.getRotacao() });
        }
        c.girar();
    }
    return colocacoes;
}
