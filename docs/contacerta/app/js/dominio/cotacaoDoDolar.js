// Cotação do dólar comercial (venda), publicada pelo site dos apps na abertura e no fechamento do mercado.

export const MOMENTO_DA_COTACAO = Object.freeze({ ABERTURA: 'abertura', FECHAMENTO: 'fechamento' });
const FORMATO_CONHECIDO = 1;

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
  if (dados?.formato !== FORMATO_CONHECIDO) throw new ErroCotacaoInvalida(`formato ${dados?.formato}`);
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
