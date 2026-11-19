// Ponto de composição: cria as dependências, liga telas, ações e preferências, e guarda o estado da tela.
import { criarAcoesDoMes } from './acoesDoMes.js';
import { criarAgendadorDeAvisos, criarAgendadorSemNotificacoes } from './agendadorDeAvisos.js';
import {
  ENDERECO_DO_ANUNCIO_DE_ATUALIZACAO, criarRelogio, gerarId, obterArmazenamentoDoAparelho, registrarFuncionamentoOffline,
} from './ambiente.js';
import { criarAtualizador, criarBuscaDeAnuncio } from './atualizador.js';
import { criarAvisoDispensado } from './dados/avisoDispensado.js';
import { criarAnoConformePlanilha } from './dados/modeloPlanilha.js';
import { AVISOS, HORARIOS_DOS_AVISOS, criarPreferencias } from './dados/preferencias.js';
import { criarRepositorioOrcamento } from './dados/repositorioOrcamento.js';
import { compararMeses } from './dominio/comparacaoDeMeses.js';
import { resumirContasAPagar, vencimentosDoDia } from './dominio/contasAPagar.js';
import { resumirEvolucaoDosGastos } from './dominio/evolucaoDeGastos.js';
import { resumirGastosPorCategoria } from './dominio/gastosPorCategoria.js';
import { MODO, deslocarMes, periodoDoDia, resumirAno, totalizar } from './dominio/orcamento.js';
import { aplicarTextosNaPagina, criarLocalizacao } from './i18n/localizacao.js';
import { criarNavegacao } from './navegacao.js';
import { criarAtualizacaoNativa, obterPluginDeAtualizacao } from './plataforma/atualizacaoNativa.js';
import { criarNotificacoesNativas, obterPluginDeNotificacoes } from './plataforma/notificacoesNativas.js';
import { criarTratamentoDeErros } from './tratamentoDeErros.js';
import { criarAviso } from './ui/aviso.js';
import { criarBotaoDeValores } from './ui/botaoDeValores.js';
import { criarConviteDeAvisos } from './ui/conviteDeAvisos.js';
import { criarDialogoCategoria } from './ui/dialogoCategoria.js';
import { criarDialogoConfirmacao } from './ui/dialogoConfirmacao.js';
import { criarDialogoCopia } from './ui/dialogoCopia.js';
import { criarDialogoLancamento } from './ui/dialogoLancamento.js';
import { criarFaixaDeAtualizacao } from './ui/faixaDeAtualizacao.js';
import { criarFaixaDeVencimentos } from './ui/faixaDeVencimentos.js';
import { criarGradeDoMes } from './ui/gradeDoMes.js';
import { criarMenuLateral } from './ui/menuLateral.js';
import { criarPainelAnual } from './ui/painelAnual.js';
import { criarPainelComparacao } from './ui/painelComparacao.js';
import { criarPainelContasAPagar } from './ui/painelContasAPagar.js';
import { criarPainelEvolucao } from './ui/painelEvolucao.js';
import { criarPainelGraficoDeGastos } from './ui/painelGraficoDeGastos.js';
import { criarSeletorDeIdioma } from './ui/seletorDeIdioma.js';
import { criarSeletorDeMes } from './ui/seletorDeMes.js';
import { criarSeletorDeModo } from './ui/seletorDeModo.js';
import { criarTelaBoasVindas } from './ui/telaBoasVindas.js';
import { VERSAO_DO_APP } from './versao.js';

const elemento = (id) => document.getElementById(id);

// ── Dados e preferências ────────────────────────────────────────────────────
const relogio = criarRelogio();
const hojeNaAbertura = relogio.hoje();
const armazenamento = obterArmazenamentoDoAparelho();
const repositorio = criarRepositorioOrcamento({
  armazenamento,
  criarAnoInicial: (ano) => criarAnoConformePlanilha(ano, gerarId, modeloDoAnoNovo()),
});
const preferencias = criarPreferencias({
  armazenamento,
  idiomasDoAparelho: navigator.languages ?? [navigator.language],
  jaUsavaOApp: repositorio.existeAnoSalvo(hojeNaAbertura.ano) || repositorio.existeAnoSalvo(hojeNaAbertura.ano - 1),
});
const local = criarLocalizacao(preferencias.obter());
const avisoDispensado = criarAvisoDispensado({ armazenamento });
const pluginDeNotificacoes = obterPluginDeNotificacoes();
const notificacoes = pluginDeNotificacoes && criarNotificacoesNativas(pluginDeNotificacoes);
const agendador = notificacoes
  ? criarAgendadorDeAvisos({ notificacoes, obterMesSalvo: repositorio.obterMesSalvo, agora: relogio.agora, preferencias, local })
  : criarAgendadorSemNotificacoes();

