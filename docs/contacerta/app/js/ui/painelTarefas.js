import { SITUACAO_DA_TAREFA, filtrarPorSituacao, organizarTarefas } from '../dominio/tarefas.js';
import { escaparHtml } from './formatacao.js';
import { ICONE } from './icones.js';

/**
 * Lista de tarefas (TO DO): campo para incluir, pendentes em cima e feitas embaixo, riscadas, com o dia em que foram feitas.
 * A mesma lista aparece na aba da tela do mês e na tela própria aberta pelo menu (uma instância para cada lugar).
 * As classes são próprias (`campo-tarefa`, `campo-feita`), para não se confundirem com as dos lançamentos
 * quando a lista está dentro da grade do mês.
 * Quando `renderizar` recebe a `situacao`, aparece o filtro Todas / Abertas / Feitas e a escolha vai para `aoFiltrar`.
 */
export function criarPainelTarefas(container, {
  local, aoIncluir, aoRenomear, aoMarcarComoFeita, aoExcluir, aoFiltrar,
}) {
  let focarNovaTarefaAoRedesenhar = false;

  container.addEventListener('submit', (evento) => {
    if (!evento.target.matches('.nova-tarefa')) return;
    evento.preventDefault();
    focarNovaTarefaAoRedesenhar = true;
    aoIncluir(evento.target.elements.descricao.value);
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
    const botao = evento.target.closest('button[data-acao="excluir-tarefa"]');
    if (botao) aoExcluir(idDaTarefa(botao));
  });

  /**
   * @param {{ tarefas: object[], hoje: { ano: number, mes: number, dia: number }, situacao?: string }} dados
   * Sem `situacao`, mostra as tarefas recebidas, sem filtro. A contagem do cabeçalho é sempre das tarefas recebidas.
   */
  function renderizar({ tarefas, hoje, situacao }) {
    const { t } = local;
    const totais = organizarTarefas(tarefas);
    const exibidas = situacao === undefined ? tarefas : filtrarPorSituacao(tarefas, situacao);
    container.innerHTML = `
      <section class="quinzena tarefas" aria-label="${t('tarefas.titulo')}">
        <header class="quinzena__cabecalho">
          <h3>${t('tarefas.titulo')}</h3>
          <span class="quinzena__periodo">${t('tarefas.pendentes', { n: totais.pendentes.length })} · ${t('tarefas.feitas', { n: totais.feitas.length })}</span>
        </header>
        ${situacao === undefined ? '' : filtroDeSituacao(situacao, t)}
        <div class="grupo grupo--tarefa">
          <div class="grupo__cabecalho"><h4>${t('tarefas.lista')}</h4></div>
          <form class="nova-tarefa">
            <input name="descricao" maxlength="80" autocomplete="off" enterkeyhint="done"
                   placeholder="${t('tarefas.nova')}" aria-label="${t('tarefas.nova')}">
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
  const { id, descricao, feitaEm } = tarefa;
  const nome = escaparHtml(descricao);
  const feita = feitaEm !== undefined;
  return `
    <li class="tarefa ${feita ? 'tarefa--feita' : ''}" data-id="${escaparHtml(id)}">
      <input type="checkbox" class="campo-feita" aria-label="${t('tarefas.marcar', { descricao: nome })}" ${feita ? 'checked' : ''}>
      <textarea class="campo-tarefa" rows="1" maxlength="80" enterkeyhint="done"
                aria-label="${t('tarefas.descricao')}" ${feita ? 'disabled' : ''}>${nome}</textarea>
      ${feita ? `<span class="tarefa__data">${t('tarefas.feitaEm', { data: local.formatarDiaCurto(feitaEm, hoje.ano) })}</span>` : ''}
      <button type="button" class="botao-icone botao-excluir" data-acao="excluir-tarefa"
              aria-label="${t('lancamento.excluirItem', { descricao: nome })}">${ICONE.excluir}</button>
    </li>`;
}

function idDaTarefa(elemento) {
  return elemento.closest('[data-id]').dataset.id;
}
