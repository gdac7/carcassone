# Carcassonne

Versão digital do jogo de tabuleiro Carcassonne, feita como trabalho da disciplina Projeto de Software.

Jogo base com fazendeiros, de 2 a 5 jogadores, cada um humano ou computador (IA fácil ou difícil). A partida é salva sozinha e pode ser retomada de onde parou.

## Jogar

### No navegador

**[carcassone-eosin.vercel.app](https://carcassone-eosin.vercel.app/)**, sem instalar nada. As partidas salvas ficam no navegador.

### Instalado no computador

Baixe o instalador do seu sistema na [página de releases](https://github.com/gdac7/carcassone/releases/latest), na seção **Assets**. O jogo instalado funciona sem internet.

| Sistema | Arquivo | Tamanho aproximado |
|---|---|---|
| Windows | `.exe` | 124 MB |
| macOS | `.dmg` | 123 MB |
| Linux (Ubuntu, Debian) | `.deb` | 106 MB |
| Linux (qualquer distribuição) | `.AppImage` | 128 MB |

Como o instalador não tem assinatura digital, o sistema avisa na primeira vez:

- **Windows:** em "O Windows protegeu o computador", clique em **Mais informações** e depois em **Executar assim mesmo**.
- **macOS:** arraste o jogo para **Aplicativos**; na primeira vez, clique nele com o botão direito, escolha **Abrir** e confirme.
- **Linux (`.deb`):** dê dois cliques para instalar; o jogo aparece no menu de aplicativos.
- **Linux (`.AppImage`):** dê permissão de execução (`chmod +x`) e abra. No Ubuntu 24.04 ou mais novo, instale antes o FUSE: `sudo apt install libfuse2t64`.

## Desenvolvimento

Requer Node.js 24.

```bash
npm install
npm run dev          # abre o jogo no navegador
npx vitest run       # roda os testes do domínio
npm run app          # abre o jogo como aplicativo (Electron)
npm run instalador   # gera o instalador do sistema atual em release/
```

Os instaladores dos três sistemas são gerados pelo GitHub Actions a cada release publicada e anexados a ela.

## Créditos

As imagens em `public/` (cartelas, meeples, ícones, brasão e destaque) vêm do projeto
[tsaglam/Carcassonne](https://github.com/tsaglam/Carcassonne), distribuído sob a
[Eclipse Public License 2.0](https://github.com/tsaglam/Carcassonne/blob/master/LICENSE).

A música tema, "Minstrel Guild", é de Kevin MacLeod ([incompetech.com](https://incompetech.com)), licenciada sob
[Creative Commons BY 4.0](https://creativecommons.org/licenses/by/4.0/).

A fonte Alegreya é de Huerta Tipográfica, licenciada sob a [SIL Open Font License 1.1](https://openfontlicense.org/).

O jogo Carcassonne foi criado por Klaus-Jürgen Wrede.
