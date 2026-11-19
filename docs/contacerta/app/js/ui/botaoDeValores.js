import { VALORES } from '../dados/preferencias.js';
import { ICONE } from './icones.js';

const OUTRA_ESCOLHA = { [VALORES.VISIVEIS]: VALORES.OCULTOS, [VALORES.OCULTOS]: VALORES.VISIVEIS };
const APARENCIA = {
  [VALORES.VISIVEIS]: { icone: ICONE.olhoAberto, dica: 'valores.ocultar' },
  [VALORES.OCULTOS]: { icone: ICONE.olhoFechado, dica: 'valores.mostrar' },
};

/**
 * Botão do olho no topo: aberto com os valores à vista, fechado com eles ocultos.
 * Ao tocar, avisa `aoAlternar(novaEscolha)`.
 */
export function criarBotaoDeValores(botao, { local, aoAlternar }) {
  let escolhaAtual = VALORES.VISIVEIS;
  botao.addEventListener('click', () => aoAlternar(OUTRA_ESCOLHA[escolhaAtual]));

  function renderizar(escolha) {
    escolhaAtual = escolha;
    const { icone, dica } = APARENCIA[escolha];
    botao.innerHTML = icone;
    botao.setAttribute('aria-label', local.t(dica));
    botao.setAttribute('aria-pressed', String(escolha === VALORES.OCULTOS));
    botao.title = local.t(dica);
  }

  return { renderizar };
}
