/**
 * Diferença de um gasto em relação a outro período, para tabelas e listas.
 * Gasto que sobe é ruim (vermelho, ▲); que baixa é bom (verde, ▼). A seta diz o sentido mesmo sem a cor.
 * `undefined` = não há com o que comparar (—); zero = ficou igual (=).
 * @returns {{ classe: string, texto: string }}
 */
export function descreverDiferenca(diferencaCentavos, { formatarMoeda }) {
  if (diferencaCentavos === undefined) return { classe: 'diferenca', texto: '—' };
  if (diferencaCentavos === 0) return { classe: 'diferenca', texto: '=' };
  const subiu = diferencaCentavos > 0;
  return {
    classe: `diferenca diferenca--${subiu ? 'subiu' : 'desceu'}`,
    texto: `${subiu ? '▲' : '▼'} ${formatarMoeda(Math.abs(diferencaCentavos))}`,
  };
}
