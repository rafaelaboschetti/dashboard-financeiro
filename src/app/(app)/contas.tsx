import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CategoryPicker, DateField, MoneyField, Segmented, TextField } from '@/components/Fields';
import { FormModal } from '@/components/FormModal';
import { Screen } from '@/components/Screen';
import { Badge, Button, Card, Chips, EmptyState, Grid, IconButton, IconCircle, Muted, StatCard, Tone } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { BillStatus, billStatus } from '@/lib/finance';
import { addDays, brToISO, currentMonthKey, dueText, formatMoney, isoToBR, monthKey, todayISO } from '@/lib/format';
import { confirmAction } from '@/lib/confirm';
import { useNewParam } from '@/lib/useNewParam';
import { colors, spacing } from '@/theme';
import { Recurrence } from '@/types';

type Filter = 'todas' | 'pendentes' | 'vencidas' | 'pagas';

const statusUI: Record<BillStatus, { label?: string; tone: Tone }> = {
  paid: { label: 'Paga', tone: 'success' },
  overdue: { tone: 'danger' },
  today: { tone: 'warning' },
  soon: { tone: 'warning' },
  later: { tone: 'neutral' },
};

export default function BillsScreen() {
  const { canEdit } = useAuth();
  const { bills, categories, addBill, addCategory, toggleBillPaid, removeBill } = useData();
  const [filter, setFilter] = useState<Filter>('pendentes');
  const [open, setOpen] = useState(false);
  const today = todayISO();
  const month = currentMonthKey();

  // formulário
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(0);
  const [due, setDue] = useState('');
  const [category, setCategory] = useState('');
  const [supplier, setSupplier] = useState('');
  const [recurrence, setRecurrence] = useState<Recurrence>('none');
  const [remind, setRemind] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const expenseCats = categories.filter((c) => c.type === 'out');

  function openForm() {
    setDescription('');
    setAmount(0);
    setDue(isoToBR(addDays(today, 7)));
    setCategory(expenseCats[0]?.name ?? 'Outros');
    setSupplier('');
    setRecurrence('none');
    setRemind(1);
    setErrors({});
    setOpen(true);
  }
  useNewParam(() => canEdit && openForm());

  function submit() {
    const e: Record<string, string> = {};
    const dueISO = brToISO(due);
    if (!description.trim()) e.description = 'Descreva a conta.';
    if (amount <= 0) e.amount = 'Informe um valor maior que zero.';
    if (!dueISO) e.due = 'Data inválida.';
    setErrors(e);
    if (Object.keys(e).length || !dueISO) return;
    addBill({ description: description.trim(), amount, dueDate: dueISO, category, supplier: supplier.trim() || undefined, recurrence, remindDaysBefore: remind });
    setOpen(false);
    setFilter('pendentes');
  }

  const list = useMemo(() => {
    const filtered = bills.filter((b) => {
      const st = billStatus(b, today);
      if (filter === 'pendentes') return !b.paid;
      if (filter === 'vencidas') return st === 'overdue';
      if (filter === 'pagas') return b.paid;
      return true;
    });
    return filtered.sort((a, b) => (filter === 'pagas' ? b.dueDate.localeCompare(a.dueDate) : a.dueDate.localeCompare(b.dueDate)));
  }, [bills, filter, today]);

  const pendingTotal = bills.filter((b) => !b.paid && monthKey(b.dueDate) === month).reduce((s, b) => s + b.amount, 0);
  const overdueTotal = bills.filter((b) => billStatus(b, today) === 'overdue').reduce((s, b) => s + b.amount, 0);
  const paidTotal = bills.filter((b) => b.paid && b.paidAt && monthKey(b.paidAt) === month).reduce((s, b) => s + b.amount, 0);

  return (
    <Screen title="Contas a pagar" subtitle="Lembretes de vencimento e pagamentos" fab={canEdit ? { label: 'Nova conta', onPress: openForm } : undefined}>
      <Grid>
        <StatCard label="A pagar no mês" value={formatMoney(pendingTotal)} icon="calendar-outline" tone="warning" />
        <StatCard label="Vencidas" value={formatMoney(overdueTotal)} icon="alert-circle-outline" tone={overdueTotal ? 'expense' : 'neutral'} />
        <StatCard label="Pagas no mês" value={formatMoney(paidTotal)} icon="checkmark-circle-outline" tone="income" />
      </Grid>

      <View style={{ marginVertical: spacing.lg }}>
        <Chips
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'pendentes', label: 'Pendentes' },
            { value: 'vencidas', label: 'Vencidas' },
            { value: 'pagas', label: 'Pagas' },
            { value: 'todas', label: 'Todas' },
          ]}
        />
      </View>

      {list.length === 0 ? (
        <Card>
          <EmptyState icon="receipt-outline" title="Nenhuma conta aqui" text={canEdit ? 'Toque em "Nova conta" para cadastrar um vencimento.' : undefined} />
        </Card>
      ) : (
        <View style={{ gap: spacing.md }}>
          {list.map((b) => {
            const st = billStatus(b, today);
            const ui = statusUI[st];
            const overdue = st === 'overdue';
            return (
              <Card key={b.id} style={{ gap: spacing.md }}>
                <View style={styles.top}>
                  <IconCircle icon={b.paid ? 'checkmark-done-outline' : 'receipt-outline'} bg={b.paid ? colors.incomeSoft : overdue ? colors.expenseSoft : colors.primarySoft} color={b.paid ? colors.income : overdue ? colors.expense : colors.primary} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.title, b.paid && { textDecorationLine: 'line-through', color: colors.textMuted }]} numberOfLines={2}>
                      {b.description}
                    </Text>
                    <Muted>
                      {b.category}
                      {b.supplier ? ` · ${b.supplier}` : ''}
                      {b.recurrence !== 'none' ? ` · ${b.recurrence === 'monthly' ? 'Mensal' : 'Anual'}` : ''}
                    </Muted>
                  </View>
                  <Text style={styles.amount}>{formatMoney(b.amount)}</Text>
                </View>
                <View style={styles.bottom}>
                  <View style={{ gap: 4 }}>
                    <Badge label={ui.label ?? dueText(b.dueDate, today)} tone={ui.tone} />
                    <Muted>{b.paid && b.paidAt ? `Paga em ${isoToBR(b.paidAt)}` : `Vencimento: ${isoToBR(b.dueDate)}`}</Muted>
                  </View>
                  {canEdit && (
                    <View style={styles.actions}>
                      <Button small variant={b.paid ? 'secondary' : 'primary'} icon={b.paid ? 'arrow-undo-outline' : 'checkmark'} label={b.paid ? 'Desfazer' : 'Marcar como paga'} onPress={() => toggleBillPaid(b.id)} />
                      <IconButton icon="trash-outline" label="Excluir conta" color={colors.expense} onPress={() => confirmAction('Excluir conta', `Excluir "${b.description}"?`, () => removeBill(b.id))} />
                    </View>
                  )}
                </View>
              </Card>
            );
          })}
        </View>
      )}

      <FormModal visible={open} title="Nova conta a pagar" submitLabel="Salvar conta" onClose={() => setOpen(false)} onSubmit={submit}>
        <TextField label="Descrição" value={description} onChangeText={setDescription} error={errors.description} placeholder="Ex.: Aluguel do escritório" />
        <MoneyField label="Valor" value={amount} onChange={setAmount} error={errors.amount} />
        <DateField label="Vencimento" value={due} onChange={setDue} error={errors.due} />
        <CategoryPicker options={expenseCats} value={category} onChange={setCategory} onCreate={(name) => { addCategory({ name, type: 'out' }); setCategory(name); }} />
        <TextField label="Fornecedor (opcional)" value={supplier} onChangeText={setSupplier} placeholder="Quem você vai pagar" />
        <Segmented
          label="Repetir"
          value={recurrence}
          onChange={setRecurrence}
          options={[
            { value: 'none', label: 'Não repete' },
            { value: 'monthly', label: 'Todo mês' },
            { value: 'yearly', label: 'Todo ano' },
          ]}
        />
        <Segmented
          label="Avisar antes do vencimento"
          value={remind}
          onChange={setRemind}
          options={[
            { value: 0, label: 'No dia' },
            { value: 1, label: '1 dia' },
            { value: 3, label: '3 dias' },
            { value: 7, label: '7 dias' },
          ]}
        />
      </FormModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  amount: { fontSize: 16, fontWeight: '800', color: colors.text },
  bottom: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
