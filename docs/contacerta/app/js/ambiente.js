// O que vem do aparelho: armazenamento, relógio e funcionamento sem internet.

const CHAVE_DE_TESTE_DO_ARMAZENAMENTO = 'contacerta:teste';
/** Anúncio da versão mais nova, publicado pela landing page (repositório apps) a partir do versao.json. */
export const ENDERECO_DO_ANUNCIO_DE_ATUALIZACAO = 'https://luizflaviomatias.github.io/apps/contacerta/atualizacao.json';

/** Cotação do dólar publicada pela landing page (repositório apps) na abertura e no fechamento do mercado. */
export const ENDERECO_DA_COTACAO_DO_DOLAR = 'https://luizflaviomatias.github.io/apps/cotacoes/dolar.json';

/** Serviço que entrega a licença de quem assinou (repositório licencas, no Cloudflare Workers). */
export const ENDERECO_DO_EMISSOR_DE_LICENCAS = 'https://licencas.luizflaviomatias.workers.dev';
/** Payment Link do Stripe da assinatura mensal do ContaCerta. */
export const LINK_DE_ASSINATURA = 'https://buy.stripe.com/aFa5kE5qG4Gs8Rc3U88og05';
/** Portal do cliente do Stripe: cancelar a assinatura, trocar a forma de pagamento e ver os recibos. */
export const LINK_DO_PORTAL_DO_CLIENTE = 'https://billing.stripe.com/p/login/cNi6oIdXcgpa5F062g8og00';
/** Termos de Uso e Política de Privacidade próprios do ContaCerta, publicados na página dos apps. */
export const DOCUMENTOS_LEGAIS = Object.freeze({
  termosDeUso: 'https://luizflaviomatias.github.io/apps/termos/contacerta/',
  politicaDePrivacidade: 'https://luizflaviomatias.github.io/apps/privacidade/contacerta/',
});
/** Só a chave pública: o app confere licenças, mas não consegue criá-las. */
export const CHAVE_PUBLICA_DA_LICENCA = Object.freeze({ kty: 'EC', crv: 'P-256', x: '9-VkVCSR2KcgtUKdWR5eSXkCQTUKmQxlMYAeJo3pCZg', y: 'Asf-TPYErtIegrLzMz5stVRDx5O-wNRpksJGs-JcwzI' });

/** No modo privado do Safari o localStorage pode falhar: aí os dados ficam só em memória. */
export function obterArmazenamentoDoAparelho() {
  try {
    window.localStorage.setItem(CHAVE_DE_TESTE_DO_ARMAZENAMENTO, '1');
    window.localStorage.removeItem(CHAVE_DE_TESTE_DO_ARMAZENAMENTO);
    return window.localStorage;
  } catch {
    const memoria = new Map();
    return { getItem: (chave) => memoria.get(chave) ?? null, setItem: (chave, valor) => memoria.set(chave, valor) };
  }
}

/**
 * Relógio lido sempre na hora, para o app aberto de um dia para o outro não ficar preso na data da abertura.
 * @param {() => Date} [lerDataEHora] trocável nos testes
 */
export function criarRelogio(lerDataEHora = () => new Date()) {
  function agora() {
    const momento = lerDataEHora();
    return {
      ano: momento.getFullYear(), mes: momento.getMonth(), dia: momento.getDate(),
      hora: momento.getHours(), minuto: momento.getMinutes(),
    };
  }
  return {
    agora,
    hoje() {
      const { ano, mes, dia } = agora();
      return { ano, mes, dia };
    },
  };
}

export function gerarId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** No APK os arquivos já vêm dentro do app; o service worker só serve à versão web. */
export function registrarFuncionamentoOffline() {
  const ehAppNativo = window.Capacitor?.isNativePlatform?.() ?? false;
  if (!ehAppNativo && 'serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
}
