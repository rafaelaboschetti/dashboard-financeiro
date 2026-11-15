import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DateField, MoneyField, TextField } from '@/components/Fields';
import { FormModal } from '@/components/FormModal';
import { Screen } from '@/components/Screen';
import { Badge, Button, Card, EmptyState, IconButton, Muted, ProgressBar } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { confirmAction } from '@/lib/confirm';
import { addMonths, brToISO, daysBetween, formatMoney, isoToBR, todayISO } from '@/lib/format';
import { useNewParam } from '@/lib/useNewParam';
import { colors, spacing } from '@/theme';
import { Goal } from '@/types';

export default function GoalsScreen() {
  const { canEdit } = useAuth();
  const { goals, addGoal, updateGoal, contributeToGoal, removeGoal } = useData();
  const today = todayISO();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState(0);
  const [current, setCurrent] = useState(0);
  const [deadline, setDeadline] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [contribGoal, setContribGoal] = useState<Goal | null>(null);
  const [contrib, setContrib] = useState(0);

  /** Abre o formulário vazio (nova meta) ou preenchido com a meta a editar. */
  function openForm(goal?: Goal) {
    setEditing(goal ?? null);
    setTitle(goal?.title ?? '');
    setTarget(goal?.target ?? 0);
    setCurrent(goal?.current ?? 0);
    setDeadline(isoToBR(goal?.deadline ?? addMonths(today, 6)));
    setErrors({});
    setOpen(true);
  }
  useNewParam(() => canEdit && openForm());

  function submit() {
    const e: Record<string, string> = {};
    const iso = brToISO(deadline);
    if (!title.trim()) e.title = 'Dê um nome para a meta.';
    if (target <= 0) e.target = 'Informe o valor da meta.';
    if (!iso) e.deadline = 'Data inválida.';
    setErrors(e);
    if (Object.keys(e).length || !iso) return;
    const values = { title: title.trim(), target, current, deadline: iso };
    if (editing) updateGoal(editing.id, values);
    else addGoal(values);
    setOpen(false);
  }

  function submitContribution() {
    if (contribGoal && contrib > 0) contributeToGoal(contribGoal.id, contrib);
    setContribGoal(null);
  }

  return (
    <Screen title="Metas" subtitle="Objetivos financeiros da empresa" fab={canEdit ? { label: 'Nova meta', onPress: () => openForm() } : undefined}>
      {goals.length === 0 ? (
        <Card>
          <EmptyState icon="flag-outline" title="Nenhuma meta cadastrada" text={canEdit ? 'Crie uma meta como "Reserva de emergência" ou "Faturamento do mês".' : undefined} />
        </Card>
      ) : (
        <View style={styles.grid}>
          {goals.map((g) => {
            const pct = g.target ? g.current / g.target : 0;
            const done = pct >= 1;
            const daysLeft = daysBetween(today, g.deadline);
            const monthsLeft = Math.max(1, Math.ceil(daysLeft / 30));
            const perMonth = Math.ceil(Math.max(0, g.target - g.current) / monthsLeft);
            const late = !done && daysLeft < 0;
            return (
              <Card key={g.id} style={styles.card}>
                <View style={styles.between}>
                  <Text style={styles.title} numberOfLines={2}>
                    {g.title}
                  </Text>
                  {done ? <Badge label="Concluída" tone="success" /> : late ? <Badge label="Prazo vencido" tone="danger" /> : <Badge label={`${daysLeft} dias`} tone="info" />}
                </View>

                <View style={{ gap: 6 }}>
                  <View style={styles.between}>
                    <Text style={styles.big}>{formatMoney(g.current)}</Text>
                    <Text style={styles.pct}>{Math.round(pct * 100)}%</Text>
                  </View>
                  <ProgressBar value={pct} height={10} color={done ? colors.income : colors.primary} />
                  <Muted>
                    Meta: {formatMoney(g.target)} · até {isoToBR(g.deadline)}
                  </Muted>
                </View>

                {!done && !late && <Muted>Para chegar lá: guardar cerca de {formatMoney(perMonth)} por mês.</Muted>}

                {canEdit && (
                  <View style={styles.actions}>
                    <Button small icon="add" label="Adicionar valor" onPress={() => { setContrib(0); setContribGoal(g); }} style={{ flex: 1 }} />
                    <IconButton icon="create-outline" label="Editar meta" onPress={() => openForm(g)} />
                    <IconButton icon="trash-outline" label="Excluir meta" color={colors.expense} onPress={() => confirmAction('Excluir meta', `Excluir "${g.title}"?`, () => removeGoal(g.id))} />
                  </View>
                )}
              </Card>
            );
          })}
        </View>
      )}

      <FormModal visible={open} title={editing ? 'Editar meta' : 'Nova meta'} submitLabel={editing ? 'Salvar alterações' : 'Criar meta'} onClose={() => setOpen(false)} onSubmit={submit}>
        <TextField label="Nome da meta" value={title} onChangeText={setTitle} error={errors.title} placeholder="Ex.: Reserva de emergência" />
        <MoneyField label="Valor a alcançar" value={target} onChange={setTarget} error={errors.target} />
        <MoneyField label={editing ? 'Quanto já tem' : 'Quanto já tem (opcional)'} value={current} onChange={setCurrent} />
        <DateField label="Prazo" value={deadline} onChange={setDeadline} error={errors.deadline} />
      </FormModal>

      <FormModal visible={!!contribGoal} title="Adicionar valor à meta" submitLabel="Adicionar" onClose={() => setContribGoal(null)} onSubmit={submitContribution}>
        <Muted style={{ marginBottom: spacing.lg }}>{contribGoal?.title}</Muted>
        <MoneyField label="Valor guardado" value={contrib} onChange={setContrib} />
      </FormModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  card: { flexGrow: 1, flexBasis: 320, gap: spacing.lg },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.text },
  big: { fontSize: 22, fontWeight: '800', color: colors.text },
  pct: { fontSize: 15, fontWeight: '800', color: colors.primary },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
