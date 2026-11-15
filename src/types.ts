export type Role = 'admin' | 'financeiro' | 'leitura';

export interface Company {
  id: string;
  name: string;
  createdAt: string;
}

export interface User {
  id: string;
  companyId: string;
  name: string;
  email: string;
  role: Role;
}

/** Convite pendente: a pessoa cria a própria conta com este e-mail e entra na empresa. */
export interface Invitation {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
}

export type Recurrence = 'none' | 'monthly' | 'yearly';

/** Todos os valores monetários são inteiros em centavos. Datas em ISO (AAAA-MM-DD). */
export interface Bill {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  category: string;
  supplier?: string;
  recurrence: Recurrence;
  /** Quantos dias antes do vencimento o lembrete deve avisar (usado pelas notificações, etapa 2). */
  remindDaysBefore: number;
  paid: boolean;
  paidAt?: string;
  /** Movimentação de caixa gerada quando a conta foi paga. */
  transactionId?: string;
  /** Próxima conta gerada automaticamente (contas recorrentes). */
  nextBillId?: string;
}

export type TransactionType = 'in' | 'out';

export interface Transaction {
  id: string;
  type: TransactionType;
  description: string;
  amount: number;
  date: string;
  category: string;
  billId?: string;
}

export interface Goal {
  id: string;
  title: string;
  target: number;
  current: number;
  deadline: string;
}

export type Priority = 'baixa' | 'media' | 'alta';

export interface Reminder {
  id: string;
  title: string;
  notes?: string;
  date: string;
  priority: Priority;
  done: boolean;
}

export interface Category {
  id: string;
  name: string;
  type: 'in' | 'out';
  color: string;
}

export interface CompanyData {
  bills: Bill[];
  transactions: Transaction[];
  goals: Goal[];
  reminders: Reminder[];
  categories: Category[];
}
