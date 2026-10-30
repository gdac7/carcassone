import type { Cartela } from './Cartela';
import { PontoBorda } from './PontoBorda';
import { TipoTerreno } from './TipoTerreno';

// Pedaço de terreno de uma cartela. Guarda os pontos de borda como foram desenhados (rotação 0).
export class Segmento {
    private readonly tipo: TipoTerreno;
    private readonly pontos: PontoBorda[];
    private readonly temBrasao: boolean;
    private readonly cartela: Cartela;
    private readonly cidadesAdjacentes: Segmento[];

    constructor(
        tipo: TipoTerreno,
        pontos: PontoBorda[],
        temBrasao: boolean,
        cartela: Cartela,
        cidadesAdjacentes: Segmento[],
    ) {
        this.tipo = tipo;
        this.pontos = pontos;
        this.temBrasao = temBrasao;
        this.cartela = cartela;
        this.cidadesAdjacentes = cidadesAdjacentes;
    }

    getTipo(): TipoTerreno {
        return this.tipo;
    }

    // Pontos originais girados conforme a rotação atual da cartela.
    pontosAtuais(): PontoBorda[] {
        return this.pontos.map((ponto) => {
            let atual = ponto;
            for (let i = 0; i < this.cartela.getRotacao(); i++) {
                atual = atual.girar();
            }
            return atual;
        });
    }

    getTemBrasao(): boolean {
        return this.temBrasao;
    }

    getCartela(): Cartela {
        return this.cartela;
    }

    getCidadesAdjacentes(): Segmento[] {
        return this.cidadesAdjacentes;
    }
}
