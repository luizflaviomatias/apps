import { cabecalhoDePeriodo, ouvirTrocaDePeriodo } from './cabecalhoDePeriodo.js';
import { descreverDiferenca } from './diferenca.js';

const LARGURA = 320;
const ALTURA = 190;
const AREA = Object.freeze({ esquerda: 52, direita: 10, topo: 12, base: 24 });
const DIVISOES_DO_EIXO = 2;
const PASSOS_DA_ESCALA = [1, 2, 2.5, 5, 10];
const TOPO_DA_ESCALA_SEM_GASTOS = 100;
const SEM_COMPARACAO = '';

/**
 * Relatório "Evolução dos gastos": linha com o gasto de cada mês do ano e a tabela mês a mês, com a diferença
 * para o mês anterior. Em "Comparar com", a pessoa escolhe outro ano que tenha lançamentos: ele entra como
 * segunda linha no gráfico e como coluna na tabela (mesmo mês daquele ano). Avisa `aoEscolherAnoComparado(ano)`,
 * com `undefined` para "Não comparar".
 */
export function criarPainelEvolucao(container, { local, aoTrocarAno, aoEscolherAnoComparado }) {
  ouvirTrocaDePeriodo(container, aoTrocarAno);
  container.addEventListener('change', (evento) => {
    if (!evento.target.matches('[data-campo="ano-comparado"]')) return;
    aoEscolherAnoComparado(evento.target.value === SEM_COMPARACAO ? undefined : Number(evento.target.value));
  });

  /**
   * @param {{ ano: number, anoComparado?: number, anosParaComparar: number[],
   *           evolucao: ReturnType<import('../dominio/evolucaoDeGastos.js').resumirEvolucaoDosGastos> }} dados
   */
  function renderizar({ ano, anoComparado, anosParaComparar, evolucao }) {
    const { t } = local;
    container.innerHTML = `
      ${cabecalhoDePeriodo({
        titulo: t('evolucao.titulo', { ano }), rotuloAnterior: t('periodo.anoAnterior'), rotuloSeguinte: t('periodo.anoSeguinte'),
      })}
      ${resumoDoAno(anoComparado, evolucao, local)}
      <section class="cartao grafico-evolucao">
        ${escolhaDoAnoComparado(anoComparado, anosParaComparar, t)}
        ${anoComparado === undefined ? '' : legenda(ano, anoComparado)}
        ${graficoDeLinhas(ano, evolucao, local)}
      </section>
      ${tabelaMesAMes(anoComparado, evolucao, local)}`;
  }

  return { renderizar };
}

function resumoDoAno(anoComparado, { totalCentavos, diferencaDoAnoComparadoCentavos }, local) {
  const { t, formatarMoeda } = local;
  return `
    <section class="resumo-contas" aria-label="${t('evolucao.total')}">
      <span class="resumo-contas__rotulo">${t('evolucao.total')}</span>
      <strong class="resumo-contas__valor">${formatarMoeda(totalCentavos)}</strong>
      ${anoComparado === undefined ? '' : `
      <span class="resumo-contas__detalhe">${fraseDaComparacao(anoComparado, diferencaDoAnoComparadoCentavos, local)}</span>`}
    </section>`;
}

function fraseDaComparacao(anoComparado, diferencaCentavos, { t, formatarMoeda }) {
  if (diferencaCentavos === 0) return t('evolucao.igualAoAno', { ano: anoComparado });
  const chave = diferencaCentavos > 0 ? 'evolucao.maisQueOAno' : 'evolucao.menosQueOAno';
  return t(chave, { valor: formatarMoeda(Math.abs(diferencaCentavos)), ano: anoComparado });
}

function escolhaDoAnoComparado(anoComparado, anosParaComparar, t) {
  if (anosParaComparar.length === 0) return `<p class="grafico-evolucao__aviso">${t('evolucao.semOutroAno')}</p>`;
  const opcao = (valor, texto) => `<option value="${valor}" ${valor === (anoComparado ?? SEM_COMPARACAO) ? 'selected' : ''}>${texto}</option>`;
  return `
    <label class="escolha-de-ano">
      <span>${t('evolucao.compararCom')}</span>
      <select data-campo="ano-comparado">
        ${opcao(SEM_COMPARACAO, t('evolucao.naoComparar'))}
        ${anosParaComparar.map((ano) => opcao(ano, ano)).join('')}
      </select>
    </label>`;
}

function legenda(ano, anoComparado) {
  return `
    <ul class="legenda-evolucao">
      <li><span class="legenda-evolucao__marca legenda-evolucao__marca--atual" aria-hidden="true"></span>${ano}</li>
      <li><span class="legenda-evolucao__marca legenda-evolucao__marca--comparado" aria-hidden="true"></span>${anoComparado}</li>
    </ul>`;
}

