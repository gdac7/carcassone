import { describe, test, expect } from 'vitest';
import { Jogo } from '../src/dominio/Jogo';
import { Jogada } from '../src/dominio/Jogada';
import { Jogador } from '../src/dominio/Jogador';
import { JogadorHumano } from '../src/dominio/JogadorHumano';
import { JogadorIA } from '../src/dominio/JogadorIA';
import { Cor } from '../src/dominio/Cor';
import { IAFacil } from '../src/servicos/IAFacil';
import { IADificil } from '../src/servicos/IADificil';
import { colocacoesPossiveis } from '../src/servicos/EstrategiaIA';
import { SerializadorPartida } from '../src/servicos/SerializadorPartida';

const serializador = new SerializadorPartida();

// Tudo o que precisa sair igual depois de salvar e carregar, em forma fácil de comparar.
function retrato(jogo: Jogo) {
  const tabuleiro = jogo.getTabuleiro();
  return {
    rodada: jogo.getRodadaAtual(),
    vez: jogo.getJogadorDaVez()?.getNome() ?? null,
    cartelaAtual: jogo.getCartelaAtual()?.getId() ?? null,
    noMonte: jogo.getQuantidadeNoMonte(),
    jogadas: jogo.getHistorico().length,
    fim: jogo.verificarFimDeJogo(),
    jogadores: jogo.getJogadores().map((j) => `${j.getNome()} ${j.getCor()} ${j.getPontuacao()}pts ${j.getQuantidadeNaReserva()}na reserva`),
    mesa: tabuleiro.getCartelasPorPosicao()
      .map(({ posicao, cartela }) => `${posicao.chave()} ${cartela.getId()} r${cartela.getRotacao()}`)
      .sort(),
    regioesOcupadas: tabuleiro.regioesComMeeples()
      .map((r) => `${r.constructor.name} ${r.numCartelasDistintas()} cartelas, maioria: ${r.jogadoresComMaioria().map((j) => j.getNome()).join('+')}`)
      .sort(),
  };
}

// Jogada válida para o humano; a cada duas, tenta pôr um seguidor no primeiro segmento livre.
function jogadaDoHumano(jogo: Jogo, comSeguidor: boolean): Jogada {
  const cartela = jogo.getCartelaAtual()!;
  const tabuleiro = jogo.getTabuleiro();
  const { posicao, rotacao } = colocacoesPossiveis(cartela, tabuleiro)[0];
  if (!comSeguidor || jogo.getJogadorDaVez()!.getQuantidadeNaReserva() === 0) return new Jogada(posicao, rotacao);

  const rotacaoOriginal = cartela.getRotacao();
  while (cartela.getRotacao() !== rotacao) cartela.girar();
  const livre = cartela.getSegmentos().find((s) => tabuleiro.regioesQueSeLigam(s, posicao).every((r) => !r.estaOcupada()));
  while (cartela.getRotacao() !== rotacaoOriginal) cartela.girar();
  return new Jogada(posicao, rotacao, livre ?? null);
}

// Joga n turnos (ou até o fim): o humano pela função acima, a IA sozinha.
function jogarTurnos(jogo: Jogo, n: number): void {
  for (let i = 0; i < n && !jogo.verificarFimDeJogo(); i++) {
    if (jogo.getJogadorDaVez() instanceof JogadorHumano) {
      expect(jogo.executarJogada(jogadaDoHumano(jogo, i % 2 === 0))).toBe(true);
    } else {
      jogo.iniciarTurnoDaVez();
    }
  }
}

function partida(jogadores: Jogador[]): Jogo {
  const jogo = new Jogo();
  jogo.iniciarPartida(jogadores);
  return jogo;
}

const misturados = () => [
  new JogadorHumano('Ana', Cor.AZUL),
  new JogadorIA('Bia', Cor.VERDE, new IAFacil()),
  new JogadorIA('Caio', Cor.PRETO, new IADificil()),
];

