import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compararVersoes, ehMaisNova } from '../motor/versoes.mjs';
import { conferirEtiqueta, escolherReleaseMaisNovo, ErroVersaoDoAppInvalida, validarVersaoDoApp } from '../motor/versaoDoApp.mjs';
import { montarAnuncioDoApp, montarVersaoPublica } from '../motor/versaoPublica.mjs';
import { ErroZipInvalido, lerZip } from '../motor/zip.mjs';
import { montarZip } from './apoio/zipDeTeste.mjs';

const sha = (letra) => letra.repeat(64);
const versaoContaCerta = () => ({
  formato: 1,
  app: 'contacerta',
  versao: '3.5.0',
  android: { versao: '3.1.0', codigo: 30100, etiqueta: 'v3.1.0-apk', arquivo: 'ContaCerta-3.1.0.apk', sha256: sha('a') },
  web: { etiqueta: 'v3.5.0', arquivo: 'ContaCerta-web-3.5.0.zip', sha256: sha('b') },
  ios: { tipo: 'pwa' },
});

test('versões comparam por número, não por texto', () => {
  assert.ok(ehMaisNova('3.10.0', '3.9.0'));
  assert.equal(compararVersoes('1.2.3', '1.2.3'), 0);
  assert.throws(() => compararVersoes('3.1', '3.1.0'));
});

test('versao.json válido passa inteiro', () => {
  assert.deepEqual(validarVersaoDoApp(versaoContaCerta(), 'contacerta'), versaoContaCerta());
});

test('versao.json recusa app trocado, formato desconhecido e versão estranha', () => {
  assert.throws(() => validarVersaoDoApp(versaoContaCerta(), 'da-o-papo'), ErroVersaoDoAppInvalida);
  assert.throws(() => validarVersaoDoApp({ ...versaoContaCerta(), formato: 2 }, 'contacerta'), ErroVersaoDoAppInvalida);
  assert.throws(() => validarVersaoDoApp({ ...versaoContaCerta(), versao: 'v3' }, 'contacerta'), ErroVersaoDoAppInvalida);
});

test('versao.json recusa nome de arquivo que sai da pasta e SHA-256 malformado', () => {
  const comCaminho = versaoContaCerta();
  comCaminho.web.arquivo = '../../site/index.html';
  assert.throws(() => validarVersaoDoApp(comCaminho, 'contacerta'), /web.arquivo/);
  const semSha = versaoContaCerta();
  semSha.android.sha256 = 'abc';
  assert.throws(() => validarVersaoDoApp(semSha, 'contacerta'), /android.sha256/);
});

test('versao.json precisa de pelo menos um arquivo para baixar', () => {
  const { android, web, ...semArquivos } = versaoContaCerta();
  assert.throws(() => validarVersaoDoApp(semArquivos, 'contacerta'), /sem android e sem web/);
});

test('o release escolhido é o de versão mais alta com versao.json, não o "mais recente"', () => {
  const release = (tag, arquivos) => ({ tag_name: tag, draft: false, assets: arquivos.map((name) => ({ name })) });
  const releases = [
    release('v3.5.0-apk', ['ContaCerta-3.5.0.apk']),
    release('v3.10.0', ['versao.json']),
    release('v3.9.0', ['versao.json']),
    release('ultima-versao', ['versao.json']),
  ];
  assert.equal(escolherReleaseMaisNovo(releases).tag_name, 'v3.10.0');
  assert.equal(escolherReleaseMaisNovo([release('v1.0.0', ['app.apk'])]), undefined);
});

test('a etiqueta do release precisa bater com a versão de dentro do arquivo', () => {
  assert.throws(() => conferirEtiqueta({ tag_name: 'v3.6.0' }, versaoContaCerta()), /traz a versão 3.5.0/);
  assert.doesNotThrow(() => conferirEtiqueta({ tag_name: 'v3.5.0' }, versaoContaCerta()));
});

test('a versão pública troca etiqueta e arquivo por link e põe o endereço do app web no iOS', () => {
  const publica = montarVersaoPublica(
    versaoContaCerta(),
    { android: { url: 'https://x/apk', tamanho: 10 }, web: { url: 'https://x/zip', tamanho: 5 } },
    { urlDoAppWeb: 'https://site/contacerta/app/', publicadaEm: '2026-11-15T02:32:14Z' },
  );
  assert.deepEqual(publica, {
    formato: 1,
    app: 'contacerta',
    versao: '3.5.0',
    publicadaEm: '2026-11-15T02:32:14Z',
    android: { versao: '3.1.0', codigo: 30100, sha256: sha('a'), url: 'https://x/apk', tamanho: 10 },
    web: { sha256: sha('b'), url: 'https://x/zip', tamanho: 5 },
    ios: { tipo: 'pwa', url: 'https://site/contacerta/app/' },
  });
});

test('cada app ganha o anúncio de atualização no formato que já sabe ler', () => {
  const contacerta = { app: 'contacerta', versao: '3.5.0', android: { versao: '3.1.0', codigo: 30100, url: 'A' }, web: { url: 'Z', sha256: sha('b') } };
  assert.deepEqual(montarAnuncioDoApp(contacerta), { versao: '3.5.0', pacote: 'Z', sha256: sha('b'), versaoMinimaDoApk: '3.1.0', apk: 'A' });
  const daOPapo = { app: 'da-o-papo', versao: '0.4.0', android: { versao: '0.4.0', codigo: 4, url: 'A' } };
  assert.deepEqual(montarAnuncioDoApp(daOPapo), { versao: '0.4.0', codigo: 4, apk: 'A' });
  assert.equal(montarAnuncioDoApp({ app: 'outro' }), undefined);
});

test('o zip é lido com arquivos guardados e em deflate, em subpastas', () => {
  const arquivos = lerZip(montarZip([['index.html', '<h1>oi</h1>', 0], ['js/app.js', 'console.log(1)', 8]]));
  assert.deepEqual([...arquivos.keys()], ['index.html', 'js/app.js']);
  assert.equal(arquivos.get('js/app.js').toString(), 'console.log(1)');
});

test('o zip recusa caminho que escaparia da pasta do app', () => {
  for (const nome of ['../fora.html', '/etc/passwd', 'a/../../b', 'C:/x.js']) {
    assert.throws(() => lerZip(montarZip([[nome, 'x']])), ErroZipInvalido, nome);
  }
  assert.throws(() => lerZip(Buffer.from('não é zip')), ErroZipInvalido);
});
