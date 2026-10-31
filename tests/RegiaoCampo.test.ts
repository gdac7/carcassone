import { describe, test, expect } from 'vitest';
import { Regiao } from '../src/dominio/Regiao';
import { RegiaoCampo } from '../src/dominio/RegiaoCampo';
import { Tabuleiro } from '../src/dominio/Tabuleiro';
import { Cartela } from '../src/dominio/Cartela';
import { Posicao } from '../src/dominio/Posicao';
import { JogadorHumano } from '../src/dominio/JogadorHumano';
import { Cor } from '../src/dominio/Cor';
import { PontoBorda } from '../src/dominio/PontoBorda';
import { DEFINICOES_CARTELAS } from '../src/dominio/definicoesCartelas';

// D: cidade no norte, estrada de leste a oeste. Entre a cidade e a estrada há um campo
//    (pontos L_N e O_N) que toca a cidade; abaixo da estrada, outro campo que não toca.
// E: cidade num lado, campo nos outros três. Girada 2 vezes, a cidade fica no sul.
// B: mosteiro cercado de campo.  V: curva de estrada de oeste a sul.
function cartela(id: string, giros = 0): Cartela {
  const def = DEFINICOES_CARTELAS.find((d) => d.id === id)!;
  const c = new Cartela(id, def.segmentos);
  for (let i = 0; i < giros; i++) c.girar();
  return c;
}

// D em (0,0); o campo entre a cidade e a estrada de D.
function comD(): { tabuleiro: Tabuleiro; d: Cartela; campo: Regiao } {
  const tabuleiro = new Tabuleiro();
  const d = cartela('D');
  tabuleiro.colocarCartela(d, new Posicao(0, 0));
  return { tabuleiro, d, campo: tabuleiro.regiaoDe(d.segmentoNoPonto(PontoBorda.L_N)) };
}

describe('RegiaoCampo', () => {
  test('o tabuleiro cria uma RegiaoCampo para os segmentos de campo', () => {
    const { campo } = comD();
    expect(campo).toBeInstanceOf(RegiaoCampo);
    expect(campo).toBeInstanceOf(Regiao);
  });

  test('a estrada separa os campos: acima e abaixo dela são regiões diferentes', () => {
    const { tabuleiro, d, campo } = comD();
    expect(tabuleiro.regiaoDe(d.segmentoNoPonto(PontoBorda.S))).not.toBe(campo);
  });

  test('campos de cartelas vizinhas se juntam', () => {
    const { tabuleiro, d } = comD();
    const b = cartela('B');
    tabuleiro.colocarCartela(b, new Posicao(0, 1)); // campo do sul de D com o campo de B
    expect(tabuleiro.regiaoDe(b.segmentoNoPonto(PontoBorda.N))).toBe(tabuleiro.regiaoDe(d.segmentoNoPonto(PontoBorda.S)));
  });
});

describe('RegiaoCampo.estaConcluida', () => {
  test('nunca está concluído', () => {
    const { campo } = comD();
    expect(campo.estaConcluida()).toBe(false);
  });

  test('não aparece em regioesConcluidas', () => {
    const { tabuleiro, campo } = comD();
    expect(tabuleiro.regioesConcluidas()).not.toContain(campo);
  });
});

describe('RegiaoCampo.calcularPontos', () => {
  test('cidade ainda aberta não conta', () => {
    expect(comD().campo.calcularPontos(true)).toBe(0);
  });

  test('3 pontos por cidade concluída que o campo toca', () => {
    const { tabuleiro, campo } = comD();
    tabuleiro.colocarCartela(cartela('E', 2), new Posicao(0, -1)); // fecha a cidade de D
    expect(campo.calcularPontos(true)).toBe(3);
  });

  test('o campo do outro lado da estrada não toca a cidade', () => {
    const { tabuleiro, d } = comD();
    tabuleiro.colocarCartela(cartela('E', 2), new Posicao(0, -1));
    expect(tabuleiro.regiaoDe(d.segmentoNoPonto(PontoBorda.S)).calcularPontos(true)).toBe(0);
  });

  test('a mesma cidade, tocada por dois segmentos do campo, conta uma vez só', () => {
    // A cidade de D (0,0) fechada por E (0,-1). O campo de D (entre cidade e estrada) e o campo
    // de E (em volta da cidade) se juntam pela direita, através de B (1,-1) e da curva V (1,0).
    // Os dois segmentos tocam a mesma cidade: 3 pontos, não 6.
    const { tabuleiro, d } = comD();
    const e = cartela('E', 2);
    expect(tabuleiro.colocarCartela(e, new Posicao(0, -1))).toBe(true);
    expect(tabuleiro.colocarCartela(cartela('B'), new Posicao(1, -1))).toBe(true);
    expect(tabuleiro.colocarCartela(cartela('V'), new Posicao(1, 0))).toBe(true);

    // Busca a região depois das colocações: na fusão, a região antiga de D pode ter sido absorvida.
    const campo = tabuleiro.regiaoDe(d.segmentoNoPonto(PontoBorda.L_N));
    expect(tabuleiro.regiaoDe(e.segmentoNoPonto(PontoBorda.N))).toBe(campo);
    expect(campo.calcularPontos(true)).toBe(3);
  });
});

describe('RegiaoCampo.pontuar', () => {
  test('durante a partida, o fazendeiro fica no campo', () => {
    const ana = new JogadorHumano('Ana', Cor.AZUL);
    const { tabuleiro, campo } = comD();
    tabuleiro.colocarCartela(cartela('E', 2), new Posicao(0, -1));
    campo.adicionarMeeple(ana.retirarMeeple()!);

    campo.pontuar(false);

    expect(ana.getPontuacao()).toBe(0);
    expect(campo.estaOcupada()).toBe(true);
  });

  test('no fim do jogo, o fazendeiro pontua e volta para a reserva', () => {
    const ana = new JogadorHumano('Ana', Cor.AZUL);
    const { tabuleiro, campo } = comD();
    tabuleiro.colocarCartela(cartela('E', 2), new Posicao(0, -1));
    campo.adicionarMeeple(ana.retirarMeeple()!);

    campo.pontuar(true);

    expect(ana.getPontuacao()).toBe(3);
    expect(ana.getQuantidadeNaReserva()).toBe(7);
  });
});
