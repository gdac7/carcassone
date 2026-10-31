import type { Cartela } from '../dominio/Cartela';
import { Jogada } from '../dominio/Jogada';
import type { Jogador } from '../dominio/Jogador';
import type { Tabuleiro } from '../dominio/Tabuleiro';
import { colocacoesPossiveis, type EstrategiaIA } from './EstrategiaIA';

// Joga uma colocação válida qualquer e, na metade das vezes, põe um seguidor numa zona livre.
export class IAFacil implements EstrategiaIA {
    escolherJogada(c: Cartela, t: Tabuleiro, j: Jogador): Jogada {
        const { posicao, rotacao } = sortear(colocacoesPossiveis(c, t));

        let segmento = null;
        if (j.getQuantidadeNaReserva() > 0 && Math.random() < 0.5) {
            const rotacaoOriginal = c.getRotacao();
            while (c.getRotacao() !== rotacao) c.girar();
            const livres = c.getSegmentos().filter((s) => t.regioesQueSeLigam(s, posicao).every((r) => !r.estaOcupada()));
            while (c.getRotacao() !== rotacaoOriginal) c.girar();
            if (livres.length > 0) segmento = sortear(livres);
        }
        return new Jogada(posicao, rotacao, segmento);
    }
}

function sortear<T>(lista: T[]): T {
    return lista[Math.floor(Math.random() * lista.length)];
}
