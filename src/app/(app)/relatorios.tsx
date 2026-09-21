import { StyleSheet, Text, View } from 'react-native';

import { MonthlyBars } from '@/components/MonthlyBars';
import { Screen } from '@/components/Screen';
import { Badge, Card, EmptyState, Grid, Muted, ProgressBar, SectionHeader, StatCard } from '@/components/ui';
import { useData } from '@/context/DataContext';
import { totals, transactionsOfMonth } from '@/lib/finance';
import { currentMonthKey, formatMoney, monthLabel } from '@/lib/format';
import { colors, spacing } from '@/theme';

export default function ReportsScreen() {
  const { transactions, categories } = useData();
  const month = currentMonthKey();
  const ofMonth = transactionsOfMonth(transactions, month);
  const sums = totals(ofMonth);

  const byCategory = Object.values(
    ofMonth
      .filter((t) => t.type === 'out')
      .reduce<Record<string, { name: string; value: number }>>((acc, t) => {
        acc[t.category] = { name: t.category, value: (acc[t.category]?.value ?? 0) + t.amount };
        return acc;
      }, {}),
  ).sort((a, b) => b.value - a.value);

  const margin = sums.income > 0 ? Math.round((sums.balance / sums.income) * 100) : 0;

  return (
    <Screen title="Relatórios" subtitle={monthLabel(month)} back>
      <Grid>
        <StatCard label="Entradas" value={formatMoney(sums.income)} icon="arrow-down-circle-outline" tone="income" />
        <StatCard label="Saídas" value={formatMoney(sums.expense)} icon="arrow-up-circle-outline" tone="expense" />
        <StatCard label="Resultado" value={formatMoney(sums.balance)} icon="trending-up-outline" tone={sums.balance >= 0 ? 'income' : 'expense'} />
        <StatCard label="Margem" value={`${margin}%`} icon="pie-chart-outline" />
      </Grid>

      <SectionHeader title="Entradas x saídas (6 meses)" />
      <MonthlyBars transactions={transactions} />

      <SectionHeader title="Despesas por categoria" />
      <Card style={{ gap: spacing.lg }}>
        {byCategory.length === 0 ? (
          <EmptyState icon="pie-chart-outline" title="Sem despesas no mês" />
        ) : (
          byCategory.map((c) => {
            const color = categories.find((x) => x.name === c.name)?.color ?? colors.primary;
            const share = sums.expense ? c.value / sums.expense : 0;
            return (
              <View key={c.name} style={{ gap: 6 }}>
                <View style={styles.between}>
                  <Text style={styles.name}>{c.name}</Text>
                  <Text style={styles.value}>
                    {formatMoney(c.value)} <Muted>({Math.round(share * 100)}%)</Muted>
                  </Text>
                </View>
                <ProgressBar value={share} color={color} />
              </View>
            );
          })
        )}
      </Card>

      <SectionHeader title="Exportar" />
      <Card style={styles.export}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.name}>PDF e Excel/CSV</Text>
          <Muted>Envie relatórios para o contador.</Muted>
        </View>
        <Badge label="Em breve" tone="info" />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  name: { fontSize: 14, fontWeight: '600', color: colors.text },
  value: { fontSize: 14, fontWeight: '700', color: colors.text },
  export: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
