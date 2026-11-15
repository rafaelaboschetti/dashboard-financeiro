import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Segmented, TextField } from '@/components/Fields';
import { FormModal } from '@/components/FormModal';
import { Screen } from '@/components/Screen';
import { Badge, Card, IconButton, Muted, SectionHeader } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { confirmAction } from '@/lib/confirm';
import { isoToBR } from '@/lib/format';
import { notify } from '@/lib/notify';
import { roleInfo } from '@/lib/roles';
import { colors, spacing } from '@/theme';
import { Role, User } from '@/types';

const roleOptions: { value: Role; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'leitura', label: 'Leitura' },
];
const roleTone = (r: Role) => (r === 'admin' ? 'primary' : r === 'financeiro' ? 'info' : 'neutral');

export default function TeamScreen() {
  const { members, invitations, user, isAdmin, inviteMember, cancelInvitation, setMemberRole, removeMember } = useAuth();

  // convite
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('financeiro');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // edição de perfil de acesso
  const [editing, setEditing] = useState<User | null>(null);
  const [editRole, setEditRole] = useState<Role>('financeiro');

  function openInvite() {
    setEmail('');
    setRole('financeiro');
    setErrors({});
    setInviteOpen(true);
  }

  async function submitInvite() {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErrors({ email: 'E-mail inválido.' });
    const err = await inviteMember({ email, role });
    if (err) return setErrors({ email: err });
    setInviteOpen(false);
    notify('Convite criado', `Peça para ${email.trim().toLowerCase()} criar uma conta no app marcando "Fui convidado por uma empresa", usando este mesmo e-mail.`);
  }

  async function submitRole() {
    if (!editing) return;
    const err = await setMemberRole(editing.id, editRole);
    if (err) return notify('Não foi possível alterar', err);
    setEditing(null);
  }

  function askRemove(m: User) {
    confirmAction('Remover da equipe', `Remover ${m.name}? A pessoa perde o acesso aos dados da empresa.`, async () => {
      const err = await removeMember(m.id);
      if (err) notify('Não foi possível remover', err);
    }, 'Remover');
  }

  function askCancel(id: string, inviteEmail: string) {
    confirmAction('Cancelar convite', `Cancelar o convite para ${inviteEmail}?`, async () => {
      const err = await cancelInvitation(id);
      if (err) notify('Não foi possível cancelar', err);
    }, 'Cancelar convite');
  }

  return (
    <Screen title="Equipe" subtitle="Quem acessa as finanças da empresa" back fab={isAdmin ? { label: 'Convidar pessoa', onPress: openInvite } : undefined}>
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
            <Badge label={roleInfo[m.role].label} tone={roleTone(m.role)} />
            {isAdmin && (
              <IconButton
                icon="create-outline"
                label={`Alterar perfil de ${m.name}`}
                onPress={() => {
                  setEditRole(m.role);
                  setEditing(m);
                }}
              />
            )}
            {isAdmin && m.id !== user?.id && <IconButton icon="person-remove-outline" label={`Remover ${m.name}`} color={colors.expense} onPress={() => askRemove(m)} />}
          </View>
        ))}
      </Card>

      {isAdmin && invitations.length > 0 && (
        <>
          <SectionHeader title={`Convites pendentes (${invitations.length})`} />
          <Card style={{ padding: 0 }}>
            {invitations.map((inv, i) => (
              <View key={inv.id} style={[styles.row, i > 0 && styles.border]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.name}>{inv.email}</Text>
                  <Muted>Convidado em {isoToBR(inv.createdAt.slice(0, 10))}</Muted>
                </View>
                <Badge label={roleInfo[inv.role].label} tone={roleTone(inv.role)} />
                <IconButton icon="close-circle-outline" label={`Cancelar convite de ${inv.email}`} onPress={() => askCancel(inv.id, inv.email)} />
              </View>
            ))}
          </Card>
        </>
      )}

      <SectionHeader title="Perfis de acesso" />
      <Card style={{ gap: spacing.md }}>
        {(Object.keys(roleInfo) as Role[]).map((r) => (
          <View key={r} style={{ gap: 2 }}>
            <Text style={styles.name}>{roleInfo[r].label}</Text>
            <Muted>{roleInfo[r].description}</Muted>
          </View>
        ))}
      </Card>
      {!isAdmin && <Muted style={{ marginTop: spacing.lg }}>Somente administradores podem convidar e gerenciar a equipe.</Muted>}

      <FormModal visible={inviteOpen} title="Convidar pessoa" submitLabel="Criar convite" onClose={() => setInviteOpen(false)} onSubmit={submitInvite}>
        <TextField label="E-mail da pessoa" value={email} onChangeText={setEmail} error={errors.email} autoCapitalize="none" keyboardType="email-address" placeholder="pessoa@empresa.com" hint="A pessoa cria a própria conta e senha no app com este e-mail e entra direto na empresa." />
        <Segmented label="Perfil de acesso" value={role} onChange={setRole} options={roleOptions} />
        <Muted>{roleInfo[role].description}</Muted>
      </FormModal>

      <FormModal visible={!!editing} title="Perfil de acesso" submitLabel="Salvar" onClose={() => setEditing(null)} onSubmit={submitRole}>
        <Muted style={{ marginBottom: spacing.lg }}>{editing?.name}</Muted>
        <Segmented value={editRole} onChange={setEditRole} options={roleOptions} />
        <Muted style={{ marginTop: spacing.md }}>{roleInfo[editRole].description}</Muted>
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
