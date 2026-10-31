import { describe, test, expect } from 'vitest';
import { MonteDeCartelas } from '../src/dominio/MonteDeCartelas';
import type { Cartela } from '../src/dominio/Cartela';

function monteCriado(): MonteDeCartelas {
  const monte = new MonteDeCartelas();
  monte.criarCartelasPadrao();
  return monte;
}

function puxarTodas(monte: MonteDeCartelas): Cartela[] {
  const cartelas: Cartela[] = [];
  while (!monte.estaVazio()) {
    cartelas.push(monte.puxarCartela());
  }
  return cartelas;
}

function contarPorTipo(cartelas: Cartela[]): Record<string, number> {
  const contagem: Record<string, number> = {};
  for (const c of cartelas) {
    contagem[c.getId()] = (contagem[c.getId()] ?? 0) + 1;
  }
  return contagem;
}

describe('MonteDeCartelas.criarCartelasPadrao', () => {
  test('monte novo, antes de criar, está vazio', () => {
    expect(new MonteDeCartelas().estaVazio()).toBe(true);
  });

  test('o monte fica com 71 cartelas: a inicial fica separada', () => {
    expect(puxarTodas(monteCriado())).toHaveLength(71);
  });

  test('as quantidades por tipo batem com o manual (D tem 3 no monte + a inicial)', () => {
    const contagem = contarPorTipo(puxarTodas(monteCriado()));
    expect(contagem).toEqual({
      A: 2, B: 4, C: 1, D: 3, E: 5, F: 2, G: 1, H: 3, I: 2, J: 3, K: 3, L: 3,
      M: 2, N: 3, O: 2, P: 3, Q: 1, R: 3, S: 2, T: 1, U: 8, V: 9, W: 4, X: 1,
    });
  });

  test('cada cartela é um objeto diferente, mesmo sendo do mesmo tipo', () => {
    const cartelas = puxarTodas(monteCriado());
    expect(new Set(cartelas).size).toBe(71);
  });
});

describe('MonteDeCartelas.retirarCartelaInicial', () => {
  test('devolve a cartela inicial, do tipo D, sem rotação', () => {
    const inicial = monteCriado().retirarCartelaInicial();
    expect(inicial.getId()).toBe('D');
    expect(inicial.getRotacao()).toBe(0);
  });

  test('a cartela inicial não está no monte', () => {
    const monte = monteCriado();
    const inicial = monte.retirarCartelaInicial();
    expect(puxarTodas(monte)).not.toContain(inicial);
  });
});

describe('MonteDeCartelas.puxarCartela', () => {
  test('cada puxada tira uma cartela do monte', () => {
    const monte = monteCriado();
    const primeira = monte.puxarCartela();
    expect(puxarTodas(monte)).toHaveLength(70);
    expect(primeira).toBeDefined();
  });

  test('a quantidade diminui a cada puxada', () => {
    const monte = monteCriado();
    expect(monte.getQuantidade()).toBe(71);
    monte.puxarCartela();
    expect(monte.getQuantidade()).toBe(70);
  });

  test('puxar de um monte vazio é erro', () => {
    const monte = monteCriado();
    puxarTodas(monte);
    expect(monte.estaVazio()).toBe(true);
    expect(() => monte.puxarCartela()).toThrow();
  });
});

describe('MonteDeCartelas.embaralhar', () => {
  test('mantém as mesmas 71 cartelas', () => {
    const monte = monteCriado();
    monte.embaralhar();
    const cartelas = puxarTodas(monte);
    expect(cartelas).toHaveLength(71);
    expect(contarPorTipo(cartelas).U).toBe(8);
  });

  test('muda a ordem das cartelas', () => {
    const semEmbaralhar = puxarTodas(monteCriado()).map((c) => c.getId()).join('');
    const monte = monteCriado();
    monte.embaralhar();
    const embaralhado = puxarTodas(monte).map((c) => c.getId()).join('');
    // A chance de o embaralhamento manter exatamente a mesma sequência é desprezível.
    expect(embaralhado).not.toBe(semEmbaralhar);
  });
});

describe('MonteDeCartelas.getOrdem e ordenar', () => {
  test('getOrdem lista os ids de baixo para cima: o último é a próxima cartela puxada', () => {
    const monte = monteCriado();
    monte.embaralhar();
    const ordem = monte.getOrdem();
    expect(ordem).toHaveLength(71);
    expect(monte.puxarCartela().getId()).toBe(ordem[70]);
    expect(monte.getOrdem()).toEqual(ordem.slice(0, 70));
  });

  test('ordenar deixa o monte exatamente na ordem dada', () => {
    const original = monteCriado();
    original.embaralhar();
    const ordem = original.getOrdem();

    const copia = monteCriado();
    copia.ordenar(ordem);

    expect(copia.getOrdem()).toEqual(ordem);
    expect(puxarTodas(copia).map((c) => c.getId())).toEqual(puxarTodas(original).map((c) => c.getId()));
  });

  test('ordenar recusa uma lista que não tem exatamente as cartelas do monte', () => {
    const ordem = monteCriado().getOrdem();
    expect(() => monteCriado().ordenar(ordem.slice(1))).toThrow();               // falta uma
    expect(() => monteCriado().ordenar([...ordem, 'A'])).toThrow();              // sobra uma
    expect(() => monteCriado().ordenar(['X', ...ordem.slice(1)])).toThrow();     // troca uma por outra
  });
});
