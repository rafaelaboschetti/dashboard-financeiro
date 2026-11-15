import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { PasswordField, TextField } from '@/components/Fields';
import { FormModal } from '@/components/FormModal';
import { Screen } from '@/components/Screen';
import { Badge, Button, Card, Muted } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationsContext';
import { roleInfo } from '@/lib/roles';
import { isoToBR } from '@/lib/format';
import { notify } from '@/lib/notify';
import { passwordError } from '@/lib/validation';
import { colors, spacing } from '@/theme';

export default function ProfileScreen() {
  const { user, company, logout, changePassword, updateMyName } = useAuth();
  const notifications = useNotifications();
  const [notifBusy, setNotifBusy] = useState(false);
  const [nameOpen, setNameOpen] = useState(false);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [pwOpen, setPwOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pwErrors, setPwErrors] = useState<{ current?: string; password?: string; confirm?: string }>({});
  if (!user || !company) return null;

  async function toggleNotifications(on: boolean) {
    setNotifBusy(true);
    const result = await notifications.setEnabled(on);
    setNotifBusy(false);
    if (on && !result) {
      notify('Avisos bloqueados', 'Para receber os avisos, permita as notificações do app nas configurações do celular.');
    }
  }

  async function submitName() {
    const err = await updateMyName(name);
    if (err) return setNameError(err);
    setNameOpen(false);
  }

  async function submitPassword() {
    const e: typeof pwErrors = {};
    if (!current) e.current = 'Digite sua senha atual.';
    const ruleError = passwordError(password);
    if (ruleError) e.password = ruleError;
    else if (password === current) e.password = 'A nova senha precisa ser diferente da atual.';
    if (!e.password && confirm !== password) e.confirm = 'As senhas não conferem.';
    setPwErrors(e);
    if (Object.keys(e).length) return;

    const err = await changePassword(current, password);
    if (err) return setPwErrors(err.includes('atual está incorreta') ? { current: err } : { password: err });
    setPwOpen(false);
    notify('Senha alterada', 'Pronto! Use a nova senha no próximo login.');
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
      <Card style={{ marginTop: spacing.xl, gap: spacing.sm }}>
        <View style={styles.notifRow}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.notifTitle}>Avisos de contas e lembretes</Text>
            <Muted>
              {!notifications.supported
                ? 'Disponível no app de celular (o navegador não agenda avisos).'
                : notifications.enabled
                  ? `Ligado neste aparelho · ${notifications.scheduledCount} aviso(s) agendado(s), às 9h: contas conforme o "avisar antes" e lembretes no dia.`
                  : 'Receba um aviso no celular antes do vencimento de cada conta e no dia de cada lembrete.'}
            </Muted>
          </View>
          {notifications.supported && (
            <Switch
              value={notifications.enabled}
              onValueChange={toggleNotifications}
              disabled={notifBusy}
              trackColor={{ true: colors.primary, false: colors.border }}
              accessibilityLabel="Avisos de contas e lembretes"
            />
          )}
        </View>
        {notifications.supported && notifications.blocked && !notifications.enabled && (
          <Button small variant="secondary" icon="settings-outline" label="Abrir configurações do celular" onPress={notifications.openSettings} />
        )}
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
            setPwErrors({});
            setPwOpen(true);
          }}
        />
        <Button label="Sair da conta" variant="danger" icon="log-out-outline" onPress={logout} />
      </View>

      <FormModal visible={nameOpen} title="Alterar meu nome" onClose={() => setNameOpen(false)} onSubmit={submitName}>
        <TextField label="Nome" value={name} onChangeText={setName} error={nameError} autoComplete="name" />
      </FormModal>

      <FormModal visible={pwOpen} title="Trocar senha" submitLabel="Salvar nova senha" onClose={() => setPwOpen(false)} onSubmit={submitPassword}>
        <PasswordField label="Senha atual" value={current} onChangeText={setCurrent} autoComplete="current-password" error={pwErrors.current} />
        <PasswordField
          label="Nova senha"
          value={password}
          onChangeText={setPassword}
          autoComplete="new-password"
          error={pwErrors.password}
          hint="Mínimo de 8 caracteres, com letras e números."
          showStrength
        />
        <PasswordField label="Repita a nova senha" value={confirm} onChangeText={setConfirm} autoComplete="new-password" error={pwErrors.confirm} />
      </FormModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 26, fontWeight: '800' },
  name: { fontSize: 20, fontWeight: '800', color: colors.text },
  notifRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  notifTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  value: { fontSize: 14, fontWeight: '600', color: colors.text, flexShrink: 1, textAlign: 'right' },
});
