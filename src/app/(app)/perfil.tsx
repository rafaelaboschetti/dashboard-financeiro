import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { Badge, Button, Card, Muted } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { roleInfo } from '@/lib/roles';
import { isoToBR } from '@/lib/format';
import { colors, spacing } from '@/theme';

export default function ProfileScreen() {
  const { user, company, logout } = useAuth();
  if (!user || !company) return null;

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
      <Button label="Sair da conta" variant="danger" icon="log-out-outline" onPress={logout} style={{ marginTop: spacing.xl }} />
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
