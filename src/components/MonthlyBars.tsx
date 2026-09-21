import { StyleSheet, Text, View } from 'react-native';

import { lastMonths } from '@/lib/finance';
import { formatMoney, monthShort } from '@/lib/format';
import { colors, spacing } from '@/theme';
import { Transaction } from '@/types';
import { Card } from './ui';

/** Gráfico de barras simples (entradas x saídas) — feito só com Views, sem biblioteca externa. */
export function MonthlyBars({ transactions, months = 6 }: { transactions: Transaction[]; months?: number }) {
  const data = lastMonths(transactions, months);
  const max = Math.max(1, ...data.flatMap((m) => [m.income, m.expense]));
  const CHART_H = 120;

  return (
    <Card>
      <View style={styles.legend}>
        <Legend color={colors.income} label="Entradas" />
        <Legend color={colors.expense} label="Saídas" />
      </View>
      <View style={[styles.chart, { height: CHART_H + 22 }]}>
        {data.map((m) => (
          <View
            key={m.key}
            style={styles.col}
            accessible
            accessibilityLabel={`${monthShort(m.key)}: entradas ${formatMoney(m.income)}, saídas ${formatMoney(m.expense)}`}>
            <View style={[styles.bars, { height: CHART_H }]}>
              <View style={[styles.bar, { height: Math.max(3, (m.income / max) * CHART_H), backgroundColor: colors.income }]} />
              <View style={[styles.bar, { height: Math.max(3, (m.expense / max) * CHART_H), backgroundColor: colors.expense }]} />
            </View>
            <Text style={styles.month}>{monthShort(m.key)}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
      <Text style={{ fontSize: 12, color: colors.textMuted }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.md },
  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.sm },
  col: { flex: 1, alignItems: 'center', gap: 6 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  bar: { width: 12, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  month: { fontSize: 12, color: colors.textMuted, textTransform: 'capitalize' },
});