function graficoDeLinhas(ano, { meses, maiorGastoCentavos, totalDoAnoComparadoCentavos }, local) {
  const comparando = totalDoAnoComparadoCentavos !== undefined;
  const topo = topoDaEscala(maiorGastoCentavos);
  const larguraUtil = LARGURA - AREA.esquerda - AREA.direita;
  const alturaUtil = ALTURA - AREA.topo - AREA.base;
  const x = (mes) => AREA.esquerda + (larguraUtil * mes) / (meses.length - 1);
  const y = (centavos) => AREA.topo + alturaUtil * (1 - centavos / topo);
  const pontos = (valorDoMes) => meses.map((mes) => `${x(mes.mes).toFixed(1)},${y(valorDoMes(mes)).toFixed(1)}`).join(' ');

  const linhasDoEixo = Array.from({ length: DIVISOES_DO_EIXO + 1 }, (_, divisao) => (topo * divisao) / DIVISOES_DO_EIXO)
    .map((centavos) => `
      <line class="grafico-evolucao__grade" x1="${AREA.esquerda}" x2="${LARGURA - AREA.direita}" y1="${y(centavos)}" y2="${y(centavos)}"/>
      <text class="grafico-evolucao__rotulo" x="${AREA.esquerda - 6}" y="${y(centavos) + 3}" text-anchor="end">${local.formatarMoedaResumida(centavos)}</text>`);
  const nomesDosMeses = meses.map(({ mes }) => `
      <text class="grafico-evolucao__rotulo" x="${x(mes).toFixed(1)}" y="${ALTURA - 6}" text-anchor="middle">${local.nomeAbreviadoDoMes(mes)}</text>`);
  const marcadores = meses.map((mes) => `
      <circle class="grafico-evolucao__ponto" cx="${x(mes.mes).toFixed(1)}" cy="${y(mes.gastoCentavos).toFixed(1)}" r="3.5">
        <title>${local.nomeDoMes(mes.mes)} ${ano}: ${local.formatarMoeda(mes.gastoCentavos)}</title>
      </circle>`);

  return `
    <svg viewBox="0 0 ${LARGURA} ${ALTURA}" role="img" aria-label="${local.t('evolucao.grafico', { ano })}">
      ${linhasDoEixo.join('')}
      ${nomesDosMeses.join('')}
      ${comparando ? `<polyline class="grafico-evolucao__linha grafico-evolucao__linha--comparado" points="${pontos((mes) => mes.gastoNoAnoComparadoCentavos)}"/>` : ''}
      <polyline class="grafico-evolucao__linha grafico-evolucao__linha--atual" points="${pontos((mes) => mes.gastoCentavos)}"/>
      ${marcadores.join('')}
    </svg>`;
}

/** Arredonda o maior valor para cima até um número "redondo" (1, 2, 2,5 ou 5 vezes uma potência de 10). */
function topoDaEscala(maiorCentavos) {
  if (maiorCentavos === 0) return TOPO_DA_ESCALA_SEM_GASTOS;
  const grandeza = 10 ** Math.floor(Math.log10(maiorCentavos));
  return grandeza * PASSOS_DA_ESCALA.find((passo) => passo * grandeza >= maiorCentavos);
}

function tabelaMesAMes(anoComparado, { meses }, local) {
  const { t } = local;
  const comparando = anoComparado !== undefined;
  return `
    <section class="cartao">
      <h3>${t('evolucao.tabela')}</h3>
      <table class="tabela-evolucao">
        <thead><tr>
          <th scope="col">${t('evolucao.mes')}</th>
          <th scope="col">${t('evolucao.gasto')}</th>
          <th scope="col">${t('evolucao.contraMesAnterior')}</th>
          ${comparando ? `<th scope="col">${t('evolucao.contraAno', { ano: anoComparado })}</th>` : ''}
        </tr></thead>
        <tbody>
          ${meses.map((mes) => `
          <tr>
            <th scope="row">${local.nomeAbreviadoDoMes(mes.mes)}</th>
            <td>${local.formatarMoeda(mes.gastoCentavos)}</td>
            ${celulaDeDiferenca(mes.diferencaDoMesAnteriorCentavos, local)}
            ${comparando ? celulaDeDiferenca(mes.diferencaDoAnoComparadoCentavos, local) : ''}
          </tr>`).join('')}
        </tbody>
      </table>
    </section>`;
}

function celulaDeDiferenca(diferencaCentavos, local) {
  const { classe, texto } = descreverDiferenca(diferencaCentavos, local);
  return `<td class="${classe}">${texto}</td>`;
}
