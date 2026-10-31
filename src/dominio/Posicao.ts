import { Lado } from './Lado'

export class Posicao {
    private readonly x: number;
    private readonly y: number;

    constructor(x: number, y: number){
        this.x = x;
        this.y = y;
    }

    chave(): string {
        return `${this.x},${this.y}`;
    }

    vizinha(lado: Lado): Posicao {
        switch (lado) {
            case Lado.NORTE: return new Posicao(this.x, this.y - 1);
            case Lado.SUL:   return new Posicao(this.x, this.y + 1);
            case Lado.LESTE: return new Posicao(this.x + 1, this.y);
            case Lado.OESTE: return new Posicao(this.x - 1, this.y);
            default: throw new Error(`Lado desconhecido: ${lado}`);
        }
    }

    vizinhasComDiagonais(): Posicao[] {
        // Todas as combinações de deslocamento -1, 0, +1 em x e y, menos (0, 0), que é a própria posição.
        const vizinhas: Posicao[] = [];
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                vizinhas.push(new Posicao(this.x + dx, this.y + dy));
            }
        }
        return vizinhas;
    }

    igual(outraPosicao: Posicao): boolean {
        return this.x === outraPosicao.x && this.y === outraPosicao.y;
    }

    getX(): number {
        return this.x;
    }
    
    getY(): number {
        return this.y;
    }

    toString(): string {
        return `(${this.x}, ${this.y})`;
    }


}