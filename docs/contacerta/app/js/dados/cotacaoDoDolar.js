// A última cotação do dólar: buscada pelo aparelho (ao vivo, com o arquivo do site como reserva) e guardada,
// para aparecer também sem internet. O armazenamento e as fontes são injetados (localStorage e fetch no app).
import { FORMATO_DA_COTACAO, momentoDaCotacao, validarCotacao } from '../dominio/cotacaoDoDolar.js';

const CHAVE = 'contacerta:cotacaoDoDolar';

/**
 * @param {{ armazenamento: Pick<Storage, 'getItem' | 'setItem'>, fontes: Array<() => Promise<unknown>> }} dependencias
 *   fontes em ordem de preferência; cada uma devolve a cotação no formato publicado pelo site.
 */
export function criarCotacaoDoDolar({ armazenamento, fontes }) {
  let guardada = lerGuardada();

  function lerGuardada() {
    try {
      return validarCotacao(JSON.parse(armazenamento.getItem(CHAVE)));
    } catch {
      return undefined;
    }
  }

  /** Usa a primeira fonte com cotação válida; sem nenhuma, fica a guardada e o erro sobe para quem chamou. */
  async function atualizar() {
    const falhas = [];
    for (const buscar of fontes) {
      try {
        const publicada = await buscar();
        const cotacao = validarCotacao(publicada);
        armazenamento.setItem(CHAVE, JSON.stringify(publicada));
        guardada = cotacao;
        return cotacao;
      } catch (erro) {
        falhas.push(erro);
      }
    }
    throw new Error(`Cotação do dólar indisponível: ${falhas.map((erro) => erro.message).join('; ')}`, { cause: falhas });
  }

  return {
    /** A última cotação válida que o aparelho conhece, ou undefined se nunca conseguiu buscar. */
    ultima: () => guardada,
    atualizar,
  };
}

/** Arquivo publicado pelo site. Sem cache do navegador: ele muda no mesmo endereço. */
export function criarBuscaDaCotacao(endereco, buscarNaRede = buscarNoNavegador) {
  return () => buscarJson(endereco, buscarNaRede);
}

/** Cotação ao vivo da AwesomeAPI (venda, variação do dia e horário), convertida para o formato do site. */
export function criarBuscaNaAwesomeApi(endereco, buscarNaRede = buscarNoNavegador) {
  return async () => {
    const { USDBRL: cotacao } = await buscarJson(endereco, buscarNaRede);
    const cotadoEm = new Date(Number(cotacao?.timestamp) * 1000);
    return {
      formato: FORMATO_DA_COTACAO,
      moeda: 'USD',
      valor: Number(cotacao?.ask),
      variacaoPercentual: Number(cotacao?.pctChange),
      momento: Number.isNaN(cotadoEm.getTime()) ? undefined : momentoDaCotacao(cotadoEm),
      cotadoEm: Number.isNaN(cotadoEm.getTime()) ? undefined : cotadoEm.toISOString(),
      fonte: 'AwesomeAPI',
    };
  };
}

function buscarNoNavegador(...argumentos) {
  return fetch(...argumentos);
}

async function buscarJson(endereco, buscarNaRede) {
  const resposta = await buscarNaRede(endereco, { cache: 'no-store' });
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status} em ${endereco}`);
  return resposta.json();
}
