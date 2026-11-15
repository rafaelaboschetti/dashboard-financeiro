import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { emptyCompanyData } from '@/db/seed';
import { KEYS, read, write } from '@/db/storage';
import * as domain from '@/domain/companyData';
import { todayISO, uid } from '@/lib/format';
import { categoryPalette } from '@/theme';
import { Category, CompanyData } from '@/types';
import { useAuth } from './AuthContext';

/**
 * Estado dos dados da empresa logada: carrega do armazenamento, aplica as regras
 * de `src/domain/companyData.ts` e grava de volta. Também confere o perfil:
 * o perfil Leitura não altera nada, mesmo que alguma tela esqueça de esconder um botão.
 */
interface DataContextValue extends CompanyData {
  ready: boolean;
  addBill: (b: domain.NewBill) => void;
  /** Edita a conta. Se ela já foi paga, a saída correspondente no caixa é atualizada junto. */
  updateBill: (id: string, changes: domain.BillChanges) => void;
  toggleBillPaid: (id: string) => void;
  /** Exclui a conta (e, se paga, a saída correspondente no caixa). */
  removeBill: (id: string) => void;
  addTransaction: (t: domain.NewTransaction) => void;
  /** Edita a movimentação. Se ela veio do pagamento de uma conta, a conta é atualizada junto. */
  updateTransaction: (id: string, changes: domain.TransactionChanges) => void;
  /** Exclui a movimentação. Se era o pagamento de uma conta, a conta volta para "a pagar". */
  removeTransaction: (id: string) => void;
  addGoal: (g: domain.NewGoal) => void;
  updateGoal: (id: string, changes: Partial<domain.NewGoal>) => void;
  contributeToGoal: (id: string, amount: number) => void;
  removeGoal: (id: string) => void;
  addReminder: (r: domain.NewReminder) => void;
  updateReminder: (id: string, changes: Partial<domain.NewReminder>) => void;
  toggleReminder: (id: string) => void;
  removeReminder: (id: string) => void;
  /** Cria um rótulo/categoria. Se já existir um com o mesmo nome e tipo, não duplica. */
  addCategory: (c: { name: string; type: Category['type']; color?: string }) => void;
  /** Renomeia/recolore um rótulo. Retorna a mensagem de erro, ou null se deu certo. */
  updateCategory: (id: string, changes: { name?: string; color?: string }) => string | null;
  /** Exclui um rótulo (lançamentos em uso vão para "Outros"). Retorna a mensagem de erro, ou null. */
  removeCategory: (id: string) => string | null;
}

const DataContext = createContext<DataContextValue | null>(null);

const domainContext = (): domain.DomainContext => ({ newId: uid, today: todayISO() });

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

  /** Aplica uma regra de negócio aos dados (se o perfil puder editar). */
  const apply = useCallback(
    (fn: (d: CompanyData, ctx: domain.DomainContext) => CompanyData) => {
      if (!canEdit) return;
      setData((d) => fn(d, domainContext()));
    },
    [canEdit],
  );

  /** Para regras que podem recusar a operação: aplica e devolve a mensagem de erro (ou null). */
  const tryApply = useCallback(
    (fn: (d: CompanyData, ctx: domain.DomainContext) => domain.Result): string | null => {
      if (!canEdit) return 'Seu perfil não permite editar.';
      const result = fn(data, domainContext());
      if (result.error !== undefined) return result.error;
      setData(result.data);
      return null;
    },
    [canEdit, data],
  );

  const actions = useMemo(
    () => ({
      addBill: (b: domain.NewBill) => apply((d, ctx) => domain.addBill(d, b, ctx)),
      updateBill: (id: string, c: domain.BillChanges) => apply((d) => domain.updateBill(d, id, c)),
      toggleBillPaid: (id: string) => apply((d, ctx) => domain.toggleBillPaid(d, id, ctx)),
      removeBill: (id: string) => apply((d) => domain.removeBill(d, id)),
      addTransaction: (t: domain.NewTransaction) => apply((d, ctx) => domain.addTransaction(d, t, ctx)),
      updateTransaction: (id: string, c: domain.TransactionChanges) => apply((d) => domain.updateTransaction(d, id, c)),
      removeTransaction: (id: string) => apply((d) => domain.removeTransaction(d, id)),
      addGoal: (g: domain.NewGoal) => apply((d, ctx) => domain.addGoal(d, g, ctx)),
      updateGoal: (id: string, c: Partial<domain.NewGoal>) => apply((d) => domain.updateGoal(d, id, c)),
      contributeToGoal: (id: string, amount: number) => apply((d) => domain.contributeToGoal(d, id, amount)),
      removeGoal: (id: string) => apply((d) => domain.removeGoal(d, id)),
      addReminder: (r: domain.NewReminder) => apply((d, ctx) => domain.addReminder(d, r, ctx)),
      updateReminder: (id: string, c: Partial<domain.NewReminder>) => apply((d) => domain.updateReminder(d, id, c)),
      toggleReminder: (id: string) => apply((d) => domain.toggleReminder(d, id)),
      removeReminder: (id: string) => apply((d) => domain.removeReminder(d, id)),
      addCategory: (c: { name: string; type: Category['type']; color?: string }) =>
        apply((d, ctx) => domain.addCategory(d, { ...c, color: c.color ?? categoryPalette[d.categories.length % categoryPalette.length] }, ctx)),
    }),
    [apply],
  );

  const updateCategory = useCallback((id: string, c: { name?: string; color?: string }) => tryApply((d) => domain.updateCategory(d, id, c)), [tryApply]);
  const removeCategory = useCallback((id: string) => tryApply((d, ctx) => domain.removeCategory(d, id, ctx, categoryPalette[7])), [tryApply]);

  const value = useMemo<DataContextValue>(() => ({ ...data, ready, ...actions, updateCategory, removeCategory }), [data, ready, actions, updateCategory, removeCategory]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData deve ser usado dentro de <DataProvider>');
  return ctx;
}
