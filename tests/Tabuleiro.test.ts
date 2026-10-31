import { describe, test, expect } from 'vitest';
import { Tabuleiro } from '../src/dominio/Tabuleiro';
import { Cartela } from '../src/dominio/Cartela';
import { Posicao } from '../src/dominio/Posicao';
import { DEFINICOES_CARTELAS } from '../src/dominio/definicoesCartelas';

// Cartelas reais da tabela, na rotação 0:
//   D: cidade no norte, estrada de leste a oeste, campo no sul (a inicial)
//   B: mosteiro cercado de campo (campo nos 4 lados)
//   C: cidade nos 4 lados
//   E: cidade no norte, campo nos outros lados
//   U: estrada reta de norte a sul
function cartela(id: string, giros = 0): Cartela {
  const def = DEFINICOES_CARTELAS.find((d) => d.id === id)!;
  const c = new Cartela(id, def.segmentos);
  for (let i = 0; i < giros; i++) c.girar();
  return c;
}

// Compara listas de posições pelo valor, sem depender da ordem.
function chaves(posicoes: Posicao[]): string[] {
  return posicoes.map((p) => p.chave()).sort();
}

// Tabuleiro com a cartela inicial D em (0, 0).
function comInicial(): Tabuleiro {
  const t = new Tabuleiro();
  t.colocarCartela(cartela('D'), new Posicao(0, 0));
  return t;
}

describe('Tabuleiro.colocarCartela', () => {
  test('a primeira cartela entra em qualquer posição do tabuleiro vazio', () => {
    expect(new Tabuleiro().colocarCartela(cartela('D'), new Posicao(0, 0))).toBe(true);
  });

  test('aceita uma cartela encostada e com o lado combinando', () => {
    // campo do sul de D com o campo de B
    expect(comInicial().colocarCartela(cartela('B'), new Posicao(0, 1))).toBe(true);
  });

  test('recusa uma posição já ocupada', () => {
    expect(comInicial().colocarCartela(cartela('C'), new Posicao(0, 0))).toBe(false);
  });

  test('recusa uma posição que não encosta em nenhuma cartela', () => {
    expect(comInicial().colocarCartela(cartela('B'), new Posicao(0, 2))).toBe(false);
  });

  test('recusa uma posição só na diagonal', () => {
    expect(comInicial().colocarCartela(cartela('B'), new Posicao(1, 1))).toBe(false);
  });

  test('recusa quando o lado não combina: cidade com campo', () => {
    // norte de D é cidade; o sul de B é campo
    expect(comInicial().colocarCartela(cartela('B'), new Posicao(0, -1))).toBe(false);
  });

  test('recusa quando o lado não combina: estrada com campo', () => {
    // leste de D tem estrada no meio; o oeste de B é só campo
    expect(comInicial().colocarCartela(cartela('B'), new Posicao(1, 0))).toBe(false);
  });

  test('usa a rotação atual da cartela', () => {
    const t = comInicial();
    // E na rotação 0 tem campo no sul: não encosta na cidade de D
    expect(t.colocarCartela(cartela('E'), new Posicao(0, -1))).toBe(false);
    // girada 2 vezes, a cidade de E fica no sul
    expect(t.colocarCartela(cartela('E', 2), new Posicao(0, -1))).toBe(true);
  });

  test('uma posição recusada continua livre', () => {
    const t = comInicial();
    t.colocarCartela(cartela('B'), new Posicao(0, -1)); // recusada
    expect(t.colocarCartela(cartela('C'), new Posicao(0, -1))).toBe(true);
  });

  test('precisa combinar com todas as vizinhas, não só com uma', () => {
    // D em (0,0), B em (0,1) e U deitada (estrada de leste a oeste) em (1,0).
    // A casa (1,1) encosta em U pelo norte e em B pelo oeste: os dois são campo.
    const t = comInicial();
    t.colocarCartela(cartela('B'), new Posicao(0, 1));
    t.colocarCartela(cartela('U', 1), new Posicao(1, 0));

    // E na rotação 0: cidade no norte bate no campo de U
    expect(t.colocarCartela(cartela('E'), new Posicao(1, 1))).toBe(false);
    // E girada 1 vez: cidade no leste, que está livre; norte e oeste são campo
    expect(t.colocarCartela(cartela('E', 1), new Posicao(1, 1))).toBe(true);
  });
});

describe('Tabuleiro.vizinhas', () => {
  test('devolve as cartelas encostadas nos 4 lados', () => {
    const t = comInicial();
    const b = cartela('B');
    const c = cartela('C');
    t.colocarCartela(b, new Posicao(0, 1));
    t.colocarCartela(c, new Posicao(0, -1));

    const vizinhas = t.vizinhas(new Posicao(0, 0));
    expect(vizinhas).toHaveLength(2);
    expect(vizinhas).toContain(b);
    expect(vizinhas).toContain(c);
  });

  test('ignora as diagonais', () => {
    const t = comInicial();
    expect(t.vizinhas(new Posicao(1, 1))).toEqual([]);
  });

  test('funciona também para uma posição vazia', () => {
    const t = comInicial();
    expect(t.vizinhas(new Posicao(0, 1))).toHaveLength(1);
  });

  test('tabuleiro vazio: nenhuma vizinha', () => {
    expect(new Tabuleiro().vizinhas(new Posicao(0, 0))).toEqual([]);
  });
});

describe('Tabuleiro.posicoesValidas', () => {
  test('campo nos 4 lados: só o sul da inicial', () => {
    expect(chaves(comInicial().posicoesValidas(cartela('B')))).toEqual(['0,1']);
  });

  test('cidade nos 4 lados: só o norte da inicial', () => {
    expect(chaves(comInicial().posicoesValidas(cartela('C')))).toEqual(['0,-1']);
  });

  test('considera as 4 rotações: a estrada reta cabe no leste, no oeste e no sul', () => {
    // Em pé (rotação 0), U não cabe em lugar nenhum; deitada (leste-oeste), cabe nos três.
    expect(chaves(comInicial().posicoesValidas(cartela('U')))).toEqual(['-1,0', '0,1', '1,0']);
  });

  test('não repete posições que servem em mais de uma rotação', () => {
    const posicoes = comInicial().posicoesValidas(cartela('B')); // B serve em (0,1) nas 4 rotações
    expect(posicoes).toHaveLength(1);
  });

  test('devolve a cartela na rotação em que ela estava', () => {
    const u = cartela('U', 3);
    comInicial().posicoesValidas(u);
    expect(u.getRotacao()).toBe(3);
  });

  test('não altera o tabuleiro', () => {
    const t = comInicial();
    t.posicoesValidas(cartela('B'));
    expect(t.vizinhas(new Posicao(0, 0))).toEqual([]);
  });

  test('só posições livres e encostadas', () => {
    const t = comInicial();
    t.colocarCartela(cartela('B'), new Posicao(0, 1));
    const posicoes = chaves(t.posicoesValidas(cartela('B')));
    expect(posicoes).not.toContain('0,0');
    expect(posicoes).not.toContain('0,1');
    // B ao lado de B: campo com campo em (-1,1), (1,1) e (0,2)
    expect(posicoes).toEqual(['-1,1', '0,2', '1,1']);
  });

  test('nenhuma posição: lista vazia (a cartela será descartada)', () => {
    // Só B na mesa: campo nos 4 lados não aceita a cidade de C em nenhuma rotação.
    const t = new Tabuleiro();
    t.colocarCartela(cartela('B'), new Posicao(0, 0));
    expect(t.posicoesValidas(cartela('C'))).toEqual([]);
  });
});
