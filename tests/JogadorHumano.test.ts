import { describe, test, expect } from 'vitest';
import { JogadorHumano } from '../src/dominio/JogadorHumano';
import { Jogo } from '../src/dominio/Jogo';
import { Cor } from '../src/dominio/Cor';

describe('JogadorHumano.iniciarTurno', () => {
  test('não faz nada: quem joga é a tela, quando o usuário clica', () => {
    const ana = new JogadorHumano('Ana', Cor.AZUL);
    expect(() => ana.iniciarTurno(new Jogo())).not.toThrow();
    expect(ana.getPontuacao()).toBe(0);
    expect(ana.getQuantidadeNaReserva()).toBe(7);
  });
});