describe('SerializadorPartida: salvar e carregar', () => {
  test('no meio da partida, o jogo carregado fica igual ao original', () => {
    const original = partida(misturados());
    jogarTurnos(original, 20);

    const carregado = serializador.deTexto(serializador.paraTexto(original));

    expect(retrato(carregado)).toEqual(retrato(original));
    expect(carregado.getInicio().getTime()).toBe(original.getInicio().getTime());
    expect(carregado.getOrdemDoMonte()).toEqual(original.getOrdemDoMonte());
  });

  test('logo no começo, sem nenhuma jogada, também funciona', () => {
    const original = partida(misturados());
    expect(retrato(serializador.deTexto(serializador.paraTexto(original)))).toEqual(retrato(original));
  });

  test('uma partida terminada carrega terminada, com a pontuação final', () => {
    const original = partida([
      new JogadorIA('A', Cor.AZUL, new IAFacil()),
      new JogadorIA('B', Cor.VERMELHO, new IADificil()),
    ]);
    jogarTurnos(original, 200);
    expect(original.verificarFimDeJogo()).toBe(true);

    const carregado = serializador.deTexto(serializador.paraTexto(original));
    expect(carregado.verificarFimDeJogo()).toBe(true);
    expect(retrato(carregado)).toEqual(retrato(original));
  });

  test('recria cada jogador com o tipo certo: humano, IA fácil ou IA difícil', () => {
    const carregado = serializador.deTexto(serializador.paraTexto(partida(misturados())));
    for (const j of carregado.getJogadores()) {
      if (j.getNome() === 'Ana') expect(j).toBeInstanceOf(JogadorHumano);
      if (j.getNome() === 'Bia') expect((j as JogadorIA).getEstrategia()).toBeInstanceOf(IAFacil);
      if (j.getNome() === 'Caio') expect((j as JogadorIA).getEstrategia()).toBeInstanceOf(IADificil);
    }
  });

  test('depois de carregar, dá para continuar jogando e o jogo segue igual ao original', () => {
    const original = partida([new JogadorHumano('Ana', Cor.AZUL), new JogadorHumano('Bruno', Cor.VERMELHO)]);
    jogarTurnos(original, 15);
    const carregado = serializador.deTexto(serializador.paraTexto(original));

    jogarTurnos(original, 10);
    jogarTurnos(carregado, 10);
    expect(retrato(carregado)).toEqual(retrato(original));
  });

  test('salvar não muda a partida original', () => {
    const original = partida(misturados());
    jogarTurnos(original, 10);
    const antes = retrato(original);
    serializador.paraTexto(original);
    expect(retrato(original)).toEqual(antes);
  });
});

describe('SerializadorPartida: formato do texto', () => {
  test('é JSON com início, rodada, jogadores, ordem do monte e jogadas', () => {
    const jogo = partida(misturados());
    jogarTurnos(jogo, 20);
    const dados = JSON.parse(serializador.paraTexto(jogo));

    expect(new Date(dados.inicio).getTime()).toBe(jogo.getInicio().getTime());
    expect(dados.rodada).toBe(jogo.getRodadaAtual());
    expect(dados.ordemDoMonte).toEqual(jogo.getOrdemDoMonte());
    expect(dados.jogadores.map((j: { tipo: string }) => j.tipo).sort()).toEqual(['dificil', 'facil', 'humano']);
    expect(dados.jogadas).toHaveLength(jogo.getHistorico().length);
  });

  test('o seguidor de cada jogada é guardado como o índice do segmento na cartela, ou null', () => {
    const jogo = partida(misturados());
    jogarTurnos(jogo, 20);
    const dados = JSON.parse(serializador.paraTexto(jogo));

    jogo.getHistorico().forEach((jogada, i) => {
      const salva = dados.jogadas[i];
      expect(salva.x).toBe(jogada.getPosicao().getX());
      expect(salva.y).toBe(jogada.getPosicao().getY());
      expect(salva.rotacao).toBe(jogada.getRotacao());
      const segmento = jogada.getSegmentoDoMeeple();
      expect(salva.segmento).toBe(segmento ? segmento.getCartela().getSegmentos().indexOf(segmento) : null);
    });
    expect(dados.jogadas.some((j: { segmento: number | null }) => j.segmento !== null)).toBe(true);
  });
});

describe('SerializadorPartida.resumir', () => {
  test('lê do texto só o que a lista de partidas salvas mostra', () => {
    const jogo = partida(misturados());
    jogarTurnos(jogo, 5);
    const resumo = serializador.resumir(serializador.paraTexto(jogo));

    expect(resumo.id).toBe(jogo.getInicio().toISOString());
    expect(resumo.inicio.getTime()).toBe(jogo.getInicio().getTime());
    expect(resumo.jogadores).toEqual(jogo.getJogadores().map((j) => j.getNome()));
    expect(resumo.rodada).toBe(jogo.getRodadaAtual());
  });
});
