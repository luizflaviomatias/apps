// A última cotação do dólar: buscada no site dos apps e guardada no aparelho, para aparecer também sem internet.
// O armazenamento e a busca são injetados (localStorage e fetch no app; falsos nos testes).
import { validarCotacao } from '../dominio/cotacaoDoDolar.js';

const CHAVE = 'contacerta:cotacaoDoDolar';

/**
 * @param {{ armazenamento: Pick<Storage, 'getItem' | 'setItem'>, buscar: () => Promise<unknown> }} dependencias
 */
export function criarCotacaoDoDolar({ armazenamento, buscar }) {
  let guardada = lerGuardada();

  function lerGuardada() {
    try {
      return validarCotacao(JSON.parse(armazenamento.getItem(CHAVE)));
    } catch {
      return undefined;
    }
  }

  /** Busca a cotação publicada; só troca a guardada se a nova for válida. Erros de rede sobem para quem chamou. */
  async function atualizar() {
    const publicada = await buscar();
    const cotacao = validarCotacao(publicada);
    armazenamento.setItem(CHAVE, JSON.stringify(publicada));
    guardada = cotacao;
    return cotacao;
  }

  return {
    /** A última cotação válida que o aparelho conhece, ou undefined se nunca conseguiu buscar. */
    ultima: () => guardada,
    atualizar,
  };
}

/** Busca sem cache do navegador: o arquivo muda duas vezes por dia no mesmo endereço. */
export function criarBuscaDaCotacao(endereco, buscarNaRede = (...argumentos) => fetch(...argumentos)) {
  return async () => {
    const resposta = await buscarNaRede(endereco, { cache: 'no-store' });
    if (!resposta.ok) throw new Error(`Cotação do dólar indisponível (HTTP ${resposta.status})`);
    return resposta.json();
  };
}
