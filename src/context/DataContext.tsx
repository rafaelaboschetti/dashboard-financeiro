import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import * as api from '@/db/api';
import { notify } from '@/lib/notify';
import { friendlyError, supabase } from '@/lib/supabase';
import { categoryPalette } from '@/theme';
import { Bill, Category, CompanyData, Goal, Priority, Recurrence, Transaction } from '@/types';
import { useAuth } from './AuthContext';

type NewBill = { description: string; amount: number; dueDate: string; category: string; supplier?: string; recurrence: Recurrence; remindDaysBefore: number };
type NewTransaction = Omit<Transaction, 'id' | 'billId'>;
type NewGoal = Omit<Goal, 'id'>;
type NewReminder = { title: string; notes?: string; date: string; priority: Priority };
type BillChanges = Partial<Pick<Bill, 'description' | 'amount' | 'dueDate' | 'category' | 'supplier' | 'recurrence' | 'remindDaysBefore'>>;
type TransactionChanges = Partial<Pick<Transaction, 'type' | 'description' | 'amount' | 'date' | 'category'>>;

interface DataContextValue extends CompanyData {
  /** Dados da empresa já carregados do servidor. */
  ready: boolean;
  /** Erro ao carregar (ex.: sem internet). */
  loadError: string | null;
  reload: () => Promise<void>;
  addBill: (b: NewBill) => Promise<void>;
  /** Edita a conta. Se ela já foi paga, o banco atualiza a saída no caixa junto. */
  updateBill: (id: string, changes: BillChanges) => Promise<void>;
  toggleBillPaid: (id: string) => Promise<void>;
  /** Exclui a conta (e, se paga, a saída correspondente no caixa). */
  removeBill: (id: string) => Promise<void>;
  addTransaction: (t: NewTransaction) => Promise<void>;
  /** Edita a movimentação. Se ela veio do pagamento de uma conta, o banco atualiza a conta junto. */
  updateTransaction: (id: string, changes: TransactionChanges) => Promise<void>;
  /** Exclui a movimentação. Se era o pagamento de uma conta, a conta volta para "a pagar". */
  removeTransaction: (id: string) => Promise<void>;
  addGoal: (g: NewGoal) => Promise<void>;
  updateGoal: (id: string, changes: Partial<NewGoal>) => Promise<void>;
  contributeToGoal: (id: string, amount: number) => Promise<void>;
  removeGoal: (id: string) => Promise<void>;
  addReminder: (r: NewReminder) => Promise<void>;
  updateReminder: (id: string, changes: Partial<NewReminder>) => Promise<void>;
  toggleReminder: (id: string) => Promise<void>;
  removeReminder: (id: string) => Promise<void>;
  /** Cria um rótulo/categoria. Se já existir um com o mesmo nome e tipo, não duplica. */
  addCategory: (c: { name: string; type: Category['type']; color?: string }) => Promise<void>;
  /** Renomeia/recolore um rótulo (os lançamentos acompanham, pois apontam para o id). Retorna o erro, se houver. */
  updateCategory: (id: string, changes: { name?: string; color?: string }) => Promise<string | null>;
  /** Exclui o rótulo; lançamentos que o usavam ficam "Sem categoria". */
  removeCategory: (id: string) => Promise<void>;
}

