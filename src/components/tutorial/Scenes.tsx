/**
 * Réplicas das telas do app usadas no tutorial. São só ilustração: os botões não fazem
 * nada e nenhum dado é salvo. `target` diz qual parte fica destacada (pulsando),
 * que é para onde o robô Fin aponta.
 */
import { Ionicons } from '@expo/vector-icons';
import { ComponentProps, ReactNode, useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Image, StyleSheet, Switch, Text, View } from 'react-native';

import { Segmented } from '@/components/Fields';
import { Badge, Button, Card, IconButton, IconCircle, Muted, ProgressBar } from '@/components/ui';
import type { SceneId } from '@/domain/tutorial';
import { colors, radius, spacing } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];
const noop = () => undefined;

/** Contorno pulsante em volta da parte que o passo explica. */
export function Spot({ on, children, round }: { on: boolean; children: ReactNode; round?: boolean }) {
  // Criado uma vez só (useState com função), usado pela animação.
  const [pulse] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!on) return;
    let loop: Animated.CompositeAnimation | undefined;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled || reduce) return;
        loop = Animated.loop(
          Animated.sequence([
            Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
            Animated.timing(pulse, { toValue: 0, duration: 700, useNativeDriver: true }),
          ]),
        );
        loop.start();
      });
    return () => {
      cancelled = true;
      loop?.stop();
      pulse.setValue(0);
    };
  }, [on, pulse]);

  if (!on) return <View style={styles.dim}>{children}</View>;
  return (
    <View style={styles.spotWrap}>
      {children}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ring,
          round && { borderRadius: 999 },
          { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.45] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) }] },
        ]}
      />
    </View>
  );
}

/** Campo de formulário "de mentira" (só a aparência). */
function FakeField({ label, value, children }: { label: string; value?: string; children?: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      {value !== undefined && (
        <View style={styles.input}>
          <Text style={styles.inputText}>{value}</Text>
        </View>
      )}
      {children}
    </View>
  );
}

function Pill({ label, selected, dashed, icon }: { label: string; selected?: boolean; dashed?: boolean; icon?: IconName }) {
  return (
    <View style={[styles.pill, selected && styles.pillOn, dashed && styles.pillDashed]}>
      {icon && <Ionicons name={icon} size={14} color={dashed ? colors.primary : colors.text} />}
      <Text style={[styles.pillText, selected && { color: colors.primaryDark }]}>{label}</Text>
    </View>
  );
}

function Fab({ label }: { label: string }) {
  return (
    <View style={styles.fab}>
      <Ionicons name="add" size={18} color="#fff" />
      <Text style={styles.fabText}>{label}</Text>
    </View>
  );
}

function ScreenHeader({ title, fab, on }: { title: string; fab?: string; on?: boolean }) {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{title}</Text>
      {fab && (
        <Spot on={!!on}>
          <Fab label={fab} />
        </Spot>
      )}
    </View>
  );
}

function FormTitle({ title }: { title: string }) {
  return (
    <View style={styles.formTitle}>
      <Text style={styles.headerTitle}>{title}</Text>
      <Ionicons name="close" size={20} color={colors.textMuted} />
    </View>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <View style={styles.miniStat}>
      <Muted style={{ fontSize: 11 }}>{label}</Muted>
      <Text style={[styles.miniValue, tone ? { color: tone } : null]}>{value}</Text>
    </View>
  );
}

