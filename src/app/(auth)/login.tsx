import { Link } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { AuthShell } from '@/components/AuthShell';
import { Checkbox, PasswordField, TextField } from '@/components/Fields';
import { Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { colors, spacing } from '@/theme';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!email.trim() || !password) return setError('Informe e-mail e senha.');
    setBusy(true);
    setError(null);
    const err = await login(email, password, remember);
    if (err) setError(err);
    setBusy(false);
  }

  return (
    <AuthShell title="Entrar" subtitle="Acesse as finanças da sua empresa.">
      <TextField label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="voce@empresa.com" />
      <PasswordField label="Senha" value={password} onChangeText={setPassword} autoComplete="password" placeholder="Sua senha" onSubmitEditing={submit} />
      <Checkbox
        label="Manter conectado"
        hint={remember ? 'Você continua conectado por 30 dias, mesmo fechando o app.' : 'Você sai ao fechar o app. Use em aparelhos compartilhados.'}
        checked={remember}
        onChange={setRemember}
      />
      {error && <Text style={{ color: colors.expense, fontWeight: '600', marginBottom: spacing.md }}>{error}</Text>}
      <Button label="Entrar" onPress={submit} loading={busy} />
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: spacing.xl }}>
        <Text style={{ color: colors.textMuted }}>Ainda não tem conta?</Text>
        <Link href="/cadastro" style={{ color: colors.primary, fontWeight: '700' }}>
          Cadastrar minha empresa
        </Link>
      </View>
    </AuthShell>
  );
}
