import type { Cor } from '../dominio/Cor';
import { Jogada } from '../dominio/Jogada';
import type { Jogador } from '../dominio/Jogador';
import { JogadorHumano } from '../dominio/JogadorHumano';
import { JogadorIA } from '../dominio/JogadorIA';
import { Jogo } from '../dominio/Jogo';
import { Posicao } from '../dominio/Posicao';
import { IADificil } from './IADificil';
import { IAFacil } from './IAFacil';

// O que a lista de partidas salvas mostra, sem precisar recriar o jogo.
export interface PartidaSalva {
    id: string;
    inicio: Date;
    jogadores: string[];
    rodada: number;
}

type TipoJogador = 'humano' | 'facil' | 'dificil';

// Formato do texto salvo. O seguidor é o índice do segmento na cartela, porque objetos não vão para o JSON.
interface DadosPartida {
    inicio: string;
    rodada: number;
    jogadores: { nome: string; cor: Cor; tipo: TipoJogador }[];
    ordemDoMonte: string[];
    jogadas: { x: number; y: number; rotacao: number; segmento: number | null }[];
}

// Pure Fabrication: converte a partida em texto e de volta.
// Guarda como a partida começou e as jogadas feitas; ao carregar, o Jogo repete as jogadas.
export class SerializadorPartida {
    paraTexto(jogo: Jogo): string {
        const dados: DadosPartida = {
            inicio: jogo.getInicio().toISOString(),
            rodada: jogo.getRodadaAtual(),
            jogadores: jogo.getJogadores().map((j) => ({ nome: j.getNome(), cor: j.getCor(), tipo: tipoDe(j) })),
            ordemDoMonte: jogo.getOrdemDoMonte(),
            jogadas: jogo.getHistorico().map((jogada) => {
                const segmento = jogada.getSegmentoDoMeeple();
                return {
                    x: jogada.getPosicao().getX(),
                    y: jogada.getPosicao().getY(),
                    rotacao: jogada.getRotacao(),
                    segmento: segmento ? segmento.getCartela().getSegmentos().indexOf(segmento) : null,
                };
            }),
        };
        return JSON.stringify(dados);
    }

    deTexto(texto: string): Jogo {
        const dados: DadosPartida = JSON.parse(texto);
        const jogo = new Jogo();
        jogo.retomarPartida(
            dados.jogadores.map((j) => criarJogador(j.nome, j.cor, j.tipo)),
            dados.ordemDoMonte,
            new Date(dados.inicio),
        );

        for (const salva of dados.jogadas) {
            const cartela = jogo.getCartelaAtual();
            if (!cartela) throw new Error('A partida salva tem mais jogadas do que cartelas');
            const segmento = salva.segmento === null ? null : cartela.getSegmentos()[salva.segmento];
            if (!jogo.executarJogada(new Jogada(new Posicao(salva.x, salva.y), salva.rotacao, segmento))) {
                throw new Error('A partida salva tem uma jogada inválida');
            }
        }
        return jogo;
    }

    resumir(texto: string): PartidaSalva {
        const dados: DadosPartida = JSON.parse(texto);
        return {
            id: dados.inicio,
            inicio: new Date(dados.inicio),
            jogadores: dados.jogadores.map((j) => j.nome),
            rodada: dados.rodada,
        };
    }
}

function tipoDe(jogador: Jogador): TipoJogador {
    if (!(jogador instanceof JogadorIA)) return 'humano';
    return jogador.getEstrategia() instanceof IADificil ? 'dificil' : 'facil';
}

function criarJogador(nome: string, cor: Cor, tipo: TipoJogador): Jogador {
    switch (tipo) {
        case 'humano': return new JogadorHumano(nome, cor);
        case 'facil': return new JogadorIA(nome, cor, new IAFacil());
        case 'dificil': return new JogadorIA(nome, cor, new IADificil());
    }
}
