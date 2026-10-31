import { describe, test, expect } from 'vitest';
import { IAFacil } from '../src/servicos/IAFacil';
import { IADificil } from '../src/servicos/IADificil';
import type { EstrategiaIA } from '../src/servicos/EstrategiaIA';
import { Tabuleiro } from '../src/dominio/Tabuleiro';
import { Cartela } from '../src/dominio/Cartela';
import { Posicao } from '../src/dominio/Posicao';
import { JogadorHumano } from '../src/dominio/JogadorHumano';
import { Cor } from '../src/dominio/Cor';
import { TipoTerreno } from '../src/dominio/TipoTerreno';
import { DEFINICOES_CARTELAS } from '../src/dominio/definicoesCartelas';

function cartela(id: string): Cartela {
  return new Cartela(id, DEFINICOES_CARTELAS.find((d) => d.id === id)!.segmentos);
}

function comInicial(): Tabuleiro {
  const t = new Tabuleiro();
  t.colocarCartela(cartela('D'), new Posicao(0, 0));
  return t;
}

// Os 24 tipos de cartela que cabem ao lado da inicial (C, a cidade inteira, também cabe no norte).
const TIPOS = DEFINICOES_CARTELAS.map((d) => d.id);

describe.each([
  ['IAFacil', () => new IAFacil()],
  ['IADificil', () => new IADificil()],
] as [string, () => EstrategiaIA][])('%s', (_nome, criar) => {
  test.each(TIPOS)('cartela %s: escolhe uma colocação válida', (id) => {
    const t = comInicial();
    const c = cartela(id);
    if (t.posicoesValidas(c).length === 0) return; // a cartela seria descartada

    const jogada = criar().escolherJogada(c, t, new JogadorHumano('IA', Cor.AZUL));

    while (c.getRotacao() !== jogada.getRotacao()) c.girar();
    expect(t.podeColocar(c, jogada.getPosicao())).toBe(true);
  });

  test('devolve a cartela na rotação em que ela estava', () => {
    const c = cartela('V');
    c.girar();
    criar().escolherJogada(c, comInicial(), new JogadorHumano('IA', Cor.AZUL));
    expect(c.getRotacao()).toBe(1);
  });

  test('o seguidor, quando há, é da cartela e numa zona livre', () => {
    const t = comInicial();
    t.regiaoDe(t.getCartelasPorPosicao()[0].cartela.getSegmentos()[1]).adicionarMeeple(
      new JogadorHumano('Outro', Cor.VERDE).retirarMeeple()!); // ocupa a estrada da inicial
    for (const id of TIPOS) {
      const c = cartela(id);
      if (t.posicoesValidas(c).length === 0) continue;
      const jogada = criar().escolherJogada(c, t, new JogadorHumano('IA', Cor.AZUL));
      const segmento = jogada.getSegmentoDoMeeple();
      if (!segmento) continue;
      while (c.getRotacao() !== jogada.getRotacao()) c.girar();
      expect(c.getSegmentos()).toContain(segmento);
      expect(t.regioesQueSeLigam(segmento, jogada.getPosicao()).every((r) => !r.estaOcupada())).toBe(true);
    }
  });

  test('sem seguidores na reserva, não tenta colocar', () => {
    const ia = new JogadorHumano('IA', Cor.AZUL);
    while (ia.retirarMeeple()) { /* esvazia a reserva */ }
    const jogada = criar().escolherJogada(cartela('E'), comInicial(), ia);
    expect(jogada.temMeeple()).toBe(false);
  });

  test('decide em menos de 2 segundos', () => {
    const inicio = performance.now();
    criar().escolherJogada(cartela('X'), comInicial(), new JogadorHumano('IA', Cor.AZUL));
    expect(performance.now() - inicio).toBeLessThan(2000);
  });
});

describe('IADificil: preferências', () => {
  test('com uma cidade à mão e a reserva cheia, põe um cavaleiro', () => {
    const jogada = new IADificil().escolherJogada(cartela('E'), comInicial(), new JogadorHumano('IA', Cor.AZUL));
    expect(jogada.getSegmentoDoMeeple()?.getTipo()).toBe(TipoTerreno.CIDADE);
  });
});
