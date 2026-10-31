import { describe, test, expect } from 'vitest';
import { Regiao } from '../src/dominio/Regiao';
import { RegiaoEstrada } from '../src/dominio/RegiaoEstrada';
import { Cartela } from '../src/dominio/Cartela';
import { Segmento } from '../src/dominio/Segmento';
import { JogadorHumano } from '../src/dominio/JogadorHumano';
import { Cor } from '../src/dominio/Cor';
import { PontoBorda } from '../src/dominio/PontoBorda';
import { TipoTerreno } from '../src/dominio/TipoTerreno';

// Regiao é abstrata: os testes do comportamento comum usam RegiaoEstrada.
// Sem Tabuleiro ainda, o teste faz o papel dele: chama adicionarSegmento e conectarPontos à mão.

// Cada chamada cria uma cartela nova com um único segmento de estrada.
function estrada(pontos: PontoBorda[]): Segmento {
  return new Cartela('T', [{ tipo: TipoTerreno.ESTRADA, pontos }]).getSegmentos()[0];
}

// Estrada de 3 cartelas entre duas cidades: [S] + [N, S] + [N], com 2 conexões.
function estradaConcluidaDe3(): RegiaoEstrada {
  const r = new RegiaoEstrada();
  r.adicionarSegmento(estrada([PontoBorda.S]));
  r.adicionarSegmento(estrada([PontoBorda.N, PontoBorda.S]));
  r.conectarPontos(1);
  r.adicionarSegmento(estrada([PontoBorda.N]));
  r.conectarPontos(1);
  return r;
}

describe('Regiao: herança', () => {
  test('RegiaoEstrada é uma Regiao', () => {
    expect(new RegiaoEstrada()).toBeInstanceOf(Regiao);
  });
});

describe('Regiao.adicionarSegmento e getSegmentos', () => {
  test('guarda os segmentos adicionados', () => {
    const r = new RegiaoEstrada();
    const a = estrada([PontoBorda.S]);
    const b = estrada([PontoBorda.N]);
    r.adicionarSegmento(a);
    r.adicionarSegmento(b);
    expect(r.getSegmentos()).toEqual([a, b]);
  });
});

describe('Regiao.conectarPontos e estaConcluida', () => {
  test('com pontas abertas, não está concluída', () => {
    const r = new RegiaoEstrada();
    r.adicionarSegmento(estrada([PontoBorda.N, PontoBorda.S]));
    expect(r.estaConcluida()).toBe(false);
  });

  test('conectar só parte das pontas não conclui', () => {
    const r = new RegiaoEstrada();
    r.adicionarSegmento(estrada([PontoBorda.S]));
    r.adicionarSegmento(estrada([PontoBorda.N, PontoBorda.S]));
    r.conectarPontos(1);
    expect(r.estaConcluida()).toBe(false); // sobra o S da segunda
  });

  test('cada conexão fecha 2 pontas: 3 cartelas com 2 conexões ficam concluídas', () => {
    expect(estradaConcluidaDe3().estaConcluida()).toBe(true);
  });

  test('qtd conecta vários pontos de uma vez', () => {
    const r = new RegiaoEstrada();
    r.adicionarSegmento(estrada([PontoBorda.N, PontoBorda.S]));
    r.adicionarSegmento(estrada([PontoBorda.N, PontoBorda.S]));
    r.conectarPontos(2); // laço: as duas ficam ligadas pelos dois lados
    expect(r.estaConcluida()).toBe(true);
  });
});

describe('Regiao.numCartelasDistintas', () => {
  test('conta cartelas, não segmentos', () => {
    const cartela = new Cartela('T', [
      { tipo: TipoTerreno.ESTRADA, pontos: [PontoBorda.N] },
      { tipo: TipoTerreno.ESTRADA, pontos: [PontoBorda.S] },
    ]);
    const r = new RegiaoEstrada();
    r.adicionarSegmento(cartela.getSegmentos()[0]);
    r.adicionarSegmento(cartela.getSegmentos()[1]);
    r.adicionarSegmento(estrada([PontoBorda.N]));
    expect(r.getSegmentos()).toHaveLength(3);
    expect(r.numCartelasDistintas()).toBe(2);
  });
});