/** A réplica de cada cena, com a parte `target` destacada. */
export function Scene({ scene, target }: { scene: SceneId; target?: string }) {
  const on = (name: string) => target === name;

  switch (scene) {
    case 'hello':
    case 'done':
      return (
        <View style={styles.hello}>
          <Image source={require('../../../assets/icon.png')} style={styles.appIcon} accessibilityIgnoresInvertColors />
          <Text style={styles.helloTitle}>Finanças da Empresa</Text>
          <Muted style={{ textAlign: 'center' }}>{scene === 'hello' ? 'Contas, caixa, metas e lembretes num só lugar.' : 'Você concluiu o tutorial!'}</Muted>
          {scene === 'done' && <Ionicons name="checkmark-circle" size={40} color={colors.income} />}
        </View>
      );

    case 'dashboard':
      return (
        <View style={{ gap: spacing.md }}>
          <Spot on={on('alerta')}>
            <View style={styles.alert}>
              <Ionicons name="alert-circle" size={18} color={colors.expense} />
              <Text style={styles.alertText}>1 conta vencida · R$ 230,00</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.expense} />
            </View>
          </Spot>
          <Spot on={on('saldo')}>
            <View style={styles.hero}>
              <Text style={styles.heroLabel}>Saldo em caixa</Text>
              <Text style={styles.heroValue}>R$ 4.320,00</Text>
              <View style={{ flexDirection: 'row', gap: spacing.lg }}>
                <Text style={styles.heroSmall}>↓ Entradas R$ 6.100,00</Text>
                <Text style={styles.heroSmall}>↑ Saídas R$ 1.780,00</Text>
              </View>
            </View>
          </Spot>
          <Spot on={on('atalhos')}>
            <View style={styles.quick}>
              {(
                [
                  ['receipt-outline', 'Nova conta'],
                  ['swap-vertical-outline', 'Movimentação'],
                  ['flag-outline', 'Nova meta'],
                  ['notifications-outline', 'Lembrete'],
                ] as [IconName, string][]
              ).map(([icon, label]) => (
                <View key={label} style={styles.quickItem}>
                  <IconCircle icon={icon} />
                  <Text style={styles.quickLabel}>{label}</Text>
                </View>
              ))}
            </View>
          </Spot>
        </View>
      );

    case 'bills-screen':
      return (
        <View style={{ gap: spacing.md }}>
          <ScreenHeader title="Contas a pagar" fab="Nova conta" on={on('fab')} />
          <View style={styles.row}>
            <MiniStat label="A pagar no mês" value="R$ 2.180,00" tone={colors.warning} />
            <MiniStat label="Vencidas" value="R$ 230,00" tone={colors.expense} />
            <MiniStat label="Pagas no mês" value="R$ 900,00" tone={colors.income} />
          </View>
          <Spot on={on('filtros')}>
            <View style={styles.row}>
              <Pill label="Pendentes" selected />
              <Pill label="Vencidas" />
              <Pill label="Pagas" />
              <Pill label="Todas" />
            </View>
          </Spot>
        </View>
      );

    case 'bill-form':
      return (
        <View style={{ gap: spacing.md }}>
          <FormTitle title="Nova conta a pagar" />
          {on('descricao') && (
            <Spot on>
              <View style={{ gap: spacing.md }}>
                <FakeField label="Descrição" value="Aluguel do escritório" />
                <FakeField label="Valor" value="R$ 1.500,00" />
              </View>
            </Spot>
          )}
          {on('vencimento') && (
            <Spot on>
              <FakeField label="Vencimento" value="20/11/2026">
                <View style={styles.row}>
                  <Pill label="Hoje" />
                  <Pill label="+7 dias" />
                  <Pill label="+30 dias" />
                </View>
              </FakeField>
            </Spot>
          )}
          {on('categoria') && (
            <Spot on>
              <FakeField label="Categoria">
                <View style={styles.row}>
                  <Pill label="Aluguel" selected />
                  <Pill label="Energia e água" />
                  <Pill label="Impostos" />
                  <Pill label="Nova" dashed icon="add" />
                </View>
              </FakeField>
            </Spot>
          )}
          {on('repetir') && (
            <Spot on>
              <Segmented label="Repetir" value="monthly" onChange={noop} options={[{ value: 'none', label: 'Não repete' }, { value: 'monthly', label: 'Todo mês' }, { value: 'yearly', label: 'Todo ano' }]} />
            </Spot>
          )}
          {on('avisar') && (
            <Spot on>
              <Segmented label="Avisar antes do vencimento" value={3} onChange={noop} options={[{ value: 0, label: 'No dia' }, { value: 1, label: '1 dia' }, { value: 3, label: '3 dias' }, { value: 7, label: '7 dias' }]} />
            </Spot>
          )}
          {on('salvar') && (
            <View style={styles.row}>
              <Button label="Cancelar" variant="secondary" onPress={noop} style={{ flex: 1 }} />
              <View style={{ flex: 2 }}>
                <Spot on>
                  <Button label="Salvar conta" onPress={noop} />
                </Spot>
              </View>
            </View>
          )}
          <Muted style={{ fontSize: 12 }}>O formulário tem também: valor, vencimento, categoria, fornecedor, repetir e avisar antes.</Muted>
        </View>
      );

    case 'bill-card': {
      const paid = target === 'desfazer';
      return (
        <Card style={{ gap: spacing.md }}>
          <View style={styles.cardTop}>
            <IconCircle icon={paid ? 'checkmark-done-outline' : 'receipt-outline'} bg={paid ? colors.incomeSoft : colors.primarySoft} color={paid ? colors.income : colors.primary} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.cardTitle, paid && { textDecorationLine: 'line-through', color: colors.textMuted }]}>Aluguel do escritório</Text>
              <Muted>Aluguel · Imobiliária · Mensal</Muted>
            </View>
            <Text style={styles.cardAmount}>R$ 1.500,00</Text>
          </View>
          <View style={styles.cardBottom}>
            <View style={{ gap: 4 }}>
              <Spot on={on('status')}>
                <Badge label={paid ? 'Paga' : 'Vence em 5 dias'} tone={paid ? 'success' : 'warning'} />
              </Spot>
              <Muted>{paid ? 'Paga em 18/11/2026' : 'Vencimento: 20/11/2026'}</Muted>
            </View>
            <View style={styles.actions}>
              <Spot on={on('pagar') || on('desfazer')}>
                <Button small variant={paid ? 'secondary' : 'primary'} icon={paid ? 'arrow-undo-outline' : 'checkmark'} label={paid ? 'Desfazer' : 'Marcar como paga'} onPress={noop} />
              </Spot>
              <Spot on={on('editar')} round>
                <IconButton icon="create-outline" label="Editar conta (exemplo)" onPress={noop} />
              </Spot>
              <Spot on={on('excluir')} round>
                <IconButton icon="trash-outline" label="Excluir conta (exemplo)" color={colors.expense} onPress={noop} />
              </Spot>
            </View>
          </View>
        </Card>
      );
    }

    case 'confirm-delete':
      return (
        <View style={styles.dialog}>
          <Text style={styles.headerTitle}>Excluir conta</Text>
          <Text style={styles.body}>Excluir &quot;Aluguel do escritório&quot;? A saída no caixa também será excluída.</Text>
          <View style={[styles.row, { justifyContent: 'flex-end' }]}>
            <Button small label="Cancelar" variant="ghost" onPress={noop} />
            <Spot on={on('confirmar')}>
              <Button small label="Excluir" variant="danger" onPress={noop} />
            </Spot>
          </View>
        </View>
      );

    case 'cash':
      return (
        <View style={{ gap: spacing.md }}>
          <ScreenHeader title="Fluxo de caixa" fab="Nova movimentação" on={on('fab')} />
          <Spot on={on('mes')}>
            <View style={styles.monthNav}>
              <Ionicons name="chevron-back" size={20} color={colors.text} />
              <Text style={styles.cardTitle}>Novembro de 2026</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.text} />
            </View>
          </Spot>
          <Card style={{ padding: 0 }}>
            <View style={styles.listRow}>
              <IconCircle icon="arrow-down" bg={colors.incomeSoft} color={colors.income} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.cardTitle}>Vendas do dia</Text>
                <Muted>Vendas · 15/11/2026</Muted>
              </View>
              <Text style={[styles.cardAmount, { color: colors.income, fontSize: 14 }]}>+ R$ 850,00</Text>
              <Spot on={on('acoes')}>
                <View style={{ flexDirection: 'row' }}>
                  <IconButton icon="create-outline" label="Editar (exemplo)" onPress={noop} />
                  <IconButton icon="trash-outline" label="Excluir (exemplo)" onPress={noop} />
                </View>
              </Spot>
            </View>
          </Card>
        </View>
      );

    case 'cash-form':
      return (
        <View style={{ gap: spacing.md }}>
          <FormTitle title="Nova movimentação" />
          <Spot on={on('tipo')}>
            <Segmented value="in" onChange={noop} options={[{ value: 'in', label: 'Entrada' }, { value: 'out', label: 'Saída' }]} />
          </Spot>
          <FakeField label="Descrição" value="Venda de produtos" />
          <FakeField label="Valor" value="R$ 850,00" />
        </View>
      );

    case 'goal':
      return (
        <View style={{ gap: spacing.md }}>
          <ScreenHeader title="Metas" fab="Nova meta" on={on('fab')} />
          <Card style={{ gap: spacing.md }}>
            <View style={styles.cardTop}>
              <Text style={[styles.cardTitle, { flex: 1 }]}>Reserva de emergência</Text>
              <Badge label="180 dias" tone="info" />
            </View>
            <Text style={styles.cardAmount}>R$ 3.000,00 <Muted>de R$ 10.000,00 · 30%</Muted></Text>
            <ProgressBar value={0.3} height={10} />
            <Muted>Para chegar lá: guardar cerca de R$ 1.170,00 por mês.</Muted>
            <View style={styles.actions}>
              <View style={{ flex: 1 }}>
                <Spot on={on('adicionar')}>
                  <Button small icon="add" label="Adicionar valor" onPress={noop} />
                </Spot>
              </View>
              <Spot on={on('acoes')}>
                <View style={{ flexDirection: 'row' }}>
                  <IconButton icon="create-outline" label="Editar meta (exemplo)" onPress={noop} />
                  <IconButton icon="trash-outline" label="Excluir meta (exemplo)" color={colors.expense} onPress={noop} />
                </View>
              </Spot>
            </View>
          </Card>
        </View>
      );

    case 'reminder':
      return (
        <View style={{ gap: spacing.md }}>
          <ScreenHeader title="Lembretes" fab="Novo lembrete" on={on('fab')} />
          <Card style={{ padding: 0 }}>
            <View style={styles.listRow}>
              <Spot on={on('concluir')} round>
                <Ionicons name="ellipse-outline" size={28} color={colors.textMuted} />
              </Spot>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.cardTitle}>Reunião com o contador</Text>
                <View style={styles.row}>
                  <Muted>20/11/2026</Muted>
                  <Badge label="Alta" tone="danger" />
                </View>
              </View>
              <Spot on={on('acoes')}>
                <View style={{ flexDirection: 'row' }}>
                  <IconButton icon="create-outline" label="Editar lembrete (exemplo)" onPress={noop} />
                  <IconButton icon="trash-outline" label="Excluir lembrete (exemplo)" onPress={noop} />
                </View>
              </Spot>
            </View>
          </Card>
        </View>
      );

    case 'reports':
      return (
        <View style={{ gap: spacing.md }}>
          <Spot on={on('resumo')}>
            <View style={styles.row}>
              <MiniStat label="Entradas" value="R$ 6.100,00" tone={colors.income} />
              <MiniStat label="Saídas" value="R$ 1.780,00" tone={colors.expense} />
              <MiniStat label="Resultado" value="R$ 4.320,00" tone={colors.income} />
            </View>
          </Spot>
          <Card style={{ gap: spacing.sm }}>
            <Text style={styles.cardTitle}>Exportar para Excel (CSV)</Text>
            <Spot on={on('exportar')}>
              <View style={{ gap: spacing.sm }}>
                <Button small variant="secondary" icon="download-outline" label="Movimentações de novembro de 2026" onPress={noop} />
                <Button small variant="secondary" icon="download-outline" label="Contas a pagar" onPress={noop} />
              </View>
            </Spot>
          </Card>
        </View>
      );

    case 'alerts':
      return (
        <Card style={{ gap: spacing.sm }}>
          <View style={styles.cardTop}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.cardTitle}>Avisos de contas e lembretes</Text>
              <Muted>Receba um aviso no celular antes do vencimento de cada conta e no dia de cada lembrete.</Muted>
            </View>
            <Spot on={on('switch')} round>
              <Switch value onValueChange={noop} trackColor={{ true: colors.primary, false: colors.border }} accessibilityLabel="Avisos (exemplo)" />
            </Spot>
          </View>
        </Card>
      );

    case 'team':
      return (
        <View style={{ gap: spacing.md }}>
          <ScreenHeader title="Equipe" fab="Adicionar usuário" on={on('adicionar')} />
          <Card style={{ padding: 0 }}>
            <View style={styles.listRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>J</Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.cardTitle}>João</Text>
                <Muted>joao@empresa.com</Muted>
              </View>
              <Badge label="Financeiro" tone="info" />
              <Spot on={on('acoes')}>
                <View style={{ flexDirection: 'row' }}>
                  <IconButton icon="create-outline" label="Mudar perfil (exemplo)" onPress={noop} />
                  <IconButton icon="person-remove-outline" label="Remover (exemplo)" color={colors.expense} onPress={noop} />
                </View>
              </Spot>
            </View>
          </Card>
        </View>
      );

    case 'login':
      return (
        <View style={{ gap: spacing.md }}>
          <FormTitle title="Entrar" />
          <FakeField label="E-mail" value="voce@empresa.com" />
          <FakeField label="Senha" value="••••••••" />
          <Spot on={on('manter')}>
            <View style={styles.checkbox}>
              <Ionicons name="checkbox" size={24} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Manter conectado</Text>
                <Muted>Você continua conectado por 30 dias, mesmo fechando o app.</Muted>
              </View>
            </View>
          </Spot>
        </View>
      );

    case 'profile':
      return (
        <View style={{ gap: spacing.sm }}>
          <Button label="Alterar meu nome" variant="secondary" icon="create-outline" onPress={noop} />
          <Spot on={on('senha')}>
            <Button label="Trocar senha" variant="secondary" icon="key-outline" onPress={noop} />
          </Spot>
          <Spot on={on('sair')}>
            <Button label="Sair da conta" variant="danger" icon="log-out-outline" onPress={noop} />
          </Spot>
        </View>
      );
  }
}

