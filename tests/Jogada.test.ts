import { describe, test, expect } from 'vitest';
import { Jogada } from '../src/dominio/Jogada';
import { Posicao } from '../src/dominio/Posicao';
import { Cartela } from '../src/dominio/Cartela';
import { TipoTerreno } from '../src/dominio/TipoTerreno';
import { PontoBorda } from '../src/dominio/PontoBorda';

const { N_O, N, N_L, L_N, L, L_S, S_L, S, S_O, O_S, O, O_N } = PontoBorda;

function cidadeDeUmaCartela() {
  const cartela = new Cartela('E', [
    { tipo: TipoTerreno.CIDADE, pontos: [N_O, N, N_L] },
    { tipo: TipoTerreno.CAMPO, pontos: [L_N, L, L_S, S_L, S, S_O, O_S, O, O_N], cidadesAdjacentes: [0] },
  ]);
  return cartela.getSegmentos()[0];
}

describe('Jogada', () => {
  test('guarda posição e rotação', () => {
    const jogada = new Jogada(new Posicao(1, -2), 3);
    expect(jogada.getPosicao().igual(new Posicao(1, -2))).toBe(true);
    expect(jogada.getRotacao()).toBe(3);
  });

  test('sem segmento, não tem meeple', () => {
    const jogada = new Jogada(new Posicao(0, 1), 0);
    expect(jogada.temMeeple()).toBe(false);
    expect(jogada.getSegmentoDoMeeple()).toBeNull();
  });

  test('com segmento, tem meeple naquele segmento', () => {
    const cidade = cidadeDeUmaCartela();
    const jogada = new Jogada(new Posicao(0, 1), 0, cidade);
    expect(jogada.temMeeple()).toBe(true);
    expect(jogada.getSegmentoDoMeeple()).toBe(cidade);
  });
});
