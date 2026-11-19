// Adaptador dos plugins usados pelo bloqueio do app: o resto do app fala só com estas funções.
// - BiometricAuthNative (@aparajita/capacitor-biometric-auth): a trava do próprio aparelho;
// - ProtecaoDaTela (plugin do próprio app, no Android): esconde o app nos recentes e nas capturas de tela;
// - App (@capacitor/app): avisa quando o app vai para segundo plano e quando volta.

export const CONFIRMACAO = Object.freeze({
  CONFIRMADA: 'confirmada',
  NAO_CONFIRMADA: 'nao-confirmada',
  /** O aparelho não tem bloqueio de tela: não há trava para pedir. */
  SEM_TRAVA: 'sem-trava',
});

/** Erros do plugin que querem dizer "o aparelho não tem bloqueio de tela". */
const ERROS_DE_APARELHO_SEM_TRAVA = new Set(['noDeviceCredential', 'passcodeNotSet']);

/**
 * @param {{ autenticacao: object, protecaoDaTela?: object, ciclo: object }} plugins
 * `protecaoDaTela` só existe no Android; no iPhone o próprio sistema cobre o app nos recentes.
 */
export function criarBloqueioNativo({ autenticacao, protecaoDaTela, ciclo }) {
  async function confirmarDono(textos) {
    const { deviceIsSecure } = await autenticacao.checkBiometry();
    if (!deviceIsSecure) return CONFIRMACAO.SEM_TRAVA;
    try {
      // No app nativo o método do plugin se chama internalAuthenticate; o authenticate() da documentação
      // é um invólucro do pacote npm, que este app (sem empacotador) não carrega.
      await autenticacao.internalAuthenticate({
        reason: textos.motivo,
        androidTitle: textos.titulo,
        androidSubtitle: textos.motivo,
        cancelTitle: textos.cancelar,
        allowDeviceCredential: true,
        androidConfirmationRequired: false,
      });
      return CONFIRMACAO.CONFIRMADA;
    } catch (erro) {
      return ERROS_DE_APARELHO_SEM_TRAVA.has(erro?.code) ? CONFIRMACAO.SEM_TRAVA : CONFIRMACAO.NAO_CONFIRMADA;
    }
  }

  return {
    /** Pede a digital, o rosto, o padrão, o PIN ou a senha do aparelho; o app só fica sabendo se deu certo. */
    confirmarDono,
    protegerTela: async (protegida) => { await protecaoDaTela?.definir({ protegida }); },
    aoSairEVoltar: ({ aoSair, aoVoltar }) => {
      ciclo.addListener('pause', aoSair);
      ciclo.addListener('resume', aoVoltar);
    },
  };
}

/** Só no app instalado com os plugins (APK 3.10.0 em diante); no navegador não há trava para pedir. */
export function obterPluginsDoBloqueio() {
  const capacitor = window.Capacitor;
  if (!capacitor?.isNativePlatform?.()) return undefined;
  const { BiometricAuthNative: autenticacao, ProtecaoDaTela: protecaoDaTela, App: ciclo } = capacitor.Plugins ?? {};
  if (!autenticacao || !ciclo) return undefined;
  return { autenticacao, protecaoDaTela, ciclo };
}
