import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { BillCard } from '@/components/BillCard';
import { BillForm } from '@/components/forms/BillForm';
import { Screen } from '@/components/Screen';
import { Card, Chips, EmptyState, Grid, StatCard } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import type { NewBill } from '@/domain/companyData';
import { confirmAction } from '@/lib/confirm';
import { billStatus } from '@/lib/finance';
import { currentMonthKey, formatMoney, monthKey, todayISO } from '@/lib/format';
import { useNewParam } from '@/lib/useNewParam';
import { spacing } from '@/theme';
import { Bill } from '@/types';

type Filter = 'todas' | 'pendentes' | 'vencidas' | 'pagas';

export default function BillsScreen() {
  const { canEdit } = useAuth();
  const { bills, addBill, updateBill, toggleBillPaid, removeBill } = useData();
  const [filter, setFilter] = useState<Filter>('pendentes');
  // `key` muda a cada abertura para o formulário recomeçar com os dados certos.
  const [form, setForm] = useState<{ open: boolean; bill: Bill | null; key: number }>({ open: false, bill: null, key: 0 });
  const today = todayISO();
  const month = currentMonthKey();

  const openForm = (bill?: Bill) => setForm((f) => ({ open: true, bill: bill ?? null, key: f.key + 1 }));
  const closeForm = () => setForm((f) => ({ ...f, open: false }));
  useNewParam(() => canEdit && openForm());

  function save(values: NewBill) {
    if (form.bill) {
      updateBill(form.bill.id, values);
    } else {
      addBill(values);
      setFilter('pendentes');
    }
    closeForm();
  }

  const list = useMemo(() => {
    const filtered = bills.filter((b) => {
      if (filter === 'pendentes') return !b.paid;
      if (filter === 'vencidas') return billStatus(b, today) === 'overdue';
      if (filter === 'pagas') return b.paid;
      return true;
    });
    return filtered.sort((a, b) => (filter === 'pagas' ? b.dueDate.localeCompare(a.dueDate) : a.dueDate.localeCompare(b.dueDate)));
  }, [bills, filter, today]);

  const pendingTotal = bills.filter((b) => !b.paid && monthKey(b.dueDate) === month).reduce((s, b) => s + b.amount, 0);
  const overdueTotal = bills.filter((b) => billStatus(b, today) === 'overdue').reduce((s, b) => s + b.amount, 0);
  const paidTotal = bills.filter((b) => b.paid && b.paidAt && monthKey(b.paidAt) === month).reduce((s, b) => s + b.amount, 0);

  return (
    <Screen title="Contas a pagar" subtitle="Lembretes de vencimento e pagamentos" fab={canEdit ? { label: 'Nova conta', onPress: () => openForm() } : undefined}>
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
          {list.map((b) => (
            <BillCard
              key={b.id}
              bill={b}
              today={today}
              actions={
                canEdit
                  ? {
                      onTogglePaid: () => toggleBillPaid(b.id),
                      onEdit: () => openForm(b),
                      onRemove: () =>
                        confirmAction('Excluir conta', b.paid ? `Excluir "${b.description}"? A saída no caixa também será excluída.` : `Excluir "${b.description}"?`, () => removeBill(b.id)),
                    }
                  : undefined
              }
            />
          ))}
        </View>
      )}

      <BillForm key={form.key} visible={form.open} bill={form.bill} onClose={closeForm} onSubmit={save} />
    </Screen>
  );
}
