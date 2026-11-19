// Ponto de entrada do motor (roda no GitHub Actions): node motor/principal.mjs
// FONTE_TOKEN: leitura dos repositórios dos apps (obrigatório quando eles forem privados).
// GITHUB_TOKEN: escrita nos releases deste repositório.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buscarAtualizacao } from './buscarAtualizacao.mjs';
import { criarGitHub } from './github.mjs';
import { criarSite } from './site.mjs';

const RAIZ = resolve(fileURLToPath(new URL('..', import.meta.url)));
const configuracao = JSON.parse(await readFile(resolve(RAIZ, 'apps.json'), 'utf8'));

const dependencias = {
  fonte: criarGitHub({ token: process.env.FONTE_TOKEN || process.env.GITHUB_TOKEN }),
  destino: criarGitHub({ token: process.env.GITHUB_TOKEN }),
  site: criarSite(resolve(RAIZ, 'docs')),
  repositorioPublico: configuracao.repositorioPublico,
  urlDoSite: configuracao.urlDoSite,
};

let algumFalhou = false;
for (const app of configuracao.apps) {
  try {
    const resultado = await buscarAtualizacao(app, dependencias);
    const detalhe = resultado.situacao === 'publicada' ? ` ${resultado.anterior ?? '(primeira)'} → ${resultado.versao}` : ` ${resultado.versao ?? ''}`;
    console.log(`${app.app}: ${resultado.situacao}${detalhe}`);
  } catch (erro) {
    // Um app com problema não impede os outros de serem publicados.
    algumFalhou = true;
    console.error(`${app.app}: FALHOU — ${erro.message}`);
  }
}
process.exitCode = algumFalhou ? 1 : 0;
