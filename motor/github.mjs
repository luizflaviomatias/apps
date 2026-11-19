// Adaptador da API REST do GitHub: o motor só conhece estas funções (e os testes trocam por um falso).

export class ErroGitHub extends Error {
  constructor(metodo, caminho, status, detalhe) {
    super(`GitHub ${metodo} ${caminho} respondeu ${status}: ${detalhe}`);
    this.name = 'ErroGitHub';
    this.status = status;
  }
}

const NAO_ENCONTRADO = 404;

/**
 * @param {{ token?: string, fetch?: typeof globalThis.fetch }} opcoes
 * Sem token, só lê repositório público (e com limite baixo de consultas).
 */
export function criarGitHub({ token, fetch = globalThis.fetch } = {}) {
  const cabecalhos = (extras = {}) => ({
    'User-Agent': 'apps-landing-motor',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extras,
  });

  async function pedir(metodo, url, { corpo, aceitar = 'application/vnd.github+json', tipo } = {}) {
    const resposta = await fetch(url, {
      method: metodo,
      headers: cabecalhos({ Accept: aceitar, ...(tipo ? { 'Content-Type': tipo } : {}) }),
      body: corpo,
    });
    if (!resposta.ok) throw new ErroGitHub(metodo, new URL(url).pathname, resposta.status, await resposta.text());
    return resposta;
  }

  const api = (caminho) => `https://api.github.com${caminho}`;

  return {
    async listarReleases(repositorio) {
      return (await pedir('GET', api(`/repos/${repositorio}/releases?per_page=50`))).json();
    },

    /** O release com esta etiqueta, ou undefined se não existe. */
    async buscarRelease(repositorio, etiqueta) {
      try {
        return await (await pedir('GET', api(`/repos/${repositorio}/releases/tags/${encodeURIComponent(etiqueta)}`))).json();
      } catch (erro) {
        if (erro instanceof ErroGitHub && erro.status === NAO_ENCONTRADO) return undefined;
        throw erro;
      }
    },

    /** Funciona em repositório privado: o arquivo vem pela API, não pelo link público. */
    async baixarArquivo(repositorio, arquivo) {
      const resposta = await pedir('GET', api(`/repos/${repositorio}/releases/assets/${arquivo.id}`), {
        aceitar: 'application/octet-stream',
      });
      return Buffer.from(await resposta.arrayBuffer());
    },

    async criarRelease(repositorio, { etiqueta, titulo, notas }) {
      const corpo = JSON.stringify({ tag_name: etiqueta, name: titulo, body: notas, make_latest: 'false' });
      return (await pedir('POST', api(`/repos/${repositorio}/releases`), { corpo, tipo: 'application/json' })).json();
    },

    async enviarArquivo(repositorio, release, nome, conteudo) {
      const url = `https://uploads.github.com/repos/${repositorio}/releases/${release.id}/assets?name=${encodeURIComponent(nome)}`;
      return (await pedir('POST', url, { corpo: conteudo, tipo: 'application/octet-stream' })).json();
    },
  };
}
