import { useState } from 'react';
import { View } from 'react-native';

import { CategoryPicker, DateField, MoneyField, Segmented, TextField } from '@/components/Fields';
import { FormModal } from '@/components/FormModal';
import { Muted } from '@/components/ui';
import { useData } from '@/context/DataContext';
import type { NewTransaction } from '@/domain/companyData';
import { brToISO, isoToBR, todayISO } from '@/lib/format';
import { spacing } from '@/theme';
import { Transaction, TransactionType } from '@/types';

interface TransactionFormProps {
  visible: boolean;
  /** Movimentação a editar; sem ela, o formulário cria uma nova. */
  transaction: Transaction | null;
  onClose: () => void;
  onSubmit: (values: NewTransaction) => void;
}

/**
 * Formulário de entrada/saída do caixa (criar e editar). Os campos começam com os dados
 * da movimentação; quem abre passa uma `key` nova a cada abertura para recomeçar.
 */
export function TransactionForm({ visible, transaction: tx, onClose, onSubmit }: TransactionFormProps) {
  const { categories, addCategory } = useData();
  const catsFor = (t: TransactionType) => categories.filter((c) => c.type === t);

  const [type, setType] = useState<TransactionType>(tx?.type ?? 'in');
  const [description, setDescription] = useState(tx?.description ?? '');
  const [amount, setAmount] = useState(tx?.amount ?? 0);
  const [date, setDate] = useState(isoToBR(tx?.date ?? todayISO()));
  const [category, setCategory] = useState(tx?.category ?? catsFor(tx?.type ?? 'in')[0]?.name ?? 'Outras receitas');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function changeType(t: TransactionType) {
    setType(t);
    setCategory(catsFor(t)[0]?.name ?? 'Outros');
  }

  function submit() {
    const e: Record<string, string> = {};
    const iso = brToISO(date);
    if (!description.trim()) e.description = 'Descreva a movimentação.';
    if (amount <= 0) e.amount = 'Informe um valor maior que zero.';
    if (!iso) e.date = 'Data inválida.';
    setErrors(e);
    if (Object.keys(e).length || !iso) return;
    onSubmit({ type, description: description.trim(), amount, date: iso, category });
  }

  return (
    <FormModal visible={visible} title={tx ? 'Editar movimentação' : 'Nova movimentação'} submitLabel={tx ? 'Salvar alterações' : 'Salvar'} onClose={onClose} onSubmit={submit}>
      {tx?.billId ? (
        <Muted>Pagamento de conta: a conta a pagar será atualizada junto.</Muted>
      ) : (
        <Segmented
          value={type}
          onChange={changeType}
          options={[
            { value: 'in', label: 'Entrada' },
            { value: 'out', label: 'Saída' },
          ]}
        />
      )}
      <View style={{ height: spacing.lg }} />
      <TextField label="Descrição" value={description} onChangeText={setDescription} error={errors.description} placeholder={type === 'in' ? 'Ex.: Venda de produtos' : 'Ex.: Compra de material'} />
      <MoneyField label="Valor" value={amount} onChange={setAmount} error={errors.amount} />
      <DateField label="Data" value={date} onChange={setDate} error={errors.date} shortcuts={false} />
      <CategoryPicker
        options={catsFor(type)}
        value={category}
        onChange={setCategory}
        onCreate={(name) => {
          addCategory({ name, type });
          setCategory(name);
        }}
      />
    </FormModal>
  );
}