describe('Regiao: meeples', () => {
  test('sem meeples, não está ocupada', () => {
    expect(new RegiaoEstrada().estaOcupada()).toBe(false);
  });

  test('com um meeple, está ocupada', () => {
    const ana = new JogadorHumano('Ana', Cor.AZUL);
    const r = new RegiaoEstrada();
    r.adicionarMeeple(ana.retirarMeeple()!);
    expect(r.estaOcupada()).toBe(true);
  });

  test('liberarMeeples devolve cada meeple ao dono e esvazia a região', () => {
    const ana = new JogadorHumano('Ana', Cor.AZUL);
    const bia = new JogadorHumano('Bia', Cor.VERMELHO);
    const r = new RegiaoEstrada();
    r.adicionarMeeple(ana.retirarMeeple()!);
    r.adicionarMeeple(ana.retirarMeeple()!);
    r.adicionarMeeple(bia.retirarMeeple()!);

    r.liberarMeeples();

    expect(ana.getQuantidadeNaReserva()).toBe(7);
    expect(bia.getQuantidadeNaReserva()).toBe(7);
    expect(r.estaOcupada()).toBe(false);
  });
});

describe('Regiao.jogadoresComMaioria', () => {
  test('sem meeples, ninguém', () => {
    expect(new RegiaoEstrada().jogadoresComMaioria()).toEqual([]);
  });

  test('2 contra 1: só quem tem mais', () => {
    const azul = new JogadorHumano('Azul', Cor.AZUL);
    const amarelo = new JogadorHumano('Amarelo', Cor.AMARELO);
    const r = new RegiaoEstrada();
    r.adicionarMeeple(azul.retirarMeeple()!);
    r.adicionarMeeple(amarelo.retirarMeeple()!);
    r.adicionarMeeple(azul.retirarMeeple()!);
    expect(r.jogadoresComMaioria()).toEqual([azul]);
  });

  test('empate: todos os empatados, cada um uma vez', () => {
    const ana = new JogadorHumano('Ana', Cor.AZUL);
    const bia = new JogadorHumano('Bia', Cor.VERMELHO);
    const caio = new JogadorHumano('Caio', Cor.VERDE);
    const r = new RegiaoEstrada();
    r.adicionarMeeple(ana.retirarMeeple()!);
    r.adicionarMeeple(bia.retirarMeeple()!);
    r.adicionarMeeple(ana.retirarMeeple()!);
    r.adicionarMeeple(bia.retirarMeeple()!);
    r.adicionarMeeple(caio.retirarMeeple()!);

    const vencedores = r.jogadoresComMaioria();
    expect(vencedores).toHaveLength(2);
    expect(vencedores).toContain(ana);
    expect(vencedores).toContain(bia);
  });
});

describe('Regiao.fundir', () => {
  test('junta os segmentos das duas regiões', () => {
    const a = estrada([PontoBorda.S]);
    const b = estrada([PontoBorda.N]);
    const r1 = new RegiaoEstrada();
    const r2 = new RegiaoEstrada();
    r1.adicionarSegmento(a);
    r2.adicionarSegmento(b);

    r1.fundir(r2);

    expect(r1.getSegmentos()).toHaveLength(2);
    expect(r1.getSegmentos()).toContain(a);
    expect(r1.getSegmentos()).toContain(b);
  });

  test('soma os pontos abertos: depois de fundir, ainda falta conectar', () => {
    const r1 = new RegiaoEstrada();
    const r2 = new RegiaoEstrada();
    r1.adicionarSegmento(estrada([PontoBorda.S]));
    r2.adicionarSegmento(estrada([PontoBorda.N]));

    r1.fundir(r2);
    expect(r1.estaConcluida()).toBe(false); // 1 + 1 = 2 abertos

    r1.conectarPontos(1);
    expect(r1.estaConcluida()).toBe(true);
  });

  test('junta os meeples: a região fundida tem seguidores dos dois', () => {
    const ana = new JogadorHumano('Ana', Cor.AZUL);
    const bia = new JogadorHumano('Bia', Cor.VERMELHO);
    const r1 = new RegiaoEstrada();
    const r2 = new RegiaoEstrada();
    r1.adicionarMeeple(ana.retirarMeeple()!);
    r2.adicionarMeeple(bia.retirarMeeple()!);

    r1.fundir(r2);

    const vencedores = r1.jogadoresComMaioria();
    expect(vencedores).toHaveLength(2);
    expect(vencedores).toContain(ana);
    expect(vencedores).toContain(bia);
  });
});

