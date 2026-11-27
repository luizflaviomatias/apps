import {
  CATEGORIA_DA_TAREFA, SITUACAO_DA_TAREFA, TODAS_AS_CATEGORIAS, filtrarPorCategoria, filtrarPorSituacao, organizarTarefas,
} from '../dominio/tarefas.js';
import { escaparHtml } from './formatacao.js';
import { ICONE } from './icones.js';

/**
 * Lista de tarefas (TO DO): campo para incluir, pendentes em cima e feitas embaixo, riscadas, com o dia em que foram feitas.
 * A mesma lista aparece na aba da tela do mês e na tela própria aberta pelo menu (uma instância para cada lugar).
 * As classes são próprias (`campo-tarefa`, `campo-feita`), para não se confundirem com as dos lançamentos
 * quando a lista está dentro da grade do mês.
 * Quando `renderizar` recebe a `situacao`, aparece o filtro Todas / Abertas / Feitas e a escolha vai para `aoFiltrar`.
 * Nos dois lugares há o filtro de categoria Todas / Pessoal / Profissional, cuja escolha vai para `aoFiltrarCategoria`.
 */
export function criarPainelTarefas(container, {
  local, aoIncluir, aoRenomear, aoTrocarCategoria, aoMarcarComoFeita, aoExcluir, aoFiltrar, aoFiltrarCategoria,
}) {
  let focarNovaTarefaAoRedesenhar = false;

  container.addEventListener('submit', (evento) => {
    if (!evento.target.matches('.nova-tarefa')) return;
    evento.preventDefault();
    focarNovaTarefaAoRedesenhar = true;
    const { descricao, categoria } = evento.target.elements;
    aoIncluir(descricao.value, categoria.value);
  });
  container.addEventListener('change', (evento) => {
    const campo = evento.target;
    if (campo.matches('.campo-feita')) aoMarcarComoFeita(idDaTarefa(campo), campo.checked);
    if (campo.matches('.campo-tarefa')) aoRenomear(idDaTarefa(campo), campo.value);
  });
  /** A descrição é de uma linha só: Enter confirma, como nos campos dos lançamentos. */
  container.addEventListener('keydown', (evento) => {
    if (evento.key === 'Enter' && evento.target.matches('.campo-tarefa')) {
      evento.preventDefault();
      evento.target.blur();
    }
  });
  container.addEventListener('click', (evento) => {
    const filtro = evento.target.closest('button[data-situacao]');
    if (filtro) return aoFiltrar(filtro.dataset.situacao);
    const filtroDeCategoria = evento.target.closest('button[data-filtro-categoria]');
    if (filtroDeCategoria) return aoFiltrarCategoria(filtroDeCategoria.dataset.filtroCategoria);
    const etiqueta = evento.target.closest('button[data-acao="trocar-categoria"]');
    if (etiqueta) return aoTrocarCategoria(idDaTarefa(etiqueta), outraCategoria(etiqueta.dataset.categoria));
    const botao = evento.target.closest('button[data-acao="excluir-tarefa"]');
    if (botao) aoExcluir(idDaTarefa(botao));
  });

  /**
   * @param {{ tarefas: object[], hoje: { ano: number, mes: number, dia: number }, situacao?: string,
   *           categoria?: string }} dados
   * Sem `situacao`, não filtra por situação. A contagem do cabeçalho é das tarefas da categoria escolhida.
   * Uma tarefa nova já vem com a categoria do filtro; com "Todas", vem como pessoal.
   */
  function renderizar({ tarefas, hoje, situacao, categoria = TODAS_AS_CATEGORIAS }) {
    const { t } = local;
    const daCategoria = filtrarPorCategoria(tarefas, categoria);
    const totais = organizarTarefas(daCategoria);
    const exibidas = situacao === undefined ? daCategoria : filtrarPorSituacao(daCategoria, situacao);
    container.innerHTML = `
      <section class="quinzena tarefas" aria-label="${t('tarefas.titulo')}">
        <header class="quinzena__cabecalho">
          <h3>${t('tarefas.titulo')}</h3>
          <span class="quinzena__periodo">${t('tarefas.pendentes', { n: totais.pendentes.length })} · ${t('tarefas.feitas', { n: totais.feitas.length })}</span>
        </header>
        ${filtroDeCategoria(categoria, t)}
        ${situacao === undefined ? '' : filtroDeSituacao(situacao, t)}
        <div class="grupo grupo--tarefa">
          <div class="grupo__cabecalho"><h4>${t('tarefas.lista')}</h4></div>
          <form class="nova-tarefa">
            <input name="descricao" maxlength="80" autocomplete="off" enterkeyhint="done"
                   placeholder="${t('tarefas.nova')}" aria-label="${t('tarefas.nova')}">
            ${escolhaDaCategoria(categoriaDaNovaTarefa(categoria), t)}
            <button class="botao-adicionar" aria-label="${t('tarefas.incluir')}" title="${t('tarefas.incluir')}">${ICONE.mais}</button>
          </form>
          ${listasDasTarefas(exibidas, situacao, hoje, local)}
        </div>
      </section>`;
    if (focarNovaTarefaAoRedesenhar) container.querySelector('.nova-tarefa input').focus();
    focarNovaTarefaAoRedesenhar = false;
  }

  return { renderizar };
}

