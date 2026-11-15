import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { TransactionForm } from '@/components/forms/TransactionForm';
import { Screen } from '@/components/Screen';
import { Card, Chips, EmptyState, Grid, IconButton, IconCircle, Muted, StatCard } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import type { NewTransaction } from '@/domain/companyData';
import { totals, transactionsOfMonth } from '@/lib/finance';
import { currentMonthKey, formatMoney, isoToBR, monthLabel, shiftMonthKey } from '@/lib/format';
import { confirmAction } from '@/lib/confirm';
import { useNewParam } from '@/lib/useNewParam';
import { colors, spacing } from '@/theme';
import { Transaction, TransactionType } from '@/types';

type Filter = 'todos' | TransactionType;

export default function CashScreen() {
  const { canEdit } = useAuth();
  const { transactions, categories, addTransaction, updateTransaction, removeTransaction } = useData();
  const [month, setMonth] = useState(currentMonthKey());
  const [filter, setFilter] = useState<Filter>('todos');
  // `key` muda a cada abertura para o formulário recomeçar com os dados certos.
  const [form, setForm] = useState<{ open: boolean; tx: Transaction | null; key: number }>({ open: false, tx: null, key: 0 });

  const openForm = (tx?: Transaction) => setForm((f) => ({ open: true, tx: tx ?? null, key: f.key + 1 }));
  const closeForm = () => setForm((f) => ({ ...f, open: false }));
  useNewParam(() => canEdit && openForm());

  function save(values: NewTransaction) {
    if (form.tx) updateTransaction(form.tx.id, values);
    else addTransaction(values);
    setMonth(values.date.slice(0, 7));
    closeForm();
  }

  const ofMonth = transactionsOfMonth(transactions, month);
  const sums = totals(ofMonth);
  const list = ofMonth.filter((t) => filter === 'todos' || t.type === filter).sort((a, b) => b.date.localeCompare(a.date));
  const colorOf = (name: string) => categories.find((c) => c.name === name)?.color ?? colors.textMuted;

  return (
    <Screen title="Fluxo de caixa" subtitle="Valores que entram e saem da empresa" fab={canEdit ? { label: 'Nova movimentação', onPress: () => openForm() } : undefined}>
      <View style={styles.monthNav}>
        <IconButton icon="chevron-back" label="Mês anterior" color={colors.text} onPress={() => setMonth(shiftMonthKey(month, -1))} />
        <Text style={styles.monthText}>{monthLabel(month)}</Text>
        <IconButton icon="chevron-forward" label="Próximo mês" color={colors.text} onPress={() => setMonth(shiftMonthKey(month, 1))} />
      </View>

      <Grid>
        <StatCard label="Entradas" value={formatMoney(sums.income)} icon="arrow-down-circle-outline" tone="income" />
        <StatCard label="Saídas" value={formatMoney(sums.expense)} icon="arrow-up-circle-outline" tone="expense" />
        <StatCard label="Saldo do mês" value={formatMoney(sums.balance)} icon="wallet-outline" tone={sums.balance >= 0 ? 'income' : 'expense'} />
      </Grid>

      <View style={{ marginVertical: spacing.lg }}>
        <Chips
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'todos', label: 'Todas' },
            { value: 'in', label: 'Entradas' },
            { value: 'out', label: 'Saídas' },
          ]}
        />
      </View>

      <Card style={{ padding: 0 }}>
        {list.length === 0 ? (
          <EmptyState icon="swap-vertical-outline" title="Sem movimentações" text="Nada registrado neste mês para o filtro escolhido." />
        ) : (
          list.map((t, i) => (
            <View key={t.id} style={[styles.row, i > 0 && styles.border]}>
              <IconCircle icon={t.type === 'in' ? 'arrow-down' : 'arrow-up'} bg={t.type === 'in' ? colors.incomeSoft : colors.expenseSoft} color={t.type === 'in' ? colors.income : colors.expense} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.title} numberOfLines={1}>
                  {t.description}
                </Text>
                <View style={styles.meta}>
                  <View style={[styles.dot, { backgroundColor: colorOf(t.category) }]} />
                  <Muted>
                    {t.category} · {isoToBR(t.date)}
                    {t.billId ? ' · conta paga' : ''}
                  </Muted>
                </View>
              </View>
              <Text style={[styles.amount, { color: t.type === 'in' ? colors.income : colors.expense }]}>
                {t.type === 'in' ? '+' : '-'} {formatMoney(t.amount)}
              </Text>
              {canEdit && <IconButton icon="create-outline" label="Editar movimentação" onPress={() => openForm(t)} />}
              {canEdit && <IconButton icon="trash-outline" label="Excluir movimentação" onPress={() => confirmAction('Excluir movimentação', t.billId ? `Excluir "${t.description}"? A conta volta para "a pagar".` : `Excluir "${t.description}"?`, () => removeTransaction(t.id))} />}
            </View>
          ))
        )}
      </Card>

      <TransactionForm key={form.key} visible={form.open} transaction={form.tx} onClose={closeForm} onSubmit={save} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: spacing.sm, marginBottom: spacing.lg },
  monthText: { fontSize: 16, fontWeight: '700', color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  border: { borderTopWidth: 1, borderTopColor: colors.border },
  title: { fontSize: 15, fontWeight: '600', color: colors.text },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  amount: { fontSize: 14, fontWeight: '800' },
});
