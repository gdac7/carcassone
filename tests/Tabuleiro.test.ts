import { describe, test, expect } from 'vitest';
import { Tabuleiro } from '../src/dominio/Tabuleiro';
import { Cartela } from '../src/dominio/Cartela';
import { Posicao } from '../src/dominio/Posicao';
import { DEFINICOES_CARTELAS } from '../src/dominio/definicoesCartelas';
import { RegiaoEstrada } from '../src/dominio/RegiaoEstrada';
import { RegiaoCidade } from '../src/dominio/RegiaoCidade';
import { JogadorHumano } from '../src/dominio/JogadorHumano';
import { Cor } from '../src/dominio/Cor';
import { PontoBorda } from '../src/dominio/PontoBorda';

// Cartelas reais da tabela, na rotação 0:
//   D: cidade no norte, estrada de leste a oeste, campo no sul (a inicial)
//   B: mosteiro cercado de campo (campo nos 4 lados)
//   C: cidade nos 4 lados
//   E: cidade no norte, campo nos outros lados
//   U: estrada reta de norte a sul
//   V: estrada em curva de oeste a sul
//   W: cruzamento com 3 estradas separadas (leste, sul, oeste)
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

describe('Tabuleiro.podeColocar', () => {
  test('responde pela rotação atual, sem colocar a cartela', () => {
    const t = comInicial();
    const e = cartela('E'); // cidade no norte: não encosta na cidade de D pelo sul
    expect(t.podeColocar(e, new Posicao(0, -1))).toBe(false);
    e.girar();
    e.girar(); // cidade no sul
    expect(t.podeColocar(e, new Posicao(0, -1))).toBe(true);
    expect(t.vizinhas(new Posicao(0, 0))).toEqual([]); // nada foi colocado
  });

  test('casa ocupada, isolada ou só na diagonal: não pode', () => {
    const t = comInicial();
    expect(t.podeColocar(cartela('C'), new Posicao(0, 0))).toBe(false);
    expect(t.podeColocar(cartela('B'), new Posicao(0, 2))).toBe(false);
    expect(t.podeColocar(cartela('B'), new Posicao(1, 1))).toBe(false);
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

// ===== 7b: regiões =====
// Os segmentos são buscados pelo ponto de borda, já considerando a rotação da cartela.

describe('Tabuleiro: regiões criadas ao colocar', () => {
  test('cada estrada e cidade da cartela ganha uma região do tipo certo', () => {
    const t = new Tabuleiro();
    const d = cartela('D');
    t.colocarCartela(d, new Posicao(0, 0));
    expect(t.regiaoDe(d.segmentoNoPonto(PontoBorda.N))).toBeInstanceOf(RegiaoCidade);
    expect(t.regiaoDe(d.segmentoNoPonto(PontoBorda.L))).toBeInstanceOf(RegiaoEstrada);
  });

  test('a estrada que atravessa a cartela é um segmento só: leste e oeste na mesma região', () => {
    const t = new Tabuleiro();
    const d = cartela('D');
    t.colocarCartela(d, new Posicao(0, 0));
    expect(t.regiaoDe(d.segmentoNoPonto(PontoBorda.L))).toBe(t.regiaoDe(d.segmentoNoPonto(PontoBorda.O)));
  });

  test('a cartela nova entra na região da vizinha', () => {
    const t = new Tabuleiro();
    const d = cartela('D');
    const w = cartela('W');
    t.colocarCartela(d, new Posicao(0, 0));
    expect(t.colocarCartela(w, new Posicao(1, 0))).toBe(true);
    expect(t.regiaoDe(w.segmentoNoPonto(PontoBorda.O))).toBe(t.regiaoDe(d.segmentoNoPonto(PontoBorda.L)));
  });

  test('segmentos separados da mesma cartela ficam em regiões diferentes', () => {
    const t = new Tabuleiro();
    const w = cartela('W');
    t.colocarCartela(w, new Posicao(0, 0));
    const leste = t.regiaoDe(w.segmentoNoPonto(PontoBorda.L));
    expect(t.regiaoDe(w.segmentoNoPonto(PontoBorda.S))).not.toBe(leste);
    expect(t.regiaoDe(w.segmentoNoPonto(PontoBorda.O))).not.toBe(leste);
  });
});

describe('Tabuleiro: regiões concluídas', () => {
  test('cidade de 2 cartelas fecha', () => {
    const t = new Tabuleiro();
    const d = cartela('D');
    const e = cartela('E', 2); // cidade no sul
    t.colocarCartela(d, new Posicao(0, 0));
    expect(t.colocarCartela(e, new Posicao(0, -1))).toBe(true);

    const cidade = t.regiaoDe(d.segmentoNoPonto(PontoBorda.N));
    expect(t.regiaoDe(e.segmentoNoPonto(PontoBorda.S))).toBe(cidade);
    expect(cidade.estaConcluida()).toBe(true);
    expect(cidade.numCartelasDistintas()).toBe(2);
  });

  test('estrada entre dois cruzamentos fecha e vale 3', () => {
    const t = new Tabuleiro();
    const d = cartela('D');
    t.colocarCartela(d, new Posicao(0, 0));
    expect(t.colocarCartela(cartela('W'), new Posicao(1, 0))).toBe(true);

    const estrada = t.regiaoDe(d.segmentoNoPonto(PontoBorda.L));
    expect(estrada.estaConcluida()).toBe(false); // a ponta oeste de D continua aberta

    expect(t.colocarCartela(cartela('W'), new Posicao(-1, 0))).toBe(true);
    expect(estrada.estaConcluida()).toBe(true);
    expect(estrada.calcularPontos(false)).toBe(3);
  });

  test('regioesConcluidas devolve só as concluídas', () => {
    const t = new Tabuleiro();
    const d = cartela('D');
    t.colocarCartela(d, new Posicao(0, 0));
    expect(t.regioesConcluidas()).toEqual([]);

    t.colocarCartela(cartela('W'), new Posicao(1, 0));
    t.colocarCartela(cartela('W'), new Posicao(-1, 0));
    // As outras estradas dos cruzamentos e a cidade de D continuam abertas.
    expect(t.regioesConcluidas()).toEqual([t.regiaoDe(d.segmentoNoPonto(PontoBorda.L))]);
  });

  test('laço: 4 curvas fecham uma estrada sem pontas, sem fundir a região com ela mesma', () => {
    // ┌─┐   (0,0) curva sul-leste    (1,0) curva oeste-sul
    // └─┘   (0,1) curva leste-norte  (1,1) curva norte-oeste
    const t = new Tabuleiro();
    const curvas = [cartela('V', 3), cartela('V', 0), cartela('V', 1), cartela('V', 2)];
    const posicoes = [new Posicao(0, 0), new Posicao(1, 0), new Posicao(1, 1), new Posicao(0, 1)];
    for (let i = 0; i < 3; i++) {
      expect(t.colocarCartela(curvas[i], posicoes[i])).toBe(true);
    }
    const estrada = t.regiaoDe(curvas[0].segmentoNoPonto(PontoBorda.S));
    expect(estrada.estaConcluida()).toBe(false);

    // A última curva encosta na MESMA região pelos dois lados.
    expect(t.colocarCartela(curvas[3], posicoes[3])).toBe(true);
    expect(t.regiaoDe(curvas[3].segmentoNoPonto(PontoBorda.N))).toBe(estrada);
    expect(estrada.estaConcluida()).toBe(true);
    expect(estrada.numCartelasDistintas()).toBe(4);
  });
});

describe('Tabuleiro: fusão de regiões', () => {
  test('uma cartela que liga duas estradas funde as regiões, com os meeples de ambas', () => {
    const ana = new JogadorHumano('Ana', Cor.AZUL);
    const bia = new JogadorHumano('Bia', Cor.VERMELHO);
    const t = new Tabuleiro();

    // Estrada 1: a de D, em (0,0), com um ladrão da Ana.
    const d = cartela('D');
    t.colocarCartela(d, new Posicao(0, 0));
    t.regiaoDe(d.segmentoNoPonto(PontoBorda.L)).adicionarMeeple(ana.retirarMeeple()!);

    // Estrada 2: U deitada logo abaixo, em (0,1), separada da primeira, com um ladrão da Bia.
    const u = cartela('U', 1);
    expect(t.colocarCartela(u, new Posicao(0, 1))).toBe(true);
    t.regiaoDe(u.segmentoNoPonto(PontoBorda.L)).adicionarMeeple(bia.retirarMeeple()!);
    expect(t.regiaoDe(u.segmentoNoPonto(PontoBorda.L))).not.toBe(t.regiaoDe(d.segmentoNoPonto(PontoBorda.L)));

    // Duas curvas à direita ligam a ponta leste de D à ponta leste de U.
    expect(t.colocarCartela(cartela('V', 0), new Posicao(1, 0))).toBe(true); // oeste-sul
    expect(t.colocarCartela(cartela('V', 1), new Posicao(1, 1))).toBe(true); // norte-oeste

    const estrada = t.regiaoDe(d.segmentoNoPonto(PontoBorda.L));
    expect(t.regiaoDe(u.segmentoNoPonto(PontoBorda.L))).toBe(estrada);
    expect(estrada.jogadoresComMaioria()).toHaveLength(2);
    expect(estrada.estaConcluida()).toBe(false); // as pontas oeste de D e de U continuam abertas
  });

  test('a região absorvida sai do tabuleiro', () => {
    const ana = new JogadorHumano('Ana', Cor.AZUL);
    const bia = new JogadorHumano('Bia', Cor.VERMELHO);
    const t = new Tabuleiro();
    const d = cartela('D');
    const u = cartela('U', 1);
    t.colocarCartela(d, new Posicao(0, 0));
    t.colocarCartela(u, new Posicao(0, 1));
    t.regiaoDe(d.segmentoNoPonto(PontoBorda.L)).adicionarMeeple(ana.retirarMeeple()!);
    t.regiaoDe(u.segmentoNoPonto(PontoBorda.L)).adicionarMeeple(bia.retirarMeeple()!);
    expect(t.regioesComMeeples()).toHaveLength(2);

    t.colocarCartela(cartela('V', 0), new Posicao(1, 0));
    t.colocarCartela(cartela('V', 1), new Posicao(1, 1));

    expect(t.regioesComMeeples()).toHaveLength(1);
  });
});

describe('Tabuleiro.regioesComMeeples', () => {
  test('sem meeples: lista vazia', () => {
    expect(comInicial().regioesComMeeples()).toEqual([]);
  });

  test('devolve as regiões ocupadas', () => {
    const t = new Tabuleiro();
    const d = cartela('D');
    t.colocarCartela(d, new Posicao(0, 0));
    const cidade = t.regiaoDe(d.segmentoNoPonto(PontoBorda.N));
    cidade.adicionarMeeple(new JogadorHumano('Ana', Cor.AZUL).retirarMeeple()!);
    expect(t.regioesComMeeples()).toEqual([cidade]);
  });
});
