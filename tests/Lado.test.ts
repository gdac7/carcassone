import { describe, test, expect } from 'vitest';
import { Lado } from '../src/dominio/Lado';
import { PontoBorda } from '../src/dominio/PontoBorda';

const TODOS = [Lado.NORTE, Lado.LESTE, Lado.SUL, Lado.OESTE];

describe('Lado.oposta', () => {
  test('norte e sul são opostos', () => {
    expect(Lado.NORTE.oposta()).toBe(Lado.SUL);
    expect(Lado.SUL.oposta()).toBe(Lado.NORTE);
  });

  test('leste e oeste são opostos', () => {
    expect(Lado.LESTE.oposta()).toBe(Lado.OESTE);
    expect(Lado.OESTE.oposta()).toBe(Lado.LESTE);
  });
});

describe('Lado.pontos', () => {
  test('devolve os 3 pontos do lado no sentido horário', () => {
    expect(Lado.NORTE.pontos()).toEqual([PontoBorda.N_O, PontoBorda.N, PontoBorda.N_L]);
    expect(Lado.LESTE.pontos()).toEqual([PontoBorda.L_N, PontoBorda.L, PontoBorda.L_S]);
    expect(Lado.SUL.pontos()).toEqual([PontoBorda.S_L, PontoBorda.S, PontoBorda.S_O]);
    expect(Lado.OESTE.pontos()).toEqual([PontoBorda.O_S, PontoBorda.O, PontoBorda.O_N]);
  });

  test('é coerente com PontoBorda.lado', () => {
    for (const lado of TODOS) {
      for (const p of lado.pontos()) {
        expect(p.lado()).toBe(lado);
      }
    }
  });
});
