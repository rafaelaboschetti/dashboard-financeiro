import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DateField, Segmented, TextField } from '@/components/Fields';
import { FormModal } from '@/components/FormModal';
import { Screen } from '@/components/Screen';
import { Badge, Card, Chips, EmptyState, IconButton, Muted, SectionHeader, Tone } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { confirmAction } from '@/lib/confirm';
import { brToISO, isoToBR, todayISO } from '@/lib/format';
import { useNewParam } from '@/lib/useNewParam';
import { colors, spacing } from '@/theme';
import { Priority, Reminder } from '@/types';

type Filter = 'pendentes' | 'concluidos';

const priorityUI: Record<Priority, { label: string; tone: Tone }> = {
  alta: { label: 'Alta', tone: 'danger' },
  media: { label: 'Média', tone: 'warning' },
  baixa: { label: 'Baixa', tone: 'neutral' },
};

export default function RemindersScreen() {
  const { canEdit } = useAuth();
  const { reminders, addReminder, toggleReminder, removeReminder } = useData();
  const [filter, setFilter] = useState<Filter>('pendentes');
  const [open, setOpen] = useState(false);
  const today = todayISO();

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState('');
  const [priority, setPriority] = useState<Priority>('media');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function openForm() {
    setTitle('');
    setNotes('');
    setDate(isoToBR(today));
    setPriority('media');
    setErrors({});
    setOpen(true);
  }
  useNewParam(() => canEdit && openForm());

  function submit() {
    const e: Record<string, string> = {};
    const iso = brToISO(date);
    if (!title.trim()) e.title = 'Escreva o lembrete.';
    if (!iso) e.date = 'Data inválida.';
    setErrors(e);
    if (Object.keys(e).length || !iso) return;
    addReminder({ title: title.trim(), notes: notes.trim() || undefined, date: iso, priority });
    setOpen(false);
    setFilter('pendentes');
  }

  const sorted = [...reminders].sort((a, b) => a.date.localeCompare(b.date));
  const groups =
    filter === 'concluidos'
      ? [{ title: 'Concluídos', items: sorted.filter((r) => r.done).reverse() }]
      : [
          { title: 'Atrasados', items: sorted.filter((r) => !r.done && r.date < today) },
          { title: 'Hoje', items: sorted.filter((r) => !r.done && r.date === today) },
          { title: 'Próximos', items: sorted.filter((r) => !r.done && r.date > today) },
        ];
  const total = groups.reduce((s, g) => s + g.items.length, 0);

  function renderItem(r: Reminder, i: number) {
    const p = priorityUI[r.priority];
    return (
      <View key={r.id} style={[styles.row, i > 0 && styles.border]}>
        <Pressable onPress={() => canEdit && toggleReminder(r.id)} accessibilityRole="checkbox" accessibilityState={{ checked: r.done }} accessibilityLabel={r.title} hitSlop={8}>
          <Ionicons name={r.done ? 'checkmark-circle' : 'ellipse-outline'} size={28} color={r.done ? colors.income : colors.textMuted} />
        </Pressable>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[styles.title, r.done && { textDecorationLine: 'line-through', color: colors.textMuted }]}>{r.title}</Text>
          {r.notes ? <Muted>{r.notes}</Muted> : null}
          <View style={styles.meta}>
            <Muted>{isoToBR(r.date)}</Muted>
            {!r.done && <Badge label={p.label} tone={p.tone} />}
          </View>
        </View>
        {canEdit && <IconButton icon="trash-outline" label="Excluir lembrete" onPress={() => confirmAction('Excluir lembrete', `Excluir "${r.title}"?`, () => removeReminder(r.id))} />}
      </View>
    );
  }

  return (
    <Screen title="Lembretes" subtitle="Compromissos e avisos gerais da empresa" back fab={canEdit ? { label: 'Novo lembrete', onPress: openForm } : undefined}>
      <View style={{ marginBottom: spacing.sm }}>
        <Chips
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'pendentes', label: 'Pendentes' },
            { value: 'concluidos', label: 'Concluídos' },
          ]}
        />
      </View>

      {total === 0 ? (
        <Card style={{ marginTop: spacing.lg }}>
          <EmptyState icon="notifications-off-outline" title="Nenhum lembrete" text={filter === 'pendentes' ? 'Você está em dia com os lembretes.' : 'Nada concluído ainda.'} />
        </Card>
      ) : (
        groups
          .filter((g) => g.items.length)
          .map((g) => (
            <View key={g.title}>
              <SectionHeader title={`${g.title} (${g.items.length})`} />
              <Card style={{ padding: 0 }}>{g.items.map(renderItem)}</Card>
            </View>
          ))
      )}

      <FormModal visible={open} title="Novo lembrete" submitLabel="Salvar lembrete" onClose={() => setOpen(false)} onSubmit={submit}>
        <TextField label="O que precisa lembrar?" value={title} onChangeText={setTitle} error={errors.title} placeholder="Ex.: Reunião com o contador" />
        <TextField label="Observações (opcional)" value={notes} onChangeText={setNotes} placeholder="Detalhes, local, contatos..." multiline style={{ minHeight: 80, paddingTop: 12, textAlignVertical: 'top' }} />
        <DateField label="Data" value={date} onChange={setDate} error={errors.date} />
        <Segmented
          label="Prioridade"
          value={priority}
          onChange={setPriority}
          options={[
            { value: 'baixa', label: 'Baixa' },
            { value: 'media', label: 'Média' },
            { value: 'alta', label: 'Alta' },
          ]}
        />
      </FormModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  border: { borderTopWidth: 1, borderTopColor: colors.border },
  title: { fontSize: 15, fontWeight: '600', color: colors.text },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
