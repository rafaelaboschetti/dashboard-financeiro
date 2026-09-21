import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useLayout } from '@/lib/useLayout';
import { colors, radius, spacing } from '@/theme';
import { Button } from './ui';

interface FormModalProps {
  visible: boolean;
  title: string;
  submitLabel?: string;
  onClose: () => void;
  onSubmit: () => void;
  children: ReactNode;
}

/** Formulário em "bottom sheet" no celular e em diálogo centralizado em telas largas. */
export function FormModal({ visible, title, submitLabel = 'Salvar', onClose, onSubmit, children }: FormModalProps) {
  const { isTablet, height } = useLayout();
  return (
    <Modal visible={visible} transparent animationType={isTablet ? 'fade' : 'slide'} onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.overlay, isTablet && { justifyContent: 'center', alignItems: 'center' }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fechar" />
        <View style={[styles.sheet, isTablet ? styles.dialog : styles.bottomSheet, { maxHeight: height * 0.92 }]}>
          <View style={styles.head}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Fechar">
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
          <View style={styles.footer}>
            <Button label="Cancelar" variant="secondary" onPress={onClose} style={{ flex: 1 }} />
            <Button label={submitLabel} onPress={onSubmit} style={{ flex: 2 }} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, padding: spacing.lg },
  bottomSheet: { borderTopLeftRadius: radius.lg + 4, borderTopRightRadius: radius.lg + 4, width: '100%' },
  dialog: { borderRadius: radius.lg + 4, width: '100%', maxWidth: 520 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  footer: { flexDirection: 'row', gap: spacing.md, paddingTop: spacing.md },
});
