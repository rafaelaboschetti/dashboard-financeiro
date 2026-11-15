/**
 * Simulação do expo-crypto para testes no Node: SHA-256, UUID e AES-GCM
 * usando o WebCrypto nativo do Node, com a mesma interface usada pelo app.
 */
import { createHash, webcrypto } from 'node:crypto';

const subtle = webcrypto.subtle;
const b64 = (b: Uint8Array) => Buffer.from(b).toString('base64');
/** O WebCrypto do Node exige buffers comuns (não compartilhados); os dados aqui sempre são. */
const buf = (b: Uint8Array | undefined) => b as Uint8Array<ArrayBuffer> | undefined;

export class AESEncryptionKey {
  raw: Uint8Array;
  constructor(raw: Uint8Array) {
    this.raw = raw;
  }
  static async generate() {
    return new AESEncryptionKey(webcrypto.getRandomValues(new Uint8Array(32)));
  }
  static async import(s: string) {
    return new AESEncryptionKey(new Uint8Array(Buffer.from(s, 'base64')));
  }
  async encoded() {
    return b64(this.raw);
  }
}

export class AESSealedData {
  buf: Uint8Array;
  constructor(buf: Uint8Array) {
    this.buf = buf;
  }
  static fromCombined(s: string) {
    return new AESSealedData(new Uint8Array(Buffer.from(s, 'base64')));
  }
  async combined() {
    return b64(this.buf);
  }
}

export const AESKeySize = { AES256: 256 };
export const CryptoDigestAlgorithm = { SHA256: 'SHA-256' };
export const randomUUID = () => webcrypto.randomUUID();
export const digestStringAsync = async (_algorithm: string, s: string) => createHash('sha256').update(s).digest('hex');

export async function aesEncryptAsync(plaintext: Uint8Array, key: AESEncryptionKey, options?: { additionalData?: Uint8Array }) {
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const k = await subtle.importKey('raw', buf(key.raw)!, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv, additionalData: buf(options?.additionalData) }, k, buf(plaintext)!));
  const out = new Uint8Array(12 + ct.length);
  out.set(iv);
  out.set(ct, 12);
  return new AESSealedData(out);
}

export async function aesDecryptAsync(sealed: AESSealedData, key: AESEncryptionKey, options?: { additionalData?: Uint8Array }) {
  const k = await subtle.importKey('raw', buf(key.raw)!, 'AES-GCM', false, ['decrypt']);
  return new Uint8Array(await subtle.decrypt({ name: 'AES-GCM', iv: buf(sealed.buf.slice(0, 12))!, additionalData: buf(options?.additionalData) }, k, buf(sealed.buf.slice(12))!));
}
