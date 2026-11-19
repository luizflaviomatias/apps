// Licença por assinatura: chave assinada pelo emissor (ECDSA P-256) que o app só confere, sem internet.
// Formato: base64url(payload) + "." + base64url(assinatura); a assinatura cobre a string base64url do payload.
// payload = { v: 1, app, did: código do aparelho, exp: fim da validade em milissegundos }

export const APP_DA_LICENCA = 'contacerta';

/** Faltando menos que isto para vencer, o app já pede a licença do mês seguinte quando tiver internet. */
export const ANTECEDENCIA_DA_RENOVACAO_MS = 4 * 24 * 60 * 60 * 1000;

const ALGORITMO = { name: 'ECDSA', namedCurve: 'P-256' };
const ASSINATURA = { name: 'ECDSA', hash: 'SHA-256' };
const texto = new TextEncoder();

export const MOTIVO = Object.freeze({
  SEM_LICENCA: 'sem-licenca',
  INVALIDA: 'invalida',
  OUTRO_APP: 'outro-app',
  OUTRO_APARELHO: 'outro-aparelho',
  EXPIRADA: 'expirada',
});

/**
 * Código aleatório, gerado uma vez por instalação: "ABCD-1234-EF56-7890-ABCD".
 * Aleatório em vez de "impressão digital" do aparelho, que repete entre celulares iguais e muda com o sistema.
 * @param {(bytes: Uint8Array) => Uint8Array} [sortear]
 */
export function gerarCodigoDoAparelho(sortear = (bytes) => crypto.getRandomValues(bytes)) {
  const hexadecimal = [...sortear(new Uint8Array(10))].map((byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
  return hexadecimal.match(/.{4}/g).join('-');
}

export const ehCodigoDoAparelho = (codigo) => /^[0-9A-F]{4}(-[0-9A-F]{4}){4}$/.test(String(codigo));

function deBase64Url(valor) {
  const base64 = valor.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(valor.length / 4) * 4, '=');
  return Uint8Array.from(atob(base64), (letra) => letra.charCodeAt(0));
}

export const importarChavePublica = (jwk) => crypto.subtle.importKey('jwk', jwk, ALGORITMO, false, ['verify']);

async function assinaturaConfere(chavePublica, payload, assinatura) {
  try {
    return await crypto.subtle.verify(ASSINATURA, chavePublica, deBase64Url(assinatura), texto.encode(payload));
  } catch {
    return false;
  }
}

function lerPayload(payload) {
  try {
    return JSON.parse(new TextDecoder().decode(deBase64Url(payload)));
  } catch {
    return undefined;
  }
}

/**
 * @param {CryptoKey} chavePublica
 * @param {string | null} chave
 * @param {{ aparelho: string, agora: number }} contexto agora em milissegundos
 * @returns {Promise<{ ok: true, expiraEm: number } | { ok: false, motivo: string }>}
 */
export async function conferirLicenca(chavePublica, chave, { aparelho, agora }) {
  if (!chave) return { ok: false, motivo: MOTIVO.SEM_LICENCA };
  const [payload, assinatura] = String(chave).trim().split('.');
  if (!payload || !assinatura || !(await assinaturaConfere(chavePublica, payload, assinatura))) {
    return { ok: false, motivo: MOTIVO.INVALIDA };
  }
  const dados = lerPayload(payload);
  if (!dados || !Number.isFinite(dados.exp)) return { ok: false, motivo: MOTIVO.INVALIDA };
  if (dados.app !== APP_DA_LICENCA) return { ok: false, motivo: MOTIVO.OUTRO_APP };
  if (dados.did !== aparelho) return { ok: false, motivo: MOTIVO.OUTRO_APARELHO };
  if (agora > dados.exp) return { ok: false, motivo: MOTIVO.EXPIRADA };
  return { ok: true, expiraEm: dados.exp };
}

export const estaPertoDeVencer = (expiraEm, agora) => expiraEm - agora < ANTECEDENCIA_DA_RENOVACAO_MS;

/** Link do Stripe já com o aparelho, para o pagamento chegar ao emissor ligado a esta instalação. */
export function montarLinkDeAssinatura(linkDoStripe, aparelho) {
  const link = new URL(linkDoStripe);
  link.searchParams.set('client_reference_id', `${APP_DA_LICENCA}_${aparelho}`);
  return link.toString();
}
