import { PontoBorda } from './PontoBorda'

export class Lado {
    static readonly NORTE = new Lado('NORTE', 0);
    static readonly LESTE = new Lado('LESTE', 1);
    static readonly SUL = new Lado('SUL', 2);
    static readonly OESTE = new Lado('OESTE', 3);
    private static readonly ORDEM = [Lado.NORTE, Lado.LESTE, Lado.SUL, Lado.OESTE];

    private readonly nome: string;
    private readonly indice: number;
    

    private constructor(nome: string, indice: number){
        this.nome = nome;
        this.indice = indice;
    }

    oposta(): Lado {
        return Lado.ORDEM[(this.indice + 2) % 4]
    }

    pontos(): Array<PontoBorda> {
        // Montada aqui dentro (e não como static) por causa do import circular com PontoBorda.
        // Cada linha é um lado, na ordem dos índices; os pontos seguem o sentido horário.
        const pontosPorLado = [
            [PontoBorda.N_O, PontoBorda.N, PontoBorda.N_L], // NORTE
            [PontoBorda.L_N, PontoBorda.L, PontoBorda.L_S], // LESTE
            [PontoBorda.S_L, PontoBorda.S, PontoBorda.S_O], // SUL
            [PontoBorda.O_S, PontoBorda.O, PontoBorda.O_N], // OESTE
        ];
        return pontosPorLado[this.indice];
    }

    toString(): string {
        return this.nome;
    }

}