// Cotação do dólar comercial (venda) para os apps: buscada na abertura e no fechamento do mercado e publicada
// em docs/cotacoes/dolar.json. Cada fonte é uma função que devolve a cotação no mesmo formato; a primeira que
// responder vale, e as outras ficam de reserva.

export const FORMATO_DA_COTACAO = 1;
export const MOMENTO_DA_COTACAO = Object.freeze({ ABERTURA: 'abertura', FECHAMENTO: 'fechamento' });

/** Cotação feita antes desta hora (de Brasília) é da abertura; a partir dela, do fechamento. */
const HORA_QUE_SEPARA_ABERTURA_DO_FECHAMENTO = 13;
const FUSO_DO_MERCADO = 'America/Sao_Paulo';
const TEMPO_MAXIMO_DE_ESPERA_MS = 15_000;
const DIAS_PROCURADOS_NA_PTAX = 10;
const CABECALHOS = { 'User-Agent': 'apps-landing-cotacao', Accept: 'application/json' };

export class ErroCotacaoInvalida extends Error {
  constructor(fonte, detalhe) {
    super(`Cotação inválida de ${fonte}: ${detalhe}`);
    this.name = 'ErroCotacaoInvalida';
  }
}

export class ErroCotacaoIndisponivel extends Error {
  constructor(falhas) {
    super(`Nenhuma fonte de cotação respondeu: ${falhas.map((falha) => falha.message).join(' | ')}`);
    this.name = 'ErroCotacaoIndisponivel';
  }
}

/**
 * @typedef {{ venda: number, variacaoPercentual: number, cotadoEm: Date, fonte: string }} Cotacao
 * @param {Array<() => Promise<Cotacao>>} fontes em ordem de preferência
 * @param {{ aoFalhar?: (erro: Error) => void }} [opcoes] avisada a cada fonte que falha, mesmo quando outra responde
 */
export async function buscarCotacaoDoDolar(fontes, { aoFalhar = () => {} } = {}) {
  const falhas = [];
  for (const buscar of fontes) {
    try {
      return validarCotacao(await buscar());
    } catch (erro) {
      aoFalhar(erro);
      falhas.push(erro);
    }
  }
  throw new ErroCotacaoIndisponivel(falhas);
}

/** O arquivo que o site publica e os apps leem. */
export function montarCotacaoPublica({ venda, variacaoPercentual, cotadoEm, fonte }) {
  return {
    formato: FORMATO_DA_COTACAO,
    moeda: 'USD',
    valor: Number(venda.toFixed(4)),
    variacaoPercentual: Number(variacaoPercentual.toFixed(2)),
    momento: momentoDaCotacao(cotadoEm),
    cotadoEm: cotadoEm.toISOString(),
    fonte,
  };
}

export function momentoDaCotacao(cotadoEm) {
  const hora = Number(new Intl.DateTimeFormat('en-US', { timeZone: FUSO_DO_MERCADO, hour: 'numeric', hourCycle: 'h23' }).format(cotadoEm));
  return hora < HORA_QUE_SEPARA_ABERTURA_DO_FECHAMENTO ? MOMENTO_DA_COTACAO.ABERTURA : MOMENTO_DA_COTACAO.FECHAMENTO;
}

/** Dólar comercial em tempo real (AwesomeAPI, gratuita e sem chave). */
export function criarFonteAwesomeApi({ fetch = globalThis.fetch } = {}) {
  return async () => {
    const { USDBRL: cotacao } = await pedirJson(fetch, 'https://economia.awesomeapi.com.br/json/last/USD-BRL', 'AwesomeAPI');
    if (!cotacao) throw new ErroCotacaoInvalida('AwesomeAPI', 'resposta sem USDBRL');
    return {
      venda: Number(cotacao.ask),
      variacaoPercentual: Number(cotacao.pctChange),
      cotadoEm: new Date(Number(cotacao.timestamp) * 1000),
      fonte: 'AwesomeAPI',
    };
  };
}

/** PTAX do Banco Central: uma por dia útil (por volta das 13h); a variação é contra a PTAX anterior. */
export function criarFontePtax({ fetch = globalThis.fetch, agora = () => new Date() } = {}) {
  return async () => {
    const hoje = agora();
    const inicio = new Date(hoje.getTime() - DIAS_PROCURADOS_NA_PTAX * 24 * 60 * 60 * 1000);
    const endereco = 'https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/'
      + 'CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)'
      + `?@dataInicial='${dataDaPtax(inicio)}'&@dataFinalCotacao='${dataDaPtax(hoje)}'&$format=json`;
    const { value: cotacoes } = await pedirJson(fetch, endereco, 'PTAX');
    if (!Array.isArray(cotacoes) || cotacoes.length < 2) throw new ErroCotacaoInvalida('PTAX', 'menos de duas cotações no período');
    const [anterior, ultima] = cotacoes.slice(-2);
    return {
      venda: ultima.cotacaoVenda,
      variacaoPercentual: (ultima.cotacaoVenda / anterior.cotacaoVenda - 1) * 100,
      cotadoEm: new Date(`${ultima.dataHoraCotacao.replace(' ', 'T')}-03:00`),
      fonte: 'Banco Central (PTAX)',
    };
  };
}

async function pedirJson(fetch, endereco, fonte) {
  const resposta = await fetch(endereco, { headers: CABECALHOS, signal: AbortSignal.timeout(TEMPO_MAXIMO_DE_ESPERA_MS) });
  if (!resposta.ok) throw new ErroCotacaoInvalida(fonte, `HTTP ${resposta.status}`);
  return resposta.json();
}

function validarCotacao(cotacao) {
  const { venda, variacaoPercentual, cotadoEm, fonte } = cotacao;
  if (!(Number.isFinite(venda) && venda > 0)) throw new ErroCotacaoInvalida(fonte, `valor ${venda}`);
  if (!Number.isFinite(variacaoPercentual)) throw new ErroCotacaoInvalida(fonte, `variação ${variacaoPercentual}`);
  if (!(cotadoEm instanceof Date) || Number.isNaN(cotadoEm.getTime())) throw new ErroCotacaoInvalida(fonte, 'data da cotação');
  return cotacao;
}

/** A API da PTAX pede a data como MM-DD-AAAA, no dia de Brasília. */
function dataDaPtax(momento) {
  const partes = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: FUSO_DO_MERCADO, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(momento).map(({ type, value }) => [type, value]));
  return `${partes.month}-${partes.day}-${partes.year}`;
}
