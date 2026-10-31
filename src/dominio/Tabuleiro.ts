import type { Cartela } from './Cartela';
import { Lado } from './Lado';
import type { Posicao } from './Posicao';

const LADOS = [Lado.NORTE, Lado.LESTE, Lado.SUL, Lado.OESTE];

export class Tabuleiro {
    // A chave é posicao.chave() ("x,y"): o Map compara objetos por referência, não por valor.
    private cartelasPorPosicao: Map<string, { posicao: Posicao; cartela: Cartela }>;

    constructor() {
        this.cartelasPorPosicao = new Map();
    }

    // A primeira cartela (a inicial) entra em qualquer posição; as demais precisam caber.
    colocarCartela(c: Cartela, p: Posicao): boolean {
        if (this.cartelasPorPosicao.size > 0 && !this.cabe(c, p)) return false;
        this.cartelasPorPosicao.set(p.chave(), { posicao: p, cartela: c });
        return true;
    }

    // Casas em que `c` cabe em pelo menos uma das 4 rotações.
    posicoesValidas(c: Cartela): Posicao[] {
        const validas: Posicao[] = [];
        for (const candidata of this.casasLivresEncostadas()) {
            let cabeEmAlguma = false;
            // Gira sempre 4 vezes: assim a cartela termina na rotação em que começou.
            for (let i = 0; i < 4; i++) {
                if (this.cabe(c, candidata)) cabeEmAlguma = true;
                c.girar();
            }
            if (cabeEmAlguma) validas.push(candidata);
        }
        return validas;
    }

    vizinhas(p: Posicao): Cartela[] {
        const vizinhas: Cartela[] = [];
        for (const lado of LADOS) {
            const item = this.cartelasPorPosicao.get(p.vizinha(lado).chave());
            if (item) vizinhas.push(item.cartela);
        }
        return vizinhas;
    }

    // Casa livre, encostada em pelo menos uma cartela e combinando com todas as vizinhas,
    // na rotação atual de `c`.
    private cabe(c: Cartela, p: Posicao): boolean {
        if (this.cartelasPorPosicao.has(p.chave())) return false;

        let encostou = false;
        for (const lado of LADOS) {
            const vizinha = this.cartelasPorPosicao.get(p.vizinha(lado).chave());
            if (!vizinha) continue;
            if (!c.encaixaCom(vizinha.cartela, lado)) return false;
            encostou = true;
        }
        return encostou;
    }

    // Sem repetição: a mesma casa vazia pode encostar em várias cartelas.
    private casasLivresEncostadas(): Posicao[] {
        const livres = new Map<string, Posicao>();
        for (const { posicao } of this.cartelasPorPosicao.values()) {
            for (const lado of LADOS) {
                const vizinha = posicao.vizinha(lado);
                if (!this.cartelasPorPosicao.has(vizinha.chave())) livres.set(vizinha.chave(), vizinha);
            }
        }
        return [...livres.values()];
    }
}
