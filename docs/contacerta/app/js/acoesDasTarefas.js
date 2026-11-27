import {
  concluirTarefa, criarTarefa, incluirTarefa, reabrirTarefa, removerTarefa, renomearTarefa, trocarCategoriaDaTarefa,
} from './dominio/tarefas.js';

/**
 * O que a pessoa faz com a lista de tarefas (TO DO): incluir, renomear, trocar a categoria, marcar como feita ou pendente
 * e excluir.
 * Cada ação salva e avisa `aoSalvar` para a tela se redesenhar; erros de armazenamento são tratados por quem chama.
 * @param {{ repositorio: { obter: () => object[], salvar: (tarefas: object[]) => void },
 *           hoje: () => { ano: number, mes: number, dia: number }, gerarId: () => string,
 *           local: { t: Function }, confirmacao: { perguntar: Function }, aoSalvar: () => void }} dependencias
 */
export function criarAcoesDasTarefas({ repositorio, hoje, gerarId, local, confirmacao, aoSalvar }) {
  function salvar(tarefas) {
    repositorio.salvar(tarefas);
    aoSalvar();
  }

  /** Texto em branco não vira tarefa. */
  function incluir(descricao, categoria) {
    if (String(descricao).trim() === '') return;
    salvar(incluirTarefa(repositorio.obter(), criarTarefa({ id: gerarId(), descricao, categoria })));
  }

  /** Apagar todo o texto não apaga a tarefa: a tela volta a mostrar o nome anterior. */
  function renomear(id, descricao) {
    if (String(descricao).trim() === '') return aoSalvar();
    salvar(renomearTarefa(repositorio.obter(), id, descricao));
  }

  function trocarCategoria(id, categoria) {
    salvar(trocarCategoriaDaTarefa(repositorio.obter(), id, categoria));
  }

  function marcarComoFeita(id, feita) {
    const tarefas = repositorio.obter();
    salvar(feita ? concluirTarefa(tarefas, id, hoje()) : reabrirTarefa(tarefas, id));
  }

  async function excluir(id) {
    const tarefa = repositorio.obter().find((item) => item.id === id);
    const confirmou = await confirmacao.perguntar({
      texto: local.t('tarefas.confirmarExclusao', { descricao: tarefa.descricao }),
      rotuloDeConfirmar: local.t('confirmacao.excluir'),
    });
    if (!confirmou) return;
    salvar(removerTarefa(repositorio.obter(), id));
  }

  return { tarefas: () => repositorio.obter(), incluir, renomear, trocarCategoria, marcarComoFeita, excluir };
}
