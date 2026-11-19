// Bloqueio do app com a trava do próprio aparelho (digital, rosto, padrão, PIN ou senha), como nos apps de banco.
// O app nunca vê a digital nem o PIN: pede ao sistema e só fica sabendo se a pessoa confirmou.
import { BLOQUEIO } from './dados/preferencias.js';
import { CONFIRMACAO } from './plataforma/bloqueioNativo.js';

const MILISSEGUNDOS_POR_MINUTO = 60_000;

/**
 * @param {{
 *   plataforma: ReturnType<typeof import('./plataforma/bloqueioNativo.js').criarBloqueioNativo>,
 *   lerPreferencias: () => { bloqueio: string, prazoDoBloqueio: string },
 *   salvarOpcao: (valor: string) => void,
 *   agora: () => number,
 *   tela: { mostrar: () => void, esconder: () => void },
 *   textosDaConfirmacao: () => { titulo: string, motivo: string, cancelar: string },
 *   avisarQueNaoHaTrava: () => void,
 * }} dependencias
 */
export function criarBloqueioDoApp({ plataforma, lerPreferencias, salvarOpcao, agora, tela, textosDaConfirmacao, avisarQueNaoHaTrava }) {
  let bloqueado = false;
  /** A tela do sistema que pede a trava tira o app do primeiro plano; essas saídas não contam. */
  let confirmando = false;
  let saiuEm;

  const estaLigado = () => lerPreferencias().bloqueio === BLOQUEIO.LIGADO;
  const prazoEmMilissegundos = () => Number(lerPreferencias().prazoDoBloqueio) * MILISSEGUNDOS_POR_MINUTO;

  async function iniciar() {
    plataforma.aoSairEVoltar({ aoSair: registrarSaida, aoVoltar: conferirAoVoltar });
    await plataforma.protegerTela(estaLigado());
    if (estaLigado()) return bloquearEPedirATrava();
    tela.esconder();
  }

  function registrarSaida() {
    if (!confirmando) saiuEm = agora();
  }

  function conferirAoVoltar() {
    if (confirmando || saiuEm === undefined) return;
    const tempoFora = agora() - saiuEm;
    saiuEm = undefined;
    if (estaLigado() && !bloqueado && tempoFora >= prazoEmMilissegundos()) bloquearEPedirATrava();
  }

  async function bloquearEPedirATrava() {
    bloqueado = true;
    tela.mostrar();
    await desbloquear();
  }

  /** Pede a trava; se a pessoa desistir, o app continua bloqueado até ela tocar em Desbloquear. */
  async function desbloquear() {
    if (confirmando || !bloqueado) return;
    const confirmacao = await confirmarDono();
    if (confirmacao === CONFIRMACAO.NAO_CONFIRMADA) return;
    if (confirmacao === CONFIRMACAO.SEM_TRAVA) desligarPorFaltaDeTrava();
    bloqueado = false;
    tela.esconder();
  }

  /** Quem tirou o bloqueio de tela do aparelho não pode ficar trancado fora dos próprios dados. */
  function desligarPorFaltaDeTrava() {
    salvarOpcao(BLOQUEIO.DESLIGADO);
    plataforma.protegerTela(false);
    avisarQueNaoHaTrava();
  }

  /** Ligar e desligar pedem a trava, para ninguém mudar a opção com o celular de outra pessoa na mão. */
  async function mudarOpcao(valor) {
    if (valor === lerPreferencias().bloqueio) return;
    const confirmacao = await confirmarDono();
    if (confirmacao === CONFIRMACAO.SEM_TRAVA) {
      if (valor === BLOQUEIO.DESLIGADO) salvarOpcao(valor);
      return avisarQueNaoHaTrava();
    }
    if (confirmacao !== CONFIRMACAO.CONFIRMADA) return;
    salvarOpcao(valor);
    await plataforma.protegerTela(valor === BLOQUEIO.LIGADO);
  }

  async function confirmarDono() {
    confirmando = true;
    try {
      return await plataforma.confirmarDono(textosDaConfirmacao());
    } finally {
      confirmando = false;
    }
  }

  return { iniciar, desbloquear, mudarOpcao };
}
