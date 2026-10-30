import { som } from './Som';

// Liga o diálogo de configurações, aberto tanto pelo menu quanto pela partida.
export function ligarConfiguracoes(): void {
    const dialogo = document.getElementById('configuracoes') as HTMLDialogElement;
    const musica = document.getElementById('volume-musica') as HTMLInputElement;
    const efeitos = document.getElementById('volume-efeitos') as HTMLInputElement;

    const volumes = som.getVolumes();
    musica.value = String(Math.round(volumes.musica * 100));
    efeitos.value = String(Math.round(volumes.efeitos * 100));

    musica.addEventListener('input', () => som.definirVolumeMusica(Number(musica.value) / 100));
    efeitos.addEventListener('input', () => som.definirVolumeEfeitos(Number(efeitos.value) / 100));
    efeitos.addEventListener('change', () => som.tocarColocar());

    document.querySelectorAll('[data-abrir-configuracoes]').forEach((botao) => {
        botao.addEventListener('click', () => dialogo.showModal());
    });
    document.getElementById('fechar-configuracoes')!.addEventListener('click', () => dialogo.close());
}
