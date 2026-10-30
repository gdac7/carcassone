import { Cor } from './Cor';
import type { Jogo } from './Jogo';
import { Meeple } from './Meeple';

const MEEPLES_POR_JOGADOR = 7;

export abstract class Jogador {
    private readonly nome: string;
    private readonly cor: Cor;
    private pontuacao: number;
    private readonly reserva: Meeple[];

    constructor(nome: string, cor: Cor) {
        this.nome = nome;
        this.cor = cor;
        this.pontuacao = 0;
        this.reserva = [];
        for (let i = 0; i < MEEPLES_POR_JOGADOR; i++) {
            this.reserva.push(new Meeple(this));
        }
    }

    abstract iniciarTurno(jogo: Jogo): void;

    retirarMeeple(): Meeple | null {
        return this.reserva.pop() ?? null;
    }

    devolverMeeple(m: Meeple): void {
        if (m.getDono() !== this) {
            throw new Error(`O meeple não pertence a ${this.nome}`);
        }
        this.reserva.push(m);
    }

    adicionarPontos(pts: number): void {
        this.pontuacao += pts;
    }

    getNome(): string {
        return this.nome;
    }

    getCor(): Cor {
        return this.cor;
    }

    getPontuacao(): number {
        return this.pontuacao;
    }

    getQuantidadeNaReserva(): number {
        return this.reserva.length;
    }
}
