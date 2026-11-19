import { GRUPOS_DE_CATEGORIAS } from '../dominio/categorias.js';

const CAMPO = 'categoria';
const SEM_CATEGORIA = '';

/**
 * Lista para escolher a categoria de um gasto: os três grupos, cada um com as suas categorias e exemplos
 * do que entra em cada uma. A primeira opção é "Sem categoria". Vai dentro de um `<form>`.
 */
export function listaDeCategorias({ t }, categoriaEscolhida) {
  const opcao = (valor, nome, exemplos = '') => `
    <label class="opcao-categoria">
      <input type="radio" name="${CAMPO}" value="${valor}" ${valor === (categoriaEscolhida ?? SEM_CATEGORIA) ? 'checked' : ''}>
      <span><strong>${nome}</strong>${exemplos ? `<small>${exemplos}</small>` : ''}</span>
    </label>`;
  return `
    ${opcao(SEM_CATEGORIA, t('categoria.nenhuma'))}
    ${GRUPOS_DE_CATEGORIAS.map(({ grupo, categorias }) => `
      <p class="grupo-categoria grupo-categoria--${grupo}">
        <strong>${t(`grupo.${grupo}`)}</strong><small>${t(`grupo.${grupo}.descricao`)}</small>
      </p>
      ${categorias.map((categoria) => opcao(categoria, t(`categoria.${categoria}`), t(`categoria.${categoria}.exemplos`))).join('')}`).join('')}`;
}

/** A categoria marcada na lista, ou `undefined` para "Sem categoria". */
export function categoriaMarcada(formulario) {
  const marcada = formulario.querySelector(`input[name="${CAMPO}"]:checked`);
  return marcada && marcada.value !== SEM_CATEGORIA ? marcada.value : undefined;
}
