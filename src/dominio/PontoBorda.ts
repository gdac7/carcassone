import { Lado } from './Lado';

export class PontoBorda {  
    static readonly N_O = new PontoBorda('N_O', 0);
    static readonly N = new PontoBorda('N', 1);
    static readonly N_L = new PontoBorda('N_L', 2);
    static readonly L_N = new PontoBorda('L_N', 3);
    static readonly L = new PontoBorda('L', 4);
    static readonly L_S = new PontoBorda('L_S', 5);
    static readonly S_L = new PontoBorda('S_L', 6);
    static readonly S = new PontoBorda('S', 7);
    static readonly S_O = new PontoBorda('S_O', 8);
    static readonly O_S = new PontoBorda('O_S', 9);
    static readonly O = new PontoBorda('O', 10);
    static readonly O_N = new PontoBorda('O_N', 11);

    private static readonly ORDEM = [
        PontoBorda.N_O, PontoBorda.N, PontoBorda.N_L,
        PontoBorda.L_N, PontoBorda.L, PontoBorda.L_S,
        PontoBorda.S_L, PontoBorda.S, PontoBorda.S_O,
        PontoBorda.O_S, PontoBorda.O, PontoBorda.O_N,
    ];

    private readonly nome: string;
    private readonly indice: number;

    private constructor(nome: string, indice: number) {
        this.nome = nome;
        this.indice = indice;
    }

    oposta(): PontoBorda {
        // Posição i guarda o índice do ponto que encosta em i na cartela vizinha.
        // N_O<->S_O, N<->S, N_L<->S_L, L_N<->O_N, L<->O, L_S<->O_S.
        const indiceDaOposta = [
            8, 7, 6,   // N_O, N, N_L  -> S_O, S, S_L
            11, 10, 9, // L_N, L, L_S  -> O_N, O, O_S
            2, 1, 0,   // S_L, S, S_O  -> N_L, N, N_O
            5, 4, 3,   // O_S, O, O_N  -> L_S, L, L_N
        ];
        return PontoBorda.ORDEM[indiceDaOposta[this.indice]];
    }

    lado(): Lado {
        const lados = [Lado.NORTE, Lado.LESTE, Lado.SUL, Lado.OESTE];
        return lados[Math.floor(this.indice / 3)];
    }

    girar(): PontoBorda {
        return PontoBorda.ORDEM[(this.indice + 3) % 12];
    }

    toString(): string {
        return this.nome;
    }
}
