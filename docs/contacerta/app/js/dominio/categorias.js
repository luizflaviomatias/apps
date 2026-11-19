// Categorias dos gastos, em três grupos: o básico para viver, dia a dia e lazer, futuro e dívidas.
// Só os identificadores ficam aqui; nomes e exemplos de cada idioma estão nos dicionários (categoria.*, grupo.*).

export const GRUPO = Object.freeze({ BASICO: 'basico', DIA_A_DIA: 'diaADia', FUTURO: 'futuro' });

export const CATEGORIA = Object.freeze({
  CASA: 'casa',
  MERCADO: 'mercado',
  TRANSPORTE: 'transporte',
  SAUDE: 'saude',
  EDUCACAO: 'educacao',
  COMER_FORA: 'comerFora',
  LAZER: 'lazer',
  COMPRAS_PESSOAIS: 'comprasPessoais',
  DIVIDAS: 'dividas',
  GUARDAR_DINHEIRO: 'guardarDinheiro',
});

/** Grupos na ordem em que aparecem na tela, cada um com as suas categorias. */
export const GRUPOS_DE_CATEGORIAS = Object.freeze([
  {
    grupo: GRUPO.BASICO,
    categorias: [CATEGORIA.CASA, CATEGORIA.MERCADO, CATEGORIA.TRANSPORTE, CATEGORIA.SAUDE, CATEGORIA.EDUCACAO],
  },
  { grupo: GRUPO.DIA_A_DIA, categorias: [CATEGORIA.COMER_FORA, CATEGORIA.LAZER, CATEGORIA.COMPRAS_PESSOAIS] },
  { grupo: GRUPO.FUTURO, categorias: [CATEGORIA.DIVIDAS, CATEGORIA.GUARDAR_DINHEIRO] },
]);

export function ehCategoriaConhecida(categoria) {
  return Object.values(CATEGORIA).includes(categoria);
}
