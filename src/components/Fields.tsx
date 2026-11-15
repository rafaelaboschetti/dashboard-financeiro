import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { addDays, centsFromInput, formatMoney, maskDate, todayISO, isoToBR } from '@/lib/format';
import { passwordStrength } from '@/lib/validation';
import { colors, radius, spacing } from '@/theme';

export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function TextField({ label, error, hint, style, ...props }: TextInputProps & { label: string; error?: string; hint?: string }) {
  return (
    <Field label={label} error={error} hint={hint}>
      <TextInput
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={label}
        {...props}
        style={[styles.input, error ? { borderColor: colors.expense } : null, style]}
      />
    </Field>
  );
}

/** Caixa de seleção com texto (e explicação opcional embaixo). */
export function Checkbox({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <Pressable onPress={() => onChange(!checked)} accessibilityRole="checkbox" accessibilityState={{ checked }} accessibilityLabel={label} style={styles.checkbox}>
      <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={24} color={colors.primary} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.checkboxLabel}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
    </Pressable>
  );
}

/**
 * Campo de senha com botão de mostrar/ocultar. Com `showStrength`, mostra a força
 * da senha enquanto a pessoa digita (use em senhas novas, não no login).
 */
export function PasswordField({ label, error, hint, showStrength, style, ...props }: TextInputProps & { label: string; error?: string; hint?: string; showStrength?: boolean }) {
  const [visible, setVisible] = useState(false);
  const strength = passwordStrength(props.value ?? '');
  const strengthColor = [colors.border, colors.expense, colors.warning, colors.info, colors.income][strength.score];
  return (
    <Field label={label} error={error} hint={hint}>
      <View>
        <TextInput
          placeholderTextColor={colors.textMuted}
          accessibilityLabel={label}
          autoCapitalize="none"
          autoCorrect={false}
          {...props}
          secureTextEntry={!visible}
          style={[styles.input, { paddingRight: 48 }, error ? { borderColor: colors.expense } : null, style]}
        />
        <Pressable
          onPress={() => setVisible((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Ocultar senha' : 'Mostrar senha'}
          hitSlop={8}
          style={styles.eye}>
          <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textMuted} />
        </Pressable>
      </View>
      {showStrength && strength.score > 0 && (
        <View style={styles.strengthRow} accessibilityLabel={`Força da senha: ${strength.label}`}>
          <View style={styles.strengthBars}>
            {[1, 2, 3, 4].map((i) => (
              <View key={i} style={[styles.strengthBar, { backgroundColor: i <= strength.score ? strengthColor : colors.border }]} />
            ))}
          </View>
          <Text style={[styles.strengthLabel, { color: strengthColor }]}>{strength.label}</Text>
        </View>
      )}
    </Field>
  );
}

/** Campo de valor em reais: o usuário digita só números e o campo formata (R$ 1.234,56). Valor em centavos. */
export function MoneyField({ label, value, onChange, error }: { label: string; value: number; onChange: (cents: number) => void; error?: string }) {
  return (
    <TextField
      label={label}
      error={error}
      value={formatMoney(value)}
      onChangeText={(t) => onChange(centsFromInput(t))}
      keyboardType="numeric"
      inputMode="numeric"
      selectTextOnFocus
    />
  );
}

/** Campo de data DD/MM/AAAA com máscara e atalhos rápidos. `value` é o texto digitado. */
export function DateField({ label, value, onChange, error, shortcuts = true }: { label: string; value: string; onChange: (text: string) => void; error?: string; shortcuts?: boolean }) {
  const today = todayISO();
  const options = [
    { label: 'Hoje', iso: today },
    { label: '+7 dias', iso: addDays(today, 7) },
    { label: '+30 dias', iso: addDays(today, 30) },
  ];
  return (
    <Field label={label} error={error}>
      <TextInput
        value={value}
        onChangeText={(t) => onChange(maskDate(t))}
        placeholder="DD/MM/AAAA"
        placeholderTextColor={colors.textMuted}
        keyboardType="numeric"
        inputMode="numeric"
        maxLength={10}
        accessibilityLabel={label}
        style={[styles.input, error ? { borderColor: colors.expense } : null]}
      />
      {shortcuts && (
        <View style={styles.shortcuts}>
          {options.map((o) => (
            <Pressable key={o.label} onPress={() => onChange(isoToBR(o.iso))} style={styles.shortcut} accessibilityRole="button">
              <Text style={styles.shortcutText}>{o.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </Field>
  );
}

/** Seleção única em formato de segmentos (ex.: Entrada | Saída). */
export function Segmented<T extends string | number>({ label, options, value, onChange }: { label?: string; options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const control = (
    <View style={styles.segmented}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable key={String(o.value)} onPress={() => onChange(o.value)} accessibilityRole="button" accessibilityState={{ selected: active }} style={[styles.segment, active && styles.segmentActive]}>
            <Text style={[styles.segmentText, active && { color: colors.primaryDark }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
  return label ? <Field label={label}>{control}</Field> : control;
}

/**
 * Escolha de categoria (o ponto colorido mostra a cor da categoria).
 * Com `onCreate`, aparece o botão "+ Nova" para cadastrar um rótulo sem sair do formulário.
 */
export function CategoryPicker({ label = 'Categoria', options, value, onChange, onCreate }: { label?: string; options: { name: string; color: string }[]; value: string; onChange: (name: string) => void; onCreate?: (name: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');

  function create() {
    const name = newName.trim();
    if (name && onCreate) {
      const existing = options.find((o) => o.name.toLowerCase() === name.toLowerCase());
      if (existing) onChange(existing.name);
      else onCreate(name);
    }
    setNewName('');
    setAdding(false);
  }

  return (
    <Field label={label}>
      <View style={styles.pickerWrap}>
        {options.map((o) => {
          const active = o.name === value;
          return (
            <Pressable key={o.name} onPress={() => onChange(o.name)} accessibilityRole="button" accessibilityState={{ selected: active }} style={[styles.pick, active && { borderColor: colors.primary, backgroundColor: colors.primarySoft }]}>
              <View style={[styles.dot, { backgroundColor: o.color }]} />
              <Text style={styles.pickText}>{o.name}</Text>
            </Pressable>
          );
        })}
        {onCreate && !adding && (
          <Pressable onPress={() => setAdding(true)} accessibilityRole="button" accessibilityLabel="Criar nova categoria" style={[styles.pick, { borderStyle: 'dashed', borderColor: colors.primary }]}>
            <Ionicons name="add" size={16} color={colors.primary} />
            <Text style={[styles.pickText, { color: colors.primary, fontWeight: '700' }]}>Nova</Text>
          </Pressable>
        )}
      </View>
      {onCreate && adding && (
        <View style={styles.newRow}>
          <TextInput
            value={newName}
            onChangeText={setNewName}
            onSubmitEditing={create}
            placeholder="Nome do novo rótulo"
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Nome do novo rótulo"
            autoFocus
            style={[styles.input, { flex: 1 }]}
          />
          <Pressable onPress={create} accessibilityRole="button" accessibilityLabel="Adicionar rótulo" style={styles.newAdd}>
            <Ionicons name="checkmark" size={22} color="#fff" />
          </Pressable>
          <Pressable onPress={() => { setAdding(false); setNewName(''); }} accessibilityRole="button" accessibilityLabel="Cancelar" style={styles.newCancel}>
            <Ionicons name="close" size={22} color={colors.textMuted} />
          </Pressable>
        </View>
      )}
    </Field>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6, marginBottom: spacing.lg },
  label: { fontSize: 13, fontWeight: '600', color: colors.text },
  hint: { fontSize: 12, color: colors.textMuted },
  error: { fontSize: 12, color: colors.expense, fontWeight: '600' },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, fontSize: 16, color: colors.text, backgroundColor: colors.surface },
  checkbox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xl },
  checkboxLabel: { color: colors.text, fontSize: 15 },
  eye: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 48, alignItems: 'center', justifyContent: 'center' },
  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  strengthBars: { flex: 1, flexDirection: 'row', gap: 4 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: 12, fontWeight: '700', minWidth: 60, textAlign: 'right' },
  shortcuts: { flexDirection: 'row', gap: spacing.sm, marginTop: 2 },
  shortcut: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: colors.neutralSoft },
  shortcutText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  segmented: { flexDirection: 'row', backgroundColor: colors.neutralSoft, borderRadius: radius.md, padding: 3 },
  segment: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, paddingHorizontal: 6 },
  segmentActive: { backgroundColor: colors.surface },
  segmentText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  pickerWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pick: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  pickText: { fontSize: 13, color: colors.text, fontWeight: '500' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  newRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  newAdd: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  newCancel: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.neutralSoft, alignItems: 'center', justifyContent: 'center' },
});
