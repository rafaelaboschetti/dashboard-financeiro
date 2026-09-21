import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MonthlyBars } from '@/components/MonthlyBars';
import { Screen } from '@/components/Screen';
import { Badge, Card, EmptyState, Grid, IconCircle, Muted, ProgressBar, SectionHeader, StatCard } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { billStatus, totals, transactionsOfMonth } from '@/lib/finance';
import { currentMonthKey, dueText, formatMoney, monthLabel, shortDateBR, todayISO } from '@/lib/format';
import { colors, radius, spacing } from '@/theme';

const quickActions = [
  { label: 'Nova conta', icon: 'receipt-outline', href: '/contas?novo=1' },
  { label: 'Movimentação', icon: 'swap-vertical-outline', href: '/caixa?novo=1' },
  { label: 'Nova meta', icon: 'flag-outline', href: '/metas?novo=1' },
  { label: 'Lembrete', icon: 'notifications-outline', href: '/lembretes?novo=1' },
] as const;

export default function DashboardScreen() {
  const { user, company, canEdit } = useAuth();
  const { bills, transactions, goals, reminders } = useData();
  const today = todayISO();
  const month = currentMonthKey();

  const all = totals(transactions);
  const monthTotals = totals(transactionsOfMonth(transactions, month));
  const pending = bills.filter((b) => !b.paid).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const overdue = pending.filter((b) => billStatus(b, today) === 'overdue');
  const dueTotal = pending.reduce((s, b) => s + b.amount, 0);
  const openReminders = reminders.filter((r) => !r.done).sort((a, b) => a.date.localeCompare(b.date));
  const firstName = user?.name.split(' ')[0] ?? '';

  return (
    <Screen title={`Olá, ${firstName}!`} subtitle={company?.name}>
      {overdue.length > 0 && (
        <Pressable onPress={() => router.push('/contas')} accessibilityRole="button" style={styles.alert}>
          <Ionicons name="alert-circle" size={22} color={colors.expense} />
          <Text style={styles.alertText}>
            {overdue.length === 1 ? '1 conta vencida' : `${overdue.length} contas vencidas`} · {formatMoney(overdue.reduce((s, b) => s + b.amount, 0))}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.expense} />
        </Pressable>
      )}

      {/* Saldo */}
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Saldo em caixa</Text>
        <Text style={styles.heroValue} numberOfLines={1} adjustsFontSizeToFit>
          {formatMoney(all.balance)}
        </Text>
        <Text style={styles.heroSub}>{monthLabel(month)}</Text>
        <View style={styles.heroRow}>
          <HeroStat icon="arrow-down-circle" label="Entradas" value={formatMoney(monthTotals.income)} />
          <HeroStat icon="arrow-up-circle" label="Saídas" value={formatMoney(monthTotals.expense)} />
        </View>
      </View>

      {canEdit && (
        <View style={styles.quick}>
          {quickActions.map((a) => (
            <Pressable key={a.label} onPress={() => router.push(a.href)} accessibilityRole="button" style={styles.quickItem}>
              <IconCircle icon={a.icon} />
              <Text style={styles.quickLabel}>{a.label}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <Grid>
        <StatCard label="A pagar (pendentes)" value={formatMoney(dueTotal)} icon="receipt-outline" tone="warning" />
        <StatCard label="Contas vencidas" value={String(overdue.length)} icon="alert-circle-outline" tone={overdue.length ? 'expense' : 'neutral'} />
        <StatCard label="Resultado do mês" value={formatMoney(monthTotals.balance)} icon="trending-up-outline" tone={monthTotals.balance >= 0 ? 'income' : 'expense'} />
      </Grid>

      {/* Blocos em colunas (empilham no celular) */}
      <View style={styles.columns}>
        <View style={styles.column}>
          <SectionHeader title="Próximas contas a pagar" actionLabel="Ver todas" onAction={() => router.push('/contas')} />
          <Card style={{ padding: 0 }}>
            {pending.length === 0 ? (
              <EmptyState icon="checkmark-done-outline" title="Tudo em dia!" text="Nenhuma conta pendente." />
            ) : (
              pending.slice(0, 5).map((b, i) => {
                const st = billStatus(b, today);
                return (
                  <View key={b.id} style={[styles.row, i > 0 && styles.rowBorder]}>
                    <IconCircle icon="receipt-outline" bg={st === 'overdue' ? colors.expenseSoft : colors.primarySoft} color={st === 'overdue' ? colors.expense : colors.primary} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {b.description}
                      </Text>
                      <Muted>
                        {shortDateBR(b.dueDate)} · {dueText(b.dueDate, today)}
                      </Muted>
                    </View>
                    <Text style={styles.rowValue}>{formatMoney(b.amount)}</Text>
                  </View>
                );
              })
            )}
          </Card>
        </View>

        <View style={styles.column}>
          <SectionHeader title="Metas" actionLabel="Ver todas" onAction={() => router.push('/metas')} />
          <Card style={{ gap: spacing.lg }}>
            {goals.length === 0 ? (
              <EmptyState icon="flag-outline" title="Sem metas ainda" text="Defina objetivos para a empresa." />
            ) : (
              goals.slice(0, 3).map((g) => {
                const pct = g.target ? g.current / g.target : 0;
                return (
                  <View key={g.id} style={{ gap: 6 }}>
                    <View style={styles.between}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {g.title}
                      </Text>
                      <Text style={styles.pct}>{Math.round(pct * 100)}%</Text>
                    </View>
                    <ProgressBar value={pct} color={pct >= 1 ? colors.income : colors.primary} />
                    <Muted>
                      {formatMoney(g.current)} de {formatMoney(g.target)}
                    </Muted>
                  </View>
                );
              })
            )}
          </Card>
        </View>
      </View>

      <View style={styles.columns}>
        <View style={styles.column}>
          <SectionHeader title="Fluxo dos últimos 6 meses" actionLabel="Relatórios" onAction={() => router.push('/relatorios')} />
          <MonthlyBars transactions={transactions} />
        </View>

        <View style={styles.column}>
          <SectionHeader title="Lembretes" actionLabel="Ver todos" onAction={() => router.push('/lembretes')} />
          <Card style={{ padding: 0 }}>
            {openReminders.length === 0 ? (
              <EmptyState icon="notifications-off-outline" title="Nada por aqui" text="Nenhum lembrete pendente." />
            ) : (
              openReminders.slice(0, 4).map((r, i) => (
                <View key={r.id} style={[styles.row, i > 0 && styles.rowBorder]}>
                  <IconCircle icon="notifications-outline" bg={colors.infoSoft} color={colors.info} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {r.title}
                    </Text>
                    <Muted>{r.date === today ? 'Hoje' : r.date < today ? 'Atrasado' : shortDateBR(r.date)}</Muted>
                  </View>
                  {r.priority === 'alta' && <Badge label="Alta" tone="danger" />}
                </View>
              ))
            )}
          </Card>
        </View>
      </View>
    </Screen>
  );
}

function HeroStat({ icon, label, value }: { icon: 'arrow-down-circle' | 'arrow-up-circle'; label: string; value: string }) {
  return (
    <View style={styles.heroStat}>
      <Ionicons name={icon} size={22} color="#fff" />
      <View>
        <Text style={styles.heroStatLabel}>{label}</Text>
        <Text style={styles.heroStatValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  alert: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.expenseSoft, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md },
  alertText: { flex: 1, color: colors.expense, fontWeight: '700' },
  hero: { backgroundColor: colors.primary, borderRadius: radius.lg + 4, padding: spacing.xl, marginBottom: spacing.lg },
  heroLabel: { color: colors.primarySoft, fontSize: 13, fontWeight: '600' },
  heroValue: { color: '#fff', fontSize: 36, fontWeight: '800', marginTop: 4 },
  heroSub: { color: colors.primarySoft, fontSize: 12, marginTop: 2 },
  heroRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xl, marginTop: spacing.lg },
  heroStat: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  heroStatLabel: { color: colors.primarySoft, fontSize: 12 },
  heroStatValue: { color: '#fff', fontSize: 16, fontWeight: '700' },
  quick: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, marginBottom: spacing.lg },
  quickItem: { flex: 1, alignItems: 'center', gap: 6 },
  quickLabel: { fontSize: 12, fontWeight: '600', color: colors.text, textAlign: 'center' },
  columns: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.lg },
  column: { flexGrow: 1, flexBasis: 320, minWidth: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  rowTitle: { fontSize: 15, fontWeight: '600', color: colors.text, flexShrink: 1 },
  rowValue: { fontSize: 14, fontWeight: '700', color: colors.text },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  pct: { fontSize: 13, fontWeight: '700', color: colors.primary },
});
