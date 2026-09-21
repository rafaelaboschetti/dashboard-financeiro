import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CategoryPicker, DateField, MoneyField, Segmented, TextField } from '@/components/Fields';
import { FormModal } from '@/components/FormModal';
import { Screen } from '@/components/Screen';
import { Card, Chips, EmptyState, Grid, IconButton, IconCircle, Muted, StatCard } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { totals, transactionsOfMonth } from '@/lib/finance';
import { brToISO, currentMonthKey, formatMoney, isoToBR, monthLabel, shiftMonthKey, todayISO } from '@/lib/format';
import { confirmAction } from '@/lib/confirm';
import { useNewParam } from '@/lib/useNewParam';
import { colors, spacing } from '@/theme';
import { TransactionType } from '@/types';

type Filter = 'todos' | TransactionType;

export default function CashScreen() {
  const { canEdit } = useAuth();
  const { transactions, categories, addTransaction, addCategory, removeTransaction } = useData();
  const [month, setMonth] = useState(currentMonthKey());
  const [filter, setFilter] = useState<Filter>('todos');
  const [open, setOpen] = useState(false);

  const [type, setType] = useState<TransactionType>('in');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const catsFor = (t: TransactionType) => categories.filter((c) => c.type === t);

  function openForm() {
    setType('in');
    setDescription('');
    setAmount(0);
    setDate(isoToBR(todayISO()));
    setCategory(catsFor('in')[0]?.name ?? 'Outras receitas');
    setErrors({});
    setOpen(true);
  }
  useNewParam(() => canEdit && openForm());

  function changeType(t: TransactionType) {
    setType(t);
    setCategory(catsFor(t)[0]?.name ?? 'Outros');
  }

  function submit() {
    const e: Record<string, string> = {};
    const iso = brToISO(date);
    if (!description.trim()) e.description = 'Descreva a movimentação.';
    if (amount <= 0) e.amount = 'Informe um valor maior que zero.';
    if (!iso) e.date = 'Data inválida.';
    setErrors(e);
    if (Object.keys(e).length || !iso) return;
    addTransaction({ type, description: description.trim(), amount, date: iso, category });
    setMonth(iso.slice(0, 7));
    setOpen(false);
  }

  const ofMonth = transactionsOfMonth(transactions, month);
  const sums = totals(ofMonth);
  const list = ofMonth.filter((t) => filter === 'todos' || t.type === filter).sort((a, b) => b.date.localeCompare(a.date));
  const colorOf = (name: string) => categories.find((c) => c.name === name)?.color ?? colors.textMuted;

  return (
    <Screen title="Fluxo de caixa" subtitle="Valores que entram e saem da empresa" fab={canEdit ? { label: 'Nova movimentação', onPress: openForm } : undefined}>
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
              {canEdit && <IconButton icon="trash-outline" label="Excluir movimentação" onPress={() => confirmAction('Excluir movimentação', `Excluir "${t.description}"?`, () => removeTransaction(t.id))} />}
            </View>
          ))
        )}
      </Card>

      <FormModal visible={open} title="Nova movimentação" onClose={() => setOpen(false)} onSubmit={submit}>
        <Segmented
          value={type}
          onChange={changeType}
          options={[
            { value: 'in', label: 'Entrada' },
            { value: 'out', label: 'Saída' },
          ]}
        />
        <View style={{ height: spacing.lg }} />
        <TextField label="Descrição" value={description} onChangeText={setDescription} error={errors.description} placeholder={type === 'in' ? 'Ex.: Venda de produtos' : 'Ex.: Compra de material'} />
        <MoneyField label="Valor" value={amount} onChange={setAmount} error={errors.amount} />
        <DateField label="Data" value={date} onChange={setDate} error={errors.date} shortcuts={false} />
        <CategoryPicker options={catsFor(type)} value={category} onChange={setCategory} onCreate={(name) => { addCategory({ name, type }); setCategory(name); }} />
      </FormModal>
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