function filtroDeCategoria(categoriaEscolhida, t) {
  return `
        <div class="escolhas filtro-tarefas" role="group" aria-label="${t('tarefas.filtroCategoria')}">
          ${[TODAS_AS_CATEGORIAS, ...Object.values(CATEGORIA_DA_TAREFA)].map((categoria) => `
          <button type="button" data-filtro-categoria="${categoria}" aria-pressed="${categoria === categoriaEscolhida}">${t(`tarefas.categoria.${categoria}`)}</button>`).join('')}
        </div>`;
}

function escolhaDaCategoria(categoriaEscolhida, t) {
  return `
            <select name="categoria" aria-label="${t('tarefas.categoria')}">
              ${Object.values(CATEGORIA_DA_TAREFA).map((categoria) => `
              <option value="${categoria}" ${categoria === categoriaEscolhida ? 'selected' : ''}>${t(`tarefas.categoria.${categoria}`)}</option>`).join('')}
            </select>`;
}

function categoriaDaNovaTarefa(categoriaDoFiltro) {
  return categoriaDoFiltro === TODAS_AS_CATEGORIAS ? CATEGORIA_DA_TAREFA.PESSOAL : categoriaDoFiltro;
}

function outraCategoria(categoria) {
  return categoria === CATEGORIA_DA_TAREFA.PESSOAL ? CATEGORIA_DA_TAREFA.PROFISSIONAL : CATEGORIA_DA_TAREFA.PESSOAL;
}

function filtroDeSituacao(situacaoEscolhida, t) {
  return `
        <div class="escolhas filtro-tarefas" role="group" aria-label="${t('tarefas.filtro')}">
          ${Object.values(SITUACAO_DA_TAREFA).map((situacao) => `
          <button type="button" data-situacao="${situacao}" aria-pressed="${situacao === situacaoEscolhida}">${t(`tarefas.filtro.${situacao}`)}</button>`).join('')}
        </div>`;
}

/** Abertas em cima e feitas embaixo; filtrando só as feitas, a lista é só delas, com o aviso próprio quando vazia. */
function listasDasTarefas(tarefas, situacao, hoje, local) {
  const { t } = local;
  const { pendentes, feitas } = organizarTarefas(tarefas);
  const linhas = (lista) => lista.map((tarefa) => linhaDaTarefa(tarefa, hoje, local)).join('');
  const vazia = (chave) => `<li class="lista-vazia">${t(chave)}</li>`;
  if (situacao === SITUACAO_DA_TAREFA.FEITAS) {
    return `<ul class="lista-lancamentos">${feitas.length === 0 ? vazia('tarefas.nenhumaFeita') : linhas(feitas)}</ul>`;
  }
  return `
          <ul class="lista-lancamentos">${pendentes.length === 0 ? vazia('tarefas.nenhumaPendente') : linhas(pendentes)}</ul>
          ${feitas.length === 0 ? '' : `
          <p class="tarefas__separador">${t('tarefas.secaoFeitas')}</p>
          <ul class="lista-lancamentos">${linhas(feitas)}</ul>`}`;
}

function linhaDaTarefa(tarefa, hoje, local) {
  const { t } = local;
  const { id, descricao, categoria, feitaEm } = tarefa;
  const nome = escaparHtml(descricao);
  const feita = feitaEm !== undefined;
  return `
    <li class="tarefa ${feita ? 'tarefa--feita' : ''}" data-id="${escaparHtml(id)}">
      <input type="checkbox" class="campo-feita" aria-label="${t('tarefas.marcar', { descricao: nome })}" ${feita ? 'checked' : ''}>
      <textarea class="campo-tarefa" rows="1" maxlength="80" enterkeyhint="done"
                aria-label="${t('tarefas.descricao')}" ${feita ? 'disabled' : ''}>${nome}</textarea>
      <span class="tarefa__detalhes">
        ${etiquetaDaCategoria(categoria, nome, feita, t)}
        ${feita ? `<span class="tarefa__data">${t('tarefas.feitaEm', { data: local.formatarDiaCurto(feitaEm, hoje.ano) })}</span>` : ''}
      </span>
      <button type="button" class="botao-icone botao-excluir" data-acao="excluir-tarefa"
              aria-label="${t('lancamento.excluirItem', { descricao: nome })}">${ICONE.excluir}</button>
    </li>`;
}

/** Tocar na etiqueta troca a categoria da pendente; a da feita fica travada, como o texto. */
function etiquetaDaCategoria(categoria, nome, feita, t) {
  return `<button type="button" class="tarefa__categoria tarefa__categoria--${categoria}" data-acao="trocar-categoria"
              data-categoria="${categoria}" ${feita ? 'disabled' : ''}
              aria-label="${t('tarefas.trocarCategoria', { descricao: nome, categoria: t(`tarefas.categoria.${categoria}`) })}">${t(`tarefas.categoria.${categoria}`)}</button>`;
}

function idDaTarefa(elemento) {
  return elemento.closest('[data-id]').dataset.id;
}
