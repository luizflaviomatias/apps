// Assinatura do app: guarda o código do aparelho e a licença, confere ao abrir e busca a do mês seguinte no emissor.
import {
  APP_DA_LICENCA, MOTIVO, conferirLicenca, estaPertoDeVencer, gerarCodigoDoAparelho, importarChavePublica, montarLinkDeAssinatura,
} from './dominio/licenca.js';

const CHAVE_DO_APARELHO = 'contacerta:codigoDoAparelho';
const CHAVE_DA_LICENCA = 'contacerta:licenca';

/** Sem resposta neste tempo, segue como "sem internet" para não prender a abertura do app. */
const TEMPO_MAXIMO_DO_PEDIDO_MS = 8000;

export class ErroEmissorDeLicencas extends Error {}

/**
 * Pede ao emissor a licença deste aparelho. Sem assinatura paga, devolve null.
 * @param {string} endereco ex.: https://licencas.exemplo.workers.dev
 */
export function criarBuscaDeLicenca(endereco, buscar = (...argumentos) => fetch(...argumentos)) {
  return async (aparelho) => {
    const url = `${endereco}/licenca?app=${APP_DA_LICENCA}&aparelho=${encodeURIComponent(aparelho)}`;
    const resposta = await buscar(url, { cache: 'no-store', signal: AbortSignal.timeout(TEMPO_MAXIMO_DO_PEDIDO_MS) });
    if (resposta.status === 404) return null;
    if (!resposta.ok) throw new ErroEmissorDeLicencas(`Emissor de licenças respondeu ${resposta.status}`);
    return (await resposta.json()).chave;
  };
}

/**
 * @param {{ armazenamento: Pick<Storage, 'getItem' | 'setItem'>, chavePublica: JsonWebKey, linkDoStripe: string,
 *           buscarLicenca: (aparelho: string) => Promise<string | null>, agora?: () => number }} dependencias
 */
export function criarLicenciamento({ armazenamento, chavePublica, linkDoStripe, buscarLicenca, agora = Date.now }) {
  const chavePublicaImportada = importarChavePublica(chavePublica);

  function codigoDoAparelho() {
    const salvo = armazenamento.getItem(CHAVE_DO_APARELHO);
    if (salvo) return salvo;
    const novo = gerarCodigoDoAparelho();
    armazenamento.setItem(CHAVE_DO_APARELHO, novo);
    return novo;
  }

  async function conferir(chave) {
    return conferirLicenca(await chavePublicaImportada, chave, { aparelho: codigoDoAparelho(), agora: agora() });
  }

  /** Confere e, se valer, guarda. Licença recusada nunca apaga a que já estava guardada. */
  async function guardarSeValer(chave) {
    const resultado = await conferir(chave);
    if (resultado.ok) armazenamento.setItem(CHAVE_DA_LICENCA, chave.trim());
    return resultado;
  }

  /** Busca no emissor. Sem internet, devolve o motivo de antes marcado com semConexao. */
  async function renovar() {
    try {
      const chave = await buscarLicenca(codigoDoAparelho());
      return chave ? await guardarSeValer(chave) : { ok: false, motivo: MOTIVO.SEM_LICENCA };
    } catch (erro) {
      console.warn('Licença não renovada agora.', erro);
      return { ...(await conferir(armazenamento.getItem(CHAVE_DA_LICENCA))), semConexao: true };
    }
  }

  /** Ao abrir: vale a guardada; se faltar pouco para vencer (ou já venceu), tenta a nova antes de decidir. */
  async function verificar() {
    const guardada = await conferir(armazenamento.getItem(CHAVE_DA_LICENCA));
    if (guardada.ok && !estaPertoDeVencer(guardada.expiraEm, agora())) return guardada;
    const renovada = await renovar();
    if (guardada.ok && !renovada.ok) return guardada;
    return guardada.ok && renovada.semConexao ? guardada : renovada;
  }

  return {
    codigoDoAparelho,
    verificar,
    renovar,
    /** Chave colada à mão (ex.: recebida por mensagem), para quando o app não alcança o emissor. */
    ativar: guardarSeValer,
    linkDeAssinatura: () => montarLinkDeAssinatura(linkDoStripe, codigoDoAparelho()),
  };
}
