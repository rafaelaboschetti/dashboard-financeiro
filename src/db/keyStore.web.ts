/**
 * Na web não existe armazenamento seguro equivalente ao Keystore/Keychain:
 * a chave fica no localStorage do navegador, junto dos dados.
 * Isso evita que os dados fiquem legíveis "a olho nu", mas NÃO protege contra
 * quem tem acesso ao navegador. Proteção real na web exige o backend (etapa 2).
 */
const KEY_NAME = 'financas.data-key.v1';
const MIGRATED_NAME = 'financas.data-migrated.v1';

function get(name: string): string | null {
  try {
    return globalThis.localStorage?.getItem(name) ?? null;
  } catch {
    return null;
  }
}

export async function loadDataKey(): Promise<string | null> {
  return get(KEY_NAME);
}

export async function saveDataKey(key: string): Promise<void> {
  globalThis.localStorage?.setItem(KEY_NAME, key);
}

export async function isLegacyMigrated(): Promise<boolean> {
  return get(MIGRATED_NAME) === '1';
}

export async function markLegacyMigrated(): Promise<void> {
  globalThis.localStorage?.setItem(MIGRATED_NAME, '1');
}
