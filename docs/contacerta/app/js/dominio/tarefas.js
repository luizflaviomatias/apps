// Lista de tarefas (TO DO): fica fora do calendário e vale para qualquer mês aberto.
// As funções não alteram a lista recebida: devolvem uma lista nova.

export class ErroTarefaInvalida extends Error {
  constructor(detalhe) {
    super(`Tarefa inválida: ${detalhe}`);
    this.name = 'ErroTarefaInvalida';
  }
}

/** Toda tarefa é pessoal ou profissional. */
export const CATEGORIA_DA_TAREFA = Object.freeze({ PESSOAL: 'pessoal', PROFISSIONAL: 'profissional' });

/** Tarefas salvas antes de existir a categoria contam como pessoais. */
const CATEGORIA_PADRAO = CATEGORIA_DA_TAREFA.PESSOAL;
const CATEGORIAS = Object.values(CATEGORIA_DA_TAREFA);

/**
 * @param {{ id: string, descricao: string, categoria?: string, feitaEm?: { ano: number, mes: number, dia: number } }} dados
 * `feitaEm` existe só nas tarefas feitas: o dia em que a pessoa marcou a caixa (mês de 0 a 11).
 */
export function criarTarefa({ id, descricao, categoria = CATEGORIA_PADRAO, feitaEm }) {
  const descricaoLimpa = String(descricao ?? '').trim();
  if (!id) throw new ErroTarefaInvalida('id ausente');
  if (descricaoLimpa === '') throw new ErroTarefaInvalida('descrição vazia');
  if (!CATEGORIAS.includes(categoria)) throw new ErroTarefaInvalida(`categoria "${categoria}"`);
  if (feitaEm !== undefined && !ehDiaValido(feitaEm)) throw new ErroTarefaInvalida(`dia de conclusão ${JSON.stringify(feitaEm)}`);
  const tarefa = { id, descricao: descricaoLimpa, categoria };
  if (feitaEm) tarefa.feitaEm = { ano: feitaEm.ano, mes: feitaEm.mes, dia: feitaEm.dia };
  return tarefa;
}

export function estaFeita(tarefa) {
  return tarefa.feitaEm !== undefined;
}

/** A tarefa nova entra no fim das pendentes. */
export function incluirTarefa(tarefas, tarefa) {
  return [...tarefas, tarefa];
}

export function renomearTarefa(tarefas, id, descricao) {
  return alterarTarefa(tarefas, id, (tarefa) => ({ ...tarefa, descricao }));
}

export function trocarCategoriaDaTarefa(tarefas, id, categoria) {
  return alterarTarefa(tarefas, id, (tarefa) => ({ ...tarefa, categoria }));
}

export function concluirTarefa(tarefas, id, dia) {
  return alterarTarefa(tarefas, id, (tarefa) => ({ ...tarefa, feitaEm: dia }));
}

export function reabrirTarefa(tarefas, id) {
  return alterarTarefa(tarefas, id, ({ feitaEm, ...pendente }) => pendente);
}

export function removerTarefa(tarefas, id) {
  return tarefas.filter((tarefa) => tarefa.id !== id);
}

/**
 * Como a lista aparece: primeiro as pendentes, na ordem em que foram incluídas;
 * depois as feitas, da concluída mais recentemente para a mais antiga.
 */
export function organizarTarefas(tarefas) {
  return {
    pendentes: tarefas.filter((tarefa) => !estaFeita(tarefa)),
    feitas: tarefas.filter(estaFeita).sort((uma, outra) => numeroDoDia(outra.feitaEm) - numeroDoDia(uma.feitaEm)),
  };
}

/** Filtro da tela TO DO: todas, só as abertas (pendentes) ou só as feitas. */
export const SITUACAO_DA_TAREFA = Object.freeze({ TODAS: 'todas', ABERTAS: 'abertas', FEITAS: 'feitas' });

const FILTRO_POR_SITUACAO = {
  [SITUACAO_DA_TAREFA.TODAS]: () => true,
  [SITUACAO_DA_TAREFA.ABERTAS]: (tarefa) => !estaFeita(tarefa),
  [SITUACAO_DA_TAREFA.FEITAS]: estaFeita,
};

export function filtrarPorSituacao(tarefas, situacao) {
  const filtro = FILTRO_POR_SITUACAO[situacao];
  if (!filtro) throw new ErroTarefaInvalida(`situação "${situacao}"`);
  return tarefas.filter(filtro);
}

/** Filtro por categoria, na aba e na tela TO DO: todas ou só as de uma categoria. */
export const TODAS_AS_CATEGORIAS = 'todas';

export function filtrarPorCategoria(tarefas, categoria) {
  if (categoria === TODAS_AS_CATEGORIAS) return tarefas;
  if (!CATEGORIAS.includes(categoria)) throw new ErroTarefaInvalida(`categoria "${categoria}"`);
  return tarefas.filter((tarefa) => tarefa.categoria === categoria);
}

/**
 * O que a aba TO DO mostra no mês aberto: todas as abertas e só as feitas naquele mês.
 * Assim, quando o mês vira, as feitas do mês anterior saem da aba (continuam na tela TO DO).
 * @param {{ ano: number, mes: number }} mesAberto
 */
export function tarefasDoMes(tarefas, { ano, mes }) {
  return tarefas.filter((tarefa) => !estaFeita(tarefa) || (tarefa.feitaEm.ano === ano && tarefa.feitaEm.mes === mes));
}

function alterarTarefa(tarefas, id, alteracao) {
  if (!tarefas.some((tarefa) => tarefa.id === id)) throw new ErroTarefaInvalida(`id "${id}" não encontrado`);
  return tarefas.map((tarefa) => (tarefa.id === id ? criarTarefa(alteracao(tarefa)) : tarefa));
}

/** 2026-11-26 → 20261026 (mês de 0 a 11): números que ordenam como as datas. */
function numeroDoDia({ ano, mes, dia }) {
  return ano * 10000 + mes * 100 + dia;
}

function ehDiaValido(dia) {
  return Number.isInteger(dia?.ano) && Number.isInteger(dia?.mes) && Number.isInteger(dia?.dia)
    && dia.mes >= 0 && dia.mes <= 11 && dia.dia >= 1 && dia.dia <= 31;
}
