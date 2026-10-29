import { describe, test, expect } from 'vitest';
import { PontoBorda } from '../src/dominio/PontoBorda';
import { Lado } from '../src/dominio/Lado';

// Os 12 pontos no sentido horário, começando pelo canto noroeste.
const TODOS = [
  PontoBorda.N_O, PontoBorda.N, PontoBorda.N_L,
  PontoBorda.L_N, PontoBorda.L, PontoBorda.L_S,
  PontoBorda.S_L, PontoBorda.S, PontoBorda.S_O,
  PontoBorda.O_S, PontoBorda.O, PontoBorda.O_N,
];

describe('PontoBorda.oposta', () => {
  test('liga os pontos que se encostam entre cartelas vizinhas', () => {
    expect(PontoBorda.N_O.oposta()).toBe(PontoBorda.S_O);
    expect(PontoBorda.N.oposta()).toBe(PontoBorda.S);
    expect(PontoBorda.N_L.oposta()).toBe(PontoBorda.S_L);
    expect(PontoBorda.L_N.oposta()).toBe(PontoBorda.O_N);
    expect(PontoBorda.L.oposta()).toBe(PontoBorda.O);
    expect(PontoBorda.L_S.oposta()).toBe(PontoBorda.O_S);
  });

  test('é simétrica: a oposta da oposta é o próprio ponto', () => {
    for (const p of TODOS) {
      expect(p.oposta().oposta()).toBe(p);
    }
  });

  test('a oposta fica no lado oposto', () => {
    for (const p of TODOS) {
      expect(p.oposta().lado()).toBe(p.lado().oposta());
    }
  });
});

describe('PontoBorda.girar', () => {
  test('90° horário avança 3 posições', () => {
    expect(PontoBorda.N_O.girar()).toBe(PontoBorda.L_N);
    expect(PontoBorda.N.girar()).toBe(PontoBorda.L);
    expect(PontoBorda.L_S.girar()).toBe(PontoBorda.S_O);
  });

  test('dá a volta do oeste para o norte', () => {
    expect(PontoBorda.O_S.girar()).toBe(PontoBorda.N_O);
    expect(PontoBorda.O.girar()).toBe(PontoBorda.N);
    expect(PontoBorda.O_N.girar()).toBe(PontoBorda.N_L);
  });

  test('4 giros voltam ao ponto inicial', () => {
    for (const p of TODOS) {
      expect(p.girar().girar().girar().girar()).toBe(p);
    }
  });
});

describe('PontoBorda.lado', () => {
  test('cada ponto pertence ao lado indicado pelo nome', () => {
    expect(PontoBorda.N_O.lado()).toBe(Lado.NORTE);
    expect(PontoBorda.L_S.lado()).toBe(Lado.LESTE);
    expect(PontoBorda.S.lado()).toBe(Lado.SUL);
    expect(PontoBorda.O_N.lado()).toBe(Lado.OESTE);
  });
});
