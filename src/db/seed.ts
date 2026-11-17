import { uid } from '@/lib/format';
import { categoryPalette } from '@/theme';
import { Category, CompanyData } from '@/types';

export function defaultCategories(): Category[] {
  const out = ['Aluguel', 'Energia e água', 'Internet e telefone', 'Fornecedores', 'Folha de pagamento', 'Impostos', 'Marketing', 'Outros'];
  const inn = ['Vendas', 'Serviços', 'Investimentos', 'Outras receitas'];
  return [
    ...out.map((name, i) => ({ id: uid(), name, type: 'out' as const, color: categoryPalette[i % categoryPalette.length] })),
    ...inn.map((name, i) => ({ id: uid(), name, type: 'in' as const, color: categoryPalette[(i + 2) % categoryPalette.length] })),
  ];
}

export function emptyCompanyData(): CompanyData {
  return { bills: [], transactions: [], goals: [], reminders: [], categories: defaultCategories() };
}
