import { cabecalhoDePeriodo, ouvirTrocaDePeriodo } from './cabecalhoDePeriodo.js';
import { SEM_CATEGORIA, cartoesDosGrupos, percentual } from './gastosPorGrupo.js';

/** Folga entre as fatias, em pontos percentuais da volta, para o fundo aparecer entre elas. */
const FOLGA_ENTRE_FATIAS = 0.8;

/**
 * Relatório "Gráfico de gastos": pizza do mês com uma fatia por grupo (mais a dos gastos sem categoria)
 * e, abaixo, cada grupo aberto nas suas categorias. A cor de cada grupo é sempre a mesma.
 */
export function criarPainelGraficoDeGastos(container, { local, aoTrocarMes }) {
  ouvirTrocaDePeriodo(container, aoTrocarMes);

  /** @param {{ ano: number, mes: number, resumo: ReturnType<import('../dominio/gastosPorCategoria.js').resumirGastosPorCategoria> }} dados */
  function renderizar({ ano, mes, resumo }) {
    const { t } = local;
    container.innerHTML = `
      ${cabecalhoDePeriodo({
        titulo: local.mesEAno({ ano, mes }), rotuloAnterior: t('periodo.mesAnterior'), rotuloSeguinte: t('periodo.mesSeguinte'),
      })}
      ${resumo.totalCentavos === 0
        ? `<p class="cartao lista-vazia">${t('grafico.nenhumGasto')}</p>`
        : `${pizza(resumo, local)}${cartoesDosGrupos(resumo, local)}`}`;
  }

  return { renderizar };
}

function fatiasDoResumo({ grupos, semCategoriaCentavos }) {
  return [
    ...grupos.map(({ grupo, totalCentavos }) => ({ nome: grupo, totalCentavos })),
    { nome: SEM_CATEGORIA, totalCentavos: semCategoriaCentavos },
  ].filter(({ totalCentavos }) => totalCentavos > 0);
}

function pizza(resumo, local) {
  const { t, formatarMoeda } = local;
  let inicio = 0;
  const fatias = fatiasDoResumo(resumo).map(({ nome, totalCentavos }) => {
    const parte = (totalCentavos / resumo.totalCentavos) * 100;
    const desenho = `
      <circle class="fatia fatia--${nome}" cx="60" cy="60" r="42" pathLength="100"
              stroke-dasharray="${Math.max(parte - FOLGA_ENTRE_FATIAS, 0.1).toFixed(2)} 100" stroke-dashoffset="${(-inicio).toFixed(2)}">
        <title>${nomeDaFatia(nome, t)}: ${formatarMoeda(totalCentavos)} (${percentual(totalCentavos, resumo.totalCentavos)}%)</title>
      </circle>`;
    inicio += parte;
    return desenho;
  });
  return `
    <section class="cartao grafico-pizza">
      <svg viewBox="0 0 120 120" role="img" aria-label="${t('grafico.descricao')}">
        <g transform="rotate(-90 60 60)">${fatias.join('')}</g>
      </svg>
      <div class="grafico-pizza__total">
        <span>${t('grafico.total')}</span><strong>${formatarMoeda(resumo.totalCentavos)}</strong>
      </div>
    </section>`;
}

function nomeDaFatia(nome, t) {
  return nome === SEM_CATEGORIA ? t('categoria.nenhuma') : t(`grupo.${nome}`);
}
