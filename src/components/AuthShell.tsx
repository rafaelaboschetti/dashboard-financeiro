import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLayout } from '@/lib/useLayout';
import { colors, radius, spacing } from '@/theme';

const highlights = [
  { icon: 'receipt-outline', text: 'Lembretes de contas a pagar' },
  { icon: 'swap-vertical-outline', text: 'Controle de entradas e saídas' },
  { icon: 'flag-outline', text: 'Metas com acompanhamento' },
  { icon: 'people-outline', text: 'Vários usuários por empresa' },
] as const;

/** Moldura das telas de login/cadastro: painel de marca ao lado do formulário em telas largas. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const { isWide } = useLayout();

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[styles.scroll, isWide && { flexDirection: 'row', alignItems: 'stretch' }]} keyboardShouldPersistTaps="handled">
          {isWide && (
            <View style={styles.brandPanel}>
              <Logo light />
              <Text style={styles.brandTitle}>Toda a saúde financeira da sua empresa em um só lugar.</Text>
              <View style={{ gap: spacing.lg, marginTop: spacing.xl }}>
                {highlights.map((h) => (
                  <View key={h.text} style={styles.highlight}>
                    <Ionicons name={h.icon} size={20} color={colors.primarySoft} />
                    <Text style={styles.highlightText}>{h.text}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={[styles.formPanel, isWide && { flex: 1 }]}>
            <View style={styles.formBox}>
              {!isWide && <Logo />}
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
              <View style={{ marginTop: spacing.xl }}>{children}</View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Logo({ light }: { light?: boolean }) {
  return (
    <View style={styles.logo}>
      <View style={[styles.logoMark, light && { backgroundColor: '#fff' }]}>
        <Ionicons name="stats-chart" size={20} color={light ? colors.primary : '#fff'} />
      </View>
      <Text style={[styles.logoText, light && { color: '#fff' }]}>Finanças da Empresa</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1 },
  brandPanel: { flex: 1, backgroundColor: colors.primary, padding: 56, justifyContent: 'center' },
  brandTitle: { color: '#fff', fontSize: 30, fontWeight: '800', marginTop: spacing.xxl, lineHeight: 38, maxWidth: 440 },
  highlight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  highlightText: { color: colors.primarySoft, fontSize: 16 },
  formPanel: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  formBox: { width: '100%', maxWidth: 440, paddingVertical: spacing.xl },
  logo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xl },
  logoMark: { width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 18, fontWeight: '800', color: colors.text },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 15, color: colors.textMuted, marginTop: spacing.xs },
});
