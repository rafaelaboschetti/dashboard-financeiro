import { useState } from 'react';

import { CategoryPicker, DateField, MoneyField, Segmented, TextField } from '@/components/Fields';
import { FormModal } from '@/components/FormModal';
import { Muted } from '@/components/ui';
import { useData } from '@/context/DataContext';
import type { NewBill } from '@/domain/companyData';
import { addDays, brToISO, isoToBR, todayISO } from '@/lib/format';
import { spacing } from '@/theme';
import { Bill, Recurrence } from '@/types';

interface BillFormProps {
  visible: boolean;
  /** Conta a editar; sem ela, o formulário cria uma conta nova. */
  bill: Bill | null;
  onClose: () => void;
  onSubmit: (values: NewBill) => void;
}

/**
 * Formulário de conta a pagar (criar e editar). Os campos começam com os dados da conta
 * (ou valores padrão); quem abre passa uma `key` nova a cada abertura para recomeçar.
 */
export function BillForm({ visible, bill, onClose, onSubmit }: BillFormProps) {
  const { categories, addCategory } = useData();
  const expenseCats = categories.filter((c) => c.type === 'out');

  const [description, setDescription] = useState(bill?.description ?? '');
  const [amount, setAmount] = useState(bill?.amount ?? 0);
  const [due, setDue] = useState(isoToBR(bill?.dueDate ?? addDays(todayISO(), 7)));
  const [category, setCategory] = useState(bill?.category ?? expenseCats[0]?.name ?? 'Outros');
  const [supplier, setSupplier] = useState(bill?.supplier ?? '');
  const [recurrence, setRecurrence] = useState<Recurrence>(bill?.recurrence ?? 'none');
  const [remind, setRemind] = useState(bill?.remindDaysBefore ?? 1);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit() {
    const e: Record<string, string> = {};
    const dueISO = brToISO(due);
    if (!description.trim()) e.description = 'Descreva a conta.';
    if (amount <= 0) e.amount = 'Informe um valor maior que zero.';
    if (!dueISO) e.due = 'Data inválida.';
    setErrors(e);
    if (Object.keys(e).length || !dueISO) return;
    onSubmit({ description: description.trim(), amount, dueDate: dueISO, category, supplier: supplier.trim() || undefined, recurrence, remindDaysBefore: remind });
  }

  return (
    <FormModal visible={visible} title={bill ? 'Editar conta' : 'Nova conta a pagar'} submitLabel={bill ? 'Salvar alterações' : 'Salvar conta'} onClose={onClose} onSubmit={submit}>
      {bill?.paid && <Muted style={{ marginBottom: spacing.md }}>Esta conta já foi paga: a saída no caixa será atualizada junto.</Muted>}
      <TextField label="Descrição" value={description} onChangeText={setDescription} error={errors.description} placeholder="Ex.: Aluguel do escritório" />
      <MoneyField label="Valor" value={amount} onChange={setAmount} error={errors.amount} />
      <DateField label="Vencimento" value={due} onChange={setDue} error={errors.due} />
      <CategoryPicker
        options={expenseCats}
        value={category}
        onChange={setCategory}
        onCreate={(name) => {
          addCategory({ name, type: 'out' });
          setCategory(name);
        }}
      />
      <TextField label="Fornecedor (opcional)" value={supplier} onChangeText={setSupplier} placeholder="Quem você vai pagar" />
      <Segmented
        label="Repetir"
        value={recurrence}
        onChange={setRecurrence}
        options={[
          { value: 'none', label: 'Não repete' },
          { value: 'monthly', label: 'Todo mês' },
          { value: 'yearly', label: 'Todo ano' },
        ]}
      />
      <Segmented
        label="Avisar antes do vencimento"
        value={remind}
        onChange={setRemind}
        options={[
          { value: 0, label: 'No dia' },
          { value: 1, label: '1 dia' },
          { value: 3, label: '3 dias' },
          { value: 7, label: '7 dias' },
        ]}
      />
    </FormModal>
  );
}
