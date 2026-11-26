// Guarda a lista de tarefas (TO DO), separada dos lançamentos dos meses.
// O armazenamento é injetado (localStorage no app, memória nos testes).
import { criarTarefa } from '../dominio/tarefas.js';
import { ErroArmazenamento } from './repositorioOrcamento.js';

const CHAVE = 'contacerta:tarefas';
const SUFIXO_DA_COPIA_ILEGIVEL = ':ilegivel';

/** @param {{ armazenamento: Pick<Storage, 'getItem' | 'setItem'> }} dependencias */
export function criarRepositorioTarefas({ armazenamento }) {
  let carregadas;

  function obter() {
    carregadas ??= ler();
    return carregadas;
  }

  /** Conteúdo ilegível é guardado numa chave à parte (para não se perder de vez) e a lista recomeça vazia. */
  function ler() {
    const salvo = armazenamento.getItem(CHAVE);
    if (salvo === null) return [];
    try {
      return desserializar(salvo);
    } catch (erro) {
      console.warn('Lista de tarefas ilegível; guardada à parte e recomeçada vazia.', erro);
      gravar(CHAVE + SUFIXO_DA_COPIA_ILEGIVEL, salvo);
      gravar(CHAVE, '[]');
      return [];
    }
  }

  /** Grava primeiro e só então atualiza a memória: se a gravação falhar, a tela não mostra algo que não foi salvo. */
  function salvar(tarefas) {
    gravar(CHAVE, JSON.stringify(tarefas));
    carregadas = tarefas;
  }

  function gravar(chave, conteudo) {
    try {
      armazenamento.setItem(chave, conteudo);
    } catch (erro) {
      throw new ErroArmazenamento('Não foi possível salvar as tarefas', erro);
    }
  }

  return { obter, salvar };
}

function desserializar(json) {
  const tarefas = JSON.parse(json);
  if (!Array.isArray(tarefas)) throw new Error('formato inesperado');
  return tarefas.map(criarTarefa);
}
