import { describe, test, expect } from 'vitest';
import { JogadorHumano } from '../src/dominio/JogadorHumano';
import { Jogador } from '../src/dominio/Jogador';
import { Meeple } from '../src/dominio/Meeple';
import { Cor } from '../src/dominio/Cor';

// Jogador é abstrato: os testes usam JogadorHumano, a subclasse concreta mais simples.

describe('Jogador: estado inicial', () => {
  test('guarda nome e cor, e começa com 0 pontos', () => {
    const ana = new JogadorHumano('Ana', Cor.AZUL);
    expect(ana.getNome()).toBe('Ana');
    expect(ana.getCor()).toBe(Cor.AZUL);
    expect(ana.getPontuacao()).toBe(0);
  });

  test('começa com 7 meeples na reserva', () => {
    expect(new JogadorHumano('Ana', Cor.AZUL).getQuantidadeNaReserva()).toBe(7);
  });

  test('é um Jogador (herança)', () => {
    expect(new JogadorHumano('Ana', Cor.AZUL)).toBeInstanceOf(Jogador);
  });
});

describe('Jogador.retirarMeeple', () => {
  test('tira um meeple da reserva, e o meeple pertence ao jogador', () => {
    const ana = new JogadorHumano('Ana', Cor.AZUL);
    const meeple = ana.retirarMeeple();
    expect(meeple).toBeInstanceOf(Meeple);
    expect(meeple?.getDono()).toBe(ana);
    expect(ana.getQuantidadeNaReserva()).toBe(6);
  });

  test('os 7 meeples são objetos diferentes', () => {
    const ana = new JogadorHumano('Ana', Cor.AZUL);
    const meeples = new Set<Meeple | null>();
    for (let i = 0; i < 7; i++) meeples.add(ana.retirarMeeple());
    expect(meeples.size).toBe(7);
  });

  test('sem meeples na reserva, devolve null', () => {
    const ana = new JogadorHumano('Ana', Cor.AZUL);
    for (let i = 0; i < 7; i++) ana.retirarMeeple();
    expect(ana.getQuantidadeNaReserva()).toBe(0);
    expect(ana.retirarMeeple()).toBeNull();
  });
});

describe('Jogador.devolverMeeple', () => {
  test('o meeple volta para a reserva e pode ser retirado de novo', () => {
    const ana = new JogadorHumano('Ana', Cor.AZUL);
    for (let i = 0; i < 6; i++) ana.retirarMeeple();
    const ultimo = ana.retirarMeeple();
    expect(ana.retirarMeeple()).toBeNull();

    ana.devolverMeeple(ultimo!);
    expect(ana.getQuantidadeNaReserva()).toBe(1);
    expect(ana.retirarMeeple()).toBe(ultimo);
  });

  test('não aceita meeple de outro jogador', () => {
    const ana = new JogadorHumano('Ana', Cor.AZUL);
    const bia = new JogadorHumano('Bia', Cor.VERDE);
    const meepleDaBia = bia.retirarMeeple()!;
    expect(() => ana.devolverMeeple(meepleDaBia)).toThrow();
    expect(ana.getQuantidadeNaReserva()).toBe(7);
  });
});

describe('Jogador.adicionarPontos', () => {
  test('acumula os pontos', () => {
    const ana = new JogadorHumano('Ana', Cor.AZUL);
    ana.adicionarPontos(3);
    ana.adicionarPontos(8);
    expect(ana.getPontuacao()).toBe(11);
  });
});
