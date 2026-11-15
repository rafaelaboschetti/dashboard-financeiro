import { StyleSheet, Text, View } from 'react-native';

import { Badge, Button, Card, IconButton, IconCircle, Muted, Tone } from '@/components/ui';
import { BillStatus, billStatus } from '@/lib/finance';
import { dueText, formatMoney, isoToBR } from '@/lib/format';
import { colors, spacing } from '@/theme';
import { Bill } from '@/types';

const statusUI: Record<BillStatus, { label?: string; tone: Tone }> = {
  paid: { label: 'Paga', tone: 'success' },
  overdue: { tone: 'danger' },
  today: { tone: 'warning' },
  soon: { tone: 'warning' },
  later: { tone: 'neutral' },
};

interface BillCardProps {
  bill: Bill;
  today: string;
  /** Sem `actions`, o cartão é só de leitura (perfil Leitura). */
  actions?: { onTogglePaid: () => void; onEdit: () => void; onRemove: () => void };
}

/** Cartão de uma conta a pagar: descrição, valor, situação e ações. */
export function BillCard({ bill: b, today, actions }: BillCardProps) {
  const st = billStatus(b, today);
  const ui = statusUI[st];
  const overdue = st === 'overdue';
  return (
    <Card style={{ gap: spacing.md }}>
      <View style={styles.top}>
        <IconCircle
          icon={b.paid ? 'checkmark-done-outline' : 'receipt-outline'}
          bg={b.paid ? colors.incomeSoft : overdue ? colors.expenseSoft : colors.primarySoft}
          color={b.paid ? colors.income : overdue ? colors.expense : colors.primary}
        />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.title, b.paid && { textDecorationLine: 'line-through', color: colors.textMuted }]} numberOfLines={2}>
            {b.description}
          </Text>
          <Muted>
            {b.category}
            {b.supplier ? ` · ${b.supplier}` : ''}
            {b.recurrence !== 'none' ? ` · ${b.recurrence === 'monthly' ? 'Mensal' : 'Anual'}` : ''}
          </Muted>
        </View>
        <Text style={styles.amount}>{formatMoney(b.amount)}</Text>
      </View>
      <View style={styles.bottom}>
        <View style={{ gap: 4 }}>
          <Badge label={ui.label ?? dueText(b.dueDate, today)} tone={ui.tone} />
          <Muted>{b.paid && b.paidAt ? `Paga em ${isoToBR(b.paidAt)}` : `Vencimento: ${isoToBR(b.dueDate)}`}</Muted>
        </View>
        {actions && (
          <View style={styles.actions}>
            <Button small variant={b.paid ? 'secondary' : 'primary'} icon={b.paid ? 'arrow-undo-outline' : 'checkmark'} label={b.paid ? 'Desfazer' : 'Marcar como paga'} onPress={actions.onTogglePaid} />
            <IconButton icon="create-outline" label="Editar conta" onPress={actions.onEdit} />
            <IconButton icon="trash-outline" label="Excluir conta" color={colors.expense} onPress={actions.onRemove} />
          </View>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  amount: { fontSize: 16, fontWeight: '800', color: colors.text },
  bottom: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
