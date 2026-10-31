const CHAVE_VOLUMES = 'carcassonne.volumes';

type Volumes = { musica: number; efeitos: number };

// Música tema e efeitos sonoros. Os efeitos são sintetizados (Web Audio), sem arquivos.
class Som {
    private volumes: Volumes = lerVolumes();
    private readonly musica = new Audio('audio/minstrel-guild.mp3');
    private contexto: AudioContext | null = null;

    constructor() {
        this.musica.loop = true;
        this.musica.volume = this.volumes.musica;
    }

    // Navegadores só tocam áudio depois de uma interação do usuário.
    iniciarMusica(): void {
        if (this.musica.paused) {
            this.musica.play().catch(() => {});
        }
    }

    getVolumes(): Volumes {
        return { ...this.volumes };
    }

    definirVolumeMusica(volume: number): void {
        this.volumes.musica = volume;
        this.musica.volume = volume;
        salvarVolumes(this.volumes);
    }

    definirVolumeEfeitos(volume: number): void {
        this.volumes.efeitos = volume;
        salvarVolumes(this.volumes);
    }

    tocarColocar(): void {
        this.batida(170, 0.18, 0.6);
    }

    tocarGirar(): void {
        this.batida(620, 0.06, 0.25);
    }

    // Um "toc" de madeira: tom curto que cai de altura e some rápido.
    private batida(frequencia: number, duracao: number, intensidade: number): void {
        if (this.volumes.efeitos === 0) return;
        this.contexto ??= new AudioContext();
        const agora = this.contexto.currentTime;

        const oscilador = this.contexto.createOscillator();
        oscilador.type = 'triangle';
        oscilador.frequency.setValueAtTime(frequencia, agora);
        oscilador.frequency.exponentialRampToValueAtTime(frequencia * 0.5, agora + duracao);

        const ganho = this.contexto.createGain();
        ganho.gain.setValueAtTime(intensidade * this.volumes.efeitos, agora);
        ganho.gain.exponentialRampToValueAtTime(0.001, agora + duracao);

        oscilador.connect(ganho).connect(this.contexto.destination);
        oscilador.start(agora);
        oscilador.stop(agora + duracao);
    }
}

function lerVolumes(): Volumes {
    try {
        const salvos = JSON.parse(localStorage.getItem(CHAVE_VOLUMES) ?? '');
        if (typeof salvos.musica === 'number' && typeof salvos.efeitos === 'number') return salvos;
    } catch {
        // sem volumes salvos: usa os padrões
    }
    return { musica: 0.4, efeitos: 0.7 };
}

function salvarVolumes(volumes: Volumes): void {
    try {
        localStorage.setItem(CHAVE_VOLUMES, JSON.stringify(volumes));
    } catch {
        // armazenamento indisponível: os volumes valem só nesta sessão
    }
}

export const som = new Som();
