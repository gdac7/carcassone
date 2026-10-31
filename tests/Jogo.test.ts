import { describe, test, expect } from 'vitest';
import { Jogo } from '../src/dominio/Jogo';
import { Jogada } from '../src/dominio/Jogada';
import { Posicao } from '../src/dominio/Posicao';
import { MonteDeCartelas } from '../src/dominio/MonteDeCartelas';
import { JogadorHumano } from '../src/dominio/JogadorHumano';
import { JogadorIA } from '../src/dominio/JogadorIA';
import { Cor } from '../src/dominio/Cor';
import { TipoTerreno } from '../src/dominio/TipoTerreno';
import { IAFacil } from '../src/servicos/IAFacil';
import { IADificil } from '../src/servicos/IADificil';
import { colocacoesPossiveis } from '../src/servicos/EstrategiaIA';
import type { ObservadorJogo } from '../src/servicos/ObservadorJogo';

// O monte é embaralhado: os testes não sabem que cartela vem. Por isso usam colocacoesPossiveis
// para achar uma jogada válida, como a IA faz.
function humanos(n: number) {
  const cores = [Cor.AZUL, Cor.VERMELHO, Cor.VERDE, Cor.AMARELO, Cor.PRETO];
  return Array.from({ length: n }, (_, i) => new JogadorHumano(`J${i + 1}`, cores[i]));
}

function jogadaValida(jogo: Jogo): Jogada {
  const cartela = jogo.getCartelaAtual()!;
  const { posicao, rotacao } = colocacoesPossiveis(cartela, jogo.getTabuleiro())[0];
  return new Jogada(posicao, rotacao);
}

// Joga até o fim chamando iniciarTurnoDaVez, como a tela faz; para se alguém não conseguir jogar.
function jogarAteOFim(jogo: Jogo): number {
  let turnos = 0;
  while (!jogo.verificarFimDeJogo() && turnos < 200) {
    const rodada = jogo.getRodadaAtual();
    jogo.iniciarTurnoDaVez();
    turnos++;
    if (!jogo.verificarFimDeJogo() && jogo.getRodadaAtual() === rodada) throw new Error('A IA não conseguiu jogar');
  }
  return turnos;
}

describe('Jogo.iniciarPartida', () => {
  test('aceita de 2 a 5 jogadores', () => {
    expect(() => new Jogo().iniciarPartida(humanos(1))).toThrow();
    expect(() => new Jogo().iniciarPartida(humanos(6))).toThrow();
    expect(() => new Jogo().iniciarPartida(humanos(2))).not.toThrow();
    expect(() => new Jogo().iniciarPartida(humanos(5))).not.toThrow();
  });

  test('coloca a cartela inicial no centro e puxa a primeira cartela', () => {
    const jogo = new Jogo();
    jogo.iniciarPartida(humanos(2));
    const mesa = jogo.getTabuleiro().getCartelasPorPosicao();
    expect(mesa).toHaveLength(1);
    expect(mesa[0].posicao.chave()).toBe('0,0');
    expect(jogo.getCartelaAtual()).not.toBeNull();
    expect(jogo.getQuantidadeNoMonte()).toBeLessThanOrEqual(70); // 71 - a puxada (e eventuais descartes)
  });

  test('a vez é de um dos jogadores, e a ordem sorteada tem os mesmos jogadores', () => {
    const jogadores = humanos(4);
    const jogo = new Jogo();
    jogo.iniciarPartida(jogadores);
    expect(jogadores).toContain(jogo.getJogadorDaVez());
    expect([...jogo.getJogadores()].sort((a, b) => a.getNome().localeCompare(b.getNome()))).toEqual(jogadores);
    expect(jogo.getJogadorDaVez()).toBe(jogo.getJogadores()[0]);
  });
});

