import { ehCotacaoDoDia } from '../dominio/cotacaoDoDolar.js';

const SETA = { subiu: '▲', caiu: '▼', igual: '=' };

/**
 * Faixa no topo da tela do mês: valor do dólar, variação do dia e se é a cotação da abertura ou do fechamento.
 * A variação fica em cor neutra (as cores do app já significam entrou, pago e negativo).
 * Cotação que não é de hoje (sem internet, fim de semana, feriado) mostra a data em destaque.
 * Sem nenhuma cotação conhecida, a faixa fica escondida.
 */
export function criarFaixaDoDolar(elemento, { local }) {
  /** @param {{ cotacao?: ReturnType<typeof import('../dominio/cotacaoDoDolar.js').validarCotacao>,
   *           hoje: { ano: number, mes: number, dia: number } }} dados */
  function renderizar({ cotacao, hoje }) {
    elemento.hidden = cotacao === undefined;
    if (cotacao === undefined) return;
    const { t } = local;
    elemento.classList.toggle('cotacao-dolar--antiga', !ehCotacaoDoDia(cotacao, hoje));
    elemento.innerHTML = `
      <span class="cotacao-dolar__icone" aria-hidden="true">US$</span>
      <span class="cotacao-dolar__texto">
        <span class="cotacao-dolar__rotulo">${t('dolar.titulo')}</span>
        <strong class="cotacao-dolar__valor">${local.formatarCotacao(cotacao.valor)}</strong>
      </span>
      <span class="cotacao-dolar__lado">
        <span class="cotacao-dolar__variacao">${SETA[sentido(cotacao.variacaoPercentual)]} ${local.formatarPercentual(Math.abs(cotacao.variacaoPercentual))}</span>
        <span class="cotacao-dolar__momento">${t(`dolar.${cotacao.momento}`, momentoNaTela(cotacao.cotadoEm, hoje, local))}</span>
      </span>`;
  }

  return { renderizar };
}

function sentido(variacao) {
  if (variacao > 0) return 'subiu';
  if (variacao < 0) return 'caiu';
  return 'igual';
}

function momentoNaTela(cotadoEm, hoje, local) {
  const dia = { ano: cotadoEm.getFullYear(), mes: cotadoEm.getMonth(), dia: cotadoEm.getDate() };
  const horario = `${String(cotadoEm.getHours()).padStart(2, '0')}:${String(cotadoEm.getMinutes()).padStart(2, '0')}`;
  return { data: local.formatarDiaCurto(dia, hoje.ano), hora: local.formatarHorario(horario) };
}
