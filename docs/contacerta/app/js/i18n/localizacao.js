// Textos, nomes de meses e dinheiro no idioma e na moeda escolhidos.
import { VALORES } from '../dados/preferencias.js';
import { criarFormatoDeDinheiro } from '../dominio/dinheiro.js';
import enUS from './textos/en-US.js';
import esES from './textos/es-ES.js';
import ptBR from './textos/pt-BR.js';

export const TEXTOS_POR_IDIOMA = Object.freeze({ 'pt-BR': ptBR, 'es-ES': esES, 'en-US': enUS });

const ANO_DE_REFERENCIA = 2000;
const TAMANHO_DO_NOME_ABREVIADO = 3;
const VALOR_DE_EXEMPLO_CENTAVOS = 15000;
/** O que aparece no lugar de um valor em dinheiro quando a pessoa escolheu ocultar os valores. */
export const VALOR_OCULTO = '••••';

export class ErroTextoSemTraducao extends Error {
  constructor(chave, idioma) {
    super(`Texto "${chave}" sem tradução para ${idioma}`);
    this.name = 'ErroTextoSemTraducao';
  }
}

/**
 * Localização trocável em tempo de execução: quem a recebe sempre usa o idioma e a moeda atuais.
 * @param {{ idioma: string, moeda: string, valores?: string }} configuracaoInicial
 * Com `valores` ocultos, `formatarMoeda` devolve o símbolo da moeda e `VALOR_OCULTO` no lugar do número.
 */
export function criarLocalizacao(configuracaoInicial) {
  let idioma;
  let textos;
  let regrasDePlural;
  let formatoDoMes;
  let formatoDeLista;
  let formatoDoHorario;
  let formatoDoDiaCurto;
  let formatoDoDiaCurtoComAno;
  let dinheiro;
  let valoresOcultos;

  function configurar(configuracao) {
    valoresOcultos = configuracao.valores === VALORES.OCULTOS;
    idioma = configuracao.idioma;
    textos = TEXTOS_POR_IDIOMA[idioma];
    regrasDePlural = new Intl.PluralRules(idioma);
    formatoDoMes = new Intl.DateTimeFormat(idioma, { month: 'long' });
    formatoDeLista = new Intl.ListFormat(idioma, { style: 'long', type: 'conjunction' });
    formatoDoHorario = new Intl.DateTimeFormat(idioma, { hour: 'numeric', minute: '2-digit' });
    formatoDoDiaCurto = new Intl.DateTimeFormat(idioma, { day: '2-digit', month: '2-digit' });
    formatoDoDiaCurtoComAno = new Intl.DateTimeFormat(idioma, { day: '2-digit', month: '2-digit', year: '2-digit' });
    dinheiro = criarFormatoDeDinheiro(configuracao);
  }

  /** `t('contas.emAberto', { n: 3 })` → "3 contas em aberto". */
  function t(chave, valores = {}) {
    const entrada = textos[chave];
    if (entrada === undefined) throw new ErroTextoSemTraducao(chave, idioma);
    const modelo = typeof entrada === 'string' ? entrada : entrada[regrasDePlural.select(valores.n)] ?? entrada.other;
    return modelo.replace(/\{(\w+)\}/g, (marcador, nome) => (nome in valores ? String(valores[nome]) : marcador));
  }

  function nomeDoMes(mes) {
    const nome = formatoDoMes.format(new Date(ANO_DE_REFERENCIA, mes, 1));
    return nome.charAt(0).toLocaleUpperCase(idioma) + nome.slice(1);
  }

  configurar(configuracaoInicial);

  return {
    configurar,
    t,
    nomeDoMes,
    nomeAbreviadoDoMes: (mes) => nomeDoMes(mes).slice(0, TAMANHO_DO_NOME_ABREVIADO),
    mesEAno: ({ ano, mes }) => t('data.mesEAno', { mes: nomeDoMes(mes), ano }),
    /** ['Luz', 'Água', 'Gás'] → "Luz, Água e Gás" no idioma atual. */
    listar: (itens) => formatoDeLista.format(itens),
    /** "18:00" → "18:00" em português, "6:00 PM" em inglês. */
    formatarHorario: (horario) => {
      const [hora, minuto] = horario.split(':').map(Number);
      return formatoDoHorario.format(new Date(2000, 0, 1, hora, minuto));
    },
    /** Dia curto, com o ano só quando não é o ano atual: "26/11" ou "26/11/25" em português, "11/26" em inglês. */
    formatarDiaCurto: ({ ano, mes, dia }, anoAtual) => {
      const formato = ano === anoAtual ? formatoDoDiaCurto : formatoDoDiaCurtoComAno;
      return formato.format(new Date(ano, mes, dia));
    },
    formatarMoeda: (centavos) => (valoresOcultos ? `${dinheiro.simboloDaMoeda} ${VALOR_OCULTO}` : dinheiro.formatarMoeda(centavos)),
    formatarMoedaResumida: (centavos) => (valoresOcultos ? VALOR_OCULTO : dinheiro.formatarMoedaResumida(centavos)),
    valoresEstaoOcultos: () => valoresOcultos,
    formatarParaEdicao: (centavos) => dinheiro.formatarParaEdicao(centavos),
    converterParaCentavos: (texto) => dinheiro.converterParaCentavos(texto),
    simboloDaMoeda: () => dinheiro.simboloDaMoeda,
    valorDeExemplo: () => dinheiro.formatarParaEdicao(VALOR_DE_EXEMPLO_CENTAVOS),
    idioma: () => idioma,
  };
}

/**
 * Preenche os textos fixos da página: `data-i18n` (texto), `data-i18n-html` (texto com marcação
 * vinda dos dicionários), `data-i18n-aria` (aria-label) e `data-i18n-title` (dica ao segurar).
 */
export function aplicarTextosNaPagina(raiz, local) {
  for (const elemento of raiz.querySelectorAll('[data-i18n]')) elemento.textContent = local.t(elemento.dataset.i18n);
  for (const elemento of raiz.querySelectorAll('[data-i18n-html]')) elemento.innerHTML = local.t(elemento.dataset.i18nHtml);
  for (const elemento of raiz.querySelectorAll('[data-i18n-aria]')) {
    elemento.setAttribute('aria-label', local.t(elemento.dataset.i18nAria));
  }
  for (const elemento of raiz.querySelectorAll('[data-i18n-title]')) elemento.title = local.t(elemento.dataset.i18nTitle);
}
