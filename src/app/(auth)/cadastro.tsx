import { Link } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { AuthShell } from '@/components/AuthShell';
import { Checkbox, PasswordField, TextField } from '@/components/Fields';
import { Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { isValidEmail, passwordError } from '@/lib/validation';
import { colors, spacing } from '@/theme';

export default function RegisterScreen() {
  const { register } = useAuth();
  const [companyName, setCompanyName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [withDemo, setWithDemo] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit() {
    const e: Record<string, string> = {};
    if (!companyName.trim()) e.companyName = 'Informe o nome da empresa.';
    if (!name.trim()) e.name = 'Informe seu nome.';
    if (!isValidEmail(email)) e.email = 'E-mail inválido.';
    const pwError = passwordError(password);
    if (pwError) e.password = pwError;
    setErrors(e);
    if (Object.keys(e).length) return;

    setBusy(true);
    const err = await register({ companyName, name, email, password, withDemo });
    if (err) setErrors({ email: err });
    setBusy(false);
  }

  return (
    <AuthShell title="Criar conta" subtitle="Cadastre sua empresa e comece a organizar as finanças.">
      <TextField label="Nome da empresa" value={companyName} onChangeText={setCompanyName} error={errors.companyName} placeholder="Ex.: Padaria Bom Pão" />
      <TextField label="Seu nome" value={name} onChangeText={setName} error={errors.name} autoComplete="name" placeholder="Nome completo" />
      <TextField label="E-mail" value={email} onChangeText={setEmail} error={errors.email} autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="voce@empresa.com" />
      <PasswordField
        label="Senha"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        autoComplete="new-password"
        placeholder="Mínimo de 8 caracteres, com letras e números"
        hint="Você será o administrador da empresa e poderá convidar outros usuários."
        showStrength
      />

      <Checkbox label="Começar com dados de exemplo (para conhecer o app)" checked={withDemo} onChange={setWithDemo} />

      <Button label="Criar conta" onPress={submit} loading={busy} />
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: spacing.xl }}>
        <Text style={{ color: colors.textMuted }}>Já tem conta?</Text>
        <Link href="/login" style={{ color: colors.primary, fontWeight: '700' }}>
          Entrar
        </Link>
      </View>
    </AuthShell>
  );
}
