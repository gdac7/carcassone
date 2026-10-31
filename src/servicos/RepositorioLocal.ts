import type { Jogo } from '../dominio/Jogo';
import type { RepositorioPartida } from './RepositorioPartida';
import { SerializadorPartida, type PartidaSalva } from './SerializadorPartida';

// Guarda as partidas no armazenamento do navegador (localStorage), uma chave por partida.
// O id é a data de início, então salvar a mesma partida de novo sobrescreve o save.
export class RepositorioLocal implements RepositorioPartida {
    private readonly armazenamento: Storage;
    private readonly prefixo = 'carcassonne.partida.';
    private readonly serializador = new SerializadorPartida();

    constructor(armazenamento: Storage = localStorage) {
        this.armazenamento = armazenamento;
    }

    salvar(jogo: Jogo): boolean {
        try {
            this.armazenamento.setItem(this.prefixo + jogo.getInicio().toISOString(), this.serializador.paraTexto(jogo));
            return true;
        } catch {
            return false;
        }
    }

    // Mais recente primeiro. Ignora o que outras partes do jogo guardam no mesmo armazenamento.
    listar(): PartidaSalva[] {
        const partidas: PartidaSalva[] = [];
        for (let i = 0; i < this.armazenamento.length; i++) {
            const chave = this.armazenamento.key(i);
            if (!chave?.startsWith(this.prefixo)) continue;
            partidas.push(this.serializador.resumir(this.armazenamento.getItem(chave)!));
        }
        return partidas.sort((a, b) => b.inicio.getTime() - a.inicio.getTime());
    }

    carregar(id: string): Jogo {
        const texto = this.armazenamento.getItem(this.prefixo + id);
        if (texto === null) {
            throw new Error(`Não há partida salva com o id ${id}`);
        }
        return this.serializador.deTexto(texto);
    }

    excluir(id: string): void {
        this.armazenamento.removeItem(this.prefixo + id);
    }
}
