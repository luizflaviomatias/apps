import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { buscarAtualizacao, ErroIntegridade } from '../motor/buscarAtualizacao.mjs';
import { montarZip } from './apoio/zipDeTeste.mjs';

const sha256De = (conteudo) => createHash('sha256').update(conteudo).digest('hex');
const REPOSITORIO_PUBLICO = 'eu/apps';

/** GitHub de mentira: releases em memória; guarda o que foi criado e enviado. */
function githubFalso(releases = []) {
  let proximoId = 1;
  const conteudos = new Map();
  const novo = (tag, arquivos = {}) => {
    const release = { id: proximoId++, tag_name: tag, draft: false, published_at: '2026-11-19T10:00:00Z', assets: [] };
    for (const [nome, conteudo] of Object.entries(arquivos)) adicionar(release, nome, conteudo);
    releases.push(release);
    return release;
  };
  function adicionar(release, nome, conteudo) {
    const arquivo = { id: proximoId++, name: nome };
    conteudos.set(arquivo.id, Buffer.from(conteudo));
    release.assets.push(arquivo);
    return arquivo;
  }
  return {
    releases,
    novo,
    envios: [],
    async listarReleases() { return releases; },
    async buscarRelease(_, tag) { return releases.find((r) => r.tag_name === tag); },
    async baixarArquivo(_, arquivo) { return conteudos.get(arquivo.id); },
    async criarRelease(_, { etiqueta }) { return novo(etiqueta); },
    async enviarArquivo(_, release, nome, conteudo) { this.envios.push(nome); return adicionar(release, nome, conteudo); },
  };
}

/** Site em memória. */
function siteFalso(versaoPublicada) {
  const arquivos = {};
  return {
    arquivos,
    appWeb: undefined,
    async lerVersaoPublica() { return versaoPublicada; },
    async escreverJson(app, nome, dados) { arquivos[`${app}/${nome}`] = dados; },
    async publicarAppWeb(app, conteudo) { this.appWeb = [...conteudo.keys()]; },
  };
}

const APK = Buffer.from('apk de verdade');

function daOPapo(versao = '0.5.0', { sha256 = sha256De(APK) } = {}) {
  const versaoJson = { formato: 1, app: 'da-o-papo', versao,
    android: { versao, codigo: 5, etiqueta: `v${versao}`, arquivo: 'da-o-papo.apk', sha256 } };
  const fonte = githubFalso();
  fonte.novo(`v${versao}`, { 'da-o-papo.apk': APK, 'versao.json': JSON.stringify(versaoJson) });
  return fonte;
}

const dependencias = (fonte, destino, site) => ({
  fonte, destino, site, repositorioPublico: REPOSITORIO_PUBLICO, urlDoSite: 'https://site/',
});

test('versão nova: copia o APK, escreve versao.json público e o anúncio do app', async () => {
  const destino = githubFalso();
  const site = siteFalso({ versao: '0.4.0' });
  const resultado = await buscarAtualizacao({ app: 'da-o-papo', repositorio: 'eu/da-o-papo' }, dependencias(daOPapo(), destino, site));

  assert.deepEqual(resultado, { app: 'da-o-papo', situacao: 'publicada', versao: '0.5.0', anterior: '0.4.0' });
  assert.deepEqual(destino.envios, ['da-o-papo.apk']);
  const url = 'https://github.com/eu/apps/releases/download/da-o-papo-v0.5.0/da-o-papo.apk';
  assert.equal(site.arquivos['da-o-papo/versao.json'].android.url, url);
  assert.equal(site.arquivos['da-o-papo/versao.json'].android.tamanho, APK.length);
  assert.deepEqual(site.arquivos['da-o-papo/atualizacao.json'], { versao: '0.5.0', codigo: 5, apk: url });
});

test('versão e versao.json iguais aos publicados: não mexe em nada', async () => {
  const fonte = daOPapo();
  const primeiro = siteFalso(undefined);
  await buscarAtualizacao({ app: 'da-o-papo', repositorio: 'eu/da-o-papo' }, dependencias(fonte, githubFalso(), primeiro));
  const destino = githubFalso();
  const site = siteFalso(primeiro.arquivos['da-o-papo/versao.json']);
  const resultado = await buscarAtualizacao({ app: 'da-o-papo', repositorio: 'eu/da-o-papo' }, dependencias(fonte, destino, site));
  assert.equal(resultado.situacao, 'em-dia');
  assert.deepEqual(destino.envios, []);
  assert.deepEqual(site.arquivos, {});
});

