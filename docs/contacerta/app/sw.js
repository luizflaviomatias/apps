// Deixa o app abrir sem internet. Ao publicar uma nova versão, troque VERSAO_DO_CACHE.
const VERSAO_DO_CACHE = 'contacerta-v22';
const ARQUIVOS_DO_APP = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/app.js',
  './js/atualizador.js',
  './js/bloqueioDoApp.js',
  './js/agendadorDeAvisos.js',
  './js/plataforma/notificacoesNativas.js',
  './js/dominio/agendaDeVencimentos.js',
  './js/ui/conviteDeAvisos.js',
  './js/plataforma/atualizacaoNativa.js',
  './js/plataforma/bloqueioNativo.js',
  './js/dominio/atualizacao.js',
  './js/dominio/licenca.js',
  './js/licenciamento.js',
  './js/ui/telaAssinatura.js',
  './js/ui/faixaDeAtualizacao.js',
  './js/versao.js',
  './js/dominio/versoes.js',
  './js/acoesDoMes.js',
  './js/acoesDasTarefas.js',
  './js/dominio/tarefas.js',
  './js/dados/repositorioTarefas.js',
  './js/ui/painelTarefas.js',
  './js/ambiente.js',
  './js/navegacao.js',
  './js/tratamentoDeErros.js',
  './js/dominio/dinheiro.js',
  './js/dominio/orcamento.js',
  './js/dominio/contasAPagar.js',
  './js/dominio/comparacaoDeMeses.js',
  './js/dados/modeloPlanilha.js',
  './js/dados/repositorioOrcamento.js',
  './js/ui/seletorDeMes.js',
  './js/ui/seletorDeIdioma.js',
  './js/ui/telaBoasVindas.js',
  './js/ui/telaDeBloqueio.js',
  './js/ui/dialogoCopia.js',
  './js/ui/dialogoConfirmacao.js',
  './js/ui/seletorDeModo.js',
  './js/ui/botaoDeValores.js',
  './js/dominio/categorias.js',
  './js/dominio/gastosPorCategoria.js',
  './js/dominio/evolucaoDeGastos.js',
  './js/ui/listaDeCategorias.js',
  './js/ui/dialogoCategoria.js',
  './js/ui/painelGraficoDeGastos.js',
  './js/ui/painelEvolucao.js',
  './js/ui/gastosPorGrupo.js',
  './js/ui/diferenca.js',
  './js/ui/faixaDeVencimentos.js',
  './js/dados/avisoDispensado.js',
  './js/ui/aviso.js',
  './js/ui/dialogoLancamento.js',
  './js/ui/formatacao.js',
  './js/ui/gradeDoMes.js',
  './js/ui/icones.js',
  './js/ui/painelAnual.js',
  './js/ui/painelContasAPagar.js',
  './js/ui/painelComparacao.js',
  './js/i18n/localizacao.js',
  './js/i18n/textos/pt-BR.js',
  './js/i18n/textos/es-ES.js',
  './js/i18n/textos/en-US.js',
  './js/dados/preferencias.js',
  './js/ui/cabecalhoDePeriodo.js',
  './js/ui/menuLateral.js',
  './icones/icone-180.png',
  './icones/icone-192.png',
  './icones/icone-512.png',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(VERSAO_DO_CACHE).then((cache) => cache.addAll(ARQUIVOS_DO_APP)));
  self.skipWaiting();
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((chaves) => Promise.all(chaves.filter((chave) => chave !== VERSAO_DO_CACHE).map((chave) => caches.delete(chave))))
      .then(() => self.clients.claim()),
  );
});

// Rede primeiro (para pegar atualizações); sem rede, usa o cache.
self.addEventListener('fetch', (evento) => {
  if (evento.request.method !== 'GET') return;
  evento.respondWith(
    fetch(evento.request)
      .then((resposta) => {
        const copia = resposta.clone();
        caches.open(VERSAO_DO_CACHE).then((cache) => cache.put(evento.request, copia));
        return resposta;
      })
      .catch(() => caches.match(evento.request)),
  );
});
