import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { supabaseConfigured } from '@/lib/supabase';
import { colors, spacing } from '@/theme';

function RootNavigator() {
  const { loading, signedIn, user, needsProfile, recoveringPassword } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Link "redefinir senha" do e-mail: tem prioridade sobre tudo. */}
      <Stack.Protected guard={recoveringPassword}>
        <Stack.Screen name="redefinir-senha" />
      </Stack.Protected>
      <Stack.Protected guard={!recoveringPassword}>
        <Stack.Protected guard={!!user}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={needsProfile}>
          <Stack.Screen name="concluir-cadastro" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack.Protected>
    </Stack>
  );
}

/** Aparece só se o arquivo .env não tiver a URL e a chave do Supabase. */
function MissingConfig() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.bg, gap: spacing.md }}>
      <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center' }}>Configuração do servidor ausente</Text>
      <Text style={{ fontSize: 15, color: colors.textMuted, textAlign: 'center', maxWidth: 420 }}>
        Defina EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY no arquivo .env (veja o .env.example) e reinicie o app.
      </Text>
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {supabaseConfigured ? (
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      ) : (
        <MissingConfig />
      )}
    </SafeAreaProvider>
  );
}