test('mesma versão com versao.json corrigido: publica de novo', async () => {
  const site = siteFalso({ versao: '0.5.0', fonteSha256: 'de um versao.json antigo' });
  const resultado = await buscarAtualizacao({ app: 'da-o-papo', repositorio: 'eu/da-o-papo' }, dependencias(daOPapo(), githubFalso(), site));
  assert.equal(resultado.situacao, 'publicada');
});

test('versão mais antiga que a publicada: nunca volta atrás', async () => {
  const site = siteFalso({ versao: '0.6.0', fonteSha256: 'outro' });
  const resultado = await buscarAtualizacao({ app: 'da-o-papo', repositorio: 'eu/da-o-papo' }, dependencias(daOPapo(), githubFalso(), site));
  assert.equal(resultado.situacao, 'em-dia');
  assert.deepEqual(site.arquivos, {});
});

test('arquivo com SHA-256 diferente do anunciado não é publicado', async () => {
  const destino = githubFalso();
  const site = siteFalso(undefined);
  const fonte = daOPapo('0.5.0', { sha256: 'f'.repeat(64) });
  await assert.rejects(buscarAtualizacao({ app: 'da-o-papo', repositorio: 'eu/da-o-papo' }, dependencias(fonte, destino, site)), ErroIntegridade);
  assert.deepEqual(destino.envios, []);
  assert.deepEqual(site.arquivos, {});
});

test('rodar de novo depois de uma falha no meio não envia o mesmo arquivo duas vezes', async () => {
  const destino = githubFalso();
  destino.novo('da-o-papo-v0.5.0', { 'da-o-papo.apk': APK });
  const site = siteFalso(undefined);
  const resultado = await buscarAtualizacao({ app: 'da-o-papo', repositorio: 'eu/da-o-papo' }, dependencias(daOPapo(), destino, site));
  assert.equal(resultado.situacao, 'publicada');
  assert.deepEqual(destino.envios, []);
});

test('app sem versao.json em nenhum release fica de fora sem erro', async () => {
  const fonte = githubFalso();
  fonte.novo('ultima-versao', { 'da-o-papo.apk': APK });
  const resultado = await buscarAtualizacao({ app: 'da-o-papo', repositorio: 'eu/da-o-papo' }, dependencias(fonte, githubFalso(), siteFalso()));
  assert.equal(resultado.situacao, 'sem-versao');
});

test('ContaCerta: APK mínimo de outro release, pacote web vira o app publicado no site', async () => {
  const pacote = montarZip([['index.html', '<html>'], ['js/app.js', 'x']]);
  const apkMinimo = Buffer.from('apk 3.1.0');
  const versaoJson = { formato: 1, app: 'contacerta', versao: '3.5.0',
    android: { versao: '3.1.0', codigo: 30100, etiqueta: 'v3.1.0-apk', arquivo: 'ContaCerta-3.1.0.apk', sha256: sha256De(apkMinimo) },
    web: { etiqueta: 'v3.5.0', arquivo: 'ContaCerta-web-3.5.0.zip', sha256: sha256De(pacote) },
    ios: { tipo: 'pwa' } };
  const fonte = githubFalso();
  fonte.novo('v3.1.0-apk', { 'ContaCerta-3.1.0.apk': apkMinimo });
  fonte.novo('v3.5.0', { 'ContaCerta-web-3.5.0.zip': pacote, 'versao.json': JSON.stringify(versaoJson) });
  const destino = githubFalso();
  const site = siteFalso(undefined);

  await buscarAtualizacao({ app: 'contacerta', repositorio: 'eu/contacerta' }, dependencias(fonte, destino, site));

  assert.deepEqual(destino.releases.map((r) => r.tag_name), ['contacerta-v3.1.0-apk', 'contacerta-v3.5.0']);
  assert.deepEqual(site.appWeb, ['index.html', 'js/app.js']);
  assert.deepEqual(site.arquivos['contacerta/versao.json'].ios, { tipo: 'pwa', url: 'https://site/contacerta/app/' });
  assert.equal(site.arquivos['contacerta/atualizacao.json'].versaoMinimaDoApk, '3.1.0');
});
