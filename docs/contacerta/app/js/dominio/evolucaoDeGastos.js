// Evolução dos gastos: o gasto de cada mês de um ano, comparado com o mês anterior e com o mesmo mês de outro ano.

/**
 * @param {{ gastosDoAno: number[], gastosDoAnoComparado?: number[], gastoDoDezembroAnterior?: number }} dados
 * `gastosDoAno` e `gastosDoAnoComparado`: 12 totais em centavos, de janeiro (0) a dezembro (11).
 * `gastosDoAnoComparado`: o ano escolhido para a comparação; ausente quando a pessoa não compara com nenhum.
 * `gastoDoDezembroAnterior`: dezembro do ano imediatamente anterior, com o qual janeiro é comparado;
 * ausente quando esse ano não tem lançamentos.
 * As comparações que não têm com o que comparar ficam `undefined`.
 */
export function resumirEvolucaoDosGastos({ gastosDoAno, gastosDoAnoComparado, gastoDoDezembroAnterior }) {
  const meses = gastosDoAno.map((gastoCentavos, mes) => {
    const gastoDoMesAnterior = mes === 0 ? gastoDoDezembroAnterior : gastosDoAno[mes - 1];
    const gastoNoAnoComparado = gastosDoAnoComparado?.[mes];
    return {
      mes,
      gastoCentavos,
      gastoNoAnoComparadoCentavos: gastoNoAnoComparado,
      diferencaDoMesAnteriorCentavos: diferenca(gastoCentavos, gastoDoMesAnterior),
      diferencaDoAnoComparadoCentavos: diferenca(gastoCentavos, gastoNoAnoComparado),
    };
  });
  const totalCentavos = somar(gastosDoAno);
  const totalDoAnoComparadoCentavos = gastosDoAnoComparado && somar(gastosDoAnoComparado);
  return {
    meses,
    totalCentavos,
    totalDoAnoComparadoCentavos,
    diferencaDoAnoComparadoCentavos: diferenca(totalCentavos, totalDoAnoComparadoCentavos),
    maiorGastoCentavos: Math.max(0, ...gastosDoAno, ...(gastosDoAnoComparado ?? [])),
  };
}

function diferenca(atual, anterior) {
  return anterior === undefined ? undefined : atual - anterior;
}

function somar(valores) {
  return valores.reduce((soma, valor) => soma + valor, 0);
}
