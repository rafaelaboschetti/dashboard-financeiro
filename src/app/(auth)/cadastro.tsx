import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AuthShell } from '@/components/AuthShell';
import { TextField } from '@/components/Fields';
import { Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { colors, spacing } from '@/theme';

export default function RegisterScreen() {
  const { register } = useAuth();
  const [companyName, setCompanyName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [withDemo, setWithDemo] = useState(true);
  const [invited, setInvited] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit() {
    const e: Record<string, string> = {};
    if (!invited && !companyName.trim()) e.companyName = 'Informe o nome da empresa.';
    if (!name.trim()) e.name = 'Informe seu nome.';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.email = 'E-mail inválido.';
    if (password.length < 8) e.password = 'A senha precisa ter pelo menos 8 caracteres.';
    setErrors(e);
    if (Object.keys(e).length) return;

    setBusy(true);
    const result = await register({ companyName: invited ? undefined : companyName, name, email, password, withDemo: !invited && withDemo });
    if (result.error) setErrors({ email: result.error });
    if (result.info) setInfo(result.info);
    setBusy(false);
  }

  return (
    <AuthShell title="Criar conta" subtitle="Cadastre sua empresa e comece a organizar as finanças.">
      <Pressable onPress={() => setInvited((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: invited }} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg }}>
        <Ionicons name={invited ? 'checkbox' : 'square-outline'} size={24} color={colors.primary} />
        <Text style={{ flex: 1, color: colors.text }}>Fui convidado por uma empresa</Text>
      </Pressable>
      {!invited && <TextField label="Nome da empresa" value={companyName} onChangeText={setCompanyName} error={errors.companyName} placeholder="Ex.: Padaria Bom Pão" />}
      <TextField label="Seu nome" value={name} onChangeText={setName} error={errors.name} autoComplete="name" placeholder="Nome completo" />
      <TextField label="E-mail" value={email} onChangeText={setEmail} error={errors.email} autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="voce@empresa.com" />
      <TextField
        label="Senha"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        secureTextEntry
        autoComplete="new-password"
        placeholder="Mínimo de 8 caracteres"
        hint={invited ? 'Use o mesmo e-mail que recebeu o convite: você entra direto na empresa.' : 'Você será o administrador da empresa e poderá convidar outros usuários.'}
      />

      {info && <Text style={{ color: colors.income, fontWeight: '600', marginBottom: spacing.lg }}>{info}</Text>}

      {!invited && (
      <Pressable onPress={() => setWithDemo((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: withDemo }} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xl }}>
        <Ionicons name={withDemo ? 'checkbox' : 'square-outline'} size={24} color={colors.primary} />
        <Text style={{ flex: 1, color: colors.text }}>Começar com dados de exemplo (para conhecer o app)</Text>
      </Pressable>
      )}

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
