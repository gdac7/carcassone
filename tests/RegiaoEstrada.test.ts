import { describe, test, expect } from 'vitest';
import { RegiaoEstrada } from '../src/dominio/RegiaoEstrada';
import { Cartela } from '../src/dominio/Cartela';
import { Segmento } from '../src/dominio/Segmento';
import { PontoBorda } from '../src/dominio/PontoBorda';
import { TipoTerreno } from '../src/dominio/TipoTerreno';

function estrada(pontos: PontoBorda[]): Segmento {
  return new Cartela('T', [{ tipo: TipoTerreno.ESTRADA, pontos }]).getSegmentos()[0];
}

describe('RegiaoEstrada.calcularPontos', () => {
  test('exemplo do manual: estrada de 3 cartelas concluída vale 3', () => {
    const r = new RegiaoEstrada();
    r.adicionarSegmento(estrada([PontoBorda.S]));
    r.adicionarSegmento(estrada([PontoBorda.N, PontoBorda.S]));
    r.conectarPontos(1);
    r.adicionarSegmento(estrada([PontoBorda.N]));
    r.conectarPontos(1);
    expect(r.calcularPontos(false)).toBe(3);
  });

  test('vale 1 por cartela também no fim do jogo', () => {
    const r = new RegiaoEstrada();
    r.adicionarSegmento(estrada([PontoBorda.N, PontoBorda.S]));
    r.adicionarSegmento(estrada([PontoBorda.N, PontoBorda.S]));
    r.conectarPontos(1);
    expect(r.calcularPontos(true)).toBe(2);
  });

  test('dois segmentos da mesma cartela contam uma vez', () => {
    const cartela = new Cartela('T', [
      { tipo: TipoTerreno.ESTRADA, pontos: [PontoBorda.N] },
      { tipo: TipoTerreno.ESTRADA, pontos: [PontoBorda.S] },
    ]);
    const r = new RegiaoEstrada();
    r.adicionarSegmento(cartela.getSegmentos()[0]);
    r.adicionarSegmento(cartela.getSegmentos()[1]);
    expect(r.calcularPontos(true)).toBe(1);
  });
});
