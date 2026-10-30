import { Lado } from './Lado';
import { PontoBorda } from './PontoBorda';
import { Segmento } from './Segmento';
import { TipoTerreno } from './TipoTerreno';

// Descrição de um segmento na tabela de cartelas (rotação 0).
export type DefinicaoSegmento = {
    tipo: TipoTerreno;
    pontos: PontoBorda[];
    temBrasao?: boolean;
    cidadesAdjacentes?: number[]; // índices, nesta mesma lista, das cidades que o campo toca
};

export class Cartela {
    private readonly id: string;
    private rotacao: number;
    private readonly segmentos: Segmento[];

    constructor(id: string, definicoes: DefinicaoSegmento[]) {
        this.id = id;
        this.rotacao = 0;

        const segmentos: Segmento[] = [];

        // 1ª passada: tudo que não é campo, porque não depende de outros segmentos.
        definicoes.forEach((def, i) => {
            if (def.tipo !== TipoTerreno.CAMPO) {
                segmentos[i] = this.criarSegmento(def, []);
            }
        });

        // 2ª passada: os campos, que já encontram as cidades criadas pelo índice.
        definicoes.forEach((def, i) => {
            if (def.tipo === TipoTerreno.CAMPO) {
                const cidades = (def.cidadesAdjacentes ?? []).map((j) => segmentos[j]);
                segmentos[i] = this.criarSegmento(def, cidades);
            }
        });

        this.segmentos = segmentos;
    }

    private criarSegmento(def: DefinicaoSegmento, cidadesAdjacentes: Segmento[]): Segmento {
        return new Segmento(def.tipo, def.pontos, def.temBrasao ?? false, this, cidadesAdjacentes);
    }

    // 90° no sentido horário.
    girar(): void {
        this.rotacao = (this.rotacao + 1) % 4;
    }

    segmentoNoPonto(p: PontoBorda): Segmento {
        const segmento = this.segmentos.find((s) => s.pontosAtuais().includes(p));
        if (!segmento) {
            throw new Error(`Cartela ${this.id} não tem segmento no ponto ${p}`);
        }
        return segmento;
    }

    // `lado` é o lado desta cartela que encosta na vizinha.
    encaixaCom(vizinha: Cartela, lado: Lado): boolean {
        return lado.pontos().every(
            (p) => this.segmentoNoPonto(p).getTipo() === vizinha.segmentoNoPonto(p.oposta()).getTipo(),
        );
    }

    getId(): string {
        return this.id;
    }

    getRotacao(): number {
        return this.rotacao;
    }

    getSegmentos(): Segmento[] {
        return this.segmentos;
    }
}
