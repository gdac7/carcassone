import type { Jogador } from "./Jogador"
import type { Meeple } from "./Meeple"
import type { Segmento } from "./Segmento"

export abstract class Regiao {
    private segmentos: Array<Segmento>;
    private meeples: Array<Meeple>;
    private pontosAbertos: number;

    // Toda região nasce vazia; o Tabuleiro adiciona os segmentos depois.
    constructor(){
        this.segmentos = [];
        this.meeples = [];
        this.pontosAbertos = 0;
    }

    // Template Method
    pontuar(fimDeJogo: boolean): void {
        if (!fimDeJogo && !this.estaConcluida()) return;
        if (!this.estaOcupada()) return;

        const vencedores = this.jogadoresComMaioria();
        const pts = this.calcularPontos(fimDeJogo);
        for (const jogador of vencedores) {
            jogador.adicionarPontos(pts);
        }
        this.liberarMeeples();
    }

    estaConcluida(): boolean {
        return this.pontosAbertos === 0;
    }

    abstract calcularPontos(fimDeJogo: boolean): number;

    jogadoresComMaioria(): Array<Jogador> {
        const jogadoresContagem = new Map<Jogador, number>();
        this.meeples.forEach((meeple) => {
            const dono = meeple.getDono();
            jogadoresContagem.set(dono, (jogadoresContagem.get(dono) ?? 0) + 1);
        });
        const maior = Math.max(...jogadoresContagem.values());
        return [...jogadoresContagem.keys()].filter(
            (jogador) => jogadoresContagem.get(jogador) === maior);
    }

    estaOcupada(): boolean {
        return this.meeples.length > 0;
    }

    adicionarMeeple(m: Meeple): void {
        this.meeples.push(m);
    }

    adicionarSegmento(s: Segmento): void {
        this.segmentos.push(s);
        this.pontosAbertos += s.pontosAtuais().length;
    }

    // Cada ponto conectado fecha duas pontas: a do segmento novo e a do vizinho.
    conectarPontos(qtd: number): void {
        this.pontosAbertos -= 2 * qtd;
    }

    // Traz para esta região tudo o que estava na outra; o Tabuleiro remove a outra depois.
    fundir(outra: Regiao): void {
        this.segmentos.push(...outra.segmentos);
        this.meeples.push(...outra.meeples);
        this.pontosAbertos += outra.pontosAbertos;
    }

    liberarMeeples(): void {
        this.meeples.forEach((meeple) => {
            meeple.getDono().devolverMeeple(meeple);
        });
        this.meeples = [];
    }

    numCartelasDistintas(): number {
        return new Set(this.segmentos.map((segmento) => segmento.getCartela())).size;
    }

    getSegmentos(): Array<Segmento> {
        return this.segmentos;
    }
}
