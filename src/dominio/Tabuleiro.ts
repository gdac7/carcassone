import type { Cartela } from './Cartela';
import { Lado } from './Lado';
import type { Posicao } from './Posicao';
import type { Regiao } from './Regiao';
import { RegiaoCidade } from './RegiaoCidade';
import { RegiaoEstrada } from './RegiaoEstrada';
import type { Segmento } from './Segmento';
import { TipoTerreno } from './TipoTerreno';

const LADOS = [Lado.NORTE, Lado.LESTE, Lado.SUL, Lado.OESTE];

export class Tabuleiro {
    // A chave é posicao.chave() ("x,y"): o Map compara objetos por referência, não por valor.
    private cartelasPorPosicao: Map<string, { posicao: Posicao; cartela: Cartela }>;
    private regioes: Regiao[];

    constructor() {
        this.cartelasPorPosicao = new Map();
        this.regioes = [];
    }

    // A primeira cartela (a inicial) entra em qualquer posição; as demais precisam caber.
    colocarCartela(c: Cartela, p: Posicao): boolean {
        if (this.cartelasPorPosicao.size > 0 && !this.cabe(c, p)) return false;
        this.cartelasPorPosicao.set(p.chave(), { posicao: p, cartela: c });
        this.atualizarRegioes(c, p);
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

    regiaoDe(s: Segmento): Regiao {
        const regiao = this.regioes.find((r) => r.getSegmentos().includes(s));
        if (!regiao) {
            throw new Error('O segmento não pertence a nenhuma região do tabuleiro');
        }
        return regiao;
    }

    regioesConcluidas(): Regiao[] {
        return this.regioes.filter((r) => r.estaConcluida());
    }

    regioesComMeeples(): Regiao[] {
        return this.regioes.filter((r) => r.estaOcupada());
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

    // Cada estrada e cidade da cartela nova entra na região que encosta nela, funde as regiões
    // que ela liga ou, se não encosta em nenhuma, começa uma região nova.
    private atualizarRegioes(c: Cartela, p: Posicao): void {
        for (const seg of c.getSegmentos()) {
            // Campos e mosteiros ainda não formam regiões.
            if (seg.getTipo() !== TipoTerreno.ESTRADA && seg.getTipo() !== TipoTerreno.CIDADE) continue;

            const regioesVizinhas: Regiao[] = [];
            let conexoes = 0;
            for (const ponto of seg.pontosAtuais()) {
                const vizinha = this.cartelasPorPosicao.get(p.vizinha(ponto.lado()).chave());
                if (!vizinha) continue;
                const regiao = this.regiaoDe(vizinha.cartela.segmentoNoPonto(ponto.oposta()));
                // Num laço, a mesma região encosta por dois pontos: conta as duas conexões, mas não repete a região.
                if (!regioesVizinhas.includes(regiao)) regioesVizinhas.push(regiao);
                conexoes++;
            }

            const principal = regioesVizinhas[0] ?? this.criarRegiao(seg.getTipo());
            for (const outra of regioesVizinhas.slice(1)) {
                principal.fundir(outra);
                this.regioes = this.regioes.filter((r) => r !== outra);
            }
            principal.adicionarSegmento(seg);
            principal.conectarPontos(conexoes);
        }
    }

    private criarRegiao(tipo: TipoTerreno): Regiao {
        const regiao = tipo === TipoTerreno.CIDADE ? new RegiaoCidade() : new RegiaoEstrada();
        this.regioes.push(regiao);
        return regiao;
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
