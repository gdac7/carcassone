import '@fontsource/alegreya/400.css';
import '@fontsource/alegreya/500.css';
import '@fontsource/alegreya/700.css';
import './ui/estilo.css';
import Phaser from 'phaser';
import { ligarConfiguracoes } from './ui/configuracoes';
import { MenuInicial } from './ui/MenuInicial';
import { TelaPartida } from './ui/TelaPartida';

ligarConfiguracoes();

new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'tabuleiro',
    backgroundColor: '#3a2b22',
    banner: false,
    scale: { mode: Phaser.Scale.RESIZE },
    scene: [MenuInicial, TelaPartida],
});