/** Na Evolução, até a pessoa escolher outro, o ano comparado é o imediatamente anterior ao que está na tela. */
const ANO_ANTERIOR = 'ano-anterior';
/** Até onde procurar, em volta de hoje, anos com lançamentos para oferecer na comparação. */
const ANOS_PROCURADOS = Object.freeze({ antesDeHoje: 15, depoisDeHoje: 5 });
const DEZEMBRO = 11;

const estado = {
  ano: hojeNaAbertura.ano,
  mes: hojeNaAbertura.mes,
  periodo: periodoDoDia(modoDeControle(), hojeNaAbertura.dia),
  anoDoPainel: hojeNaAbertura.ano,
  anoComparado: ANO_ANTERIOR,
};

// ── Componentes de interface ────────────────────────────────────────────────
const aviso = criarAviso(elemento('aviso'));
const confirmacao = criarDialogoConfirmacao(elemento('dialogo-confirmacao'), { local });
const { proteger } = criarTratamentoDeErros({
  local, aviso, confirmacao, repositorio, aoRecuperarAno: () => { navegacao.renderizarTelaAtual(); reagendarAvisos(); },
});
const acoes = criarAcoesDoMes({
  repositorio,
  mesAberto: () => ({ ano: estado.ano, mes: estado.mes }),
  local,
  gerarId,
  dialogoLancamento: criarDialogoLancamento(elemento('dialogo-lancamento'), { local }),
  dialogoCategoria: criarDialogoCategoria(elemento('dialogo-categoria'), { local }),
  dialogoCopia: criarDialogoCopia(elemento('dialogo-copia'), { local }),
  confirmacao,
  aviso,
  aoSalvar: () => { navegacao.renderizarTelaAtual(); reagendarAvisos(); },
  aoDigitarValor: (lancamentos) => { grade.atualizarTotais(lancamentos); reagendarAvisos(); },
});

