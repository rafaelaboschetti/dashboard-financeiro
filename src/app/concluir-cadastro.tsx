import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AuthShell } from '@/components/AuthShell';
import { TextField } from '@/components/Fields';
import { Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { colors, spacing } from '@/theme';

/**
 * Aparece quando a pessoa está logada mas ainda não pertence a nenhuma empresa
 * (ex.: confirmou o e-mail sem ter informado a empresa, ou foi removida da equipe).
 */
export default function CompleteProfileScreen() {
  const { completeProfile, logout } = useAuth();
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [withDemo, setWithDemo] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Informe seu nome.';
    if (!companyName.trim()) e.companyName = 'Informe o nome da empresa.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const err = await completeProfile({ name, companyName, withDemo });
    if (err) setErrors({ companyName: err });
    setBusy(false);
  }

  return (
    <AuthShell title="Concluir cadastro" subtitle="Sua conta ainda não está ligada a nenhuma empresa. Crie a sua para começar.">
      <TextField label="Seu nome" value={name} onChangeText={setName} error={errors.name} autoComplete="name" />
      <TextField label="Nome da empresa" value={companyName} onChangeText={setCompanyName} error={errors.companyName} placeholder="Ex.: Padaria Bom Pão" hint="Se você foi convidado, peça ao administrador para enviar o convite para o seu e-mail e entre de novo." />
      <Pressable onPress={() => setWithDemo((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: withDemo }} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xl }}>
        <Ionicons name={withDemo ? 'checkbox' : 'square-outline'} size={24} color={colors.primary} />
        <Text style={{ flex: 1, color: colors.text }}>Começar com dados de exemplo</Text>
      </Pressable>
      <Button label="Criar empresa" onPress={submit} loading={busy} />
      <Button label="Sair" variant="secondary" onPress={logout} style={{ marginTop: spacing.md }} />
    </AuthShell>
  );
}
