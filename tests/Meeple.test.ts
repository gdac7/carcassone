import { describe, test, expect } from 'vitest';
import { Meeple } from '../src/dominio/Meeple';
import { JogadorHumano } from '../src/dominio/JogadorHumano';
import { Cor } from '../src/dominio/Cor';

describe('Meeple', () => {
  test('conhece o dono', () => {
    const ana = new JogadorHumano('Ana', Cor.AZUL);
    expect(new Meeple(ana).getDono()).toBe(ana);
  });

  test('a cor vem do dono', () => {
    const ana = new JogadorHumano('Ana', Cor.AMARELO);
    expect(new Meeple(ana).getDono().getCor()).toBe(Cor.AMARELO);
  });
});
