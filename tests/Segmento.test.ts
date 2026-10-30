import { describe, test, expect } from 'vitest';
import { Cartela } from '../src/dominio/Cartela';
import { TipoTerreno } from '../src/dominio/TipoTerreno';
import { PontoBorda } from '../src/dominio/PontoBorda';

const { N_O, N, N_L, L_N, L, L_S, S_L, S, S_O, O_S, O, O_N } = PontoBorda;

function cartelaComCidadeNoNorte(): Cartela {
  return new Cartela('E', [
    { tipo: TipoTerreno.CIDADE, pontos: [N_O, N, N_L] },
    { tipo: TipoTerreno.CAMPO, pontos: [L_N, L, L_S, S_L, S, S_O, O_S, O, O_N], cidadesAdjacentes: [0] },
  ]);
}

describe('Segmento.getTipo', () => {
  test('devolve o tipo de terreno da definição', () => {
    const [cidade, campo] = cartelaComCidadeNoNorte().getSegmentos();
    expect(cidade.getTipo()).toBe(TipoTerreno.CIDADE);
    expect(campo.getTipo()).toBe(TipoTerreno.CAMPO);
  });
});

describe('Segmento.pontosAtuais', () => {
  test('sem rotação, são os pontos originais', () => {
    const [cidade] = cartelaComCidadeNoNorte().getSegmentos();
    expect(cidade.pontosAtuais()).toEqual([N_O, N, N_L]);
  });

  test('aplica a rotação da cartela', () => {
    const cartela = cartelaComCidadeNoNorte();
    const [cidade] = cartela.getSegmentos();

    cartela.girar();
    expect(cidade.pontosAtuais()).toEqual([L_N, L, L_S]);

    cartela.girar();
    expect(cidade.pontosAtuais()).toEqual([S_L, S, S_O]);
  });

  test('o mosteiro continua sem pontos depois de girar', () => {
    const cartela = new Cartela('B', [
      { tipo: TipoTerreno.MOSTEIRO, pontos: [] },
      { tipo: TipoTerreno.CAMPO, pontos: [N_O, N, N_L, L_N, L, L_S, S_L, S, S_O, O_S, O, O_N] },
    ]);
    cartela.girar();
    expect(cartela.getSegmentos()[0].pontosAtuais()).toEqual([]);
  });
});
