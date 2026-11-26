// Cotação do dólar comercial (venda): buscada ao vivo pelo aparelho ou publicada pelo site dos apps.

export const MOMENTO_DA_COTACAO = Object.freeze({ ABERTURA: 'abertura', FECHAMENTO: 'fechamento' });
export const FORMATO_DA_COTACAO = 1;
const FUSO_DO_MERCADO = 'America/Sao_Paulo';
/** A partir desta hora de Brasília a cotação passa a valer como a do fechamento (mesma regra do site). */
const HORA_DO_FECHAMENTO = 13;

export class ErroCotacaoInvalida extends Error {
  constructor(detalhe) {
    super(`Cotação do dólar inválida: ${detalhe}`);
    this.name = 'ErroCotacaoInvalida';
  }
}

/**
 * Confere o arquivo publicado e devolve só o que a tela usa.
 * @returns {{ valor: number, variacaoPercentual: number, momento: string, cotadoEm: Date }}
 */
export function validarCotacao(dados) {
  if (dados?.formato !== FORMATO_DA_COTACAO) throw new ErroCotacaoInvalida(`formato ${dados?.formato}`);
  const { valor, variacaoPercentual, momento } = dados;
  const cotadoEm = new Date(dados.cotadoEm);
  if (!(Number.isFinite(valor) && valor > 0)) throw new ErroCotacaoInvalida(`valor ${valor}`);
  if (!Number.isFinite(variacaoPercentual)) throw new ErroCotacaoInvalida(`variação ${variacaoPercentual}`);
  if (!Object.values(MOMENTO_DA_COTACAO).includes(momento)) throw new ErroCotacaoInvalida(`momento "${momento}"`);
  if (Number.isNaN(cotadoEm.getTime())) throw new ErroCotacaoInvalida(`data "${dados.cotadoEm}"`);
  return { valor, variacaoPercentual, momento, cotadoEm };
}

/** A cotação é do dia informado, no fuso do aparelho? Senão, a tela avisa que ela é antiga. */
export function ehCotacaoDoDia({ cotadoEm }, { ano, mes, dia }) {
  return cotadoEm.getFullYear() === ano && cotadoEm.getMonth() === mes && cotadoEm.getDate() === dia;
}

/** Antes das 13h de Brasília a cotação é da abertura; depois, do fechamento, em qualquer fuso do aparelho. */
export function momentoDaCotacao(cotadoEm) {
  const hora = Number(new Intl.DateTimeFormat('en-US', { timeZone: FUSO_DO_MERCADO, hour: 'numeric', hourCycle: 'h23' })
    .format(cotadoEm));
  return hora < HORA_DO_FECHAMENTO ? MOMENTO_DA_COTACAO.ABERTURA : MOMENTO_DA_COTACAO.FECHAMENTO;
}