describe('Regiao.pontuar (Template Method)', () => {
  test('concluída com meeple: dá os pontos e devolve o meeple', () => {
    const ana = new JogadorHumano('Ana', Cor.AZUL);
    const r = estradaConcluidaDe3();
    r.adicionarMeeple(ana.retirarMeeple()!);

    r.pontuar(false);

    expect(ana.getPontuacao()).toBe(3);
    expect(ana.getQuantidadeNaReserva()).toBe(7);
    expect(r.estaOcupada()).toBe(false);
  });

  test('não concluída durante a partida: não faz nada', () => {
    const ana = new JogadorHumano('Ana', Cor.AZUL);
    const r = new RegiaoEstrada();
    r.adicionarSegmento(estrada([PontoBorda.N, PontoBorda.S]));
    r.adicionarMeeple(ana.retirarMeeple()!);

    r.pontuar(false);

    expect(ana.getPontuacao()).toBe(0);
    expect(ana.getQuantidadeNaReserva()).toBe(6);
    expect(r.estaOcupada()).toBe(true);
  });

  test('não concluída no fim do jogo: pontua mesmo assim', () => {
    const ana = new JogadorHumano('Ana', Cor.AZUL);
    const r = new RegiaoEstrada();
    r.adicionarSegmento(estrada([PontoBorda.N, PontoBorda.S]));
    r.adicionarSegmento(estrada([PontoBorda.N, PontoBorda.S]));
    r.conectarPontos(1);
    r.adicionarMeeple(ana.retirarMeeple()!);

    r.pontuar(true);

    expect(ana.getPontuacao()).toBe(2);
    expect(ana.getQuantidadeNaReserva()).toBe(7);
  });

  test('concluída sem meeples: ninguém pontua e não dá erro', () => {
    expect(() => estradaConcluidaDe3().pontuar(false)).not.toThrow();
  });

  test('empate (exemplo do manual): estrada de 4 com 1 ladrão de cada, 4 pontos para cada um', () => {
    const ana = new JogadorHumano('Ana', Cor.AZUL);
    const bia = new JogadorHumano('Bia', Cor.VERMELHO);
    // Duas estradas separadas, cada uma com um ladrão, unidas depois.
    const r1 = new RegiaoEstrada();
    r1.adicionarSegmento(estrada([PontoBorda.S]));
    r1.adicionarSegmento(estrada([PontoBorda.N, PontoBorda.S]));
    r1.conectarPontos(1);
    r1.adicionarMeeple(ana.retirarMeeple()!);
    const r2 = new RegiaoEstrada();
    r2.adicionarSegmento(estrada([PontoBorda.N, PontoBorda.S]));
    r2.adicionarSegmento(estrada([PontoBorda.N]));
    r2.conectarPontos(1);
    r2.adicionarMeeple(bia.retirarMeeple()!);

    r1.fundir(r2);
    r1.conectarPontos(1);
    r1.pontuar(false);

    expect(ana.getPontuacao()).toBe(4);
    expect(bia.getPontuacao()).toBe(4);
  });

  test('quem fica em minoria não pontua, mas recebe o meeple de volta', () => {
    const azul = new JogadorHumano('Azul', Cor.AZUL);
    const amarelo = new JogadorHumano('Amarelo', Cor.AMARELO);
    const r = estradaConcluidaDe3();
    r.adicionarMeeple(azul.retirarMeeple()!);
    r.adicionarMeeple(azul.retirarMeeple()!);
    r.adicionarMeeple(amarelo.retirarMeeple()!);

    r.pontuar(false);

    expect(azul.getPontuacao()).toBe(3);
    expect(amarelo.getPontuacao()).toBe(0);
    expect(amarelo.getQuantidadeNaReserva()).toBe(7);
  });
});