const faixaDeVencimentos = criarFaixaDeVencimentos(elemento('faixa-vencimentos'), {
  local,
  aoVerContas: () => { mudarMesSemRedesenhar(relogio.hoje()); navegacao.abrirTela('contas'); },
  aoDispensar: () => { avisoDispensado.dispensarEm(relogio.hoje()); faixaDeVencimentos.esconder(); },
});
const conviteDeAvisos = criarConviteDeAvisos(elemento('convite-avisos'), {
  local,
  aoLigar: () => { conviteDeAvisos.esconder(); ligarAvisos(); },
  aoRecusar: () => { conviteDeAvisos.esconder(); alterarPreferencia('avisos', AVISOS.DESLIGADOS); },
});
const seletorDeMes = criarSeletorDeMes(elemento('seletor-mes'), {
  local,
  aoSelecionarMes: proteger((mes) => mudarMes({ mes })),
  aoTrocarAno: proteger((deslocamento) => mudarMes({ ano: estado.ano + deslocamento })),
});
const grade = criarGradeDoMes(elemento('grade-do-mes'), {
  local,
  aoAlterarValor: proteger(acoes.alterarValor),
  aoAlterarDescricao: proteger(acoes.alterarDescricao),
  aoMarcarPagamento: proteger(acoes.marcarPagamento),
  aoCategorizar: proteger(acoes.categorizar),
  aoExcluir: proteger(acoes.excluir),
  aoAdicionar: proteger(acoes.incluir),
  aoTrocarPeriodo: (periodo) => { estado.periodo = periodo; navegacao.renderizarTelaAtual(); },
});
const painelContas = criarPainelContasAPagar(elemento('painel-contas'), {
  local, aoTrocarMes: proteger(deslocarMesAberto), aoMarcarPagamento: proteger(acoes.marcarPagamento),
});
const painelComparacao = criarPainelComparacao(elemento('painel-comparacao'), {
  local, aoTrocarMes: proteger(deslocarMesAberto),
});
const painelGrafico = criarPainelGraficoDeGastos(elemento('painel-grafico'), {
  local, aoTrocarMes: proteger(deslocarMesAberto),
});
const painelEvolucao = criarPainelEvolucao(elemento('painel-evolucao'), {
  local,
  aoTrocarAno: proteger(deslocarAnoDoPainel),
  aoEscolherAnoComparado: proteger((ano) => { estado.anoComparado = ano; navegacao.renderizarTelaAtual(); }),
});
const painelAnual = criarPainelAnual(elemento('painel-anual'), { local, aoTrocarAno: proteger(deslocarAnoDoPainel) });
const telaBoasVindas = criarTelaBoasVindas(elemento('tela-boas-vindas'), {
  local, aoEscolherModo: (modo) => { alterarPreferencia('modo', modo); navegacao.abrirTela('mes'); },
});
const menuLateral = criarMenuLateral(elemento('menu-lateral'), elemento('botao-menu'), {
  aoEscolherTela: (nome) => navegacao.abrirTela(nome),
  aoAlterarPreferencia: (nome, valor) => (nome === 'avisos' && valor === AVISOS.LIGADOS ? ligarAvisos() : alterarPreferencia(nome, valor)),
});
const seletorDeIdioma = criarSeletorDeIdioma(elemento('seletor-de-idioma'), {
  local, aoEscolherIdioma: (idioma) => alterarPreferencia('idioma', idioma),
});
const seletorDeModo = criarSeletorDeModo(elemento('botao-visualizacao'), {
  local, aoTrocarModo: (modo) => alterarPreferencia('modo', modo),
});

const botaoDeValores = criarBotaoDeValores(elemento('botao-valores'), {
  local, aoAlternar: (valores) => alterarPreferencia('valores', valores),
});

const navegacao = criarNavegacao({
  telas: {
    'boas-vindas': { renderizar: () => telaBoasVindas.renderizar() },
    mes: { renderizar: proteger(renderizarMes) },
    contas: { renderizar: proteger(renderizarContas) },
    comparacao: { renderizar: proteger(renderizarComparacao) },
    grafico: { renderizar: proteger(renderizarGrafico) },
    evolucao: { renderizar: proteger(renderizarEvolucao), aoAbrir: abrirPainelNoAnoAberto },
    anual: { renderizar: proteger(renderizarPainelAnual), aoAbrir: abrirPainelNoAnoAberto },
  },
  secoes: document.querySelectorAll('[data-tela-conteudo]'),
  topo: document.querySelector('.topo'),
  aoTrocarTela: (nome) => menuLateral.marcarTelaAtual(nome),
});

elemento('botao-copiar-mes').addEventListener('click', proteger(acoes.copiarParaMesesSeguintes));
document.querySelector('.conteudo').addEventListener('click', (evento) => {
  const botaoDeVoltar = evento.target.closest('.botao-voltar[data-tela]');
  if (botaoDeVoltar) navegacao.abrirTela(botaoDeVoltar.dataset.tela);
});

// ── Telas ───────────────────────────────────────────────────────────────────
/** Enquanto a pessoa não escolheu, o app mostra o modo quinzenal (o de quem já usava). */
function modoDeControle() {
  return preferencias.obter().modo ?? MODO.QUINZENAL;
}

/** Anos ainda não abertos nascem no idioma e no modo atuais. */
function modeloDoAnoNovo() {
  return { idioma: preferencias.obter().idioma, modo: modoDeControle() };
}

/** O aviso é sempre sobre hoje, qualquer que seja o mês aberto na tela. */
function renderizarAvisoDeHoje() {
  const hoje = relogio.hoje();
  if (avisoDispensado.foiDispensadoEm(hoje)) return faixaDeVencimentos.esconder();
  faixaDeVencimentos.renderizar(vencimentosDoDia(repositorio.obterMes(hoje.ano, hoje.mes), hoje.dia));
}

