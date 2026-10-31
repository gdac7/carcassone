import Phaser from 'phaser';
import { Cor } from '../dominio/Cor';
import type { Jogador } from '../dominio/Jogador';
import { JogadorHumano } from '../dominio/JogadorHumano';
import { JogadorIA } from '../dominio/JogadorIA';
import { Jogo } from '../dominio/Jogo';
import type { EstrategiaIA } from '../servicos/EstrategiaIA';
import { IADificil } from '../servicos/IADificil';
import { IAFacil } from '../servicos/IAFacil';
import { COR_HEX, IMAGEM_POR_TIPO, MOVIMENTO_REDUZIDO, TAMANHO_CARTELA } from './aparencia';
import { som } from './Som';

const CORES_EM_ORDEM = [Cor.AZUL, Cor.VERMELHO, Cor.VERDE, Cor.AMARELO, Cor.PRETO];

export class MenuInicial extends Phaser.Scene {
    private quantidade = 2;
    private reiniciar = false;

    constructor() {
        super('MenuInicial');
    }

    // `reiniciar`: a TelaPartida pediu outra partida com os mesmos jogadores (o formulário continua preenchido).
    init(dados: { reiniciar?: boolean }): void {
        this.reiniciar = dados.reiniciar ?? false;
    }

    // As imagens ficam disponíveis para todas as cenas, inclusive a TelaPartida.
    preload(): void {
        for (const nome of new Set(Object.values(IMAGEM_POR_TIPO))) {
            for (let rotacao = 0; rotacao < 4; rotacao++) {
                this.load.image(`${nome}${rotacao}`, `tiles/${nome}${rotacao}.png`);
            }
        }
        this.load.image('brasao', 'emblem.png');
        this.load.image('destaque', 'highlight.png');
        this.load.image('seguidor-ESTRADA', 'meeple/meeple_road_template.png');
        this.load.image('seguidor-CIDADE', 'meeple/meeple_castle_template.png');
        this.load.image('seguidor-CAMPO', 'meeple/meeple_fields_template.png');
        this.load.image('seguidor-MOSTEIRO', 'meeple/meeple_monastery_template.png');
    }

    create(): void {
        this.desenharFundo();
        this.ligarMenu();
        this.mostrar('tela-inicio');
        document.getElementById('menu')!.hidden = false;
        document.addEventListener('pointerdown', () => som.iniciarMusica(), { once: true });
        document.addEventListener('keydown', () => som.iniciarMusica(), { once: true });
        if (this.reiniciar) this.iniciarJogo();
    }

    definirJogadores(): Jogador[] {
        const campos = document.querySelectorAll<HTMLInputElement>('#nomes-jogadores input');
        return [...campos].map((campo, i) => {
            const estrategia = this.definirDificuldade(i);
            const nome = campo.value.trim() || `${estrategia ? 'Computador' : 'Jogador'} ${i + 1}`;
            return estrategia
                ? new JogadorIA(nome, CORES_EM_ORDEM[i], estrategia)
                : new JogadorHumano(nome, CORES_EM_ORDEM[i]);
        });
    }

    // null quando o jogador `indice` é humano.
    definirDificuldade(indice: number): EstrategiaIA | null {
        const tipo = document.querySelectorAll<HTMLSelectElement>('#nomes-jogadores select')[indice].value;
        if (tipo === 'facil') return new IAFacil();
        if (tipo === 'dificil') return new IADificil();
        return null;
    }

    // MenuInicial cria o Jogo; a TelaPartida se registra como observadora e começa a partida.
    iniciarJogo(): void {
        document.getElementById('menu')!.hidden = true;
        this.scene.start('TelaPartida', { jogo: new Jogo(), jogadores: this.definirJogadores() });
    }

    // onclick/onchange (e não addEventListener): a cena é recriada ao voltar da partida e não pode acumular cliques.
    private ligarMenu(): void {
        document.getElementById('jogar')!.onclick = () => this.mostrar('tela-jogadores');
        document.getElementById('voltar')!.onclick = () => this.mostrar('tela-inicio');
        document.getElementById('comecar')!.onclick = () => this.iniciarJogo();

        document.querySelectorAll<HTMLInputElement>('input[name="quantidade"]').forEach((opcao) => {
            opcao.onchange = () => {
                this.quantidade = Number(opcao.value);
                this.listarCamposDeNome();
            };
            if (opcao.checked) this.quantidade = Number(opcao.value);
        });
        this.listarCamposDeNome();
    }

    // Mantém os nomes e os tipos já escolhidos ao mudar a quantidade.
    private listarCamposDeNome(): void {
        const lista = document.getElementById('nomes-jogadores')!;
        const digitados = [...lista.querySelectorAll('input')].map((campo) => campo.value);
        const tipos = [...lista.querySelectorAll('select')].map((tipo) => tipo.value);

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

            const tipo = document.createElement('select');
            tipo.setAttribute('aria-label', `Quem controla o jogador ${i + 1}`);
            for (const [valor, rotulo] of [['humano', 'Humano'], ['facil', 'IA fácil'], ['dificil', 'IA difícil']]) {
                tipo.add(new Option(rotulo, valor));
            }
            tipo.value = tipos[i] ?? 'humano';

            item.append(meeple, campo, tipo);
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
        this.add.rectangle(0, 0, largura, altura, 0x2b2f33, 0.6)
            .setOrigin(0).setScrollFactor(0);

        if (!MOVIMENTO_REDUZIDO) {
            this.tweens.add({
                targets: this.cameras.main, scrollX: TAMANHO_CARTELA * 2,
                duration: 40000, ease: 'Sine.InOut', yoyo: true, repeat: -1,
            });
        }
    }
}
