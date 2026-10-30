import { describe, test, expect } from 'vitest';
import { Posicao } from '../src/dominio/Posicao';
import { Lado } from '../src/dominio/Lado';

// Convenção de coordenadas (a mesma da tela): x cresce para o leste, y cresce para o sul.

describe('Posicao: coordenadas', () => {
  test('guarda x e y', () => {
    const p = new Posicao(2, -3);
    expect(p.getX()).toBe(2);
    expect(p.getY()).toBe(-3);
  });
});

describe('Posicao.igual', () => {
  test('duas posições com as mesmas coordenadas são iguais, mesmo sendo objetos diferentes', () => {
    const a = new Posicao(1, 1);
    const b = new Posicao(1, 1);
    expect(a === b).toBe(false); // objetos diferentes...
    expect(a.igual(b)).toBe(true); // ...mas o mesmo valor
  });

  test('coordenadas diferentes não são iguais', () => {
    expect(new Posicao(1, 1).igual(new Posicao(1, 2))).toBe(false);
    expect(new Posicao(1, 1).igual(new Posicao(2, 1))).toBe(false);
  });
});

describe('Posicao.chave', () => {
  test('representa a posição como texto "x,y"', () => {
    expect(new Posicao(2, -3).chave()).toBe('2,-3');
  });

  test('serve de chave de Map: posições iguais encontram o mesmo valor', () => {
    const mapa = new Map<string, string>();
    mapa.set(new Posicao(0, 0).chave(), 'cartela inicial');
    expect(mapa.get(new Posicao(0, 0).chave())).toBe('cartela inicial');
  });
});

describe('Posicao.vizinha', () => {
  const origem = new Posicao(0, 0);

  test('norte diminui y, sul aumenta y', () => {
    expect(origem.vizinha(Lado.NORTE).igual(new Posicao(0, -1))).toBe(true);
    expect(origem.vizinha(Lado.SUL).igual(new Posicao(0, 1))).toBe(true);
  });

  test('leste aumenta x, oeste diminui x', () => {
    expect(origem.vizinha(Lado.LESTE).igual(new Posicao(1, 0))).toBe(true);
    expect(origem.vizinha(Lado.OESTE).igual(new Posicao(-1, 0))).toBe(true);
  });

  test('ir para um lado e voltar pelo oposto retorna à mesma posição', () => {
    const p = new Posicao(5, 7);
    for (const lado of [Lado.NORTE, Lado.LESTE, Lado.SUL, Lado.OESTE]) {
      expect(p.vizinha(lado).vizinha(lado.oposta()).igual(p)).toBe(true);
    }
  });

  test('não altera a posição original', () => {
    const p = new Posicao(3, 3);
    p.vizinha(Lado.LESTE);
    expect(p.igual(new Posicao(3, 3))).toBe(true);
  });
});

describe('Posicao.vizinhasComDiagonais', () => {
  const centro = new Posicao(4, -2);
  const vizinhas = centro.vizinhasComDiagonais();
  const chaves = vizinhas.map((p) => p.chave());

  test('devolve 8 posições diferentes', () => {
    expect(vizinhas).toHaveLength(8);
    expect(new Set(chaves).size).toBe(8);
  });

  test('não inclui a própria posição', () => {
    expect(chaves).not.toContain(centro.chave());
  });

  test('todas ficam a no máximo 1 de distância em x e em y', () => {
    for (const p of vizinhas) {
      expect(Math.abs(p.getX() - centro.getX())).toBeLessThanOrEqual(1);
      expect(Math.abs(p.getY() - centro.getY())).toBeLessThanOrEqual(1);
    }
  });

  test('inclui as 4 vizinhas dos lados e as 4 diagonais', () => {
    for (const lado of [Lado.NORTE, Lado.LESTE, Lado.SUL, Lado.OESTE]) {
      expect(chaves).toContain(centro.vizinha(lado).chave());
    }
    expect(chaves).toContain('3,-3'); // noroeste
    expect(chaves).toContain('5,-3'); // nordeste
    expect(chaves).toContain('5,-1'); // sudeste
    expect(chaves).toContain('3,-1'); // sudoeste
  });
});