const styles = StyleSheet.create({
  spotWrap: { position: 'relative' },
  ring: { position: 'absolute', top: -6, left: -6, right: -6, bottom: -6, borderWidth: 3, borderColor: colors.warning, borderRadius: radius.md + 4, backgroundColor: 'rgba(217,119,6,0.06)' },
  dim: { opacity: 0.55 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, flexWrap: 'wrap' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  formTitle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fab: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.pill },
  fabText: { color: '#fff', fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', color: colors.text },
  input: { minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, justifyContent: 'center', backgroundColor: colors.surface },
  inputText: { fontSize: 15, color: colors.text },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  pillOn: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  pillDashed: { borderStyle: 'dashed', borderColor: colors.primary },
  pillText: { fontSize: 13, fontWeight: '600', color: colors.text },
  miniStat: { flexGrow: 1, flexBasis: 90, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.sm, gap: 2 },
  miniValue: { fontSize: 14, fontWeight: '800', color: colors.text },
  alert: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.expenseSoft, padding: spacing.md, borderRadius: radius.md },
  alertText: { flex: 1, color: colors.expense, fontWeight: '700' },
  hero: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.lg, gap: 4 },
  heroLabel: { color: colors.primarySoft, fontWeight: '600' },
  heroValue: { color: '#fff', fontSize: 26, fontWeight: '800' },
  heroSmall: { color: colors.primarySoft, fontSize: 12, fontWeight: '600' },
  quick: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  quickItem: { flex: 1, alignItems: 'center', gap: 6 },
  quickLabel: { fontSize: 11, fontWeight: '600', color: colors.text, textAlign: 'center' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  cardAmount: { fontSize: 16, fontWeight: '800', color: colors.text },
  cardBottom: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dialog: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, borderWidth: 1, borderColor: colors.border },
  body: { fontSize: 15, color: colors.text, lineHeight: 21 },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.sm },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primaryDark, fontWeight: '800' },
  checkbox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  hello: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  appIcon: { width: 72, height: 72, borderRadius: 18 },
  helloTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
});
