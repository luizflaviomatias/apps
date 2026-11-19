// Ícones em traço único (SVG), herdando a cor do texto. Decorativos: o nome acessível fica no botão.
function icone(desenho) {
  return `<svg class="icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
               stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${desenho}</svg>`;
}

export const ICONE = Object.freeze({
  anterior: icone('<path d="m15 18-6-6 6-6"/>'),
  seguinte: icone('<path d="m9 18 6-6-6-6"/>'),
  excluir: icone('<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"/><path d="M9 7V4h6v3"/>'),
  mais: icone('<path d="M12 5v14M5 12h14"/>'),
  olhoAberto: icone('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  olhoFechado: icone('<path d="M3 3l18 18"/><path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17.3 17.3 0 0 1-3.1 4"/>'
    + '<path d="M6.5 6.6C3.7 8.5 2 12 2 12s3.6 7 10 7a9.8 9.8 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>'),
});
