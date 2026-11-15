/**
 * Acesso ao banco (Supabase). Converte as linhas das tabelas (snake_case, categoria por id)
 * para os tipos usados nas telas (camelCase, categoria por nome) e vice-versa.
 * As regras de quem pode ler/gravar ficam no banco (RLS) — ver supabase/migrations.
 */
import { supabase } from '@/lib/supabase';
import { Bill, Category, CompanyData, Goal, Priority, Recurrence, Reminder, Transaction, TransactionType } from '@/types';

/* ---------- linhas do banco ---------- */

type CategoryRow = { id: string; name: string; type: TransactionType; color: string };
type BillRow = {
  id: string;
  description: string;
  amount_cents: number;
  due_date: string;
  category_id: string | null;
  supplier: string | null;
  recurrence: Recurrence;
  remind_days_before: number;
  paid_at: string | null;
  next_bill_id: string | null;
};
type TransactionRow = { id: string; type: TransactionType; description: string; amount_cents: number; date: string; category_id: string | null; bill_id: string | null };
type GoalRow = { id: string; title: string; target_cents: number; current_cents: number; deadline: string };
type ReminderRow = { id: string; title: string; notes: string | null; date: string; priority: Priority; done: boolean };

export const NO_CATEGORY = 'Sem categoria';

/** Lança o erro do Supabase (para ser tratado por quem chamou). */
function check<T>(result: { data: T; error: unknown }): T {
  if (result.error) throw result.error;
  return result.data;
}

/* ---------- leitura ---------- */

export async function loadCompanyData(): Promise<CompanyData> {
  // O RLS já limita tudo à empresa do usuário logado.
  const [cats, bills, txs, goals, reminders] = await Promise.all([
    supabase.from('categories').select('id, name, type, color').order('name'),
    supabase.from('bills').select('id, description, amount_cents, due_date, category_id, supplier, recurrence, remind_days_before, paid_at, next_bill_id'),
    supabase.from('transactions').select('id, type, description, amount_cents, date, category_id, bill_id'),
    supabase.from('goals').select('id, title, target_cents, current_cents, deadline').order('created_at'),
    supabase.from('reminders').select('id, title, notes, date, priority, done'),
  ]);

  const categories = check(cats) as CategoryRow[];
  const nameOf = new Map(categories.map((c) => [c.id, c.name]));
  const catName = (id: string | null) => (id && nameOf.get(id)) || NO_CATEGORY;
  const txRows = check(txs) as TransactionRow[];
  const paymentOf = new Map(txRows.filter((t) => t.bill_id).map((t) => [t.bill_id as string, t.id]));

  return {
    categories: categories.map((c): Category => ({ id: c.id, name: c.name, type: c.type, color: c.color })),
    bills: (check(bills) as BillRow[]).map(
      (b): Bill => ({
        id: b.id,
        description: b.description,
        amount: b.amount_cents,
        dueDate: b.due_date,
        category: catName(b.category_id),
        supplier: b.supplier ?? undefined,
        recurrence: b.recurrence,
        remindDaysBefore: b.remind_days_before,
        paid: !!b.paid_at,
        paidAt: b.paid_at ?? undefined,
        transactionId: paymentOf.get(b.id),
        nextBillId: b.next_bill_id ?? undefined,
      }),
    ),
    transactions: txRows.map(
      (t): Transaction => ({
        id: t.id,
        type: t.type,
        description: t.description,
        amount: t.amount_cents,
        date: t.date,
        category: catName(t.category_id),
        billId: t.bill_id ?? undefined,
      }),
    ),
    goals: (check(goals) as GoalRow[]).map((g): Goal => ({ id: g.id, title: g.title, target: g.target_cents, current: g.current_cents, deadline: g.deadline })),
    reminders: (check(reminders) as ReminderRow[]).map((r): Reminder => ({ id: r.id, title: r.title, notes: r.notes ?? undefined, date: r.date, priority: r.priority, done: r.done })),
  };
}

/* ---------- gravação ---------- */

/** Resolve o nome da categoria (como aparece nas telas) para o id no banco. */
export function categoryIdFor(categories: Category[], name: string, type: TransactionType): string | null {
  return categories.find((c) => c.type === type && c.name === name)?.id ?? null;
}

export type BillInput = { description: string; amount: number; dueDate: string; categoryId: string | null; supplier?: string; recurrence: Recurrence; remindDaysBefore: number };