/** Só no app instalado, uma vez: convida a ligar os avisos no celular. */
function renderizarConviteDeAvisos() {
  if (!notificacoes || !preferencias.aindaNaoRespondeuSobreAvisos()) return conviteDeAvisos.esconder();
  conviteDeAvisos.renderizar(preferencias.obter().horarioDosAvisos);
}

function renderizarMes() {
  renderizarAvisoDeHoje();
  renderizarConviteDeAvisos();
  const hoje = relogio.hoje();
  seletorDeMes.renderizar({
    ano: estado.ano,
    mesSelecionado: estado.mes,
    mesAtual: estado.ano === hoje.ano ? hoje.mes : undefined,
  });
  elemento('titulo-mes').textContent = local.mesEAno(estado);
  grade.renderizar({
    modo: modoDeControle(),
    ano: estado.ano,
    mes: estado.mes,
    lancamentos: acoes.lancamentosDoMes(),
    periodoAtivo: estado.periodo,
  });
}

function renderizarContas() {
  const mesAberto = { ano: estado.ano, mes: estado.mes };
  painelContas.renderizar({ ...mesAberto, resumo: resumirContasAPagar(acoes.lancamentosDoMes(), mesAberto, relogio.hoje()) });
}

function renderizarComparacao() {
  const mes = { ano: estado.ano, mes: estado.mes };
  const mesAnterior = deslocarMes(mes, -1);
  const comparacao = compararMeses(acoes.lancamentosDoMes(), repositorio.obterMes(mesAnterior.ano, mesAnterior.mes));
  painelComparacao.renderizar({ mes, mesAnterior, comparacao });
}

function renderizarGrafico() {
  painelGrafico.renderizar({ ano: estado.ano, mes: estado.mes, resumo: resumirGastosPorCategoria(acoes.lancamentosDoMes()) });
}

/** Só entram na comparação anos que já têm lançamentos no aparelho: consultar não cria o ano. */
function renderizarEvolucao() {
  const ano = estado.anoDoPainel;
  const hoje = relogio.hoje();
  const anosParaComparar = repositorio
    .anosSalvosEntre(hoje.ano - ANOS_PROCURADOS.antesDeHoje, hoje.ano + ANOS_PROCURADOS.depoisDeHoje)
    .filter((anoSalvo) => anoSalvo !== ano);
  const anoPretendido = estado.anoComparado === ANO_ANTERIOR ? ano - 1 : estado.anoComparado;
  const anoComparado = anosParaComparar.includes(anoPretendido) ? anoPretendido : undefined;
  const gastosPorMes = (anoConsultado) => repositorio.obterAno(anoConsultado).map((lancamentos) => totalizar(lancamentos).gasto);
  const evolucao = resumirEvolucaoDosGastos({
    gastosDoAno: gastosPorMes(ano),
    gastosDoAnoComparado: anoComparado === undefined ? undefined : gastosPorMes(anoComparado),
    gastoDoDezembroAnterior: repositorio.existeAnoSalvo(ano - 1) ? gastosPorMes(ano - 1)[DEZEMBRO] : undefined,
  });
  painelEvolucao.renderizar({ ano, anoComparado, anosParaComparar, evolucao });
}

/** Relatórios por ano abrem no ano do mês aberto e depois andam sozinhos, sem mudar o mês aberto. */
function abrirPainelNoAnoAberto() {
  estado.anoDoPainel = estado.ano;
}

function deslocarAnoDoPainel(deslocamento) {
  estado.anoDoPainel += deslocamento;
  navegacao.renderizarTelaAtual();
}

function renderizarPainelAnual() {
  const lancamentosPorMes = repositorio.obterAno(estado.anoDoPainel);
  painelAnual.renderizar({
    ano: estado.anoDoPainel,
    resumo: resumirAno(lancamentosPorMes),
    gastosPorCategoria: resumirGastosPorCategoria(lancamentosPorMes.flat()),
  });
}

function mudarMes(alteracao) {
  mudarMesSemRedesenhar(alteracao);
  navegacao.renderizarTelaAtual();
}

function mudarMesSemRedesenhar({ ano = estado.ano, mes = estado.mes }) {
  Object.assign(estado, { ano, mes });
}

