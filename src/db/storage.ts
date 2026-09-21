import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Camada de persistência do protótipo (armazenamento local do aparelho).
 * Todo o app fala com o "banco" só por aqui e por src/db/auth.ts — na etapa de backend
 * (Supabase/Firebase) basta trocar a implementação destes arquivos.
 */
export const KEYS = {
  users: 'fin:users',
  companies: 'fin:companies',
  session: 'fin:session',
  data: (companyId: string) => `fin:data:${companyId}`,
};

export async function read<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function write<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function remove(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}
