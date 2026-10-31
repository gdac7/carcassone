import type { DefinicaoSegmento } from './Cartela';
import { PontoBorda } from './PontoBorda';
import { TipoTerreno } from './TipoTerreno';

// Um tipo de cartela do jogo base (A a X) e quantas cópias existem dele.
export type DefinicaoCartela = {
    id: string;
    quantidade: number;
    segmentos: DefinicaoSegmento[];
};

export const ID_CARTELA_INICIAL = 'D';

const { N_O, N, N_L, L_N, L, L_S, S_L, S, S_O, O_S, O, O_N } = PontoBorda;
const { CIDADE, ESTRADA, CAMPO, MOSTEIRO } = TipoTerreno;

// Cada definição está na rotação 0 da imagem indicada (public/tiles/<Imagem>0.png).
// Cidades vêm primeiro, para que `cidadesAdjacentes` use índices baixos e fáceis de conferir.
// Estradas que terminam na cartela (mosteiro, cidade, cruzamento) são segmentos separados.
export const DEFINICOES_CARTELAS: DefinicaoCartela[] = [
    {
        id: 'A', quantidade: 2, // MonasteryRoad: mosteiro com estrada para o sul
        segmentos: [
            { tipo: MOSTEIRO, pontos: [] },
            { tipo: ESTRADA, pontos: [S] },
            { tipo: CAMPO, pontos: [N_O, N, N_L, L_N, L, L_S, S_L, S_O, O_S, O, O_N] },
        ],
    },
    {
        id: 'B', quantidade: 4, // Monastery: mosteiro cercado de campo
        segmentos: [
            { tipo: MOSTEIRO, pontos: [] },
            { tipo: CAMPO, pontos: [N_O, N, N_L, L_N, L, L_S, S_L, S, S_O, O_S, O, O_N] },
        ],
    },
    {
        id: 'C', quantidade: 1, // CastleCenter: cidade ocupando a cartela inteira
        segmentos: [
            { tipo: CIDADE, pontos: [N_O, N, N_L, L_N, L, L_S, S_L, S, S_O, O_S, O, O_N], temBrasao: true },
        ],
    },
    {
        id: 'D', quantidade: 4, // CastleWallRoad: cidade no norte, estrada de leste a oeste (cartela inicial)
        segmentos: [
            { tipo: CIDADE, pontos: [N_O, N, N_L] },
            { tipo: ESTRADA, pontos: [L, O] },
            { tipo: CAMPO, pontos: [L_N, O_N], cidadesAdjacentes: [0] },
            { tipo: CAMPO, pontos: [L_S, S_L, S, S_O, O_S] },
        ],
    },
    {
        id: 'E', quantidade: 5, // CastleWall: cidade no norte
        segmentos: [
            { tipo: CIDADE, pontos: [N_O, N, N_L] },
            { tipo: CAMPO, pontos: [L_N, L, L_S, S_L, S, S_O, O_S, O, O_N], cidadesAdjacentes: [0] },
        ],
    },
    {
        id: 'F', quantidade: 2, // CastleTube: cidade de leste a oeste, campos no norte e no sul
        segmentos: [
            { tipo: CIDADE, pontos: [L_N, L, L_S, O_S, O, O_N], temBrasao: true },
            { tipo: CAMPO, pontos: [N_O, N, N_L], cidadesAdjacentes: [0] },
            { tipo: CAMPO, pontos: [S_L, S, S_O], cidadesAdjacentes: [0] },
        ],
    },
    {
        id: 'G', quantidade: 1, // CastleTube, sem brasão
        segmentos: [
            { tipo: CIDADE, pontos: [L_N, L, L_S, O_S, O, O_N] },
            { tipo: CAMPO, pontos: [N_O, N, N_L], cidadesAdjacentes: [0] },
            { tipo: CAMPO, pontos: [S_L, S, S_O], cidadesAdjacentes: [0] },
        ],
    },
    {
        id: 'H', quantidade: 3, // CastleSides: cidades separadas no norte e no sul
        segmentos: [
            { tipo: CIDADE, pontos: [N_O, N, N_L] },
            { tipo: CIDADE, pontos: [S_L, S, S_O] },
            { tipo: CAMPO, pontos: [L_N, L, L_S, O_S, O, O_N], cidadesAdjacentes: [0, 1] },
        ],
    },
    {
        id: 'I', quantidade: 2, // CastleSidesEdge: cidades separadas no norte e no oeste
        segmentos: [
            { tipo: CIDADE, pontos: [N_O, N, N_L] },
            { tipo: CIDADE, pontos: [O_S, O, O_N] },
            { tipo: CAMPO, pontos: [L_N, L, L_S, S_L, S, S_O], cidadesAdjacentes: [0, 1] },
        ],
    },
    {
        id: 'J', quantidade: 3, // CastleWallCurveRight: cidade no norte, estrada em curva de leste a sul
        segmentos: [
            { tipo: CIDADE, pontos: [N_O, N, N_L] },
            { tipo: ESTRADA, pontos: [L, S] },
            { tipo: CAMPO, pontos: [L_S, S_L] },
            { tipo: CAMPO, pontos: [L_N, S_O, O_S, O, O_N], cidadesAdjacentes: [0] },
        ],
    },
    {
        id: 'K', quantidade: 3, // CastleWallCurveLeft: cidade no norte, estrada em curva de oeste a sul
        segmentos: [
            { tipo: CIDADE, pontos: [N_O, N, N_L] },
            { tipo: ESTRADA, pontos: [O, S] },
            { tipo: CAMPO, pontos: [S_O, O_S] },
            { tipo: CAMPO, pontos: [L_N, L, L_S, S_L, O_N], cidadesAdjacentes: [0] },
        ],
    },
    {
        id: 'L', quantidade: 3, // CastleWallJunction: cidade no norte, cruzamento de 3 estradas (leste, sul, oeste)
        segmentos: [
            { tipo: CIDADE, pontos: [N_O, N, N_L] },
            { tipo: ESTRADA, pontos: [L] },
            { tipo: ESTRADA, pontos: [S] },
            { tipo: ESTRADA, pontos: [O] },
            { tipo: CAMPO, pontos: [L_N, O_N], cidadesAdjacentes: [0] },
            { tipo: CAMPO, pontos: [L_S, S_L] },
            { tipo: CAMPO, pontos: [S_O, O_S] },
        ],
    },
    {
        id: 'M', quantidade: 2, // CastleEdge: cidade no norte e no leste
        segmentos: [
            { tipo: CIDADE, pontos: [N_O, N, N_L, L_N, L, L_S], temBrasao: true },
            { tipo: CAMPO, pontos: [S_L, S, S_O, O_S, O, O_N], cidadesAdjacentes: [0] },
        ],
    },
    {
        id: 'N', quantidade: 3, // CastleEdge, sem brasão
        segmentos: [
            { tipo: CIDADE, pontos: [N_O, N, N_L, L_N, L, L_S] },
            { tipo: CAMPO, pontos: [S_L, S, S_O, O_S, O, O_N], cidadesAdjacentes: [0] },
        ],
    },
    {
        id: 'O', quantidade: 2, // CastleEdgeRoad: cidade no norte e no leste, estrada em curva de oeste a sul
        segmentos: [
            { tipo: CIDADE, pontos: [N_O, N, N_L, L_N, L, L_S], temBrasao: true },
            { tipo: ESTRADA, pontos: [O, S] },
            { tipo: CAMPO, pontos: [S_L, O_N], cidadesAdjacentes: [0] },
            { tipo: CAMPO, pontos: [S_O, O_S] },
        ],
    },
    {
        id: 'P', quantidade: 3, // CastleEdgeRoad, sem brasão
        segmentos: [
            { tipo: CIDADE, pontos: [N_O, N, N_L, L_N, L, L_S] },
            { tipo: ESTRADA, pontos: [O, S] },
            { tipo: CAMPO, pontos: [S_L, O_N], cidadesAdjacentes: [0] },
            { tipo: CAMPO, pontos: [S_O, O_S] },
        ],
    },
    {
        id: 'Q', quantidade: 1, // CastleCenterSide: cidade no norte, leste e oeste
        segmentos: [
            { tipo: CIDADE, pontos: [N_O, N, N_L, L_N, L, L_S, O_S, O, O_N], temBrasao: true },
            { tipo: CAMPO, pontos: [S_L, S, S_O], cidadesAdjacentes: [0] },
        ],
    },
    {
        id: 'R', quantidade: 3, // CastleCenterSide, sem brasão
        segmentos: [
            { tipo: CIDADE, pontos: [N_O, N, N_L, L_N, L, L_S, O_S, O, O_N] },
            { tipo: CAMPO, pontos: [S_L, S, S_O], cidadesAdjacentes: [0] },
        ],
    },
    {
        id: 'S', quantidade: 2, // CastleCenterEntry: cidade no norte, leste e oeste, estrada saindo para o sul
        segmentos: [
            { tipo: CIDADE, pontos: [N_O, N, N_L, L_N, L, L_S, O_S, O, O_N], temBrasao: true },
            { tipo: ESTRADA, pontos: [S] },
            { tipo: CAMPO, pontos: [S_L], cidadesAdjacentes: [0] },
            { tipo: CAMPO, pontos: [S_O], cidadesAdjacentes: [0] },
        ],
    },
    {
        id: 'T', quantidade: 1, // CastleCenterEntry, sem brasão
        segmentos: [
            { tipo: CIDADE, pontos: [N_O, N, N_L, L_N, L, L_S, O_S, O, O_N] },
            { tipo: ESTRADA, pontos: [S] },
            { tipo: CAMPO, pontos: [S_L], cidadesAdjacentes: [0] },
            { tipo: CAMPO, pontos: [S_O], cidadesAdjacentes: [0] },
        ],
    },
    {
        id: 'U', quantidade: 8, // Road: estrada reta de norte a sul
        segmentos: [
            { tipo: ESTRADA, pontos: [N, S] },
            { tipo: CAMPO, pontos: [N_L, L_N, L, L_S, S_L] },
            { tipo: CAMPO, pontos: [S_O, O_S, O, O_N, N_O] },
        ],
    },
    {
        id: 'V', quantidade: 9, // RoadCurve: estrada em curva de oeste a sul
        segmentos: [
            { tipo: ESTRADA, pontos: [O, S] },
            { tipo: CAMPO, pontos: [S_O, O_S] },
            { tipo: CAMPO, pontos: [N_O, N, N_L, L_N, L, L_S, S_L, O_N] },
        ],
    },
    {
        id: 'W', quantidade: 4, // RoadJunctionSmall: cruzamento de 3 estradas (leste, sul, oeste)
        segmentos: [
            { tipo: ESTRADA, pontos: [L] },
            { tipo: ESTRADA, pontos: [S] },
            { tipo: ESTRADA, pontos: [O] },
            { tipo: CAMPO, pontos: [O_N, N_O, N, N_L, L_N] },
            { tipo: CAMPO, pontos: [L_S, S_L] },
            { tipo: CAMPO, pontos: [S_O, O_S] },
        ],
    },
    {
        id: 'X', quantidade: 1, // RoadJunctionLarge: cruzamento de 4 estradas
        segmentos: [
            { tipo: ESTRADA, pontos: [N] },
            { tipo: ESTRADA, pontos: [L] },
            { tipo: ESTRADA, pontos: [S] },
            { tipo: ESTRADA, pontos: [O] },
            { tipo: CAMPO, pontos: [N_L, L_N] },
            { tipo: CAMPO, pontos: [L_S, S_L] },
            { tipo: CAMPO, pontos: [S_O, O_S] },
            { tipo: CAMPO, pontos: [O_N, N_O] },
        ],
    },
];
