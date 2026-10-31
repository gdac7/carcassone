import { describe, test, expect } from 'vitest';
import { Regiao } from '../src/dominio/Regiao';
import { RegiaoCidade } from '../src/dominio/RegiaoCidade';
import { Cartela } from '../src/dominio/Cartela';
import { Segmento } from '../src/dominio/Segmento';
import { JogadorHumano } from '../src/dominio/JogadorHumano';
import { Cor } from '../src/dominio/Cor';
import { PontoBorda } from '../src/dominio/PontoBorda';
import { TipoTerreno } from '../src/dominio/TipoTerreno';

// Os pontos exatos não importam aqui, só a quantidade (cada lado de cidade tem 3).
const LADO_NORTE = [PontoBorda.N_O, PontoBorda.N, PontoBorda.N_L];
const LADO_SUL = [PontoBorda.S_L, PontoBorda.S, PontoBorda.S_O];

function cidade(pontos: PontoBorda[], temBrasao = false): Segmento {
  return new Cartela('T', [{ tipo: TipoTerreno.CIDADE, pontos, temBrasao }]).getSegmentos()[0];
}

// Cidade em coluna, fechada: topo [S] + n-2 meios [N, S] + base [N].
// `brasoes` indica quantas cartelas do meio têm brasão.
function cidadeConcluida(numCartelas: number, brasoes = 0): RegiaoCidade {
  const r = new RegiaoCidade();
  r.adicionarSegmento(cidade(LADO_SUL));
  for (let i = 0; i < numCartelas - 2; i++) {
    r.adicionarSegmento(cidade([...LADO_NORTE, ...LADO_SUL], i < brasoes));
    r.conectarPontos(3);
  }
  r.adicionarSegmento(cidade(LADO_NORTE));
  r.conectarPontos(3);
  return r;
}

describe('RegiaoCidade', () => {
  test('é uma Regiao', () => {
    expect(new RegiaoCidade()).toBeInstanceOf(Regiao);
  });

  test('cidade de 2 cartelas fecha com 3 conexões', () => {
    expect(cidadeConcluida(2).estaConcluida()).toBe(true);
  });
});

describe('RegiaoCidade.calcularPontos', () => {
  test('exemplo do manual: cidade de 3 cartelas com 1 brasão, concluída, vale 8', () => {
    const r = cidadeConcluida(3, 1);
    expect(r.estaConcluida()).toBe(true);
    expect(r.calcularPontos(false)).toBe(8); // 2×3 + 2×1
  });

  test('exemplo do manual: cidade incompleta de 5 cartelas com 3 brasões vale 8 no fim', () => {
    const r = new RegiaoCidade();
    r.adicionarSegmento(cidade(LADO_SUL, true));
    r.adicionarSegmento(cidade([...LADO_NORTE, ...LADO_SUL], true));
    r.conectarPontos(3);
    r.adicionarSegmento(cidade([...LADO_NORTE, ...LADO_SUL], true));
    r.conectarPontos(3);
    r.adicionarSegmento(cidade([...LADO_NORTE, ...LADO_SUL]));
    r.conectarPontos(3);
    r.adicionarSegmento(cidade([...LADO_NORTE, ...LADO_SUL]));
    r.conectarPontos(3);
    expect(r.estaConcluida()).toBe(false); // o sul da última está aberto
    expect(r.calcularPontos(true)).toBe(8); // 1×5 + 1×3
  });

  test('sem brasão, concluída: 2 por cartela', () => {
    expect(cidadeConcluida(2).calcularPontos(false)).toBe(4);
  });

  test('dois segmentos da mesma cartela contam uma vez', () => {
    // Cartela com dois pedaços de cidade (norte e sul) que acabam na mesma região.
    const dupla = new Cartela('T', [
      { tipo: TipoTerreno.CIDADE, pontos: LADO_NORTE },
      { tipo: TipoTerreno.CIDADE, pontos: LADO_SUL },
    ]);
    const r = new RegiaoCidade();
    r.adicionarSegmento(dupla.getSegmentos()[0]);
    r.adicionarSegmento(dupla.getSegmentos()[1]);
    r.adicionarSegmento(cidade(LADO_SUL));
    r.conectarPontos(3);
    r.adicionarSegmento(cidade(LADO_NORTE));
    r.conectarPontos(3);
    expect(r.estaConcluida()).toBe(true);
    expect(r.calcularPontos(false)).toBe(6); // 3 cartelas, não 4 segmentos
  });
});

describe('RegiaoCidade.pontuar', () => {
  test('exemplo do manual: 2 cavaleiros azuis contra 1 amarelo, só o azul leva os 10', () => {
    const azul = new JogadorHumano('Azul', Cor.AZUL);
    const amarelo = new JogadorHumano('Amarelo', Cor.AMARELO);
    const r = cidadeConcluida(5);
    r.adicionarMeeple(azul.retirarMeeple()!);
    r.adicionarMeeple(azul.retirarMeeple()!);
    r.adicionarMeeple(amarelo.retirarMeeple()!);

    r.pontuar(false);

    expect(azul.getPontuacao()).toBe(10);
    expect(amarelo.getPontuacao()).toBe(0);
    expect(azul.getQuantidadeNaReserva()).toBe(7);
    expect(amarelo.getQuantidadeNaReserva()).toBe(7);
  });
});
