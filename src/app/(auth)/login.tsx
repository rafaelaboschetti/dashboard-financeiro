import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AuthShell } from '@/components/AuthShell';
import { TextField } from '@/components/Fields';
import { Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { colors, spacing } from '@/theme';

export default function LoginScreen() {
  const { login, sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!email.trim() || !password) return setError('Informe e-mail e senha.');
    setBusy(true);
    setError(null);
    setInfo(null);
    const err = await login(email, password);
    if (err) setError(err);
    setBusy(false);
  }

  async function forgot() {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Digite seu e-mail acima para receber o link de nova senha.');
    setError(null);
    const err = await sendPasswordReset(email);
    if (err) setError(err);
    else setInfo('Se existir uma conta com este e-mail, enviamos um link para criar uma nova senha.');
  }

  return (
    <AuthShell title="Entrar" subtitle="Acesse as finanças da sua empresa.">
      <TextField label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="voce@empresa.com" />
      <TextField label="Senha" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" placeholder="Sua senha" onSubmitEditing={submit} />
      {error && <Text style={{ color: colors.expense, fontWeight: '600', marginBottom: spacing.md }}>{error}</Text>}
      {info && <Text style={{ color: colors.income, fontWeight: '600', marginBottom: spacing.md }}>{info}</Text>}
      <Button label="Entrar" onPress={submit} loading={busy} />
      <Pressable onPress={forgot} accessibilityRole="button" style={{ alignSelf: 'center', marginTop: spacing.lg }} hitSlop={8}>
        <Text style={{ color: colors.primary, fontWeight: '600' }}>Esqueci minha senha</Text>
      </Pressable>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: spacing.xl }}>
        <Text style={{ color: colors.textMuted }}>Ainda não tem conta?</Text>
        <Link href="/cadastro" style={{ color: colors.primary, fontWeight: '700' }}>
          Cadastrar minha empresa
        </Link>
      </View>
    </AuthShell>
  );
}
