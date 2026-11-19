// Para um app: acha a versão mais nova publicada no repositório dele, confere, copia os arquivos para
// os releases deste repositório e atualiza o site (versao.json, atualizacao.json e o app web).
import { createHash } from 'node:crypto';
import { conferirEtiqueta, escolherReleaseMaisNovo, NOME_DO_ARQUIVO_DE_VERSAO, validarVersaoDoApp } from './versaoDoApp.mjs';
import { etiquetaPublica, montarAnuncioDoApp, montarVersaoPublica } from './versaoPublica.mjs';
import { ehMaisNova } from './versoes.mjs';
import { lerZip } from './zip.mjs';

export class ErroIntegridade extends Error {
  constructor(arquivo, esperado, obtido) {
    super(`SHA-256 de ${arquivo} não confere: esperado ${esperado}, veio ${obtido}`);
    this.name = 'ErroIntegridade';
  }
}

const CANAIS_COM_ARQUIVO = ['android', 'web'];
const sha256De = (conteudo) => createHash('sha256').update(conteudo).digest('hex');

/**
 * @param {{ app: string, repositorio: string }} configuracao
 * @param {{ fonte, destino, site, repositorioPublico: string, urlDoSite: string }} dependencias
 *   `fonte`: GitHub com leitura do repositório do app; `destino`: GitHub com escrita neste repositório.
 */
export async function buscarAtualizacao({ app, repositorio }, { fonte, destino, site, repositorioPublico, urlDoSite }) {
  const releases = await fonte.listarReleases(repositorio);
  const release = escolherReleaseMaisNovo(releases);
  if (!release) return { app, situacao: 'sem-versao' };

  const arquivoDeVersao = release.assets.find((arquivo) => arquivo.name === NOME_DO_ARQUIVO_DE_VERSAO);
  const versaoDoApp = validarVersaoDoApp(JSON.parse(await fonte.baixarArquivo(repositorio, arquivoDeVersao)), app);
  conferirEtiqueta(release, versaoDoApp);

  const publicada = await site.lerVersaoPublica(app);
  if (publicada && !ehMaisNova(versaoDoApp.versao, publicada.versao)) {
    return { app, situacao: 'em-dia', versao: publicada.versao };
  }

  async function espelhar(canal) {
    const { etiqueta, arquivo, sha256 } = versaoDoApp[canal];
    const origem = releases.find((r) => r.tag_name === etiqueta) ?? await fonte.buscarRelease(repositorio, etiqueta);
    const arquivoDeOrigem = origem?.assets.find((a) => a.name === arquivo);
    if (!arquivoDeOrigem) throw new Error(`${app}: ${arquivo} não está no release ${etiqueta} de ${repositorio}`);

    const conteudo = await fonte.baixarArquivo(repositorio, arquivoDeOrigem);
    const obtido = sha256De(conteudo);
    if (obtido !== sha256) throw new ErroIntegridade(arquivo, sha256, obtido);

    const etiquetaDoDestino = etiquetaPublica(app, etiqueta);
    const releaseDoDestino = await destino.buscarRelease(repositorioPublico, etiquetaDoDestino)
      ?? await destino.criarRelease(repositorioPublico, {
        etiqueta: etiquetaDoDestino,
        titulo: `${app} ${etiqueta}`,
        notas: `Cópia de ${arquivo} (${etiqueta}), publicada pelo motor da landing page. SHA-256: ${sha256}`,
      });
    if (!releaseDoDestino.assets?.some((a) => a.name === arquivo)) {
      await destino.enviarArquivo(repositorioPublico, releaseDoDestino, arquivo, conteudo);
    }
    const url = `https://github.com/${repositorioPublico}/releases/download/${etiquetaDoDestino}/${arquivo}`;
    return { conteudo, publicado: { url, tamanho: conteudo.length } };
  }

  const espelhados = {};
  for (const canal of CANAIS_COM_ARQUIVO.filter((c) => versaoDoApp[c])) espelhados[canal] = await espelhar(canal);

  const temAppWeb = versaoDoApp.ios?.tipo === 'pwa' && espelhados.web;
  if (temAppWeb) await site.publicarAppWeb(app, lerZip(espelhados.web.conteudo));

  const publicados = Object.fromEntries(Object.entries(espelhados).map(([canal, { publicado }]) => [canal, publicado]));
  const versaoPublica = montarVersaoPublica(versaoDoApp, publicados, {
    urlDoAppWeb: temAppWeb ? `${urlDoSite}${app}/app/` : undefined,
    publicadaEm: release.published_at,
  });
  await site.escreverJson(app, 'versao.json', versaoPublica);
  const anuncio = montarAnuncioDoApp(versaoPublica);
  if (anuncio) await site.escreverJson(app, 'atualizacao.json', anuncio);

  return { app, situacao: 'publicada', versao: versaoDoApp.versao, anterior: publicada?.versao };
}
