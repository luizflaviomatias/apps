// Os arquivos do site (pasta docs/, publicada pelo GitHub Pages) que o motor lê e escreve.
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

export function criarSite(pastaDoSite) {
  const caminho = (...partes) => resolve(pastaDoSite, ...partes);

  async function escreverArquivo(destino, conteudo) {
    await mkdir(dirname(destino), { recursive: true });
    await writeFile(destino, conteudo);
  }

  return {
    /** A versão que a landing mostra hoje, ou undefined se o app ainda não foi publicado. */
    async lerVersaoPublica(app) {
      try {
        return JSON.parse(await readFile(caminho(app, 'versao.json'), 'utf8'));
      } catch (erro) {
        if (erro.code === 'ENOENT') return undefined;
        throw erro;
      }
    },

    async escreverJson(app, nome, dados) {
      await escreverArquivo(caminho(app, nome), `${JSON.stringify(dados, null, 2)}\n`);
    },

    /** Troca o app web inteiro (docs/<app>/app/) pelo conteúdo do pacote: nada de arquivo velho sobrando. */
    async publicarAppWeb(app, arquivos) {
      const pasta = caminho(app, 'app');
      await rm(pasta, { recursive: true, force: true });
      for (const [nome, conteudo] of arquivos) await escreverArquivo(resolve(pasta, nome), conteudo);
    },
  };
}
