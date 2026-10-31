import { describe, test, expect } from 'vitest';
import { Regiao } from '../src/dominio/Regiao';
import { RegiaoMosteiro } from '../src/dominio/RegiaoMosteiro';
import { Tabuleiro } from '../src/dominio/Tabuleiro';
import { Cartela } from '../src/dominio/Cartela';
import { Posicao } from '../src/dominio/Posicao';
import { Segmento } from '../src/dominio/Segmento';
import { JogadorHumano } from '../src/dominio/JogadorHumano';
import { Cor } from '../src/dominio/Cor';
import { TipoTerreno } from '../src/dominio/TipoTerreno';
import { DEFINICOES_CARTELAS } from '../src/dominio/definicoesCartelas';

// B: mosteiro cercado de campo. Campo encaixa com campo, então B cabe ao lado de B em qualquer direção.
function cartelaB(): Cartela {
  const def = DEFINICOES_CARTELAS.find((d) => d.id === 'B')!;
  return new Cartela('B', def.segmentos);
}

function mosteiroDe(c: Cartela): Segmento {
  return c.getSegmentos().find((s) => s.getTipo() === TipoTerreno.MOSTEIRO)!;
}

// Ordem que mantém cada nova cartela encostada nas anteriores.
const AO_REDOR = [
  new Posicao(1, 0), new Posicao(0, 1), new Posicao(-1, 0), new Posicao(0, -1),
  new Posicao(1, 1), new Posicao(-1, 1), new Posicao(-1, -1), new Posicao(1, -1),
];

// Mosteiro em (0,0) com as `n` primeiras casas de AO_REDOR ocupadas.
function mosteiroCom(n: number): { tabuleiro: Tabuleiro; regiao: Regiao } {
  const tabuleiro = new Tabuleiro();
  const centro = cartelaB();
  tabuleiro.colocarCartela(centro, new Posicao(0, 0));
  for (let i = 0; i < n; i++) {
    expect(tabuleiro.colocarCartela(cartelaB(), AO_REDOR[i])).toBe(true);
  }
  return { tabuleiro, regiao: tabuleiro.regiaoDe(mosteiroDe(centro)) };
}

describe('RegiaoMosteiro', () => {
  test('o tabuleiro cria uma RegiaoMosteiro para o segmento de mosteiro', () => {
    const { regiao } = mosteiroCom(0);
    expect(regiao).toBeInstanceOf(RegiaoMosteiro);
    expect(regiao).toBeInstanceOf(Regiao);
  });

  test('cada mosteiro é uma região separada, mesmo com mosteiros vizinhos', () => {
    const tabuleiro = new Tabuleiro();
    const a = cartelaB();
    const b = cartelaB();
    tabuleiro.colocarCartela(a, new Posicao(0, 0));
    tabuleiro.colocarCartela(b, new Posicao(1, 0));
    expect(tabuleiro.regiaoDe(mosteiroDe(a))).not.toBe(tabuleiro.regiaoDe(mosteiroDe(b)));
  });
});

describe('RegiaoMosteiro.estaConcluida', () => {
  test('sozinho, não está concluído', () => {
    expect(mosteiroCom(0).regiao.estaConcluida()).toBe(false);
  });

  test('com 7 vizinhas, ainda não', () => {
    expect(mosteiroCom(7).regiao.estaConcluida()).toBe(false);
  });

  test('com as 8 vizinhas (incluindo as diagonais), está concluído', () => {
    expect(mosteiroCom(8).regiao.estaConcluida()).toBe(true);
  });
});

describe('RegiaoMosteiro.calcularPontos', () => {
  test('sozinho vale 1', () => {
    expect(mosteiroCom(0).regiao.calcularPontos(true)).toBe(1);
  });

  test('exemplo do manual: incompleto com 3 vizinhas vale 4 no fim', () => {
    // (1,0), (0,1) e a diagonal (1,1)
    const tabuleiro = new Tabuleiro();
    const centro = cartelaB();
    tabuleiro.colocarCartela(centro, new Posicao(0, 0));
    tabuleiro.colocarCartela(cartelaB(), new Posicao(1, 0));
    tabuleiro.colocarCartela(cartelaB(), new Posicao(0, 1));
    tabuleiro.colocarCartela(cartelaB(), new Posicao(1, 1));
    expect(tabuleiro.regiaoDe(mosteiroDe(centro)).calcularPontos(true)).toBe(4);
  });

  test('completo vale 9', () => {
    expect(mosteiroCom(8).regiao.calcularPontos(false)).toBe(9);
  });
});

describe('RegiaoMosteiro.pontuar', () => {
  test('ao completar, o monge pontua 9 e volta para a reserva', () => {
    const ana = new JogadorHumano('Ana', Cor.AZUL);
    const { regiao } = mosteiroCom(8);
    regiao.adicionarMeeple(ana.retirarMeeple()!);

    regiao.pontuar(false);

    expect(ana.getPontuacao()).toBe(9);
    expect(ana.getQuantidadeNaReserva()).toBe(7);
  });

  test('incompleto durante a partida: o monge fica', () => {
    const ana = new JogadorHumano('Ana', Cor.AZUL);
    const { regiao } = mosteiroCom(5);
    regiao.adicionarMeeple(ana.retirarMeeple()!);

    regiao.pontuar(false);

    expect(ana.getPontuacao()).toBe(0);
    expect(regiao.estaOcupada()).toBe(true);
  });

  test('aparece em regioesConcluidas ao completar', () => {
    const { tabuleiro, regiao } = mosteiroCom(8);
    expect(tabuleiro.regioesConcluidas()).toContain(regiao);
  });
});
