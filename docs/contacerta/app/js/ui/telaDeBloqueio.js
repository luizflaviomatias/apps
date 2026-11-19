/**
 * Tela que cobre o app enquanto ele está bloqueado. Bloqueado é um atributo em <html>
 * (`data-bloqueado`), que o CSS usa para esconder todo o resto; o script do <head> já o põe
 * antes da primeira pintura, para os valores não aparecerem nem por um instante.
 */
export function criarTelaDeBloqueio(secao, { raiz = document.documentElement, aoDesbloquear }) {
  const botao = secao.querySelector('[data-acao="desbloquear"]');
  botao.addEventListener('click', aoDesbloquear);

  return {
    mostrar: () => {
      raiz.dataset.bloqueado = '';
      botao.focus();
    },
    esconder: () => { delete raiz.dataset.bloqueado; },
  };
}
