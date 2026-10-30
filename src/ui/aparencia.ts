import { Cor } from '../dominio/Cor';

export const TAMANHO_CARTELA = 100;

// Tipo da cartela (A–X) → nome do arquivo em public/tiles/<nome><rotacao>.png.
export const IMAGEM_POR_TIPO: Record<string, string> = {
    A: 'MonasteryRoad', B: 'Monastery', C: 'CastleCenter', D: 'CastleWallRoad',
    E: 'CastleWall', F: 'CastleTube', G: 'CastleTube', H: 'CastleSides',
    I: 'CastleSidesEdge', J: 'CastleWallCurveRight', K: 'CastleWallCurveLeft', L: 'CastleWallJunction',
    M: 'CastleEdge', N: 'CastleEdge', O: 'CastleEdgeRoad', P: 'CastleEdgeRoad',
    Q: 'CastleCenterSide', R: 'CastleCenterSide', S: 'CastleCenterEntry', T: 'CastleCenterEntry',
    U: 'Road', V: 'RoadCurve', W: 'RoadJunctionSmall', X: 'RoadJunctionLarge',
};

export const COR_HEX: Record<Cor, string> = {
    [Cor.AMARELO]: '#e3b23c',
    [Cor.VERMELHO]: '#c2412d',
    [Cor.VERDE]: '#4f9a52',
    [Cor.AZUL]: '#4a6fb5',
    [Cor.PRETO]: '#2b2523',
};

// Posição de cada ponto de borda dentro da cartela, de -0.5 a 0.5 a partir do centro.
export const POSICAO_DO_PONTO: Record<string, [number, number]> = {
    N_O: [-0.33, -0.5], N: [0, -0.5], N_L: [0.33, -0.5],
    L_N: [0.5, -0.33], L: [0.5, 0], L_S: [0.5, 0.33],
    S_L: [0.33, 0.5], S: [0, 0.5], S_O: [-0.33, 0.5],
    O_S: [-0.5, 0.33], O: [-0.5, 0], O_N: [-0.5, -0.33],
};

export const MOVIMENTO_REDUZIDO = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
