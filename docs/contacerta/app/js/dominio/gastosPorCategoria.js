// Gráfico de gastos: quanto do gasto de um mês foi para cada grupo e para cada categoria.
import { GRUPOS_DE_CATEGORIAS } from './categorias.js';
import { TIPO } from './orcamento.js';

/**
 * Os três grupos vêm sempre, na ordem fixa, mesmo zerados (a cor de cada um não muda de um mês para o outro).
 * Gastos sem categoria são somados à parte; gastos sem valor não contam.
 * @returns {{ totalCentavos: number, semCategoriaCentavos: number,
 *             grupos: Array<{ grupo: string, totalCentavos: number,
 *                             categorias: Array<{ categoria: string, totalCentavos: number }> }> }}
 */
export function resumirGastosPorCategoria(lancamentos) {
  const gastos = lancamentos.filter(({ tipo, valorCentavos }) => tipo === TIPO.DESPESA && valorCentavos > 0);
  const totalDaCategoria = (categoria) => somar(gastos.filter((gasto) => gasto.categoria === categoria));
  const grupos = GRUPOS_DE_CATEGORIAS.map(({ grupo, categorias }) => {
    const totais = categorias.map((categoria) => ({ categoria, totalCentavos: totalDaCategoria(categoria) }));
    return { grupo, totalCentavos: totais.reduce((soma, { totalCentavos }) => soma + totalCentavos, 0), categorias: totais };
  });
  return {
    totalCentavos: somar(gastos),
    semCategoriaCentavos: somar(gastos.filter((gasto) => gasto.categoria === undefined)),
    grupos,
  };
}

function somar(gastos) {
  return gastos.reduce((soma, { valorCentavos }) => soma + valorCentavos, 0);
}
