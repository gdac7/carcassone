import { Cartela } from './Cartela';
import { DEFINICOES_CARTELAS, ID_CARTELA_INICIAL } from './definicoesCartelas';

// Pilha de cartelas viradas para baixo. O topo é o fim da lista.
export class MonteDeCartelas {
    private cartelas: Cartela[];
    private cartelaInicial: Cartela | null;

    constructor() {
        this.cartelas = [];
        this.cartelaInicial = null;
    }

    // Creator: cria as 72 cartelas a partir da tabela e separa a inicial.
    criarCartelasPadrao(): void {
        this.cartelas = [];
        this.cartelaInicial = null;
        for (const def of DEFINICOES_CARTELAS) {
            for (let i = 0; i < def.quantidade; i++) {
                const cartela = new Cartela(def.id, def.segmentos);
                if (def.id === ID_CARTELA_INICIAL && this.cartelaInicial === null) {
                    this.cartelaInicial = cartela;
                } else {
                    this.cartelas.push(cartela);
                }
            }
        }
    }

    // Fisher–Yates: troca cada posição, de trás para frente, com uma posição sorteada entre 0 e ela.
    embaralhar(): void {
        for (let i = this.cartelas.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cartelas[i], this.cartelas[j]] = [this.cartelas[j], this.cartelas[i]];
        }
    }

    puxarCartela(): Cartela {
        const cartela = this.cartelas.pop();
        if (!cartela) {
            throw new Error('O monte está vazio');
        }
        return cartela;
    }

    retirarCartelaInicial(): Cartela {
        if (!this.cartelaInicial) {
            throw new Error('A cartela inicial não está disponível');
        }
        const inicial = this.cartelaInicial;
        this.cartelaInicial = null;
        return inicial;
    }

    estaVazio(): boolean {
        return this.cartelas.length === 0;
    }

    getQuantidade(): number {
        return this.cartelas.length;
    }
}
