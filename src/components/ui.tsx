import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

import { colors, radius, shadow, spacing } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

/* ---------- Card ---------- */
export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }, style]} accessibilityRole="button">
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

/* ---------- Botão ---------- */
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  small,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const palette = {
    primary: { bg: colors.primary, fg: '#fff', border: colors.primary },
    secondary: { bg: colors.surface, fg: colors.primary, border: colors.border },
    danger: { bg: colors.expenseSoft, fg: colors.expense, border: colors.expenseSoft },
    ghost: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
  }[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: palette.bg, borderColor: palette.border },
        (disabled || loading) && { opacity: 0.5 },
        pressed && { opacity: 0.8 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={small ? 16 : 18} color={palette.fg} />}
          <Text style={[styles.buttonText, small && { fontSize: 13 }, { color: palette.fg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({ icon, onPress, color = colors.textMuted, label }: { icon: IconName; onPress: () => void; color?: string; label: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={8} style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }]}>
      <Ionicons name={icon} size={20} color={color} />
    </Pressable>
  );
}

/* ---------- Badge ---------- */
export type Tone = 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'primary';
const tones: Record<Tone, { bg: string; fg: string }> = {
  success: { bg: colors.incomeSoft, fg: colors.income },
  danger: { bg: colors.expenseSoft, fg: colors.expense },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  info: { bg: colors.infoSoft, fg: colors.info },
  neutral: { bg: colors.neutralSoft, fg: colors.textMuted },
  primary: { bg: colors.primarySoft, fg: colors.primaryDark },
};
export function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  return (
    <View style={[styles.badge, { backgroundColor: tones[tone].bg }]}>
      <Text style={[styles.badgeText, { color: tones[tone].fg }]}>{label}</Text>
    </View>
  );
}

/* ---------- Barra de progresso ---------- */
export function ProgressBar({ value, color = colors.primary, height = 8 }: { value: number; color?: string; height?: number }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={[styles.track, { height }]} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}>
      <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: color, borderRadius: radius.pill }} />
    </View>
  );
}

/* ---------- Chips de filtro ---------- */
export function Chips<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={styles.chips}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} accessibilityRole="button" accessibilityState={{ selected: active }} style={[styles.chip, active && styles.chipActive]}>
            <Text style={[styles.chipText, active && { color: '#fff' }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------- Cabeçalho de seção ---------- */
export function SectionHeader({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="link">
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

/* ---------- Estado vazio ---------- */
export function EmptyState({ icon, title, text }: { icon: IconName; title: string; text?: string }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={28} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {text && <Text style={styles.emptyText}>{text}</Text>}
    </View>
  );
}

/* ---------- Ícone circular (linhas de lista) ---------- */
export function IconCircle({ icon, color = colors.primary, bg = colors.primarySoft }: { icon: IconName; color?: string; bg?: string }) {
  return (
    <View style={[styles.iconCircle, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
  );
}

/* ---------- Card de indicador ---------- */
export function StatCard({ label, value, tone = 'neutral', icon }: { label: string; value: string; tone?: 'neutral' | 'income' | 'expense' | 'warning'; icon: IconName }) {
  const c = { neutral: colors.text, income: colors.income, expense: colors.expense, warning: colors.warning }[tone];
  return (
    <Card style={styles.stat}>
      <View style={styles.statHead}>
        <Ionicons name={icon} size={16} color={colors.textMuted} />
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <Text style={[styles.statValue, { color: c }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </Card>
  );
}

/* ---------- Tipografia ---------- */
export function Muted({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[{ color: colors.textMuted, fontSize: 13 }, style]}>{children}</Text>;
}

/** Linha de flex que quebra em várias colunas conforme a largura disponível. */
export function Grid({ children, gap = spacing.md }: { children: ReactNode; gap?: number }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>{children}</View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, ...shadow },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, minHeight: 48, paddingHorizontal: spacing.lg, borderRadius: radius.md, borderWidth: 1 },
  buttonSmall: { minHeight: 36, paddingHorizontal: spacing.md, borderRadius: radius.sm },
  buttonText: { fontSize: 15, fontWeight: '600' },
  iconButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  badgeText: { fontSize: 11, fontWeight: '700' },
  track: { backgroundColor: colors.neutralSoft, borderRadius: radius.pill, overflow: 'hidden' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.text },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.md },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  sectionAction: { fontSize: 13, fontWeight: '600', color: colors.primary },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg, gap: spacing.sm },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  stat: { flexGrow: 1, flexBasis: 150, gap: spacing.xs },
  statHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  statValue: { fontSize: 20, fontWeight: '800' },
});
