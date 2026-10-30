import Phaser from 'phaser';
import { Cor } from '../dominio/Cor';
import type { Jogador } from '../dominio/Jogador';
import { JogadorHumano } from '../dominio/JogadorHumano';
import { COR_HEX, IMAGEM_POR_TIPO, MOVIMENTO_REDUZIDO, TAMANHO_CARTELA } from './aparencia';
import { som } from './Som';

const CORES_EM_ORDEM = [Cor.AZUL, Cor.VERMELHO, Cor.VERDE, Cor.AMARELO, Cor.PRETO];

export class MenuInicial extends Phaser.Scene {
    private quantidade = 2;

    constructor() {
        super('MenuInicial');
    }

    // As imagens ficam disponíveis para todas as cenas, inclusive a TelaPartida.
    preload(): void {
        for (const nome of new Set(Object.values(IMAGEM_POR_TIPO))) {
            for (let rotacao = 0; rotacao < 4; rotacao++) {
                this.load.image(`${nome}${rotacao}`, `tiles/${nome}${rotacao}.png`);
            }
        }
        this.load.image('brasao', 'emblem.png');
    }

    create(): void {
        this.desenharFundo();
        this.ligarMenu();
        this.mostrar('tela-inicio');
        document.getElementById('menu')!.hidden = false;
        document.addEventListener('pointerdown', () => som.iniciarMusica(), { once: true });
        document.addEventListener('keydown', () => som.iniciarMusica(), { once: true });
    }

    definirJogadores(): Jogador[] {
        const campos = document.querySelectorAll<HTMLInputElement>('#nomes-jogadores input');
        return [...campos].map((campo, i) =>
            new JogadorHumano(campo.value.trim() || `Jogador ${i + 1}`, CORES_EM_ORDEM[i]));
    }

    iniciarJogo(): void {
        document.getElementById('menu')!.hidden = true;
        this.scene.start('TelaPartida', { jogadores: this.definirJogadores() });
    }

    private ligarMenu(): void {
        document.getElementById('jogar')!.addEventListener('click', () => this.mostrar('tela-jogadores'));
        document.getElementById('voltar')!.addEventListener('click', () => this.mostrar('tela-inicio'));
        document.getElementById('comecar')!.addEventListener('click', () => this.iniciarJogo());

        document.querySelectorAll<HTMLInputElement>('input[name="quantidade"]').forEach((opcao) => {
            opcao.addEventListener('change', () => {
                this.quantidade = Number(opcao.value);
                this.listarCamposDeNome();
            });
        });
        this.listarCamposDeNome();
    }

    // Mantém os nomes já digitados ao mudar a quantidade.
    private listarCamposDeNome(): void {
        const lista = document.getElementById('nomes-jogadores')!;
        const digitados = [...lista.querySelectorAll('input')].map((campo) => campo.value);

        lista.replaceChildren(...CORES_EM_ORDEM.slice(0, this.quantidade).map((cor, i) => {
            const item = document.createElement('li');
            item.style.setProperty('--cor-jogador', COR_HEX[cor]);

            const meeple = document.createElement('span');
            meeple.className = 'meeple';
            meeple.setAttribute('aria-hidden', 'true');

            const campo = document.createElement('input');
            campo.type = 'text';
            campo.maxLength = 16;
            campo.placeholder = `Jogador ${i + 1}`;
            campo.value = digitados[i] ?? '';
            campo.setAttribute('aria-label', `Nome do jogador ${i + 1}`);

            item.append(meeple, campo);
            return item;
        }));
    }

    private mostrar(idDaTela: string): void {
        document.querySelectorAll<HTMLElement>('.cartao-menu').forEach((tela) => {
            tela.hidden = tela.id !== idDaTela;
        });
    }

    // Fundo: cartelas aleatórias, desfocadas e escurecidas, deslizando devagar.
    private desenharFundo(): void {
        const nomes = [...new Set(Object.values(IMAGEM_POR_TIPO))];
        // Área generosa, para continuar coberta se a janela for redimensionada ou maximizada.
        const largura = Math.max(this.scale.width, window.screen.width, 2560);
        const altura = Math.max(this.scale.height, window.screen.height, 1440);
        const colunas = Math.ceil(largura / TAMANHO_CARTELA) + 4;
        const linhas = Math.ceil(altura / TAMANHO_CARTELA) + 2;

        for (let x = -2; x < colunas; x++) {
            for (let y = -1; y < linhas; y++) {
                const nome = Phaser.Utils.Array.GetRandom(nomes);
                const rotacao = Phaser.Math.Between(0, 3);
                this.add.image(x * TAMANHO_CARTELA, y * TAMANHO_CARTELA, `${nome}${rotacao}`).setOrigin(0);
            }
        }
        this.cameras.main.postFX?.addBlur(1, 2, 2, 1.2);
        this.add.rectangle(0, 0, largura, altura, 0x1b130e, 0.55)
            .setOrigin(0).setScrollFactor(0);

        if (!MOVIMENTO_REDUZIDO) {
            this.tweens.add({
                targets: this.cameras.main, scrollX: TAMANHO_CARTELA * 2,
                duration: 40000, ease: 'Sine.InOut', yoyo: true, repeat: -1,
            });
        }
    }
}
