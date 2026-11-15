import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { emptyCompanyData } from '@/db/seed';
import { categoryPalette } from '@/theme';
import { KEYS, read, write } from '@/db/storage';
import { addMonths, todayISO, uid } from '@/lib/format';
import { Bill, Category, CompanyData, Goal, Priority, Recurrence, Transaction } from '@/types';
import { useAuth } from './AuthContext';

type NewBill = { description: string; amount: number; dueDate: string; category: string; supplier?: string; recurrence: Recurrence; remindDaysBefore: number };
type NewTransaction = Omit<Transaction, 'id'>;
type NewGoal = Omit<Goal, 'id'>;
type NewReminder = { title: string; notes?: string; date: string; priority: Priority };
type BillChanges = Partial<Pick<Bill, 'description' | 'amount' | 'dueDate' | 'category' | 'supplier' | 'recurrence' | 'remindDaysBefore'>>;
type TransactionChanges = Partial<Pick<Transaction, 'type' | 'description' | 'amount' | 'date' | 'category'>>;

interface DataContextValue extends CompanyData {
  ready: boolean;
  addBill: (b: NewBill) => void;
  /** Edita a conta. Se ela já foi paga, a saída correspondente no caixa é atualizada junto. */
  updateBill: (id: string, changes: BillChanges) => void;
  toggleBillPaid: (id: string) => void;
  removeBill: (id: string) => void;
  addTransaction: (t: NewTransaction) => void;
  /** Edita a movimentação. Se ela veio do pagamento de uma conta, a conta é atualizada junto. */
  updateTransaction: (id: string, changes: TransactionChanges) => void;
  removeTransaction: (id: string) => void;
  addGoal: (g: NewGoal) => void;
  updateGoal: (id: string, changes: Partial<NewGoal>) => void;
  contributeToGoal: (id: string, amount: number) => void;
  removeGoal: (id: string) => void;
  addReminder: (r: NewReminder) => void;
  updateReminder: (id: string, changes: Partial<NewReminder>) => void;
  toggleReminder: (id: string) => void;
  removeReminder: (id: string) => void;
  /** Cria um rótulo/categoria. Se já existir um com o mesmo nome e tipo, não duplica. */
  addCategory: (c: { name: string; type: Category['type']; color?: string }) => void;
  /** Renomeia/recolore um rótulo. Contas e movimentações que usam o nome antigo passam a usar o novo. */
  updateCategory: (id: string, changes: { name?: string; color?: string }) => string | null;
  removeCategory: (id: string) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { company, canEdit } = useAuth();
  const companyId = company?.id ?? null;
  const [data, setData] = useState<CompanyData>(emptyCompanyData);
  // Os dados só valem para a empresa cujo id foi carregado (evita gravar dados de uma empresa na outra).
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const ready = !!companyId && loadedFor === companyId;

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    read<CompanyData>(KEYS.data(companyId), emptyCompanyData()).then((stored) => {
      if (cancelled) return;
      setData(stored);
      setLoadedFor(companyId);
    });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  // Persiste a cada alteração (só depois de carregar os dados da empresa atual).
  useEffect(() => {
    if (companyId && ready) write(KEYS.data(companyId), data);
  }, [data, companyId, ready]);

  // Toda alteração passa por `patch`, que confere o perfil: o perfil Leitura não altera nada,
  // mesmo que alguma tela esqueça de esconder um botão.
  const patch = useCallback(
    (fn: (d: CompanyData) => CompanyData) => {
      if (!canEdit) return;
      setData(fn);
    },
    [canEdit],
  );

  const addBill = useCallback((b: NewBill) => patch((d) => ({ ...d, bills: [...d.bills, { ...b, id: uid(), paid: false }] })), [patch]);

  const toggleBillPaid = useCallback(
    (id: string) =>
      patch((d) => {
        const bill = d.bills.find((x) => x.id === id);
        if (!bill) return d;

        if (bill.paid) {
          // Desfaz o pagamento: remove a saída de caixa e a próxima conta recorrente (se ainda pendente).
          return {
            ...d,
            transactions: d.transactions.filter((t) => t.id !== bill.transactionId),
            bills: d.bills
              .filter((b) => !(b.id === bill.nextBillId && !b.paid))
              .map((b) => (b.id === id ? { ...b, paid: false, paidAt: undefined, transactionId: undefined, nextBillId: undefined } : b)),
          };
        }

        const tx: Transaction = { id: uid(), type: 'out', description: bill.description, amount: bill.amount, date: todayISO(), category: bill.category, billId: bill.id };
        let next: Bill | undefined;
        if (bill.recurrence !== 'none') {
          next = { ...bill, id: uid(), dueDate: addMonths(bill.dueDate, bill.recurrence === 'monthly' ? 1 : 12), paid: false, paidAt: undefined, transactionId: undefined, nextBillId: undefined };
        }
        return {
          ...d,
          transactions: [...d.transactions, tx],
          bills: [...d.bills.map((b) => (b.id === id ? { ...b, paid: true, paidAt: todayISO(), transactionId: tx.id, nextBillId: next?.id } : b)), ...(next ? [next] : [])],
        };
      }),
    [patch],
  );

  const updateBill = useCallback(
    (id: string, changes: BillChanges) =>
      patch((d) => {
        const bill = d.bills.find((b) => b.id === id);
        if (!bill) return d;
        const updated: Bill = { ...bill, ...changes };
        return {
          ...d,
          bills: d.bills.map((b) => (b.id === id ? updated : b)),
          transactions: d.transactions.map((t) =>
            t.id === bill.transactionId ? { ...t, description: updated.description, amount: updated.amount, category: updated.category } : t,
          ),
        };
      }),
    [patch],
  );

