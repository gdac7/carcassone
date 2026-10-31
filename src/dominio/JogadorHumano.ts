import { Jogador } from './Jogador';
import type { Jogo } from './Jogo';

export class JogadorHumano extends Jogador {
    // Não faz nada: a tela já foi notificada e executa a jogada quando o usuário clica.
    // _jogo aqui é só para evitar erros de NoUnusedParameters
    iniciarTurno(_jogo: Jogo): void {}
}