function deslocarMesAberto(deslocamento) {
  mudarMes(deslocarMes(estado, deslocamento));
}

// ── Preferências ────────────────────────────────────────────────────────────
function alterarPreferencia(nome, valor) {
  aplicarPreferencias(preferencias.alterar({ [nome]: valor }));
  if (nome === 'modo') estado.periodo = periodoDoDia(valor, relogio.hoje().dia);
  navegacao.renderizarTelaAtual();
  reagendarAvisos();
}

/** Liga os avisos só com a permissão de notificação do celular; sem ela, explica onde permitir. */
async function ligarAvisos() {
  const permitido = (await notificacoes.temPermissao()) || (await notificacoes.pedirPermissao());
  if (!permitido) aviso.mostrar(local.t('notificacao.semPermissao'));
  alterarPreferencia('avisos', permitido ? AVISOS.LIGADOS : AVISOS.DESLIGADOS);
}

function reagendarAvisos() {
  agendador.reagendar().catch((erro) => console.warn('Avisos de vencimento não reagendados.', erro));
}

function prepararAvisosNoCelular() {
  if (!notificacoes) return;
  elemento('preferencia-avisos').hidden = false;
  const horarios = elemento('horario-dos-avisos');
  horarios.addEventListener('change', () => alterarPreferencia('horarioDosAvisos', horarios.value));
  notificacoes.prepararCanal(local.t('notificacao.canal'));
  notificacoes.aoTocar(({ ano, mes }) => { mudarMesSemRedesenhar({ ano, mes }); navegacao.abrirTela('contas'); });
  reagendarAvisos();
}

/** Tema, idioma, moeda, modo e valores à vista valem para a página inteira: textos fixos, topo, menu e tela aberta. */
function aplicarPreferencias(atuais) {
  document.documentElement.dataset.tema = atuais.tema;
  document.documentElement.lang = atuais.idioma;
  local.configurar(atuais);
  elemento('descricao-lancamentos').dataset.i18n = `menu.lancamentos.${modoDeControle()}`;
  aplicarTextosNaPagina(document, local);
  menuLateral.marcarPreferencias(atuais);
  seletorDeIdioma.renderizar(atuais.idioma);
  seletorDeModo.renderizar(modoDeControle());
  botaoDeValores.renderizar(atuais.valores);
  renderizarHorariosDosAvisos(atuais.horarioDosAvisos);
}

function renderizarHorariosDosAvisos(horarioEscolhido) {
  elemento('horario-dos-avisos').innerHTML = HORARIOS_DOS_AVISOS.map((horario) =>
    `<option value="${horario}" ${horario === horarioEscolhido ? 'selected' : ''}>${local.formatarHorario(horario)}</option>`).join('');
}

/** No app instalado: baixa pacotes novos sozinho ou avisa quando é preciso instalar um APK novo. */
function verificarAtualizacao() {
  const plugin = obterPluginDeAtualizacao();
  if (!plugin) return;
  const faixa = criarFaixaDeAtualizacao(elemento('faixa-atualizacao'), { local });
  criarAtualizador({
    plataforma: criarAtualizacaoNativa(plugin),
    buscarAnuncio: criarBuscaDeAnuncio(ENDERECO_DO_ANUNCIO_DE_ATUALIZACAO),
    versaoEmUso: VERSAO_DO_APP,
    aoPacotePronto: faixa.mostrarPacotePronto,
    aoApkDisponivel: faixa.mostrarApkDisponivel,
  }).verificar().catch((erro) => console.warn('Atualização não verificada; tenta de novo na próxima abertura.', erro));
}

/** Mostra a versão no rodapé da tela principal e no menu. */
function mostrarVersaoDoApp() {
  for (const lugar of document.querySelectorAll('[data-versao-do-app]')) lugar.textContent = `ContaCerta ${VERSAO_DO_APP}`;
}

mostrarVersaoDoApp();
aplicarPreferencias(preferencias.obter());
navegacao.abrirTela(preferencias.precisaEscolherModo() ? 'boas-vindas' : 'mes');
registrarFuncionamentoOffline();
prepararAvisosNoCelular();
verificarAtualizacao();
