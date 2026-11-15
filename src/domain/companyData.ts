/**
 * Regras de negócio dos dados da empresa, como funções puras:
 * recebem os dados atuais e devolvem os dados novos (sem React, sem armazenamento).
 * Assim podem ser testadas isoladamente (ver __tests__/companyData-test.ts) e o
 * DataContext fica responsável só por estado, permissão e gravação.
 */
import { addMonths } from '@/lib/format';
import { Bill, Category, CompanyData, Goal, Priority, Recurrence, Reminder, Transaction, TransactionType } from '@/types';

/** Dependências externas, injetadas para os testes poderem controlar ids e data. */
export interface DomainContext {
  newId: () => string;
  /** Data de hoje (AAAA-MM-DD). */
  today: string;
}

export type NewBill = { description: string; amount: number; dueDate: string; category: string; supplier?: string; recurrence: Recurrence; remindDaysBefore: number };
export type BillChanges = Partial<NewBill>;
export type NewTransaction = { type: TransactionType; description: string; amount: number; date: string; category: string };
export type TransactionChanges = Partial<NewTransaction>;
export type NewGoal = Omit<Goal, 'id'>;
export type NewReminder = { title: string; notes?: string; date: string; priority: Priority };

/** Resultado de uma operação que pode ser recusada (com a mensagem para o usuário). */
export type Result = { data: CompanyData; error?: undefined } | { data?: undefined; error: string };

/** Categoria usada quando uma categoria em uso é excluída. */
export const FALLBACK_CATEGORY: Record<TransactionType, string> = { out: 'Outros', in: 'Outras receitas' };

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/* ---------- contas a pagar ---------- */

export function addBill(d: CompanyData, input: NewBill, ctx: DomainContext): CompanyData {
  return { ...d, bills: [...d.bills, { ...input, id: ctx.newId(), paid: false }] };
}

/**
 * Marca a conta como paga: cria a saída no caixa (com a data de hoje) e,
 * se for recorrente, a próxima conta (um mês ou um ano depois).
 */
export function payBill(d: CompanyData, id: string, ctx: DomainContext): CompanyData {
  const bill = d.bills.find((b) => b.id === id);
  if (!bill || bill.paid) return d;

  const tx: Transaction = { id: ctx.newId(), type: 'out', description: bill.description, amount: bill.amount, date: ctx.today, category: bill.category, billId: bill.id };
  const next: Bill | undefined =
    bill.recurrence === 'none'
      ? undefined
      : { ...bill, id: ctx.newId(), dueDate: addMonths(bill.dueDate, bill.recurrence === 'monthly' ? 1 : 12), paid: false, paidAt: undefined, transactionId: undefined, nextBillId: undefined };

  return {
    ...d,
    transactions: [...d.transactions, tx],
    bills: [...d.bills.map((b) => (b.id === id ? { ...b, paid: true, paidAt: ctx.today, transactionId: tx.id, nextBillId: next?.id } : b)), ...(next ? [next] : [])],
  };
}

/** Desfaz o pagamento: remove a saída do caixa e a próxima conta recorrente (se ainda não foi paga). */
export function unpayBill(d: CompanyData, id: string): CompanyData {
  const bill = d.bills.find((b) => b.id === id);
  if (!bill || !bill.paid) return d;
  return {
    ...d,
    transactions: d.transactions.filter((t) => t.billId !== bill.id),
    bills: d.bills
      .filter((b) => !(b.id === bill.nextBillId && !b.paid))
      .map((b) => (b.id === id ? { ...b, paid: false, paidAt: undefined, transactionId: undefined, nextBillId: undefined } : b)),
  };
}

export function toggleBillPaid(d: CompanyData, id: string, ctx: DomainContext): CompanyData {
  const bill = d.bills.find((b) => b.id === id);
  if (!bill) return d;
  return bill.paid ? unpayBill(d, id) : payBill(d, id, ctx);
}

/** Edita a conta. Se ela já foi paga, a saída correspondente no caixa acompanha. */
export function updateBill(d: CompanyData, id: string, changes: BillChanges): CompanyData {
  const bill = d.bills.find((b) => b.id === id);
  if (!bill) return d;
  const updated: Bill = { ...bill, ...changes };
  return {
    ...d,
    bills: d.bills.map((b) => (b.id === id ? updated : b)),
    transactions: d.transactions.map((t) => (t.billId === id ? { ...t, description: updated.description, amount: updated.amount, category: updated.category } : t)),
  };
}

/** Exclui a conta e, se ela foi paga, a saída correspondente no caixa. */
export function removeBill(d: CompanyData, id: string): CompanyData {
  return {
    ...d,
    bills: d.bills.filter((b) => b.id !== id).map((b) => (b.nextBillId === id ? { ...b, nextBillId: undefined } : b)),
    transactions: d.transactions.filter((t) => t.billId !== id),
  };
}

/* ---------- caixa ---------- */

export function addTransaction(d: CompanyData, input: NewTransaction, ctx: DomainContext): CompanyData {
  return { ...d, transactions: [...d.transactions, { ...input, id: ctx.newId() }] };
}

/** Edita a movimentação. Se ela é o pagamento de uma conta, a conta acompanha (e continua sendo uma saída). */
export function updateTransaction(d: CompanyData, id: string, changes: TransactionChanges): CompanyData {
  const tx = d.transactions.find((t) => t.id === id);
  if (!tx) return d;
  const updated: Transaction = { ...tx, ...changes, type: tx.billId ? 'out' : (changes.type ?? tx.type) };
  return {
    ...d,
    transactions: d.transactions.map((t) => (t.id === id ? updated : t)),
    bills: d.bills.map((b) => (b.id === tx.billId ? { ...b, description: updated.description, amount: updated.amount, category: updated.category, paidAt: updated.date } : b)),
  };
}

