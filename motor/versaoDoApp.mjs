// O versao.json (formato 1) que cada app publica no próprio release, e a escolha do release mais novo.
import { compararVersoes, ehVersaoValida } from './versoes.mjs';

export const NOME_DO_ARQUIVO_DE_VERSAO = 'versao.json';
const FORMATO_ACEITO = 1;
const SHA256_EM_HEXADECIMAL = /^[0-9a-f]{64}$/;
// Etiqueta e arquivo viram parte de um caminho: nada de "/", "..", espaço ou caractere estranho.
const NOME_SEGURO = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const TIPOS_DE_IOS = new Set(['pwa', 'testflight', 'appstore']);

export class ErroVersaoDoAppInvalida extends Error {
  constructor(app, motivo) {
    super(`versao.json de ${app} inválido: ${motivo}`);
    this.name = 'ErroVersaoDoAppInvalida';
  }
}

/** Confere tudo antes de usar: o arquivo vem de outro repositório e decide o que vai para o público. */
export function validarVersaoDoApp(dados, appEsperado) {
  const falhar = (motivo) => { throw new ErroVersaoDoAppInvalida(appEsperado, motivo); };
  if (dados?.formato !== FORMATO_ACEITO) falhar(`formato ${dados?.formato}`);
  if (dados.app !== appEsperado) falhar(`app "${dados.app}"`);
  if (!ehVersaoValida(dados.versao)) falhar(`versão "${dados.versao}"`);
  if (!dados.android && !dados.web) falhar('sem android e sem web');

  const conferirArquivo = (canal) => {
    const { etiqueta, arquivo, sha256 } = dados[canal];
    if (!NOME_SEGURO.test(String(etiqueta))) falhar(`${canal}.etiqueta "${etiqueta}"`);
    if (!NOME_SEGURO.test(String(arquivo))) falhar(`${canal}.arquivo "${arquivo}"`);
    if (!SHA256_EM_HEXADECIMAL.test(String(sha256))) falhar(`${canal}.sha256`);
  };
  if (dados.android) {
    conferirArquivo('android');
    if (!ehVersaoValida(dados.android.versao)) falhar(`android.versao "${dados.android.versao}"`);
    if (!Number.isInteger(dados.android.codigo) || dados.android.codigo <= 0) falhar(`android.codigo ${dados.android.codigo}`);
    const { versaoMinima } = dados.android;
    if (versaoMinima !== undefined && (!ehVersaoValida(versaoMinima) || compararVersoes(versaoMinima, dados.android.versao) > 0)) {
      falhar(`android.versaoMinima "${versaoMinima}"`);
    }
  }
  if (dados.web) conferirArquivo('web');
  if (dados.ios && !TIPOS_DE_IOS.has(dados.ios.tipo)) falhar(`ios.tipo "${dados.ios.tipo}"`);
  return dados;
}

const versaoDaEtiqueta = (etiqueta) => String(etiqueta).replace(/^v/, '');

/**
 * Entre os releases que trazem versao.json, o de versão mais alta (a etiqueta é "v" + versão).
 * Não confia no "latest" do GitHub: no ContaCerta o mais recente costuma ser o release do APK.
 */
export function escolherReleaseMaisNovo(releases) {
  return releases
    .filter((release) => !release.draft && ehVersaoValida(versaoDaEtiqueta(release.tag_name)))
    .filter((release) => release.assets.some((arquivo) => arquivo.name === NOME_DO_ARQUIVO_DE_VERSAO))
    .sort((a, b) => compararVersoes(versaoDaEtiqueta(b.tag_name), versaoDaEtiqueta(a.tag_name)))[0];
}

/** A etiqueta do release precisa bater com a versão de dentro do arquivo. */
export function conferirEtiqueta(release, versaoDoApp) {
  if (versaoDaEtiqueta(release.tag_name) !== versaoDoApp.versao) {
    throw new ErroVersaoDoAppInvalida(versaoDoApp.app, `release ${release.tag_name} traz a versão ${versaoDoApp.versao}`);
  }
}
