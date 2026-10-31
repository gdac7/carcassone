import type { Jogo } from '../dominio/Jogo';

// Observer: quem quer saber quando a partida muda (a tela) implementa esta interface.
export interface ObservadorJogo {
    aoAtualizar(jogo: Jogo): void;
}
