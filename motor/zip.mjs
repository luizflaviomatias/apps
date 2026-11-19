// Leitor mínimo de .zip (guardado ou deflate), sem dependências: o suficiente para o pacote web dos apps.
import { inflateRawSync } from 'node:zlib';

const ASSINATURA_DO_FIM = 0x06054b50;
const ASSINATURA_DO_INDICE = 0x02014b50;
const METODO_GUARDADO = 0;
const METODO_DEFLATE = 8;

export class ErroZipInvalido extends Error {
  constructor(motivo) {
    super(`Pacote zip inválido: ${motivo}`);
    this.name = 'ErroZipInvalido';
  }
}

/** Caminho relativo e limpo: impede o zip de escrever fora da pasta de destino ("zip slip"). */
function conferirCaminho(nome) {
  const partes = nome.split('/');
  if (nome.startsWith('/') || /^[A-Za-z]:/.test(nome) || nome.includes('\\') || partes.some((parte) => parte === '..')) {
    throw new ErroZipInvalido(`caminho perigoso "${nome}"`);
  }
}

/** @returns {Map<string, Buffer>} caminho relativo → conteúdo, só arquivos (pastas ficam implícitas) */
export function lerZip(zip) {
  const fim = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (fim < 0 || zip.readUInt32LE(fim) !== ASSINATURA_DO_FIM) throw new ErroZipInvalido('sem índice');
  const quantidade = zip.readUInt16LE(fim + 10);
  let posicao = zip.readUInt32LE(fim + 16);
  const arquivos = new Map();
  for (let indice = 0; indice < quantidade; indice++) {
    if (zip.readUInt32LE(posicao) !== ASSINATURA_DO_INDICE) throw new ErroZipInvalido('índice corrompido');
    const metodo = zip.readUInt16LE(posicao + 10);
    const compactado = zip.readUInt32LE(posicao + 20);
    const tamanhoDoNome = zip.readUInt16LE(posicao + 28);
    const tamanhoExtra = zip.readUInt16LE(posicao + 30);
    const tamanhoDoComentario = zip.readUInt16LE(posicao + 32);
    const inicio = zip.readUInt32LE(posicao + 42);
    const nome = zip.subarray(posicao + 46, posicao + 46 + tamanhoDoNome).toString('utf8');
    posicao += 46 + tamanhoDoNome + tamanhoExtra + tamanhoDoComentario;
    if (nome.endsWith('/')) continue;
    conferirCaminho(nome);
    const inicioDosDados = inicio + 30 + zip.readUInt16LE(inicio + 26) + zip.readUInt16LE(inicio + 28);
    const dados = zip.subarray(inicioDosDados, inicioDosDados + compactado);
    if (metodo === METODO_GUARDADO) arquivos.set(nome, Buffer.from(dados));
    else if (metodo === METODO_DEFLATE) arquivos.set(nome, inflateRawSync(dados));
    else throw new ErroZipInvalido(`método ${metodo} em "${nome}"`);
  }
  return arquivos;
}
