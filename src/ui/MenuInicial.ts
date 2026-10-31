import Phaser from 'phaser';
import { Cor } from '../dominio/Cor';
import type { Jogador } from '../dominio/Jogador';
import { JogadorHumano } from '../dominio/JogadorHumano';
import { JogadorIA } from '../dominio/JogadorIA';
import { Jogo } from '../dominio/Jogo';
import type { EstrategiaIA } from '../servicos/EstrategiaIA';
import { IADificil } from '../servicos/IADificil';
import { IAFacil } from '../servicos/IAFacil';
import { RepositorioLocal } from '../servicos/RepositorioLocal';
import type { RepositorioPartida } from '../servicos/RepositorioPartida';
import type { PartidaSalva } from '../servicos/SerializadorPartida';
import { COR_HEX, IMAGEM_POR_TIPO, MOVIMENTO_REDUZIDO, TAMANHO_CARTELA } from './aparencia';
import { som } from './Som';

const CORES_EM_ORDEM = [Cor.AZUL, Cor.VERMELHO, Cor.VERDE, Cor.AMARELO, Cor.PRETO];
const ICONE_LIXEIRA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-3 6h12l-1 12H7L6 9Zm4 2v8h2v-8h-2Zm4 0v8h2v-8h-2Z" /></svg>';

export class MenuInicial extends Phaser.Scene {
    private repositorio: RepositorioPartida = new RepositorioLocal();
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
        this.listarPartidasSalvas();
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
        this.scene.start('TelaPartida', { jogo: new Jogo(), jogadores: this.definirJogadores(), repositorio: this.repositorio });
    }

    // O repositório recria o Jogo repetindo as jogadas salvas; a TelaPartida continua dali.
    carregarJogo(id: string): void {
        let jogo: Jogo;
        try {
            jogo = this.repositorio.carregar(id);
        } catch {
            document.getElementById('erro-carregar')!.hidden = false;
            return;
        }
        // Assim "Reiniciar" na partida carregada começa outra com os mesmos jogadores.
        this.preencherFormulario(jogo.getJogadores());
        document.getElementById('menu')!.hidden = true;
        this.scene.start('TelaPartida', { jogo, repositorio: this.repositorio });
    }

    // onclick/onchange (e não addEventListener): a cena é recriada ao voltar da partida e não pode acumular cliques.
    private ligarMenu(): void {
        document.getElementById('jogar')!.onclick = () => this.mostrar('tela-jogadores');
        document.getElementById('voltar')!.onclick = () => this.mostrar('tela-inicio');
        document.getElementById('comecar')!.onclick = () => this.iniciarJogo();
        document.getElementById('continuar')!.onclick = () => this.mostrar('tela-continuar');
        document.getElementById('voltar-continuar')!.onclick = () => this.mostrar('tela-inicio');

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

    // "Continuar partida" só aparece quando há alguma salva.
    private listarPartidasSalvas(): void {
        const partidas = this.repositorio.listar();
        document.getElementById('continuar')!.hidden = partidas.length === 0;
        document.getElementById('erro-carregar')!.hidden = true;
        document.getElementById('partidas-salvas')!.replaceChildren(...partidas.map((partida) => {
            const item = document.createElement('li');
            item.className = 'linha-partida';
            this.mostrarPartida(item, partida);
            return item;
        }));
    }

    private mostrarPartida(item: HTMLLIElement, partida: PartidaSalva): void {
        const carregar = document.createElement('button');
        carregar.type = 'button';
        carregar.className = 'partida-salva';
        carregar.innerHTML = '<span class="data"></span><span class="rodada"></span><span class="quem"></span>';
        carregar.querySelector('.data')!.textContent = descreverData(partida);
        carregar.querySelector('.rodada')!.textContent = `rodada ${partida.rodada}`;
        carregar.querySelector('.quem')!.textContent = partida.jogadores.join(', ');
        carregar.onclick = () => this.carregarJogo(partida.id);

        const excluir = document.createElement('button');
        excluir.type = 'button';
        excluir.className = 'botao-icone botao-excluir';
        excluir.title = 'Excluir partida';
        excluir.setAttribute('aria-label', `Excluir a partida de ${descreverData(partida)}`);
        excluir.innerHTML = ICONE_LIXEIRA;
        excluir.onclick = () => this.confirmarExclusao(item, partida);

        item.replaceChildren(carregar, excluir);
        item.classList.remove('confirmando');
    }

    // A confirmação aparece no lugar da própria linha: excluir não tem volta.
    private confirmarExclusao(item: HTMLLIElement, partida: PartidaSalva): void {
        const pergunta = document.createElement('p');
        pergunta.textContent = `Excluir a partida de ${descreverData(partida)}?`;

        const cancelar = document.createElement('button');
        cancelar.type = 'button';
        cancelar.className = 'botao botao-secundario';
        cancelar.textContent = 'Cancelar';
        cancelar.onclick = () => {
            this.mostrarPartida(item, partida);
            item.querySelector<HTMLButtonElement>('.botao-excluir')!.focus();
        };

        const confirmar = document.createElement('button');
        confirmar.type = 'button';
        confirmar.className = 'botao botao-perigo';
        confirmar.textContent = 'Excluir';
        confirmar.onclick = () => {
            this.repositorio.excluir(partida.id);
            this.listarPartidasSalvas();
            if (this.repositorio.listar().length === 0) this.mostrar('tela-inicio');
        };

        item.replaceChildren(pergunta, cancelar, confirmar);
        item.classList.add('confirmando');
        cancelar.focus();
    }

    // No formulário, a cor vem da linha; por isso os jogadores voltam na ordem das cores, e não na sorteada.
    private preencherFormulario(jogadoresDaPartida: Jogador[]): void {
        const jogadores = [...jogadoresDaPartida]
            .sort((a, b) => CORES_EM_ORDEM.indexOf(a.getCor()) - CORES_EM_ORDEM.indexOf(b.getCor()));
        this.quantidade = jogadores.length;
        document.querySelectorAll<HTMLInputElement>('input[name="quantidade"]').forEach((opcao) => {
            opcao.checked = Number(opcao.value) === jogadores.length;
        });
        this.listarCamposDeNome();
        const campos = document.querySelectorAll<HTMLInputElement>('#nomes-jogadores input');
        const tipos = document.querySelectorAll<HTMLSelectElement>('#nomes-jogadores select');
        jogadores.forEach((jogador, i) => {
            campos[i].value = jogador.getNome();
            tipos[i].value = !(jogador instanceof JogadorIA) ? 'humano'
                : jogador.getEstrategia() instanceof IADificil ? 'dificil' : 'facil';
        });
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

function descreverData(partida: PartidaSalva): string {
    const dia = partida.inicio.toLocaleDateString('pt-BR');
    const hora = partida.inicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${dia} às ${hora}`;
}
