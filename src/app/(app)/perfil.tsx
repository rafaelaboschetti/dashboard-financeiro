import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { TextField } from '@/components/Fields';
import { FormModal } from '@/components/FormModal';

import { Screen } from '@/components/Screen';
import { Badge, Button, Card, Muted } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { roleInfo } from '@/lib/roles';
import { isoToBR } from '@/lib/format';
import { notify } from '@/lib/notify';
import { colors, spacing } from '@/theme';

export default function ProfileScreen() {
  const { user, company, logout, changePassword, updateMyName } = useAuth();
  const [nameOpen, setNameOpen] = useState(false);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [pwOpen, setPwOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pwError, setPwError] = useState('');
  if (!user || !company) return null;

  async function submitName() {
    const err = await updateMyName(name);
    if (err) return setNameError(err);
    setNameOpen(false);
  }

  async function submitPassword() {
    if (password !== confirm) return setPwError('As senhas novas não conferem.');
    const err = await changePassword(current, password);
    if (err) return setPwError(err);
    setPwOpen(false);
    notify('Senha alterada', 'Use a nova senha no próximo login.');
  }

  const rows = [
    ['Nome', user.name],
    ['E-mail', user.email],
    ['Empresa', company.name],
    ['Empresa criada em', isoToBR(company.createdAt.slice(0, 10))],
  ];

  return (
    <Screen title="Meu perfil" subtitle="Dados da sua conta" back>
      <Card style={{ gap: spacing.lg }}>
        <View style={styles.head}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ gap: 4 }}>
            <Text style={styles.name}>{user.name}</Text>
            <Badge label={roleInfo[user.role].label} tone={roleInfo[user.role].tone} />
          </View>
        </View>
        {rows.map(([label, value]) => (
          <View key={label} style={styles.row}>
            <Muted>{label}</Muted>
            <Text style={styles.value}>{value}</Text>
          </View>
        ))}
      </Card>
      <View style={{ gap: spacing.md, marginTop: spacing.xl }}>
        <Button
          label="Alterar meu nome"
          variant="secondary"
          icon="create-outline"
          onPress={() => {
            setName(user.name);
            setNameError('');
            setNameOpen(true);
          }}
        />
        <Button
          label="Trocar senha"
          variant="secondary"
          icon="key-outline"
          onPress={() => {
            setCurrent('');
            setPassword('');
            setConfirm('');
            setPwError('');
            setPwOpen(true);
          }}
        />
        <Button label="Sair da conta" variant="danger" icon="log-out-outline" onPress={logout} />
      </View>

      <FormModal visible={nameOpen} title="Alterar meu nome" onClose={() => setNameOpen(false)} onSubmit={submitName}>
        <TextField label="Nome" value={name} onChangeText={setName} error={nameError} autoComplete="name" />
      </FormModal>

      <FormModal visible={pwOpen} title="Trocar senha" submitLabel="Salvar nova senha" onClose={() => setPwOpen(false)} onSubmit={submitPassword}>
        <TextField label="Senha atual" value={current} onChangeText={setCurrent} secureTextEntry autoComplete="current-password" />
        <TextField label="Nova senha" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
        <TextField label="Repita a nova senha" value={confirm} onChangeText={setConfirm} secureTextEntry autoComplete="new-password" error={pwError} />
      </FormModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 26, fontWeight: '800' },
  name: { fontSize: 20, fontWeight: '800', color: colors.text },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  value: { fontSize: 14, fontWeight: '600', color: colors.text, flexShrink: 1, textAlign: 'right' },
});
