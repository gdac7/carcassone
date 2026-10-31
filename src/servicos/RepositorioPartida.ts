import type { Jogo } from '../dominio/Jogo';
import type { PartidaSalva } from './SerializadorPartida';

// Protected Variations: a interface só conhece "onde guardar partidas", não como.
// Trocar o localStorage por arquivos em pasta seria outra classe com esta mesma interface.
export interface RepositorioPartida {
    salvar(jogo: Jogo): boolean;
    listar(): PartidaSalva[];
    carregar(id: string): Jogo;
    excluir(id: string): void;
}
