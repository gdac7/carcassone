import type { Jogador } from './Jogador';

export class Meeple {
    private readonly dono: Jogador;

    constructor(dono: Jogador) {
        this.dono = dono;
    }

    getDono(): Jogador {
        return this.dono;
    }
}
