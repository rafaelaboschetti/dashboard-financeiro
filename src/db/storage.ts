import AsyncStorage from '@react-native-async-storage/async-storage';
import { aesDecryptAsync, aesEncryptAsync, AESEncryptionKey, AESKeySize, AESSealedData } from 'expo-crypto';

import { utf8Decode, utf8Encode } from '@/lib/utf8';
import { isLegacyMigrated, loadDataKey, markLegacyMigrated, saveDataKey } from './keyStore';

/**
 * Camada de persistência do protótipo (armazenamento local do aparelho).
 * Todo o app fala com o "banco" só por aqui e por src/db/auth.ts — na etapa de backend
 * (Supabase/Firebase) basta trocar a implementação destes arquivos.
 *
 * Os valores são gravados criptografados com AES-256-GCM. A chave fica no armazenamento
 * seguro do sistema (src/db/keyStore.ts). O GCM também autentica os dados: um valor
 * alterado por fora (ex.: trocar a sessão ou o perfil de um usuário) é rejeitado.
 */
export const KEYS = {
  users: 'fin:users',
  companies: 'fin:companies',
  session: 'fin:session',
  loginAttempts: 'fin:login-attempts',
  /** Preferência deste aparelho: avisos de contas a vencer ligados? */
  notifications: 'fin:notifications',
  /** Pessoas (ids) que já viram o guia de primeiros passos neste aparelho. */
  guideSeen: 'fin:guide-seen',
  data: (companyId: string) => `fin:data:${companyId}`,
};

const ENCRYPTED_PREFIX = 'enc1:';
const APP_PREFIX = 'fin:';

let keyPromise: Promise<AESEncryptionKey> | null = null;

function getKey(): Promise<AESEncryptionKey> {
  if (!keyPromise) {
    keyPromise = (async () => {
      const stored = await loadDataKey();
      let key: AESEncryptionKey;
      if (stored) {
        key = await AESEncryptionKey.import(stored, 'base64');
      } else {
        key = await AESEncryptionKey.generate(AESKeySize.AES256);
        await saveDataKey(await key.encoded('base64'));
      }
      if (!(await isLegacyMigrated())) {
        await migrateLegacyValues(key);
        await markLegacyMigrated();
      }
      return key;
    })();
    // Se falhar (ex.: armazenamento seguro indisponível), tenta de novo na próxima chamada.
    keyPromise.catch(() => {
      keyPromise = null;
    });
  }
  return keyPromise;
}

/**
 * Versões anteriores gravavam tudo em texto puro. Na primeira vez que esta versão abre,
 * criptografa esses valores de uma vez. Depois disso (marca no armazenamento seguro),
 * qualquer valor em texto puro é rejeitado — senão bastaria gravar uma sessão falsa sem criptografia.
 */
async function migrateLegacyValues(key: AESEncryptionKey): Promise<void> {
  const names = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(APP_PREFIX));
  for (const name of names) {
    const raw = await AsyncStorage.getItem(name);
    if (!raw || raw.startsWith(ENCRYPTED_PREFIX)) continue;
    try {
      JSON.parse(raw); // só migra valores válidos
      await AsyncStorage.setItem(name, await encrypt(raw, name, key));
    } catch {
      await AsyncStorage.removeItem(name);
    }
  }
}

async function encrypt(plain: string, storageKey: string, key: AESEncryptionKey): Promise<string> {
  const sealed = await aesEncryptAsync(utf8Encode(plain), key, {
    // Amarra o texto cifrado à sua chave: não dá para copiar o valor de uma chave para outra.
    additionalData: utf8Encode(storageKey),
  });
  return ENCRYPTED_PREFIX + (await sealed.combined('base64'));
}

async function decrypt(stored: string, storageKey: string, key: AESEncryptionKey): Promise<string> {
  const sealed = AESSealedData.fromCombined(stored.slice(ENCRYPTED_PREFIX.length));
  const bytes = await aesDecryptAsync(sealed, key, { additionalData: utf8Encode(storageKey) });
  return utf8Decode(bytes);
}

// As gravações são feitas em fila: como a criptografia é assíncrona, duas gravações
// seguidas poderiam terminar fora de ordem e a mais antiga sobrescreveria a mais nova.
let writeQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(task, task);
  writeQueue = run.catch(() => undefined);
  return run;
}

async function rawWrite<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, await encrypt(JSON.stringify(value), key, await getKey()));
}

export async function read<T>(key: string, fallback: T): Promise<T> {
  await writeQueue; // garante que gravações pendentes já foram aplicadas
  let cryptoKey: AESEncryptionKey;
  try {
    cryptoKey = await getKey(); // também faz a migração única dos dados antigos
  } catch {
    return fallback;
  }
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(key);
  } catch {
    return fallback;
  }
  if (!raw) return fallback;

  // Texto puro ou valor adulterado/copiado de outra chave: ignora o valor.
  if (!raw.startsWith(ENCRYPTED_PREFIX)) return fallback;
  try {
    return JSON.parse(await decrypt(raw, key, cryptoKey)) as T;
  } catch {
    return fallback;
  }
}

export function write<T>(key: string, value: T): Promise<void> {
  return enqueue(() => rawWrite(key, value));
}

export function remove(key: string): Promise<void> {
  return enqueue(() => AsyncStorage.removeItem(key));
}
