import { Ionicons } from '@expo/vector-icons';
import { Href, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { Scene } from '@/components/tutorial/Scenes';
import { Button, ProgressBar } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { markGuideSeen } from '@/db/guide';
import { chaptersOf, firstAction, tutorialSteps } from '@/domain/tutorial';
import { colors, radius, spacing } from '@/theme';

const robot = require('../../../assets/robo-fin.png');

/**
 * Tutorial ilustrado: o robô Fin aponta, em réplicas das telas, onde tocar para
 * adicionar, editar, pagar e excluir contas, movimentações, metas e lembretes.
 */
export default function TutorialScreen() {
  const { user } = useAuth();
  const role = user?.role ?? 'leitura';
  const steps = useMemo(() => tutorialSteps({ role, web: Platform.OS === 'web' }), [role]);
  const chapters = useMemo(() => chaptersOf(steps), [steps]);
  const [index, setIndex] = useState(0);
  const step = steps[index];
  const last = index === steps.length - 1;

  // Abrir o tutorial já conta como visto: ele não abre sozinho de novo.
  useEffect(() => {
    if (user) markGuideSeen(user.id).catch(() => undefined);
  }, [user]);

  const leave = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const action = firstAction(role);

  return (
    <Screen
      title="Tutorial do app"
      subtitle={`Passo ${index + 1} de ${steps.length}`}
      back
      right={
        !last ? (
          <Pressable onPress={leave} accessibilityRole="button" hitSlop={10}>
            <Text style={styles.skip}>Pular</Text>
          </Pressable>
        ) : undefined
      }>
      <View style={{ gap: spacing.lg }}>
        {/* Capítulos: toque para ir direto a um assunto */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chapters}>
          {chapters.map((c) => {
            const active = c.id === step.chapter;
            return (
              <Pressable key={c.id} onPress={() => setIndex(c.first)} accessibilityRole="button" accessibilityState={{ selected: active }} style={[styles.chapter, active && styles.chapterOn]}>
                <Text style={[styles.chapterText, active && styles.chapterTextOn]}>{c.title}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <ProgressBar value={(index + 1) / steps.length} height={6} />

        {/* Réplica da tela, com a parte explicada pulsando */}
        <View style={styles.stage}>
          <View style={styles.stageTag}>
            <Ionicons name="eye-outline" size={12} color={colors.textMuted} />
            <Text style={styles.stageTagText}>Exemplo ilustrativo · não é salvo</Text>
          </View>
          <Scene scene={step.scene} target={step.target} />
        </View>

        {/* Robô Fin apontando + balão de fala */}
        <View style={styles.robotRow}>
          <Image source={robot} style={styles.robot} resizeMode="contain" accessibilityLabel="Robô Fin apontando para a parte destacada" />
          <View style={styles.bubble}>
            <View style={styles.bubbleTail} />
            <Text style={styles.title}>{step.title}</Text>
            <Text style={styles.text}>{step.text}</Text>
            {step.where && (
              <View style={styles.where}>
                <Ionicons name="navigate-outline" size={14} color={colors.primary} />
                <Text style={styles.whereText}>Onde fica: {step.where}</Text>
              </View>
            )}
          </View>
        </View>

        {last ? (
          <View style={styles.nav}>
            <Button label={action.label} icon="arrow-forward" onPress={() => router.replace(action.href as Href)} style={{ flexGrow: 1 }} />
            <Button label="Ver de novo" variant="secondary" icon="refresh" onPress={() => setIndex(0)} style={{ flexGrow: 1 }} />
          </View>
        ) : (
          <View style={styles.nav}>
            <Button label="Voltar" variant="secondary" icon="chevron-back" onPress={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0} style={{ flex: 1 }} />
            <Button label="Próximo" icon="chevron-forward" onPress={() => setIndex((i) => Math.min(steps.length - 1, i + 1))} style={{ flex: 1 }} />
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  skip: { color: colors.primary, fontWeight: '700', fontSize: 15, padding: spacing.sm },
  chapters: { gap: spacing.sm, paddingVertical: 2 },
  chapter: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chapterOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chapterText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  chapterTextOn: { color: '#fff' },
  stage: { backgroundColor: colors.bg, borderRadius: radius.lg, borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed', padding: spacing.lg, paddingTop: spacing.xl + 4, gap: spacing.md },
  stageTag: { position: 'absolute', top: 8, left: 12, flexDirection: 'row', alignItems: 'center', gap: 4 },
  stageTagText: { fontSize: 11, fontWeight: '600', color: colors.textMuted, letterSpacing: 0.3 },
  robotRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  robot: { width: 96, height: 112, marginTop: -8 },
  bubble: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 2, borderColor: colors.primary, padding: spacing.lg, gap: spacing.sm },
  bubbleTail: { position: 'absolute', left: -9, top: 28, width: 16, height: 16, backgroundColor: colors.surface, borderLeftWidth: 2, borderBottomWidth: 2, borderColor: colors.primary, transform: [{ rotate: '45deg' }] },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  text: { fontSize: 15, color: colors.text, lineHeight: 22 },
  where: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  whereText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  nav: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
});
