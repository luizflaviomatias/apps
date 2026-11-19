import { MOTIVO } from '../dominio/licenca.js';
import { escaparHtml } from './formatacao.js';

/** Texto de apoio conforme o motivo do bloqueio: nunca assinou ou a assinatura venceu. */
const EXPLICACAO_DO_MOTIVO = { [MOTIVO.EXPIRADA]: 'assinatura.vencida' };

/** O que dizer quando "Já assinei" não liberou. */
function mensagemDaTentativa(resultado) {
  if (resultado.semConexao) return 'assinatura.semInternet';
  return 'assinatura.naoEncontrado';
}

/**
 * Tela de bloqueio: mostra o preço, o código do aparelho e leva ao pagamento.
 * Depois de pagar, "Já assinei" busca a licença; quem recebeu uma chave por mensagem pode colar.
 * @param {{ local: object, licenciamento: ReturnType<typeof import('../licenciamento.js').criarLicenciamento>,
 *           aoLiberar: () => void, copiarTexto?: (texto: string) => Promise<void> }} dependencias
 */
export function criarTelaAssinatura(container, {
  local, licenciamento, aoLiberar, copiarTexto = (texto) => navigator.clipboard.writeText(texto),
}) {
  let motivo = MOTIVO.SEM_LICENCA;
  let mensagem = '';

  container.addEventListener('click', async (evento) => {
    const acao = evento.target.closest('[data-acao]')?.dataset.acao;
    if (acao === 'copiar') await copiarCodigo();
    if (acao === 'ja-assinei') await tentar(() => licenciamento.renovar(), mensagemDaTentativa);
    if (acao === 'ativar') await tentar(() => licenciamento.ativar(container.querySelector('#chave-de-ativacao').value), () => 'assinatura.chaveRecusada');
  });

  async function copiarCodigo() {
    await copiarTexto(licenciamento.codigoDoAparelho()).catch(() => {});
    mostrarMensagem('assinatura.copiado');
  }

  async function tentar(obterResultado, mensagemSeFalhar) {
    mostrarMensagem('assinatura.conferindo');
    const resultado = await obterResultado();
    if (resultado.ok) aoLiberar();
    else mostrarMensagem(mensagemSeFalhar(resultado));
  }

  function mostrarMensagem(chave) {
    mensagem = chave;
    container.querySelector('[data-mensagem]').textContent = local.t(chave);
  }

  /** @param {{ motivo: string }} resultado da verificação que bloqueou o app */
  function mostrar(resultado) {
    motivo = resultado.motivo;
    mensagem = resultado.semConexao ? 'assinatura.semInternet' : '';
  }

  function renderizar() {
    const { t } = local;
    container.innerHTML = `
      <div class="assinatura">
        <h2 class="assinatura__titulo">${t('assinatura.titulo')}</h2>
        <p class="assinatura__preco">${t('assinatura.preco')}</p>
        <p>${t(EXPLICACAO_DO_MOTIVO[motivo] ?? 'assinatura.explicacao')}</p>
        <div class="assinatura__codigo">
          <span>${t('assinatura.codigo')}</span>
          <strong data-codigo>${escaparHtml(licenciamento.codigoDoAparelho())}</strong>
          <button type="button" class="botao-secundario" data-acao="copiar">${t('assinatura.copiar')}</button>
        </div>
        <a class="botao-primario assinatura__assinar" href="${escaparHtml(licenciamento.linkDeAssinatura())}"
           target="_blank" rel="noopener">${t('assinatura.assinar')}</a>
        <button type="button" class="botao-secundario assinatura__ja-assinei" data-acao="ja-assinei">${t('assinatura.jaAssinei')}</button>
        <p class="assinatura__mensagem" data-mensagem role="status">${mensagem ? t(mensagem) : ''}</p>
        <details class="assinatura__chave">
          <summary>${t('assinatura.temChave')}</summary>
          <label>${t('assinatura.chave')}<textarea id="chave-de-ativacao" rows="3" spellcheck="false" autocomplete="off"></textarea></label>
          <button type="button" class="botao-secundario" data-acao="ativar">${t('assinatura.ativar')}</button>
        </details>
        <p class="assinatura__nota">${t('assinatura.dados')}</p>
      </div>`;
  }

  return { mostrar, renderizar };
}