describe('Jogo.executarJogada', () => {
  test('jogada válida: coloca a cartela, guarda no histórico e passa a vez', () => {
    const jogo = new Jogo();
    jogo.iniciarPartida(humanos(2));
    const [primeiro, segundo] = jogo.getJogadores();

    expect(jogo.executarJogada(jogadaValida(jogo))).toBe(true);

    expect(jogo.getTabuleiro().getCartelasPorPosicao()).toHaveLength(2);
    expect(jogo.getHistorico()).toHaveLength(1);
    expect(jogo.getJogadorDaVez()).toBe(segundo);
    expect(jogo.getJogadorDaVez()).not.toBe(primeiro);
  });

  test('a vez volta ao primeiro depois do último', () => {
    const jogo = new Jogo();
    jogo.iniciarPartida(humanos(2));
    const primeiro = jogo.getJogadorDaVez();
    jogo.executarJogada(jogadaValida(jogo));
    jogo.executarJogada(jogadaValida(jogo));
    expect(jogo.getJogadorDaVez()).toBe(primeiro);
  });

  test('posição inválida: devolve false e nada muda', () => {
    const jogo = new Jogo();
    jogo.iniciarPartida(humanos(2));
    const daVez = jogo.getJogadorDaVez();
    const cartela = jogo.getCartelaAtual();

    expect(jogo.executarJogada(new Jogada(new Posicao(5, 5), 0))).toBe(false);

    expect(jogo.getHistorico()).toHaveLength(0);
    expect(jogo.getJogadorDaVez()).toBe(daVez);
    expect(jogo.getCartelaAtual()).toBe(cartela);
  });

  // O seguidor vai num campo: campo nunca fica concluído, então ele não volta à reserva no mesmo turno.
  // (Numa cidade ou estrada, a cartela podia fechar a zona e o seguidor voltaria na hora.)
  test('com seguidor: sai da reserva e a zona fica ocupada', () => {
    let jogo = new Jogo();
    jogo.iniciarPartida(humanos(2));
    while (!jogo.getCartelaAtual()!.getSegmentos().some((s) => s.getTipo() === TipoTerreno.CAMPO)) {
      jogo = new Jogo();
      jogo.iniciarPartida(humanos(2));
    }
    const jogador = jogo.getJogadorDaVez()!;
    const cartela = jogo.getCartelaAtual()!;
    const { posicao, rotacao } = colocacoesPossiveis(cartela, jogo.getTabuleiro())[0];
    const segmento = cartela.getSegmentos().find((s) => s.getTipo() === TipoTerreno.CAMPO)!;

    expect(jogo.executarJogada(new Jogada(posicao, rotacao, segmento))).toBe(true);

    expect(jogador.getQuantidadeNaReserva()).toBe(6);
    expect(jogo.getTabuleiro().regiaoDe(segmento).estaOcupada()).toBe(true);
  });

  test('seguidor num segmento que não é da cartela da vez: recusa', () => {
    const jogo = new Jogo();
    jogo.iniciarPartida(humanos(2));
    const inicial = jogo.getTabuleiro().getCartelasPorPosicao()[0].cartela;
    const { posicao, rotacao } = colocacoesPossiveis(jogo.getCartelaAtual()!, jogo.getTabuleiro())[0];

    expect(jogo.executarJogada(new Jogada(posicao, rotacao, inicial.getSegmentos()[0]))).toBe(false);
    expect(jogo.getHistorico()).toHaveLength(0);
  });
});

describe('Jogo: turno pedido pela tela', () => {
  test('iniciarTurnoDaVez com humano não faz nada (a tela espera o clique)', () => {
    const jogo = new Jogo();
    jogo.iniciarPartida(humanos(2));
    jogo.iniciarTurnoDaVez();
    expect(jogo.getHistorico()).toHaveLength(0);
  });

  test('iniciarTurnoDaVez com IA joga um turno só, sem emendar o turno seguinte', () => {
    const jogo = new Jogo();
    jogo.iniciarPartida([new JogadorIA('A', Cor.AZUL, new IAFacil()), new JogadorIA('B', Cor.VERDE, new IAFacil())]);
    jogo.iniciarTurnoDaVez();
    expect(jogo.getHistorico()).toHaveLength(1);
  });
});

describe('Jogo: observadores', () => {
  test('são avisados ao iniciar e a cada jogada', () => {
    let avisos = 0;
    const observador: ObservadorJogo = { aoAtualizar: () => avisos++ };
    const jogo = new Jogo();
    jogo.adicionarObservador(observador);

    jogo.iniciarPartida(humanos(2));
    const depoisDeIniciar = avisos;
    expect(depoisDeIniciar).toBeGreaterThan(0);

    jogo.executarJogada(jogadaValida(jogo));
    expect(avisos).toBeGreaterThan(depoisDeIniciar);
  });

  test('recebem o próprio jogo', () => {
    let recebido: Jogo | null = null;
    const jogo = new Jogo();
    jogo.adicionarObservador({ aoAtualizar: (j) => (recebido = j) });
    jogo.iniciarPartida(humanos(2));
    expect(recebido).toBe(jogo);
  });
});

