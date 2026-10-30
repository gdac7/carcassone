import { describe, test, expect } from 'vitest';
import { DEFINICOES_CARTELAS, ID_CARTELA_INICIAL } from '../src/dominio/definicoesCartelas';
import { Cartela } from '../src/dominio/Cartela';
import { TipoTerreno } from '../src/dominio/TipoTerreno';
import { PontoBorda } from '../src/dominio/PontoBorda';
import { Lado } from '../src/dominio/Lado';

// Estes testes conferem a tabela de definições: um erro de digitação aqui viraria um bug escondido no tabuleiro.

const TODOS_OS_PONTOS = [
  PontoBorda.N_O, PontoBorda.N, PontoBorda.N_L,
  PontoBorda.L_N, PontoBorda.L, PontoBorda.L_S,
  PontoBorda.S_L, PontoBorda.S, PontoBorda.S_O,
  PontoBorda.O_S, PontoBorda.O, PontoBorda.O_N,
];
const PONTOS_CENTRAIS = [PontoBorda.N, PontoBorda.L, PontoBorda.S, PontoBorda.O];
const LADOS = [Lado.NORTE, Lado.LESTE, Lado.SUL, Lado.OESTE];

// Quantidades do manual (jogo base, sem rio).
const QUANTIDADES: Record<string, number> = {
  A: 2, B: 4, C: 1, D: 4, E: 5, F: 2, G: 1, H: 3, I: 2, J: 3, K: 3, L: 3,
  M: 2, N: 3, O: 2, P: 3, Q: 1, R: 3, S: 2, T: 1, U: 8, V: 9, W: 4, X: 1,
};
const COM_BRASAO = ['C', 'F', 'M', 'O', 'Q', 'S'];
const COM_MOSTEIRO = ['A', 'B'];

describe('tabela de definições: quantidades', () => {
  test('tem os 24 tipos do jogo base, de A a X, sem repetir', () => {
    const ids = DEFINICOES_CARTELAS.map((d) => d.id);
    expect([...ids].sort()).toEqual(Object.keys(QUANTIDADES).sort());
  });

  test('cada tipo tem a quantidade do manual', () => {
    for (const def of DEFINICOES_CARTELAS) {
      expect(def.quantidade, `tipo ${def.id}`).toBe(QUANTIDADES[def.id]);
    }
  });

  test('somam 72 cartelas', () => {
    const total = DEFINICOES_CARTELAS.reduce((soma, d) => soma + d.quantidade, 0);
    expect(total).toBe(72);
  });

  test('a cartela inicial é do tipo D', () => {
    expect(ID_CARTELA_INICIAL).toBe('D');
  });
});

describe.each(DEFINICOES_CARTELAS)('tabela de definições: tipo $id', (def) => {
  test('cada um dos 12 pontos de borda pertence a exatamente um segmento', () => {
    for (const p of TODOS_OS_PONTOS) {
      const donos = def.segmentos.filter((s) => s.pontos.includes(p));
      expect(donos, `ponto ${p}`).toHaveLength(1);
    }
  });

  test('cidades ocupam lados inteiros', () => {
    for (const s of def.segmentos.filter((s) => s.tipo === TipoTerreno.CIDADE)) {
      for (const lado of LADOS) {
        const ocupados = lado.pontos().filter((p) => s.pontos.includes(p)).length;
        expect([0, 3], `lado ${lado}`).toContain(ocupados);
      }
    }
  });

  test('estradas só ocupam o ponto central dos lados', () => {
    for (const s of def.segmentos.filter((s) => s.tipo === TipoTerreno.ESTRADA)) {
      for (const p of s.pontos) {
        expect(PONTOS_CENTRAIS, `ponto ${p}`).toContain(p);
      }
    }
  });

  test('mosteiro só nos tipos A e B, sem pontos de borda', () => {
    const mosteiros = def.segmentos.filter((s) => s.tipo === TipoTerreno.MOSTEIRO);
    expect(mosteiros).toHaveLength(COM_MOSTEIRO.includes(def.id) ? 1 : 0);
    for (const m of mosteiros) {
      expect(m.pontos).toEqual([]);
    }
  });

  test('brasão só nos tipos do manual, sempre em uma cidade', () => {
    const comBrasao = def.segmentos.filter((s) => s.temBrasao);
    expect(comBrasao).toHaveLength(COM_BRASAO.includes(def.id) ? 1 : 0);
    for (const s of comBrasao) {
      expect(s.tipo).toBe(TipoTerreno.CIDADE);
    }
  });

  test('cidadesAdjacentes só em campos, apontando para cidades da mesma cartela', () => {
    def.segmentos.forEach((s) => {
      const adjacentes = s.cidadesAdjacentes ?? [];
      if (s.tipo !== TipoTerreno.CAMPO) {
        expect(adjacentes).toEqual([]);
      }
      for (const i of adjacentes) {
        expect(def.segmentos[i]?.tipo, `índice ${i}`).toBe(TipoTerreno.CIDADE);
      }
    });
  });

  test('vira uma Cartela válida em todas as rotações', () => {
    const cartela = new Cartela(def.id, def.segmentos);
    for (let giro = 0; giro < 4; giro++) {
      for (const p of TODOS_OS_PONTOS) {
        expect(() => cartela.segmentoNoPonto(p)).not.toThrow();
      }
      cartela.girar();
    }
  });
});
