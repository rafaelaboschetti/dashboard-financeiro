import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Segmented, TextField } from '@/components/Fields';
import { FormModal } from '@/components/FormModal';
import { Screen } from '@/components/Screen';
import { Badge, Card, Muted, SectionHeader } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { roleInfo } from '@/lib/roles';
import { colors, spacing } from '@/theme';
import { Role } from '@/types';

export default function TeamScreen() {
  const { members, user, isAdmin, addMember } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('financeiro');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function openForm() {
    setName('');
    setEmail('');
    setPassword('');
    setRole('financeiro');
    setErrors({});
    setOpen(true);
  }

  async function submit() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Informe o nome.';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.email = 'E-mail inválido.';
    if (password.length < 6) e.password = 'Mínimo de 6 caracteres.';
    setErrors(e);
    if (Object.keys(e).length) return;
    const err = await addMember({ name, email, password, role });
    if (err) return setErrors({ email: err });
    setOpen(false);
  }

  return (
    <Screen title="Equipe" subtitle="Quem acessa as finanças da empresa" back fab={isAdmin ? { label: 'Adicionar usuário', onPress: openForm } : undefined}>
      <Card style={{ padding: 0 }}>
        {members.map((m, i) => (
          <View key={m.id} style={[styles.row, i > 0 && styles.border]}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{m.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.name}>
                {m.name}
                {m.id === user?.id ? ' (você)' : ''}
              </Text>
              <Muted>{m.email}</Muted>
            </View>
            <Badge label={roleInfo[m.role].label} tone={m.role === 'admin' ? 'primary' : m.role === 'financeiro' ? 'info' : 'neutral'} />
          </View>
        ))}
      </Card>

      <SectionHeader title="Perfis de acesso" />
      <Card style={{ gap: spacing.md }}>
        {(Object.keys(roleInfo) as Role[]).map((r) => (
          <View key={r} style={{ gap: 2 }}>
            <Text style={styles.name}>{roleInfo[r].label}</Text>
            <Muted>{roleInfo[r].description}</Muted>
          </View>
        ))}
      </Card>
      {!isAdmin && <Muted style={{ marginTop: spacing.lg }}>Somente administradores podem adicionar usuários.</Muted>}

      <FormModal visible={open} title="Adicionar usuário" submitLabel="Adicionar" onClose={() => setOpen(false)} onSubmit={submit}>
        <TextField label="Nome" value={name} onChangeText={setName} error={errors.name} placeholder="Nome completo" />
        <TextField label="E-mail" value={email} onChangeText={setEmail} error={errors.email} autoCapitalize="none" keyboardType="email-address" placeholder="pessoa@empresa.com" />
        <TextField label="Senha provisória" value={password} onChangeText={setPassword} error={errors.password} secureTextEntry hint="A pessoa poderá trocar depois." />
        <Segmented
          label="Perfil de acesso"
          value={role}
          onChange={setRole}
          options={[
            { value: 'admin', label: 'Admin' },
            { value: 'financeiro', label: 'Financeiro' },
            { value: 'leitura', label: 'Leitura' },
          ]}
        />
        <Muted>{roleInfo[role].description}</Muted>
      </FormModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  border: { borderTopWidth: 1, borderTopColor: colors.border },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primaryDark, fontWeight: '800', fontSize: 16 },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
});
