const path = require('node:path');
const { app, BrowserWindow } = require('electron');

function criarJanela() {
    const janela = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 1280,
        minHeight: 720,
        title: 'Carcassonne',
        backgroundColor: '#2b2f33',
        autoHideMenuBar: true,
    });
    janela.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

app.whenReady().then(criarJanela);

app.on('window-all-closed', () => app.quit());
