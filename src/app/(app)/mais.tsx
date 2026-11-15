import { Ionicons } from '@expo/vector-icons';
import { Href, router } from 'expo-router';
import { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { Badge, Card, IconCircle, Muted } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { roleInfo } from '@/lib/roles';
import { useData } from '@/context/DataContext';
import { colors, spacing } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export default function MoreScreen() {
  const { user, company, logout } = useAuth();
  const { reminders } = useData();
  const openReminders = reminders.filter((r) => !r.done).length;

  const items: { icon: IconName; label: string; desc: string; href: Href; badge?: string }[] = [
    { icon: 'notifications-outline', label: 'Lembretes', desc: 'Compromissos e avisos da empresa', href: '/lembretes', badge: openReminders ? String(openReminders) : undefined },
    { icon: 'bar-chart-outline', label: 'Relatórios', desc: 'Resumo mensal e despesas por categoria', href: '/relatorios' },
    { icon: 'pricetags-outline', label: 'Categorias', desc: 'Organize entradas e saídas', href: '/categorias' },
    { icon: 'people-outline', label: 'Equipe e permissões', desc: 'Usuários que acessam a empresa', href: '/equipe' },
    { icon: 'help-circle-outline', label: 'Como usar o app', desc: 'Passo a passo das principais funções', href: '/guia' },
    { icon: 'bulb-outline', label: 'Roadmap e sugestões', desc: 'O que já está no app e o que vem a seguir', href: '/ideias' },
    { icon: 'person-circle-outline', label: 'Meu perfil', desc: 'Dados da conta', href: '/perfil' },
  ];

  return (
    <Screen title="Mais" subtitle="Outras áreas do aplicativo">
      <Card style={styles.user}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>{user?.name}</Text>
          <Muted>{company?.name}</Muted>
        </View>
        {user && <Badge label={roleInfo[user.role].label} tone={roleInfo[user.role].tone} />}
      </Card>

      <Card style={{ padding: 0, marginTop: spacing.lg }}>
        {items.map((it, i) => (
          <Pressable key={it.label} onPress={() => router.push(it.href)} accessibilityRole="button" style={[styles.item, i > 0 && styles.border]}>
            <IconCircle icon={it.icon} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.itemLabel}>{it.label}</Text>
              <Muted>{it.desc}</Muted>
            </View>
            {it.badge && <Badge label={it.badge} tone="info" />}
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        ))}
      </Card>

      <Pressable onPress={logout} accessibilityRole="button" style={[styles.logout]}>
        <Ionicons name="log-out-outline" size={20} color={colors.expense} />
        <Text style={{ color: colors.expense, fontWeight: '700', fontSize: 15 }}>Sair da conta</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  user: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  userName: { fontSize: 16, fontWeight: '700', color: colors.text },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  border: { borderTopWidth: 1, borderTopColor: colors.border },
  itemLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  logout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.xl, minHeight: 48 },
});