const empty: CompanyData = { bills: [], transactions: [], goals: [], reminders: [], categories: [] };
const TABLES = ['categories', 'bills', 'transactions', 'goals', 'reminders'] as const;

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { company, canEdit } = useAuth();
  const companyId = company?.id ?? null;
  const [data, setData] = useState<CompanyData>(empty);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const ready = !!companyId && loadedFor === companyId;
  const loadSeq = useRef(0);

  const reload = useCallback(async () => {
    if (!companyId) return;
    const seq = ++loadSeq.current;
    try {
      const fresh = await api.loadCompanyData();
      if (seq !== loadSeq.current) return; // chegou uma resposta mais nova antes
      setData(fresh);
      setLoadedFor(companyId);
      setLoadError(null);
    } catch (e) {
      if (seq === loadSeq.current) setLoadError(friendlyError(e));
    }
  }, [companyId]);

  // Carrega ao entrar / trocar de empresa. (Ao sair, a área logada é desmontada e este estado some junto.)
  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    const seq = ++loadSeq.current;
    api
      .loadCompanyData()
      .then((fresh) => {
        if (cancelled || seq !== loadSeq.current) return;
        setData(fresh);
        setLoadedFor(companyId);
        setLoadError(null);
      })
      .catch((e) => {
        if (!cancelled) setLoadError(friendlyError(e));
      });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  // Tempo real: quando outra pessoa da empresa altera algo, recarrega (agrupando alterações próximas).
  useEffect(() => {
    if (!companyId) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(reload, 400);
    };
    const channel = supabase.channel(`empresa-${companyId}`);
    for (const table of TABLES) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table, filter: `company_id=eq.${companyId}` }, schedule);
    }
    channel.subscribe();
    // Ao voltar para o app, garante que está atualizado.
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') schedule();
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
      supabase.removeChannel(channel);
    };
  }, [companyId, reload]);

  /** Executa uma gravação: confere o perfil, mostra o erro (se houver) e recarrega os dados. */
  const run = useCallback(
    async (action: (companyId: string) => Promise<unknown>) => {
      if (!companyId || !canEdit) return;
      try {
        await action(companyId);
      } catch (e) {
        notify('Não foi possível salvar', friendlyError(e));
      }
      await reload();
    },
    [companyId, canEdit, reload],
  );

  const catId = useCallback((name: string, type: Category['type']) => api.categoryIdFor(data.categories, name, type), [data.categories]);

  const addBill = useCallback((b: NewBill) => run((cid) => api.insertBill(cid, { ...b, categoryId: catId(b.category, 'out') })), [run, catId]);
  const updateBill = useCallback(
    (id: string, c: BillChanges) => run(() => api.updateBill(id, { ...c, ...(c.category !== undefined && { categoryId: catId(c.category, 'out') }) })),
    [run, catId],
  );
  const toggleBillPaid = useCallback(
    (id: string) => {
      const bill = data.bills.find((b) => b.id === id);
      if (!bill) return Promise.resolve();
      return run(() => (bill.paid ? api.unpayBill(id) : api.payBill(id)));
    },
    [run, data.bills],
  );
  const removeBill = useCallback((id: string) => run(() => api.deleteBill(id)), [run]);

  const addTransaction = useCallback(
    (t: NewTransaction) => run((cid) => api.insertTransaction(cid, { type: t.type, description: t.description, amount: t.amount, date: t.date, categoryId: catId(t.category, t.type) })),
    [run, catId],
  );
  const updateTransaction = useCallback(
    (id: string, c: TransactionChanges) => {
      const tx = data.transactions.find((t) => t.id === id);
      const type = tx?.billId ? 'out' : (c.type ?? tx?.type ?? 'out'); // pagamento de conta é sempre saída
      return run(() => api.updateTransaction(id, { ...c, type, ...(c.category !== undefined && { categoryId: catId(c.category, type) }) }));
    },
    [run, catId, data.transactions],
  );
  const removeTransaction = useCallback((id: string) => run(() => api.deleteTransaction(id)), [run]);

  const addGoal = useCallback((g: NewGoal) => run((cid) => api.insertGoal(cid, g)), [run]);
  const updateGoal = useCallback((id: string, c: Partial<NewGoal>) => run(() => api.updateGoal(id, c)), [run]);
  const contributeToGoal = useCallback(
    (id: string, amount: number) => {
      const goal = data.goals.find((g) => g.id === id);
      if (!goal) return Promise.resolve();
      return run(() => api.updateGoal(id, { current: goal.current + amount }));
    },
    [run, data.goals],
  );
  const removeGoal = useCallback((id: string) => run(() => api.deleteGoal(id)), [run]);

  const addReminder = useCallback((r: NewReminder) => run((cid) => api.insertReminder(cid, r)), [run]);
  const updateReminder = useCallback((id: string, c: Partial<NewReminder>) => run(() => api.updateReminder(id, c)), [run]);
  const toggleReminder = useCallback(
    (id: string) => {
      const r = data.reminders.find((x) => x.id === id);
      if (!r) return Promise.resolve();
      return run(() => api.updateReminder(id, { done: !r.done }));
    },
    [run, data.reminders],
  );
  const removeReminder = useCallback((id: string) => run(() => api.deleteReminder(id)), [run]);

  const addCategory = useCallback(
    (c: { name: string; type: Category['type']; color?: string }) => {
      const name = c.name.trim();
      if (!name || data.categories.some((x) => x.type === c.type && x.name.toLowerCase() === name.toLowerCase())) return Promise.resolve();
      const color = c.color ?? categoryPalette[data.categories.length % categoryPalette.length];
      return run((cid) => api.insertCategory(cid, { name, type: c.type, color }));
    },
    [run, data.categories],
  );
  const updateCategory = useCallback(
    async (id: string, changes: { name?: string; color?: string }): Promise<string | null> => {
      if (!canEdit) return 'Seu perfil não permite editar.';
      const cat = data.categories.find((c) => c.id === id);
      if (!cat) return 'Rótulo não encontrado.';
      const name = changes.name?.trim() ?? cat.name;
      if (!name) return 'Digite o nome do rótulo.';
      if (data.categories.some((c) => c.id !== id && c.type === cat.type && c.name.toLowerCase() === name.toLowerCase())) return 'Esse rótulo já existe.';
      try {
        await api.updateCategory(id, { name, color: changes.color ?? cat.color });
      } catch (e) {
        return friendlyError(e);
      }
      await reload();
      return null;
    },
    [canEdit, data.categories, reload],
  );
  const removeCategory = useCallback((id: string) => run(() => api.deleteCategory(id)), [run]);

  const value = useMemo<DataContextValue>(
    () => ({
      ...data,
      ready,
      loadError,
      reload,
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
    [data, ready, loadError, reload, addBill, updateBill, toggleBillPaid, removeBill, addTransaction, updateTransaction, removeTransaction, addGoal, updateGoal, contributeToGoal, removeGoal, addReminder, updateReminder, toggleReminder, removeReminder, addCategory, updateCategory, removeCategory],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData deve ser usado dentro de <DataProvider>');
  return ctx;
}