const billRow = (b: Partial<BillInput>) => ({
  ...(b.description !== undefined && { description: b.description }),
  ...(b.amount !== undefined && { amount_cents: b.amount }),
  ...(b.dueDate !== undefined && { due_date: b.dueDate }),
  ...(b.categoryId !== undefined && { category_id: b.categoryId }),
  ...('supplier' in b && { supplier: b.supplier ?? null }),
  ...(b.recurrence !== undefined && { recurrence: b.recurrence }),
  ...(b.remindDaysBefore !== undefined && { remind_days_before: b.remindDaysBefore }),
});

export async function insertBill(companyId: string, b: BillInput): Promise<string> {
  const row = check(await supabase.from('bills').insert({ company_id: companyId, ...billRow(b) }).select('id').single()) as { id: string };
  return row.id;
}
export async function updateBill(id: string, b: Partial<BillInput>) {
  check(await supabase.from('bills').update(billRow(b)).eq('id', id));
}
export async function deleteBill(id: string) {
  check(await supabase.from('bills').delete().eq('id', id));
}
export async function payBill(id: string, paidAt?: string) {
  check(await supabase.rpc('pay_bill', paidAt ? { p_bill_id: id, p_paid_at: paidAt } : { p_bill_id: id }));
}
export async function unpayBill(id: string) {
  check(await supabase.rpc('unpay_bill', { p_bill_id: id }));
}

export type TransactionInput = { type: TransactionType; description: string; amount: number; date: string; categoryId: string | null };

const txRow = (t: Partial<TransactionInput>) => ({
  ...(t.type !== undefined && { type: t.type }),
  ...(t.description !== undefined && { description: t.description }),
  ...(t.amount !== undefined && { amount_cents: t.amount }),
  ...(t.date !== undefined && { date: t.date }),
  ...(t.categoryId !== undefined && { category_id: t.categoryId }),
});

export async function insertTransaction(companyId: string, t: TransactionInput) {
  check(await supabase.from('transactions').insert({ company_id: companyId, ...txRow(t) }));
}
export async function updateTransaction(id: string, t: Partial<TransactionInput>) {
  check(await supabase.from('transactions').update(txRow(t)).eq('id', id));
}
export async function deleteTransaction(id: string) {
  check(await supabase.from('transactions').delete().eq('id', id));
}

export type GoalInput = { title: string; target: number; current: number; deadline: string };
const goalRow = (g: Partial<GoalInput>) => ({
  ...(g.title !== undefined && { title: g.title }),
  ...(g.target !== undefined && { target_cents: g.target }),
  ...(g.current !== undefined && { current_cents: Math.max(0, g.current) }),
  ...(g.deadline !== undefined && { deadline: g.deadline }),
});
export async function insertGoal(companyId: string, g: GoalInput) {
  check(await supabase.from('goals').insert({ company_id: companyId, ...goalRow(g) }));
}
export async function updateGoal(id: string, g: Partial<GoalInput>) {
  check(await supabase.from('goals').update(goalRow(g)).eq('id', id));
}
export async function deleteGoal(id: string) {
  check(await supabase.from('goals').delete().eq('id', id));
}

export type ReminderInput = { title: string; notes?: string; date: string; priority: Priority; done?: boolean };
const reminderRow = (r: Partial<ReminderInput>) => ({
  ...(r.title !== undefined && { title: r.title }),
  ...('notes' in r && { notes: r.notes ?? null }),
  ...(r.date !== undefined && { date: r.date }),
  ...(r.priority !== undefined && { priority: r.priority }),
  ...(r.done !== undefined && { done: r.done }),
});
export async function insertReminder(companyId: string, r: ReminderInput) {
  check(await supabase.from('reminders').insert({ company_id: companyId, ...reminderRow(r) }));
}
export async function updateReminder(id: string, r: Partial<ReminderInput>) {
  check(await supabase.from('reminders').update(reminderRow(r)).eq('id', id));
}
export async function deleteReminder(id: string) {
  check(await supabase.from('reminders').delete().eq('id', id));
}

export async function insertCategory(companyId: string, c: { name: string; type: TransactionType; color: string }) {
  check(await supabase.from('categories').insert({ company_id: companyId, ...c }));
}
export async function updateCategory(id: string, c: { name?: string; color?: string }) {
  check(await supabase.from('categories').update(c).eq('id', id));
}
export async function deleteCategory(id: string) {
  check(await supabase.from('categories').delete().eq('id', id));
}
