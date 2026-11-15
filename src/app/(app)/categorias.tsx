import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { TextField } from '@/components/Fields';
import { FormModal } from '@/components/FormModal';
import { Screen } from '@/components/Screen';
import { Card, IconButton, Muted, SectionHeader } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { categoryUsage, FALLBACK_CATEGORY } from '@/domain/companyData';
import { confirmAction } from '@/lib/confirm';
import { notify } from '@/lib/notify';
import { categoryPalette, colors, radius, spacing } from '@/theme';
import { Category } from '@/types';

/** Seletor de cor usado ao criar e ao editar um rótulo. */
function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <View style={styles.colors}>
      <Muted>Cor:</Muted>
      {categoryPalette.map((c) => (
        <Pressable key={c} onPress={() => onChange(c)} accessibilityRole="button" accessibilityLabel={`Cor ${c}`} accessibilityState={{ selected: c === value }} hitSlop={6} style={[styles.swatch, { backgroundColor: c }, c === value && styles.swatchActive]} />
      ))}
    </View>
  );
}

/** Campo para cadastrar um novo rótulo (nome + cor) dentro do bloco de entradas ou saídas. */
function AddLabel({ type, placeholder }: { type: Category['type']; placeholder: string }) {
  const { categories, addCategory } = useData();
  const [name, setName] = useState('');
  const [color, setColor] = useState(categoryPalette[0]);
  const [error, setError] = useState('');

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return setError('Digite o nome do rótulo.');
    if (categories.some((c) => c.type === type && c.name.toLowerCase() === trimmed.toLowerCase())) return setError('Esse rótulo já existe.');
    addCategory({ name: trimmed, type, color });
    setName('');
    setError('');
  }

  return (
    <View style={styles.add}>
      <View style={styles.addRow}>
        <TextInput
          value={name}
          onChangeText={(t) => {
            setName(t);
            setError('');
          }}
          onSubmitEditing={submit}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          accessibilityLabel={placeholder}
          style={[styles.input, error ? { borderColor: colors.expense } : null]}
        />
        <Pressable onPress={submit} accessibilityRole="button" accessibilityLabel="Adicionar rótulo" style={styles.addButton}>
          <Ionicons name="add" size={24} color="#fff" />
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <ColorPicker value={color} onChange={setColor} />
    </View>
  );
}

export default function CategoriesScreen() {
  const { canEdit } = useAuth();
  const { categories, bills, transactions, updateCategory, removeCategory } = useData();
  const [editing, setEditing] = useState<Category | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState(categoryPalette[0]);
  const [editError, setEditError] = useState('');

  function askRemove(c: Category) {
    const usage = categoryUsage({ bills, transactions, categories, goals: [], reminders: [] }, c);
    const detail = usage ? ` Os ${usage} lançamento(s) com este rótulo passarão para "${FALLBACK_CATEGORY[c.type]}".` : '';
    confirmAction('Excluir rótulo', `Excluir "${c.name}"?${detail}`, () => {
      const err = removeCategory(c.id);
      if (err) notify('Não foi possível excluir', err);
    });
  }

  function openEdit(c: Category) {
    setEditing(c);
    setEditName(c.name);
    setEditColor(c.color);
    setEditError('');
  }

  function submitEdit() {
    if (!editing) return;
    const err = updateCategory(editing.id, { name: editName, color: editColor });
    if (err) return setEditError(err);
    setEditing(null);
  }

  const group = (type: Category['type'], title: string, hint: string, placeholder: string) => {
    const items = categories.filter((c) => c.type === type);
    return (
      <View>
        <SectionHeader title={`${title} (${items.length})`} />
        <Muted style={{ marginTop: -spacing.sm, marginBottom: spacing.md }}>{hint}</Muted>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {canEdit && <AddLabel type={type} placeholder={placeholder} />}
          {items.map((c, i) => (
            <View key={c.id} style={[styles.row, (i > 0 || canEdit) && styles.border]}>
              <View style={[styles.dot, { backgroundColor: c.color }]} />
              <Text style={styles.name}>{c.name}</Text>
              {canEdit && <IconButton icon="create-outline" label={`Editar ${c.name}`} onPress={() => openEdit(c)} />}
              {canEdit && <IconButton icon="trash-outline" label={`Excluir ${c.name}`} onPress={() => askRemove(c)} />}
            </View>
          ))}
        </Card>
      </View>
    );
  };

  return (
    <Screen title="Categorias" subtitle="Rótulos para organizar contas, entradas e saídas" back>
      <View style={styles.cols}>
        <View style={styles.col}>{group('out', 'Contas a pagar / saídas', 'Rótulos usados ao cadastrar contas a pagar e saídas.', 'Novo rótulo de conta a pagar')}</View>
        <View style={styles.col}>{group('in', 'Entradas / receitas', 'Rótulos usados ao registrar entradas de dinheiro.', 'Novo rótulo de entrada')}</View>
      </View>

      <FormModal visible={!!editing} title="Editar rótulo" submitLabel="Salvar alterações" onClose={() => setEditing(null)} onSubmit={submitEdit}>
        <TextField
          label="Nome"
          value={editName}
          onChangeText={(t) => {
            setEditName(t);
            setEditError('');
          }}
          error={editError}
          hint="Contas e movimentações com este rótulo passam a usar o novo nome."
        />
        <ColorPicker value={editColor} onChange={setEditColor} />
      </FormModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cols: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.lg },
  col: { flexGrow: 1, flexBasis: 320 },
  add: { padding: spacing.md, gap: spacing.sm, backgroundColor: colors.neutralSoft },
  addRow: { flexDirection: 'row', gap: spacing.sm },
  input: { flex: 1, minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, fontSize: 15, color: colors.text, backgroundColor: colors.surface },
  addButton: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  error: { fontSize: 12, fontWeight: '600', color: colors.expense },
  colors: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  swatch: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: 'transparent' },
  swatchActive: { borderColor: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 6, paddingLeft: spacing.lg, paddingRight: spacing.sm, minHeight: 52 },
  border: { borderTopWidth: 1, borderTopColor: colors.border },
  dot: { width: 12, height: 12, borderRadius: 6 },
  name: { flex: 1, fontSize: 15, color: colors.text, fontWeight: '500' },
});
