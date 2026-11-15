import { addDays, addMonths, todayISO, uid } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { Bill, CompanyData, Recurrence } from '@/types';
import * as api from './api';

/** Dados de exemplo para o usuário avaliar o layout com o app "preenchido". */
function demoCompanyData(): CompanyData {
  const today = todayISO();
  const thisMonth = today.slice(0, 7);
  const data: CompanyData = { bills: [], transactions: [], goals: [], reminders: [], categories: [] };

  const bill = (description: string, amount: number, dayOffset: number, category: string, recurrence: Recurrence, supplier?: string, paid = false): Bill => ({
    id: uid(),
    description,
    amount,
    dueDate: addDays(today, dayOffset),
    category,
    supplier,
    recurrence,
    remindDaysBefore: 3,
    paid,
    paidAt: paid ? addDays(today, dayOffset) : undefined,
  });
  data.bills = [
    bill('Aluguel do escritório', 350000, 3, 'Aluguel', 'monthly', 'Imobiliária Centro'),
    bill('Energia elétrica', 42090, -2, 'Energia e água', 'monthly', 'CPFL'),
    bill('Internet fibra', 19990, 7, 'Internet e telefone', 'monthly', 'Vivo Empresas'),
    bill('Fornecedor de embalagens', 128000, 12, 'Fornecedores', 'none', 'Embalagens Sul'),
    bill('DAS - Simples Nacional', 215000, 18, 'Impostos', 'monthly'),
    bill('Campanha de anúncios', 80000, -10, 'Marketing', 'none', undefined, true),
  ];

  const tx = (type: 'in' | 'out', description: string, amount: number, day: number, category: string) => ({
    id: uid(),
    type,
    description,
    amount,
    date: `${thisMonth}-${String(day).padStart(2, '0')}`,
    category,
  });
  const prev = (n: number, type: 'in' | 'out', description: string, amount: number, category: string) => ({
    id: uid(),
    type,
    description,
    amount,
    date: addMonths(`${thisMonth}-10`, -n),
    category,
  });
  data.transactions = [
    tx('in', 'Vendas da semana 1', 1850000, 3, 'Vendas'),
    tx('in', 'Serviço de consultoria', 620000, 8, 'Serviços'),
    tx('out', 'Folha de pagamento', 980000, 5, 'Folha de pagamento'),
    tx('out', 'Compra de material', 145000, 9, 'Fornecedores'),
    prev(1, 'in', 'Vendas do mês', 3100000, 'Vendas'),
    prev(1, 'out', 'Despesas do mês', 2050000, 'Fornecedores'),
    prev(2, 'in', 'Vendas do mês', 2800000, 'Vendas'),
    prev(2, 'out', 'Despesas do mês', 2200000, 'Fornecedores'),
    prev(3, 'in', 'Vendas do mês', 2400000, 'Vendas'),
    prev(3, 'out', 'Despesas do mês', 2300000, 'Fornecedores'),
    prev(4, 'in', 'Vendas do mês', 2650000, 'Vendas'),
    prev(4, 'out', 'Despesas do mês', 1900000, 'Fornecedores'),
    prev(5, 'in', 'Vendas do mês', 2100000, 'Vendas'),
    prev(5, 'out', 'Despesas do mês', 2000000, 'Fornecedores'),
  ];

  data.goals = [
    { id: uid(), title: 'Reserva de emergência (3 meses)', target: 3000000, current: 1850000, deadline: addMonths(today, 6) },
    { id: uid(), title: 'Faturamento do mês', target: 4000000, current: 2470000, deadline: `${thisMonth}-28` },
    { id: uid(), title: 'Comprar equipamento novo', target: 1500000, current: 300000, deadline: addMonths(today, 4) },
  ];

  data.reminders = [
    { id: uid(), title: 'Reunião com contador', notes: 'Levar extratos do mês', date: today, priority: 'alta', done: false },
    { id: uid(), title: 'Renovar certificado digital', date: addDays(today, 9), priority: 'media', done: false },
    { id: uid(), title: 'Cobrar cliente em atraso', notes: 'Cliente Silva & Cia', date: addDays(today, -1), priority: 'alta', done: false },
    { id: uid(), title: 'Revisar contrato de internet', date: addDays(today, 20), priority: 'baixa', done: false },
  ];

  return data;
}

/**
 * Grava os dados de exemplo na empresa recém-criada (as categorias padrão já
 * foram criadas pelo banco em complete_signup).
 */
export async function insertDemoData(companyId: string): Promise<void> {
  const demo = demoCompanyData();
  const { data: cats, error } = await supabase.from('categories').select('id, name, type').eq('company_id', companyId);
  if (error) throw error;
  const idOf = (name: string, type: 'in' | 'out') => cats?.find((c) => c.name === name && c.type === type)?.id ?? null;
  const fail = (r: { error: unknown }) => {
    if (r.error) throw r.error;
  };

  for (const b of demo.bills) {
    const id = await api.insertBill(companyId, { ...b, categoryId: idOf(b.category, 'out') });
    if (b.paid) await api.payBill(id, b.paidAt);
  }
  fail(
    await supabase.from('transactions').insert(
      demo.transactions.map((t) => ({ company_id: companyId, type: t.type, description: t.description, amount_cents: t.amount, date: t.date, category_id: idOf(t.category, t.type) })),
    ),
  );
  fail(await supabase.from('goals').insert(demo.goals.map((g) => ({ company_id: companyId, title: g.title, target_cents: g.target, current_cents: g.current, deadline: g.deadline }))));
  fail(
    await supabase
      .from('reminders')
      .insert(demo.reminders.map((r) => ({ company_id: companyId, title: r.title, notes: r.notes ?? null, date: r.date, priority: r.priority, done: r.done }))),
  );
}
