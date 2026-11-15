import * as SecureStore from 'expo-secure-store';

/**
 * Guarda a chave de criptografia dos dados no armazenamento seguro do sistema
 * (Android Keystore / iOS Keychain). Ela só pode ser lida por este app, não vai
 * para backups e não sai do aparelho.
 */
const KEY_NAME = 'fin_data_key_v1';
const MIGRATED_NAME = 'fin_data_migrated_v1';
const options: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export async function loadDataKey(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY_NAME, options);
}

export async function saveDataKey(key: string): Promise<void> {
  await SecureStore.setItemAsync(KEY_NAME, key, options);
}

/** Marca que os dados antigos (sem criptografia) já foram convertidos; depois disso, texto puro é rejeitado. */
export async function isLegacyMigrated(): Promise<boolean> {
  return (await SecureStore.getItemAsync(MIGRATED_NAME, options)) === '1';
}

export async function markLegacyMigrated(): Promise<void> {
  await SecureStore.setItemAsync(MIGRATED_NAME, '1', options);
}
