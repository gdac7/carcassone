import { describe, test, expect } from 'vitest';
import { JogadorIA } from '../src/dominio/JogadorIA';
import { Jogador } from '../src/dominio/Jogador';
import { Jogo } from '../src/dominio/Jogo';
import { Cor } from '../src/dominio/Cor';
import { IAFacil } from '../src/servicos/IAFacil';
import type { EstrategiaIA } from '../src/servicos/EstrategiaIA';

describe('JogadorIA', () => {
  test('é um Jogador, com 7 seguidores, e guarda a estratégia', () => {
    const estrategia = new IAFacil();
    const ia = new JogadorIA('Robô', Cor.VERDE, estrategia);
    expect(ia).toBeInstanceOf(Jogador);
    expect(ia.getQuantidadeNaReserva()).toBe(7);
    expect(ia.getEstrategia()).toBe(estrategia);
  });

  test('iniciarTurno pede a jogada à estratégia e o Jogo a executa', () => {
    let chamadas = 0;
    const facil = new IAFacil();
    const espia: EstrategiaIA = {
      escolherJogada: (c, t, j) => {
        chamadas++;
        return facil.escolherJogada(c, t, j);
      },
    };
    const ia = new JogadorIA('Robô', Cor.VERDE, espia);
    const jogo = new Jogo();
    jogo.iniciarPartida([ia, new JogadorIA('Outro', Cor.AZUL, espia)]);

    jogo.getJogadorDaVez()!.iniciarTurno(jogo);

    expect(chamadas).toBe(1);
    expect(jogo.getHistorico()).toHaveLength(1);
  });
});
