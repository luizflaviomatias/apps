/**
 * Troca de telas: mostra a seção da tela escolhida, esconde as outras e a redesenha.
 * Enquanto houver uma tela de bloqueio (a da assinatura), qualquer pedido de troca abre ela, venha de onde vier
 * (menu, notificação, botão de voltar).
 * @param {{ telas: Record<string, { renderizar: () => void, aoAbrir?: () => void }>,
 *           secoes: NodeListOf<HTMLElement>, topo: HTMLElement, aoTrocarTela: (nome: string) => void,
 *           bloqueadaEm?: string }} dependencias
 *   bloqueadaEm: já começa bloqueada nesta tela, sem mostrá-la; o app decide depois de conferir a licença.
 */
export function criarNavegacao({ telas, secoes, topo, aoTrocarTela, bloqueadaEm }) {
  let telaAtual;
  let telaDeBloqueio = bloqueadaEm;

  function abrirTela(nomePedido) {
    const nome = telaDeBloqueio ?? nomePedido;
    telaAtual = nome;
    telas[nome].aoAbrir?.();
    for (const secao of secoes) secao.hidden = secao.dataset.telaConteudo !== nome;
    topo.dataset.tela = nome;
    aoTrocarTela(nome);
    renderizarTelaAtual();
    window.scrollTo(0, 0);
  }

  /** Cada tela se redesenha ao abrir e depois de cada mudança, porque o mês pode ter mudado em outra. */
  function renderizarTelaAtual() {
    telas[telaAtual]?.renderizar();
  }

  function bloquearEm(nome) {
    telaDeBloqueio = nome;
    abrirTela(nome);
  }

  function liberarEAbrir(nome) {
    telaDeBloqueio = undefined;
    abrirTela(nome);
  }

  return { abrirTela, renderizarTelaAtual, bloquearEm, liberarEAbrir };
}
