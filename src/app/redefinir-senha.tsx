import { useState } from 'react';
import { Text } from 'react-native';

import { AuthShell } from '@/components/AuthShell';
import { TextField } from '@/components/Fields';
import { Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { colors, spacing } from '@/theme';

/** Aberta pelo link "redefinir senha" enviado por e-mail (versão web). */
export default function ResetPasswordScreen() {
  const { changePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (password.length < 8) return setError('A nova senha precisa ter pelo menos 8 caracteres.');
    if (password !== confirm) return setError('As senhas não conferem.');
    setBusy(true);
    setError(null);
    const err = await changePassword(password);
    if (err) setError(err);
    setBusy(false);
  }

  return (
    <AuthShell title="Nova senha" subtitle="Escolha uma nova senha para a sua conta.">
      <TextField label="Nova senha" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" placeholder="Mínimo de 8 caracteres" />
      <TextField label="Repita a nova senha" value={confirm} onChangeText={setConfirm} secureTextEntry autoComplete="new-password" onSubmitEditing={submit} />
      {error && <Text style={{ color: colors.expense, fontWeight: '600', marginBottom: spacing.md }}>{error}</Text>}
      <Button label="Salvar nova senha" onPress={submit} loading={busy} />
    </AuthShell>
  );
}
