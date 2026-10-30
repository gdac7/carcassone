import '@fontsource/alegreya/400.css';
import '@fontsource/alegreya/500.css';
import '@fontsource/alegreya/700.css';
import './ui/estilo.css';
import Phaser from 'phaser';
import { TelaPartida } from './ui/TelaPartida';

new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'tabuleiro',
    backgroundColor: '#3a2b22',
    banner: false,
    scale: { mode: Phaser.Scale.RESIZE },
    scene: [TelaPartida],
});