/** Exclui a movimentação. Se ela era o pagamento de uma conta, a conta volta para "a pagar". */
export function removeTransaction(d: CompanyData, id: string): CompanyData {
  const tx = d.transactions.find((t) => t.id === id);
  if (!tx) return d;
  if (tx.billId && d.bills.some((b) => b.id === tx.billId && b.paid)) return unpayBill(d, tx.billId);
  return { ...d, transactions: d.transactions.filter((t) => t.id !== id) };
}

/* ---------- metas ---------- */

export function addGoal(d: CompanyData, input: NewGoal, ctx: DomainContext): CompanyData {
  return { ...d, goals: [...d.goals, { ...input, current: Math.max(0, input.current), id: ctx.newId() }] };
}

export function updateGoal(d: CompanyData, id: string, changes: Partial<NewGoal>): CompanyData {
  return { ...d, goals: d.goals.map((g) => (g.id === id ? { ...g, ...changes, current: Math.max(0, changes.current ?? g.current) } : g)) };
}

/** Soma (ou subtrai, se negativo) um valor ao que já foi guardado na meta, sem ficar abaixo de zero. */
export function contributeToGoal(d: CompanyData, id: string, amount: number): CompanyData {
  return { ...d, goals: d.goals.map((g) => (g.id === id ? { ...g, current: Math.max(0, g.current + amount) } : g)) };
}

export function removeGoal(d: CompanyData, id: string): CompanyData {
  return { ...d, goals: d.goals.filter((g) => g.id !== id) };
}

/* ---------- lembretes ---------- */

export function addReminder(d: CompanyData, input: NewReminder, ctx: DomainContext): CompanyData {
  return { ...d, reminders: [...d.reminders, { ...input, id: ctx.newId(), done: false }] };
}

export function updateReminder(d: CompanyData, id: string, changes: Partial<NewReminder>): CompanyData {
  return { ...d, reminders: d.reminders.map((r) => (r.id === id ? { ...r, ...changes } : r)) };
}

export function toggleReminder(d: CompanyData, id: string): CompanyData {
  return { ...d, reminders: d.reminders.map((r): Reminder => (r.id === id ? { ...r, done: !r.done } : r)) };
}

export function removeReminder(d: CompanyData, id: string): CompanyData {
  return { ...d, reminders: d.reminders.filter((r) => r.id !== id) };
}

/* ---------- categorias ---------- */

/** Cria um rótulo. Se já existir um com o mesmo nome e tipo, não duplica. */
export function addCategory(d: CompanyData, input: { name: string; type: TransactionType; color: string }, ctx: DomainContext): CompanyData {
  const name = input.name.trim();
  if (!name || d.categories.some((c) => c.type === input.type && sameName(c.name, name))) return d;
  return { ...d, categories: [...d.categories, { id: ctx.newId(), name, type: input.type, color: input.color }] };
}

/** Itens (contas e movimentações) que usam o rótulo. Contas a pagar só usam rótulos de saída. */
function renameUsages(d: CompanyData, cat: Category, newName: string): Pick<CompanyData, 'bills' | 'transactions'> {
  return {
    bills: cat.type === 'out' ? d.bills.map((b) => (b.category === cat.name ? { ...b, category: newName } : b)) : d.bills,
    transactions: d.transactions.map((t) => (t.type === cat.type && t.category === cat.name ? { ...t, category: newName } : t)),
  };
}

export function categoryUsage(d: CompanyData, cat: Category): number {
  const bills = cat.type === 'out' ? d.bills.filter((b) => b.category === cat.name).length : 0;
  return bills + d.transactions.filter((t) => t.type === cat.type && t.category === cat.name).length;
}

/** Renomeia/recolore um rótulo; contas e movimentações com o nome antigo passam a usar o novo. */
export function updateCategory(d: CompanyData, id: string, changes: { name?: string; color?: string }): Result {
  const cat = d.categories.find((c) => c.id === id);
  if (!cat) return { error: 'Rótulo não encontrado.' };
  const name = changes.name?.trim() ?? cat.name;
  if (!name) return { error: 'Digite o nome do rótulo.' };
  if (d.categories.some((c) => c.id !== id && c.type === cat.type && sameName(c.name, name))) return { error: 'Esse rótulo já existe.' };
  return {
    data: {
      ...d,
      ...renameUsages(d, cat, name),
      categories: d.categories.map((c) => (c.id === id ? { ...c, name, color: changes.color ?? c.color } : c)),
    },
  };
}

/**
 * Exclui um rótulo. Se ele estiver em uso, os lançamentos passam para o rótulo
 * "Outros" / "Outras receitas" (criado se não existir), para nenhum ficar órfão.
 */
export function removeCategory(d: CompanyData, id: string, ctx: DomainContext, fallbackColor: string): Result {
  const cat = d.categories.find((c) => c.id === id);
  if (!cat) return { data: d };
  const usage = categoryUsage(d, cat);
  const fallbackName = FALLBACK_CATEGORY[cat.type];
  if (usage > 0 && sameName(cat.name, fallbackName)) {
    return { error: `"${cat.name}" está em uso por ${usage} lançamento(s) e é o rótulo padrão. Mude esses lançamentos de rótulo antes de excluir.` };
  }
  let data: CompanyData = { ...d, categories: d.categories.filter((c) => c.id !== id) };
  if (usage > 0) {
    data = addCategory(data, { name: fallbackName, type: cat.type, color: fallbackColor }, ctx);
    const fallback = data.categories.find((c) => c.type === cat.type && sameName(c.name, fallbackName)) as Category;
    data = { ...data, ...renameUsages(data, cat, fallback.name) };
  }
  return { data };
}
