import { describe, test, expect } from 'vitest';

// Teste de fumaça: só confirma que o Vitest está configurado e rodando.
describe('configuração do projeto', () => {
  test('o Vitest executa um teste simples', () => {
    expect(1 + 1).toBe(2);
  });
});
