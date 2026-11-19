import { escaparHtml } from './formatacao.js';
import { categoriaMarcada, listaDeCategorias } from './listaDeCategorias.js';

/**
 * Janela para trocar a categoria de um gasto que já existe.
 * `abrir` devolve uma Promise com `{ categoria }` (`undefined` = sem categoria), ou `undefined` se a pessoa cancelar.
 */
export function criarDialogoCategoria(dialogo, { local }) {
  const formulario = dialogo.querySelector('form');
  const titulo = dialogo.querySelector('[data-campo="titulo"]');
  const lista = dialogo.querySelector('[data-campo="categorias"]');
  let resolverAberto = () => {};

  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();
    fechar(evento.submitter?.value === 'cancelar' ? undefined : { categoria: categoriaMarcada(formulario) });
  });
  dialogo.addEventListener('cancel', () => resolverAberto(undefined));

  function fechar(resultado) {
    dialogo.close();
    resolverAberto(resultado);
  }

  function abrir({ descricao, categoria }) {
    titulo.innerHTML = local.t('categoria.de', { descricao: escaparHtml(descricao) });
    lista.innerHTML = listaDeCategorias(local, categoria);
    dialogo.showModal();
    return new Promise((resolver) => { resolverAberto = resolver; });
  }

  return { abrir };
}