describe('Jogo: partida inteira entre IAs', () => {
  test.each([
    ['fáceis', () => new IAFacil()],
    ['difíceis', () => new IADificil()],
  ])('IAs %s jogam até o monte acabar, sem erro', (_nome, estrategia) => {
    const jogadores = [Cor.AZUL, Cor.VERMELHO, Cor.VERDE].map((cor, i) => new JogadorIA(`IA ${i}`, cor, estrategia()));
    const jogo = new Jogo();
    jogo.iniciarPartida(jogadores);

    const turnos = jogarAteOFim(jogo);

    expect(jogo.verificarFimDeJogo()).toBe(true);
    expect(jogo.getQuantidadeNoMonte()).toBe(0);
    expect(turnos).toBe(jogo.getHistorico().length);
    expect(jogo.getHistorico().length).toBeGreaterThan(60); // 71 menos os raros descartes
  });

  test('no fim, todos os seguidores voltaram para a reserva (7 cada)', () => {
    const jogadores = [new JogadorIA('A', Cor.AZUL, new IADificil()), new JogadorIA('B', Cor.VERMELHO, new IAFacil())];
    const jogo = new Jogo();
    jogo.iniciarPartida(jogadores);
    jogarAteOFim(jogo);
    for (const j of jogadores) expect(j.getQuantidadeNaReserva()).toBe(7);
  });

  test('a última notificação já é com a partida encerrada', () => {
    let encerradaNoUltimoAviso = false;
    const jogo = new Jogo();
    jogo.adicionarObservador({ aoAtualizar: (j) => (encerradaNoUltimoAviso = j.verificarFimDeJogo()) });
    jogo.iniciarPartida([new JogadorIA('A', Cor.AZUL, new IAFacil()), new JogadorIA('B', Cor.VERDE, new IAFacil())]);
    jogarAteOFim(jogo);
    expect(encerradaNoUltimoAviso).toBe(true);
  });

  test('alguém pontua numa partida inteira', () => {
    const jogadores = [new JogadorIA('A', Cor.AZUL, new IADificil()), new JogadorIA('B', Cor.VERMELHO, new IADificil())];
    const jogo = new Jogo();
    jogo.iniciarPartida(jogadores);
    jogarAteOFim(jogo);
    expect(jogadores.some((j) => j.getPontuacao() > 0)).toBe(true);
  });
});

describe('Jogo: dados para retomar a partida', () => {
  test('guarda a data e a hora de início', () => {
    const antes = Date.now();
    const jogo = new Jogo();
    jogo.iniciarPartida(humanos(2));
    expect(jogo.getInicio().getTime()).toBeGreaterThanOrEqual(antes);
    expect(jogo.getInicio().getTime()).toBeLessThanOrEqual(Date.now());
  });

  test('guarda a ordem do monte logo depois de embaralhar, e ela não muda durante a partida', () => {
    const jogo = new Jogo();
    jogo.iniciarPartida(humanos(2));
    const ordem = [...jogo.getOrdemDoMonte()];
    expect(ordem).toHaveLength(71);
    expect(ordem.at(-1)).toBe(jogo.getCartelaAtual()!.getId()); // com só a cartela inicial na mesa, nenhuma é descartada

    jogo.executarJogada(jogadaValida(jogo));
    jogo.executarJogada(jogadaValida(jogo));
    expect(jogo.getOrdemDoMonte()).toEqual(ordem);
  });
});

describe('Jogo.retomarPartida', () => {
  test('começa igual à partida original: mesma ordem dos jogadores, mesmo monte, mesma data', () => {
    const original = new Jogo();
    original.iniciarPartida(humanos(3));

    const jogadores = original.getJogadores().map((j) => new JogadorHumano(j.getNome(), j.getCor()));
    const retomado = new Jogo();
    retomado.retomarPartida(jogadores, original.getOrdemDoMonte(), original.getInicio());

    expect(retomado.getJogadores()).toEqual(jogadores);              // não sorteia de novo
    expect(retomado.getJogadorDaVez()).toBe(jogadores[0]);
    expect(retomado.getCartelaAtual()!.getId()).toBe(original.getCartelaAtual()!.getId());
    expect(retomado.getQuantidadeNoMonte()).toBe(original.getQuantidadeNoMonte());
    expect(retomado.getOrdemDoMonte()).toEqual(original.getOrdemDoMonte());
    expect(retomado.getInicio().getTime()).toBe(original.getInicio().getTime());
    expect(retomado.getTabuleiro().getCartelasPorPosicao()).toHaveLength(1);
  });

  test('repetindo as mesmas jogadas, as duas partidas seguem iguais', () => {
    const original = new Jogo();
    original.iniciarPartida(humanos(2));
    const jogadores = original.getJogadores().map((j) => new JogadorHumano(j.getNome(), j.getCor()));
    const retomado = new Jogo();
    retomado.retomarPartida(jogadores, original.getOrdemDoMonte(), original.getInicio());

    for (let i = 0; i < 10; i++) {
      const j = jogadaValida(original);
      expect(retomado.executarJogada(new Jogada(j.getPosicao(), j.getRotacao()))).toBe(original.executarJogada(j));
      expect(retomado.getCartelaAtual()?.getId()).toBe(original.getCartelaAtual()?.getId());
      expect(retomado.getJogadorDaVez()?.getNome()).toBe(original.getJogadorDaVez()?.getNome());
    }
  });

  test('aceita de 2 a 5 jogadores, como iniciarPartida', () => {
    const ordem = new MonteDeCartelas();
    ordem.criarCartelasPadrao();
    expect(() => new Jogo().retomarPartida(humanos(1), ordem.getOrdem(), new Date())).toThrow(/2 a 5/);
    expect(() => new Jogo().retomarPartida(humanos(6), ordem.getOrdem(), new Date())).toThrow(/2 a 5/);
  });
});
