// Monta um .zip pequeno para os testes (cada arquivo guardado ou em deflate).
import { crc32, deflateRawSync } from 'node:zlib';

/** @param {Array<[nome: string, conteudo: string, metodo?: 0 | 8]>} entradas */
export function montarZip(entradas) {
  const partes = [];
  const indice = [];
  let posicao = 0;
  for (const [nome, texto, metodo = 8] of entradas) {
    const conteudo = Buffer.from(texto, 'utf8');
    const dados = metodo === 8 ? deflateRawSync(conteudo) : conteudo;
    const nomeEmBytes = Buffer.from(nome, 'utf8');
    const cabecalho = Buffer.alloc(30);
    cabecalho.writeUInt32LE(0x04034b50, 0);
    cabecalho.writeUInt16LE(metodo, 8);
    cabecalho.writeUInt32LE(crc32(conteudo), 14);
    cabecalho.writeUInt32LE(dados.length, 18);
    cabecalho.writeUInt32LE(conteudo.length, 22);
    cabecalho.writeUInt16LE(nomeEmBytes.length, 26);
    const entrada = Buffer.alloc(46);
    entrada.writeUInt32LE(0x02014b50, 0);
    entrada.writeUInt16LE(metodo, 10);
    entrada.writeUInt32LE(crc32(conteudo), 16);
    entrada.writeUInt32LE(dados.length, 20);
    entrada.writeUInt32LE(conteudo.length, 24);
    entrada.writeUInt16LE(nomeEmBytes.length, 28);
    entrada.writeUInt32LE(posicao, 42);
    partes.push(cabecalho, nomeEmBytes, dados);
    indice.push(entrada, nomeEmBytes);
    posicao += 30 + nomeEmBytes.length + dados.length;
  }
  const indiceEmBytes = Buffer.concat(indice);
  const fim = Buffer.alloc(22);
  fim.writeUInt32LE(0x06054b50, 0);
  fim.writeUInt16LE(entradas.length, 8);
  fim.writeUInt16LE(entradas.length, 10);
  fim.writeUInt32LE(indiceEmBytes.length, 12);
  fim.writeUInt32LE(posicao, 16);
  return Buffer.concat([...partes, indiceEmBytes, fim]);
}
