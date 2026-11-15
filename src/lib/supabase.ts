// No Android/iOS, dá ao app um `localStorage` (gravado com SQLite) para guardar a sessão.
// Na web não faz nada: o navegador já tem localStorage.
import 'expo-sqlite/localStorage/install';

import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** Falso quando o arquivo .env não foi configurado (o app mostra um aviso em vez de quebrar). */
export const supabaseConfigured = !!supabaseUrl && !!supabasePublishableKey;

/**
 * Cliente do Supabase. As duas variáveis são públicas (a segurança vem das regras RLS do banco);
 * a chave secreta (service role) NUNCA deve ir para o app.
 */
export const supabase = createClient(supabaseUrl ?? 'http://localhost', supabasePublishableKey ?? 'nao-configurado', {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Na web, lê a sessão do link de "redefinir senha" recebido por e-mail.
    detectSessionInUrl: Platform.OS === 'web',
  },
});

/** Endereço da versão web, usado no link de redefinição de senha enviado por e-mail. */
export const webAppUrl = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://dashboard-financeiro.expo.app';

// No celular, só renova o token de acesso enquanto o app está aberto (recomendação do Supabase).
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

/** Mensagens de erro do Supabase/Postgres traduzidas para o usuário. */
export function friendlyError(error: unknown): string {
  const message = error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String((error as { message: unknown }).message) : String(error);
  const known: [RegExp, string][] = [
    [/Invalid login credentials/i, 'E-mail ou senha incorretos.'],
    [/User already registered/i, 'Já existe uma conta com este e-mail.'],
    [/Password should be at least/i, 'A senha precisa ter pelo menos 6 caracteres.'],
    [/Email not confirmed/i, 'Confirme seu e-mail antes de entrar (veja sua caixa de entrada).'],
    [/rate limit|too many requests/i, 'Muitas tentativas. Aguarde alguns minutos e tente de novo.'],
    [/Unable to validate email|invalid format/i, 'E-mail inválido.'],
    [/invitations_pending_email_idx|duplicate key.*invitations/i, 'Já existe um convite pendente para este e-mail.'],
    [/categories_unique_name_idx/i, 'Esse rótulo já existe.'],
    [/row-level security|permission denied/i, 'Seu perfil não tem permissão para esta ação.'],
    [/Failed to fetch|Network request failed|NetworkError/i, 'Sem conexão com a internet. Verifique sua rede e tente de novo.'],
  ];
  for (const [pattern, text] of known) if (pattern.test(message)) return text;
  return message || 'Algo deu errado. Tente de novo.';
}
