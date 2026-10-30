import { describe, test, expect } from 'vitest';
import { Cartela, type DefinicaoSegmento } from '../src/dominio/Cartela';
import { TipoTerreno } from '../src/dominio/TipoTerreno';
import { PontoBorda } from '../src/dominio/PontoBorda';
import { Lado } from '../src/dominio/Lado';

const { N_O, N, N_L, L_N, L, L_S, S_L, S, S_O, O_S, O, O_N } = PontoBorda;

// Cidade ocupando o lado norte; o resto é um campo que toca a cidade.
const CIDADE_NO_NORTE: DefinicaoSegmento[] = [
  { tipo: TipoTerreno.CIDADE, pontos: [N_O, N, N_L] },
  { tipo: TipoTerreno.CAMPO, pontos: [L_N, L, L_S, S_L, S, S_O, O_S, O, O_N], cidadesAdjacentes: [0] },
];

// Estrada reta de norte a sul, separando um campo a leste e outro a oeste.
const ESTRADA_RETA: DefinicaoSegmento[] = [
  { tipo: TipoTerreno.ESTRADA, pontos: [N, S] },
  { tipo: TipoTerreno.CAMPO, pontos: [N_L, L_N, L, L_S, S_L] },
  { tipo: TipoTerreno.CAMPO, pontos: [S_O, O_S, O, O_N, N_O] },
];

// Mosteiro no centro (sem pontos de borda), cercado de campo.
const MOSTEIRO: DefinicaoSegmento[] = [
  { tipo: TipoTerreno.MOSTEIRO, pontos: [] },
  { tipo: TipoTerreno.CAMPO, pontos: [N_O, N, N_L, L_N, L, L_S, S_L, S, S_O, O_S, O, O_N] },
];

describe('Cartela: criação dos segmentos (Creator)', () => {
  test('guarda o id e começa sem rotação', () => {
    const c = new Cartela('E', CIDADE_NO_NORTE);
    expect(c.getId()).toBe('E');
    expect(c.getRotacao()).toBe(0);
  });

  test('cria um segmento para cada definição', () => {
    expect(new Cartela('U', ESTRADA_RETA).getSegmentos()).toHaveLength(3);
  });

  test('cada segmento sabe a qual cartela pertence', () => {
    const c = new Cartela('U', ESTRADA_RETA);
    for (const s of c.getSegmentos()) {
      expect(s.getCartela()).toBe(c);
    }
  });

  test('o brasão vem da definição (falso quando omitido)', () => {
    const comBrasao = new Cartela('X', [
      { tipo: TipoTerreno.CIDADE, pontos: [N_O, N, N_L, L_N, L, L_S, S_L, S, S_O, O_S, O, O_N], temBrasao: true },
    ]);
    expect(comBrasao.getSegmentos()[0].getTemBrasao()).toBe(true);
    expect(new Cartela('E', CIDADE_NO_NORTE).getSegmentos()[0].getTemBrasao()).toBe(false);
  });

  test('o campo aponta para o segmento de cidade que ele toca na mesma cartela', () => {
    const c = new Cartela('E', CIDADE_NO_NORTE);
    const cidade = c.segmentoNoPonto(N);
    const campo = c.segmentoNoPonto(S);
    expect(campo.getCidadesAdjacentes()).toEqual([cidade]);
    expect(campo.getCidadesAdjacentes()[0]).toBe(cidade); // o mesmo objeto, não uma cópia
  });
});

describe('Cartela.segmentoNoPonto', () => {
  test('encontra o segmento que ocupa o ponto', () => {
    const c = new Cartela('E', CIDADE_NO_NORTE);
    expect(c.segmentoNoPonto(N).getTipo()).toBe(TipoTerreno.CIDADE);
    expect(c.segmentoNoPonto(N_L).getTipo()).toBe(TipoTerreno.CIDADE);
    expect(c.segmentoNoPonto(S).getTipo()).toBe(TipoTerreno.CAMPO);
  });

  test('a estrada fica no meio do lado e os campos nos pontos laterais', () => {
    const c = new Cartela('U', ESTRADA_RETA);
    expect(c.segmentoNoPonto(N).getTipo()).toBe(TipoTerreno.ESTRADA);
    expect(c.segmentoNoPonto(N_O)).not.toBe(c.segmentoNoPonto(N_L)); // campos diferentes
  });

  test('o mosteiro não ocupa nenhum ponto de borda', () => {
    const c = new Cartela('B', MOSTEIRO);
    for (const p of [N_O, N, N_L, L_N, L, L_S, S_L, S, S_O, O_S, O, O_N]) {
      expect(c.segmentoNoPonto(p).getTipo()).toBe(TipoTerreno.CAMPO);
    }
  });
});

describe('Cartela.girar', () => {
  test('um giro leva a cidade do norte para o leste', () => {
    const c = new Cartela('E', CIDADE_NO_NORTE);
    c.girar();
    expect(c.getRotacao()).toBe(1);
    expect(c.segmentoNoPonto(L).getTipo()).toBe(TipoTerreno.CIDADE);
    expect(c.segmentoNoPonto(N).getTipo()).toBe(TipoTerreno.CAMPO);
  });

  test('4 giros voltam à rotação 0', () => {
    const c = new Cartela('E', CIDADE_NO_NORTE);
    c.girar(); c.girar(); c.girar(); c.girar();
    expect(c.getRotacao()).toBe(0);
    expect(c.segmentoNoPonto(N).getTipo()).toBe(TipoTerreno.CIDADE);
  });
});

describe('Cartela.encaixaCom', () => {
  test('cidade encaixa com cidade', () => {
    const embaixo = new Cartela('E', CIDADE_NO_NORTE);
    const emCima = new Cartela('E', CIDADE_NO_NORTE);
    emCima.girar(); emCima.girar(); // cidade passa para o sul, de frente para a de baixo
    expect(embaixo.encaixaCom(emCima, Lado.NORTE)).toBe(true);
  });

  test('cidade não encaixa com campo', () => {
    const embaixo = new Cartela('E', CIDADE_NO_NORTE);
    const emCima = new Cartela('E', CIDADE_NO_NORTE); // o sul dela é campo
    expect(embaixo.encaixaCom(emCima, Lado.NORTE)).toBe(false);
  });

  test('estrada encaixa com estrada, e os campos dos dois lados também combinam', () => {
    const embaixo = new Cartela('U', ESTRADA_RETA);
    const emCima = new Cartela('U', ESTRADA_RETA);
    expect(embaixo.encaixaCom(emCima, Lado.NORTE)).toBe(true);
  });

  test('estrada não encaixa com campo', () => {
    const estrada = new Cartela('U', ESTRADA_RETA); // leste é só campo
    const vizinha = new Cartela('U', ESTRADA_RETA);
    vizinha.girar(); // estrada passa a ir de leste a oeste: o oeste dela é estrada
    expect(estrada.encaixaCom(vizinha, Lado.LESTE)).toBe(false);
  });

  test('campo encaixa com campo', () => {
    const estrada = new Cartela('U', ESTRADA_RETA);
    const mosteiro = new Cartela('B', MOSTEIRO);
    expect(estrada.encaixaCom(mosteiro, Lado.LESTE)).toBe(true);
  });
});
