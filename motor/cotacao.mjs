// Ponto de entrada da cotação do dólar (roda no GitHub Actions na abertura e no fechamento do mercado):
// node motor/cotacao.mjs — grava docs/cotacoes/dolar.json. Se nenhuma fonte responder, o arquivo anterior fica.
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buscarCotacaoDoDolar, criarFonteAwesomeApi, criarFontePtax, montarCotacaoPublica,
} from './cotacaoDoDolar.mjs';
import { criarSite } from './site.mjs';

const RAIZ = resolve(fileURLToPath(new URL('..', import.meta.url)));
const site = criarSite(resolve(RAIZ, 'docs'));

try {
  const cotacao = montarCotacaoPublica(await buscarCotacaoDoDolar([criarFonteAwesomeApi(), criarFontePtax()]));
  await site.escreverJson('cotacoes', 'dolar.json', cotacao);
  console.log(`Dólar ${cotacao.valor} (${cotacao.variacaoPercentual}%, ${cotacao.momento}, ${cotacao.cotadoEm}, ${cotacao.fonte})`);
} catch (erro) {
  console.error(`Cotação do dólar não atualizada: ${erro.message}`);
  process.exitCode = 1;
}
