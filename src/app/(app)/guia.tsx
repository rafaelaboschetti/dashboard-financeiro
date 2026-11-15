import { Ionicons } from '@expo/vector-icons';
import { Href, router } from 'expo-router';
import { ComponentProps, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { Button, Card, ProgressBar } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { markGuideSeen } from '@/db/guide';
import { firstAction, guideSteps } from '@/domain/guide';
import { colors, radius, spacing } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Guia de primeiros passos: um passo por vez, com atalho para a tela explicada. */
export default function GuideScreen() {
  const { user } = useAuth();
  const steps = useMemo(() => guideSteps({ role: user?.role ?? 'leitura', web: Platform.OS === 'web' }), [user?.role]);
  const [index, setIndex] = useState(0);
  const finished = index >= steps.length;
  const step = steps[Math.min(index, steps.length - 1)];

  // Abrir o guia já conta como visto: ele não abre sozinho de novo.
  useEffect(() => {
    if (user) markGuideSeen(user.id).catch(() => undefined);
  }, [user]);

  const go = (href: string) => router.push(href as Href);
  const leave = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (finished) {
    const action = firstAction(user?.role ?? 'leitura');
    return (
      <Screen title="Como usar o app" subtitle="Guia concluído" back>
        <Card style={styles.card}>
          <View style={[styles.icon, { backgroundColor: colors.incomeSoft }]}>
            <Ionicons name="checkmark-circle-outline" size={44} color={colors.income} />
          </View>
          <Text style={styles.title}>Pronto, você já sabe o básico!</Text>
          <Text style={styles.intro}>
            {user?.role === 'leitura'
              ? 'Acompanhe as contas, o caixa e as metas pela tela Início.'
              : 'Uma boa forma de começar é cadastrar as contas fixas do mês, como aluguel, energia e internet.'}
          </Text>
          <Text style={styles.hint}>Para rever este guia: Mais → Como usar o app.</Text>
          <View style={styles.actions}>
            <Button label={action.label} icon="arrow-forward" onPress={() => router.replace(action.href as Href)} style={{ flexGrow: 1 }} />
            <Button label="Ver o guia de novo" variant="secondary" onPress={() => setIndex(0)} style={{ flexGrow: 1 }} />
          </View>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen
      title="Como usar o app"
      subtitle={`Passo ${index + 1} de ${steps.length}`}
      back
      right={
        <Pressable onPress={leave} accessibilityRole="button" hitSlop={10}>
          <Text style={styles.skip}>Pular</Text>
        </Pressable>
      }>
      <View style={{ gap: spacing.lg }}>
        <ProgressBar value={(index + 1) / steps.length} height={6} />

        <Card style={styles.card}>
          <View style={styles.icon}>
            <Ionicons name={step.icon as IconName} size={40} color={colors.primary} />
          </View>
          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.intro}>{step.intro}</Text>
          <View style={{ gap: spacing.md, alignSelf: 'stretch' }}>
            {step.tips.map((tip, i) => (
              <View key={i} style={styles.tip}>
                <View style={styles.tipNumber}>
                  <Text style={styles.tipNumberText}>{i + 1}</Text>
                </View>
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
          {step.href && (
            <Button label="Ver na tela" variant="ghost" icon="open-outline" onPress={() => go(step.href as string)} small />
          )}
        </Card>

        <View style={styles.nav}>
          <Button label="Voltar" variant="secondary" icon="chevron-back" onPress={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0} style={{ flex: 1 }} />
          <Button
            label={index === steps.length - 1 ? 'Concluir' : 'Próximo'}
            icon={index === steps.length - 1 ? 'checkmark' : 'chevron-forward'}
            onPress={() => setIndex((i) => i + 1)}
            style={{ flex: 1 }}
          />
        </View>

        <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {steps.map((s, i) => (
            <Pressable key={s.id} onPress={() => setIndex(i)} hitSlop={6}>
              <View style={[styles.dot, i === index && styles.dotActive]} />
            </Pressable>
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: spacing.lg, padding: spacing.xl },
  icon: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center' },
  intro: { fontSize: 16, color: colors.text, textAlign: 'center', lineHeight: 23 },
  hint: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  tip: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  tipNumber: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  tipNumberText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  tipText: { flex: 1, fontSize: 15, color: colors.text, lineHeight: 22 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, alignSelf: 'stretch' },
  nav: { flexDirection: 'row', gap: spacing.md },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, flexWrap: 'wrap' },
  dot: { width: 8, height: 8, borderRadius: radius.pill, backgroundColor: colors.border },
  dotActive: { width: 22, backgroundColor: colors.primary },
  skip: { color: colors.primary, fontWeight: '700', fontSize: 15, padding: spacing.sm },
});
