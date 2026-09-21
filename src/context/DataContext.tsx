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

interface DataContextValue extends CompanyData {
  ready: boolean;
  addBill: (b: NewBill) => void;
  toggleBillPaid: (id: string) => void;
  removeBill: (id: string) => void;
  addTransaction: (t: NewTransaction) => void;
  removeTransaction: (id: string) => void;
  addGoal: (g: NewGoal) => void;
  contributeToGoal: (id: string, amount: number) => void;
  removeGoal: (id: string) => void;
  addReminder: (r: NewReminder) => void;
  toggleReminder: (id: string) => void;
  removeReminder: (id: string) => void;
  /** Cria um rótulo/categoria. Se já existir um com o mesmo nome e tipo, não duplica. */
  addCategory: (c: { name: string; type: Category['type']; color?: string }) => void;
  removeCategory: (id: string) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { company } = useAuth();
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

  const patch = useCallback((fn: (d: CompanyData) => CompanyData) => setData(fn), []);

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

  const removeBill = useCallback((id: string) => patch((d) => ({ ...d, bills: d.bills.filter((b) => b.id !== id) })), [patch]);

  const addTransaction = useCallback((t: NewTransaction) => patch((d) => ({ ...d, transactions: [...d.transactions, { ...t, id: uid() }] })), [patch]);
  const removeTransaction = useCallback((id: string) => patch((d) => ({ ...d, transactions: d.transactions.filter((t) => t.id !== id) })), [patch]);

  const addGoal = useCallback((g: NewGoal) => patch((d) => ({ ...d, goals: [...d.goals, { ...g, id: uid() }] })), [patch]);
  const contributeToGoal = useCallback(
    (id: string, amount: number) => patch((d) => ({ ...d, goals: d.goals.map((g) => (g.id === id ? { ...g, current: Math.max(0, g.current + amount) } : g)) })),
    [patch],
  );
  const removeGoal = useCallback((id: string) => patch((d) => ({ ...d, goals: d.goals.filter((g) => g.id !== id) })), [patch]);

  const addReminder = useCallback((r: NewReminder) => patch((d) => ({ ...d, reminders: [...d.reminders, { ...r, id: uid(), done: false }] })), [patch]);
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
  const removeCategory = useCallback((id: string) => patch((d) => ({ ...d, categories: d.categories.filter((c) => c.id !== id) })), [patch]);

  const value = useMemo<DataContextValue>(
    () => ({
      ...data,
      ready,
      addBill,
      toggleBillPaid,
      removeBill,
      addTransaction,
      removeTransaction,
      addGoal,
      contributeToGoal,
      removeGoal,
      addReminder,
      toggleReminder,
      removeReminder,
      addCategory,
      removeCategory,
    }),
    [data, ready, addBill, toggleBillPaid, removeBill, addTransaction, removeTransaction, addGoal, contributeToGoal, removeGoal, addReminder, toggleReminder, removeReminder, addCategory, removeCategory],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData deve ser usado dentro de <DataProvider>');
  return ctx;
}
