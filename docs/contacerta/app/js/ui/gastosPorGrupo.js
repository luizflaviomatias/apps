// Cartões com os gastos de cada grupo abertos nas suas categorias. Usados no Gráfico de gastos e no Resumo do ano.

export const SEM_CATEGORIA = 'sem-categoria';

/**
 * Um cartão por grupo (valor, percentual e uma barra por categoria) e, se houver, o dos gastos sem categoria.
 * @param {ReturnType<import('../dominio/gastosPorCategoria.js').resumirGastosPorCategoria>} resumo
 */
export function cartoesDosGrupos(resumo, local) {
  return `
    ${resumo.grupos.map((grupo) => cartaoDoGrupo(grupo, resumo.totalCentavos, local)).join('')}
    ${cartaoSemCategoria(resumo, local)}`;
}

export function percentual(parte, todo) {
  return todo === 0 ? 0 : Math.round((parte / todo) * 100);
}

function cartaoDoGrupo({ grupo, totalCentavos, categorias }, totalGeral, local) {
  const { t } = local;
  return `
    <section class="cartao grupo-grafico grupo-grafico--${grupo}">
      ${cabecalhoDoGrupo(t(`grupo.${grupo}`), t(`grupo.${grupo}.descricao`), totalCentavos, totalGeral, local)}
      <ul class="lista-categorias">
        ${categorias.map(({ categoria, totalCentavos: daCategoria }) => `
          <li>
            <span>${t(`categoria.${categoria}`)}</span>
            <span>${valorComPercentual(daCategoria, totalGeral, local)}</span>
            <span class="barra-categoria"><span style="width: ${percentual(daCategoria, totalGeral)}%"></span></span>
          </li>`).join('')}
      </ul>
    </section>`;
}

function cartaoSemCategoria({ semCategoriaCentavos, totalCentavos }, local) {
  if (semCategoriaCentavos === 0) return '';
  const { t } = local;
  return `
    <section class="cartao grupo-grafico grupo-grafico--${SEM_CATEGORIA}">
      ${cabecalhoDoGrupo(t('categoria.nenhuma'), t('grafico.dicaSemCategoria'), semCategoriaCentavos, totalCentavos, local)}
    </section>`;
}

function cabecalhoDoGrupo(nome, descricao, totalCentavos, totalGeral, local) {
  return `
    <header class="grupo-grafico__cabecalho">
      <span class="grupo-grafico__cor" aria-hidden="true"></span>
      <h3>${nome}<small>${descricao}</small></h3>
      <strong>${valorComPercentual(totalCentavos, totalGeral, local)}</strong>
    </header>`;
}

function valorComPercentual(centavos, totalGeral, { formatarMoeda }) {
  return `<small>${percentual(centavos, totalGeral)}%</small> ${formatarMoeda(centavos)}`;
}
