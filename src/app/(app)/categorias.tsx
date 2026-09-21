import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { Card, IconButton, Muted, SectionHeader } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { confirmAction } from '@/lib/confirm';
import { categoryPalette, colors, radius, spacing } from '@/theme';
import { Category } from '@/types';

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
      <View style={styles.colors}>
        <Muted>Cor:</Muted>
        {categoryPalette.map((c) => (
          <Pressable key={c} onPress={() => setColor(c)} accessibilityRole="button" accessibilityLabel={`Cor ${c}`} accessibilityState={{ selected: c === color }} hitSlop={6} style={[styles.swatch, { backgroundColor: c }, c === color && styles.swatchActive]} />
        ))}
      </View>
    </View>
  );
}

export default function CategoriesScreen() {
  const { canEdit } = useAuth();
  const { categories, removeCategory } = useData();

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
              {canEdit && <IconButton icon="trash-outline" label={`Excluir ${c.name}`} onPress={() => confirmAction('Excluir rótulo', `Excluir "${c.name}"? Lançamentos antigos continuam com este nome.`, () => removeCategory(c.id))} />}
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
