import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ErroCotacaoIndisponivel, MOMENTO_DA_COTACAO, buscarCotacaoDoDolar, criarFonteAwesomeApi, criarFontePtax,
  momentoDaCotacao, montarCotacaoPublica,
} from '../motor/cotacaoDoDolar.mjs';

const respostaJson = (corpo, status = 200) => async () => ({ ok: status < 400, status, json: async () => corpo });
const fetchQueFalha = async () => { throw new Error('sem rede'); };
const ABERTURA_26_11 = new Date('2026-11-26T09:31:00-03:00');
const FECHAMENTO_26_11 = new Date('2026-11-26T17:30:00-03:00');

test('cotação antes das 13h de Brasília é da abertura; depois, do fechamento', () => {
  assert.equal(momentoDaCotacao(ABERTURA_26_11), MOMENTO_DA_COTACAO.ABERTURA);
  assert.equal(momentoDaCotacao(new Date('2026-11-26T12:59:00-03:00')), MOMENTO_DA_COTACAO.ABERTURA);
  assert.equal(momentoDaCotacao(new Date('2026-11-26T13:00:00-03:00')), MOMENTO_DA_COTACAO.FECHAMENTO);
  assert.equal(momentoDaCotacao(FECHAMENTO_26_11), MOMENTO_DA_COTACAO.FECHAMENTO);
});

test('arquivo publicado: valor com 4 casas, variação com 2 e data em UTC', () => {
  const publicada = montarCotacaoPublica({ venda: 5.644549, variacaoPercentual: -3.040716, cotadoEm: FECHAMENTO_26_11, fonte: 'X' });
  assert.deepEqual(publicada, {
    formato: 1, moeda: 'USD', valor: 5.6445, variacaoPercentual: -3.04,
    momento: 'fechamento', cotadoEm: '2026-11-26T20:30:00.000Z', fonte: 'X',
  });
});

test('AwesomeAPI: usa o valor de venda, a variação do dia e o horário da cotação', async () => {
  const buscar = criarFonteAwesomeApi({ fetch: respostaJson({
    USDBRL: { bid: '5.644', ask: '5.6445', pctChange: '-3.040716', timestamp: String(FECHAMENTO_26_11.getTime() / 1000) },
  }) });
  assert.deepEqual(await buscar(), { venda: 5.6445, variacaoPercentual: -3.040716, cotadoEm: FECHAMENTO_26_11, fonte: 'AwesomeAPI' });
});

test('PTAX: última cotação do período e variação contra a anterior, no horário de Brasília', async () => {
  let enderecoPedido;
  const buscar = criarFontePtax({
    agora: () => FECHAMENTO_26_11,
    fetch: async (endereco) => {
      enderecoPedido = endereco;
      return respostaJson({ value: [
        { cotacaoVenda: 5.0, dataHoraCotacao: '2026-11-25 13:02:42.418' },
        { cotacaoVenda: 5.1, dataHoraCotacao: '2026-11-26 13:11:27.937' },
      ] })();
    },
  });
  const cotacao = await buscar();
  assert.equal(cotacao.venda, 5.1);
  assert.ok(Math.abs(cotacao.variacaoPercentual - 2) < 1e-9);
  assert.equal(cotacao.cotadoEm.toISOString(), '2026-11-26T16:11:27.937Z');
  assert.match(enderecoPedido, /dataFinalCotacao='11-26-2026'/);
});

test('primeira fonte fora do ar: usa a reserva', async () => {
  const reserva = async () => ({ venda: 5.1, variacaoPercentual: 0.5, cotadoEm: FECHAMENTO_26_11, fonte: 'Reserva' });
  const cotacao = await buscarCotacaoDoDolar([criarFonteAwesomeApi({ fetch: fetchQueFalha }), reserva]);
  assert.equal(cotacao.fonte, 'Reserva');
});

test('resposta com erro HTTP ou valor estranho não vale como cotação', async () => {
  const comErro = criarFonteAwesomeApi({ fetch: respostaJson({}, 503) });
  const semValor = async () => ({ venda: Number.NaN, variacaoPercentual: 0, cotadoEm: FECHAMENTO_26_11, fonte: 'Zerada' });
  await assert.rejects(buscarCotacaoDoDolar([comErro, semValor]), (erro) => {
    assert.ok(erro instanceof ErroCotacaoIndisponivel);
    assert.match(erro.message, /HTTP 503/);
    assert.match(erro.message, /Zerada/);
    return true;
  });
});
