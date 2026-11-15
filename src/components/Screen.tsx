import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ReactNode, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useData } from '@/context/DataContext';
import { useLayout } from '@/lib/useLayout';
import { colors, contentMaxWidth, radius, shadow, spacing } from '@/theme';

interface ScreenProps {
  title: string;
  subtitle?: string;
  /** Mostra seta de voltar (telas secundárias abertas a partir de "Mais"). */
  back?: boolean;
  right?: ReactNode;
  /** Botão flutuante de ação principal (ex.: "+ Nova conta"). */
  fab?: { label: string; onPress: () => void };
  children: ReactNode;
}

export function Screen({ title, subtitle, back, right, fab, children }: ScreenProps) {
  const { isTablet, isWide } = useLayout();
  const pad = isTablet ? spacing.xl : spacing.lg;
  const { ready, loadError, reload } = useData();
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={[styles.headerWrap, { paddingHorizontal: pad }]}>
        <View style={[styles.header, { maxWidth: contentMaxWidth }]}>
          {back && (
            <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/mais'))} hitSlop={8} accessibilityRole="button" accessibilityLabel="Voltar" style={styles.back}>
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </Pressable>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {right}
          {fab && isWide && (
            <Pressable onPress={fab.onPress} accessibilityRole="button" style={styles.headerButton}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.headerButtonText}>{fab.label}</Text>
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: pad, paddingTop: spacing.sm, paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} colors={[colors.primary]} />}>
        <View style={{ width: '100%', maxWidth: contentMaxWidth, alignSelf: 'center' }}>
          {loadError ? (
            <View style={styles.errorBanner} accessibilityRole="alert">
              <Ionicons name="cloud-offline-outline" size={20} color={colors.expense} />
              <Text style={styles.errorText}>{loadError}</Text>
              <Pressable onPress={refresh} accessibilityRole="button" hitSlop={8}>
                <Text style={styles.retry}>Tentar de novo</Text>
              </Pressable>
            </View>
          ) : !ready ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.loadingText}>Carregando dados da empresa…</Text>
            </View>
          ) : null}
          {children}
        </View>
      </ScrollView>

      {fab && !isWide && (
        <Pressable onPress={fab.onPress} accessibilityRole="button" accessibilityLabel={fab.label} style={styles.fab}>
          <Ionicons name="add" size={22} color="#fff" />
          <Text style={styles.fabText}>{fab.label}</Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.expenseSoft, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg },
  errorText: { flex: 1, color: colors.expense, fontWeight: '600' },
  retry: { color: colors.primary, fontWeight: '700' },
  loading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  loadingText: { color: colors.textMuted },
  root: { flex: 1, backgroundColor: colors.bg },
  headerWrap: { paddingTop: spacing.md, paddingBottom: spacing.sm },
  header: { width: '100%', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  back: { marginLeft: -6, padding: 4 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  headerButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, paddingHorizontal: 16, height: 40, borderRadius: radius.md },
  headerButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  fab: { position: 'absolute', right: spacing.lg, bottom: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, paddingHorizontal: 18, height: 52, borderRadius: radius.pill, ...shadow },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
