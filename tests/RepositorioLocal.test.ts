import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { Jogo } from '../src/dominio/Jogo';
import { JogadorHumano } from '../src/dominio/JogadorHumano';
import { Cor } from '../src/dominio/Cor';
import { colocacoesPossiveis } from '../src/servicos/EstrategiaIA';
import { Jogada } from '../src/dominio/Jogada';
import { RepositorioLocal } from '../src/servicos/RepositorioLocal';
import type { RepositorioPartida } from '../src/servicos/RepositorioPartida';

// Faz o papel do localStorage, que não existe fora do navegador.
class ArmazenamentoFalso implements Storage {
  [nome: string]: unknown;
  private dados = new Map<string, string>();
  cheio = false;

  get length(): number { return this.dados.size; }
  clear(): void { this.dados.clear(); }
  getItem(chave: string): string | null { return this.dados.get(chave) ?? null; }
  key(indice: number): string | null { return [...this.dados.keys()][indice] ?? null; }
  removeItem(chave: string): void { this.dados.delete(chave); }
  setItem(chave: string, valor: string): void {
    if (this.cheio) throw new Error('QuotaExceededError');
    this.dados.set(chave, valor);
  }
}

function partidaEm(data: string, nomes = ['Ana', 'Bruno']): Jogo {
  vi.setSystemTime(new Date(data));
  const jogo = new Jogo();
  jogo.iniciarPartida(nomes.map((n, i) => new JogadorHumano(n, [Cor.AZUL, Cor.VERMELHO, Cor.VERDE][i])));
  return jogo;
}

function jogar(jogo: Jogo): void {
  const { posicao, rotacao } = colocacoesPossiveis(jogo.getCartelaAtual()!, jogo.getTabuleiro())[0];
  jogo.executarJogada(new Jogada(posicao, rotacao));
}

let armazenamento: ArmazenamentoFalso;
let repositorio: RepositorioPartida;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  armazenamento = new ArmazenamentoFalso();
  repositorio = new RepositorioLocal(armazenamento);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('RepositorioLocal.salvar e carregar', () => {
  test('salva e carrega a partida pelo id', () => {
    const jogo = partidaEm('2026-10-31T15:40:00');
    jogar(jogo);
    jogar(jogo);

    expect(repositorio.salvar(jogo)).toBe(true);
    const [salva] = repositorio.listar();
    const carregado = repositorio.carregar(salva.id);

    expect(carregado.getHistorico()).toHaveLength(2);
    expect(carregado.getCartelaAtual()!.getId()).toBe(jogo.getCartelaAtual()!.getId());
    expect(carregado.getInicio().getTime()).toBe(jogo.getInicio().getTime());
  });

  test('salvar a mesma partida de novo sobrescreve, em vez de criar outro save', () => {
    const jogo = partidaEm('2026-10-31T15:40:00');
    repositorio.salvar(jogo);
    jogar(jogo);
    repositorio.salvar(jogo);

    const lista = repositorio.listar();
    expect(lista).toHaveLength(1);
    expect(repositorio.carregar(lista[0].id).getHistorico()).toHaveLength(1);
  });

  test('devolve false quando o armazenamento recusa (por exemplo, cheio)', () => {
    armazenamento.cheio = true;
    expect(repositorio.salvar(partidaEm('2026-10-31T15:40:00'))).toBe(false);
  });

  test('carregar um id que não existe é erro', () => {
    expect(() => repositorio.carregar('2000-01-01T00:00:00.000Z')).toThrow();
  });
});

describe('RepositorioLocal.listar', () => {
  test('sem nada salvo, a lista é vazia', () => {
    expect(repositorio.listar()).toEqual([]);
  });

  test('lista da partida mais recente para a mais antiga, com data, jogadores e rodada', () => {
    const antiga = partidaEm('2026-10-29T10:00:00', ['Ana', 'Bruno']);
    const nova = partidaEm('2026-10-31T15:40:00', ['Caio', 'Duda', 'Edu']);
    const meio = partidaEm('2026-10-30T20:15:00');
    jogar(nova);
    for (const jogo of [antiga, nova, meio]) repositorio.salvar(jogo);

    const lista = repositorio.listar();
    expect(lista.map((p) => p.inicio.getTime())).toEqual([nova, meio, antiga].map((j) => j.getInicio().getTime()));
    expect(lista[0].jogadores).toEqual(nova.getJogadores().map((j) => j.getNome()));
    expect(lista[0].rodada).toBe(nova.getRodadaAtual());
  });

  test('ignora o que outras partes do jogo guardam no armazenamento', () => {
    armazenamento.setItem('carcassonne.volumes', '{"musica":0.5,"efeitos":1}');
    repositorio.salvar(partidaEm('2026-10-31T15:40:00'));
    expect(repositorio.listar()).toHaveLength(1);
  });
});

describe('RepositorioLocal.excluir', () => {
  test('tira a partida da lista e não mexe nas outras', () => {
    const a = partidaEm('2026-10-29T10:00:00');
    const b = partidaEm('2026-10-30T10:00:00');
    repositorio.salvar(a);
    repositorio.salvar(b);

    repositorio.excluir(a.getInicio().toISOString());

    const lista = repositorio.listar();
    expect(lista).toHaveLength(1);
    expect(lista[0].inicio.getTime()).toBe(b.getInicio().getTime());
  });
});