  const removeBill = useCallback((id: string) => patch((d) => ({ ...d, bills: d.bills.filter((b) => b.id !== id) })), [patch]);

  const addTransaction = useCallback((t: NewTransaction) => patch((d) => ({ ...d, transactions: [...d.transactions, { ...t, id: uid() }] })), [patch]);
  const updateTransaction = useCallback(
    (id: string, changes: TransactionChanges) =>
      patch((d) => {
        const tx = d.transactions.find((t) => t.id === id);
        if (!tx) return d;
        // Pagamento de conta é sempre uma saída.
        const updated: Transaction = { ...tx, ...changes, type: tx.billId ? 'out' : (changes.type ?? tx.type) };
        return {
          ...d,
          transactions: d.transactions.map((t) => (t.id === id ? updated : t)),
          bills: d.bills.map((b) =>
            b.id === tx.billId ? { ...b, description: updated.description, amount: updated.amount, category: updated.category, paidAt: updated.date } : b,
          ),
        };
      }),
    [patch],
  );
  const removeTransaction = useCallback((id: string) => patch((d) => ({ ...d, transactions: d.transactions.filter((t) => t.id !== id) })), [patch]);

  const addGoal = useCallback((g: NewGoal) => patch((d) => ({ ...d, goals: [...d.goals, { ...g, id: uid() }] })), [patch]);
  const contributeToGoal = useCallback(
    (id: string, amount: number) => patch((d) => ({ ...d, goals: d.goals.map((g) => (g.id === id ? { ...g, current: Math.max(0, g.current + amount) } : g)) })),
    [patch],
  );
  const updateGoal = useCallback(
    (id: string, changes: Partial<NewGoal>) => patch((d) => ({ ...d, goals: d.goals.map((g) => (g.id === id ? { ...g, ...changes } : g)) })),
    [patch],
  );
  const removeGoal = useCallback((id: string) => patch((d) => ({ ...d, goals: d.goals.filter((g) => g.id !== id) })), [patch]);

  const addReminder = useCallback((r: NewReminder) => patch((d) => ({ ...d, reminders: [...d.reminders, { ...r, id: uid(), done: false }] })), [patch]);
  const updateReminder = useCallback(
    (id: string, changes: Partial<NewReminder>) => patch((d) => ({ ...d, reminders: d.reminders.map((r) => (r.id === id ? { ...r, ...changes } : r)) })),
    [patch],
  );
  const toggleReminder = useCallback(
    (id: string) => patch((d) => ({ ...d, reminders: d.reminders.map((r) => (r.id === id ? { ...r, done: !r.done } : r)) })),
    [patch],
  );
  const removeReminder = useCallback((id: string) => patch((d) => ({ ...d, reminders: d.reminders.filter((r) => r.id !== id) })), [patch]);

  const addCategory = useCallback(
    (c: { name: string; type: Category['type']; color?: string }) =>
      patch((d) => {
        const name = c.name.trim();
        if (!name || d.categories.some((x) => x.type === c.type && x.name.toLowerCase() === name.toLowerCase())) return d;
        const color = c.color ?? categoryPalette[d.categories.length % categoryPalette.length];
        return { ...d, categories: [...d.categories, { id: uid(), name, type: c.type, color }] };
      }),
    [patch],
  );
  const updateCategory = useCallback(
    (id: string, changes: { name?: string; color?: string }): string | null => {
      if (!canEdit) return 'Seu perfil não permite editar.';
      const cat = data.categories.find((c) => c.id === id);
      if (!cat) return 'Rótulo não encontrado.';
      const name = changes.name?.trim() ?? cat.name;
      if (!name) return 'Digite o nome do rótulo.';
      if (data.categories.some((c) => c.id !== id && c.type === cat.type && c.name.toLowerCase() === name.toLowerCase())) return 'Esse rótulo já existe.';
      patch((d) => {
        const rename = <T extends { category: string }>(item: T, type: Category['type']): T =>
          item.category === cat.name && type === cat.type ? { ...item, category: name } : item;
        return {
          ...d,
          categories: d.categories.map((c) => (c.id === id ? { ...c, name, color: changes.color ?? c.color } : c)),
          bills: d.bills.map((b) => rename(b, 'out')),
          transactions: d.transactions.map((t) => rename(t, t.type)),
        };
      });
      return null;
    },
    [canEdit, data.categories, patch],
  );
  const removeCategory = useCallback((id: string) => patch((d) => ({ ...d, categories: d.categories.filter((c) => c.id !== id) })), [patch]);

  const value = useMemo<DataContextValue>(
    () => ({
      ...data,
      ready,
      addBill,
      updateBill,
      toggleBillPaid,
      removeBill,
      addTransaction,
      updateTransaction,
      removeTransaction,
      addGoal,
      updateGoal,
      contributeToGoal,
      removeGoal,
      addReminder,
      updateReminder,
      toggleReminder,
      removeReminder,
      addCategory,
      updateCategory,
      removeCategory,
    }),
    [data, ready, addBill, updateBill, toggleBillPaid, removeBill, addTransaction, updateTransaction, removeTransaction, addGoal, updateGoal, contributeToGoal, removeGoal, addReminder, updateReminder, toggleReminder, removeReminder, addCategory, updateCategory, removeCategory],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData deve ser usado dentro de <DataProvider>');
  return ctx;
}
