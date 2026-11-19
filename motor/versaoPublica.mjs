// O que a landing page publica para o público: docs/<app>/versao.json, com links de verdade,
// e o atualizacao.json no formato que cada app instalado já sabe ler.

/** Release deste repositório que guarda um arquivo do app: "contacerta-v3.5.0", "da-o-papo-v0.4.0". */
export const etiquetaPublica = (app, etiquetaDoApp) => `${app}-${etiquetaDoApp}`;

/**
 * @param {object} versaoDoApp versao.json validado
 * @param {{ [canal: string]: { url: string, tamanho: number } }} arquivos o que já foi publicado, por canal
 * @param {{ urlDoAppWeb?: string, publicadaEm: string, fonteSha256: string }} extras
 *   `fonteSha256`: impressão do versao.json de origem, para notar quando ele muda sem mudar a versão.
 */
export function montarVersaoPublica(versaoDoApp, arquivos, { urlDoAppWeb, publicadaEm, fonteSha256 }) {
  const publica = { formato: 1, app: versaoDoApp.app, versao: versaoDoApp.versao, publicadaEm, fonteSha256 };
  if (versaoDoApp.android) {
    const { versao, codigo, versaoMinima = versao, sha256 } = versaoDoApp.android;
    publica.android = { versao, codigo, versaoMinima, sha256, url: arquivos.android.url, tamanho: arquivos.android.tamanho };
  }
  if (versaoDoApp.web) {
    publica.web = { sha256: versaoDoApp.web.sha256, url: arquivos.web.url, tamanho: arquivos.web.tamanho };
  }
  if (versaoDoApp.ios) {
    publica.ios = versaoDoApp.ios.tipo === 'pwa'
      ? { tipo: 'pwa', url: urlDoAppWeb }
      : { tipo: versaoDoApp.ios.tipo, url: versaoDoApp.ios.url };
  }
  return publica;
}

/** Cada app lê o anúncio de atualização num formato próprio. App sem anúncio: só a landing usa. */
/** Apps com atualizador de pacote web (Capgo): baixam o pacote, ou o APK quando ele ficou velho demais. */
const anuncioDePacoteWebEApk = (publica) => ({
  versao: publica.versao,
  pacote: publica.web.url,
  sha256: publica.web.sha256,
  versaoMinimaDoApk: publica.android.versaoMinima,
  apk: publica.android.url,
});

const ANUNCIOS_DOS_APPS = {
  'da-o-papo': (publica) => ({ versao: publica.android.versao, codigo: publica.android.codigo, apk: publica.android.url }),
  contacerta: anuncioDePacoteWebEApk,
  radiestesiapro: anuncioDePacoteWebEApk,
};

export function montarAnuncioDoApp(publica) {
  return ANUNCIOS_DOS_APPS[publica.app]?.(publica);
}
