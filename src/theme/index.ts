import { Platform, ViewStyle } from 'react-native';

export const colors = {
  primary: '#0F766E',
  primaryDark: '#115E59',
  primarySoft: '#CCFBF1',
  bg: '#F3F6F9',
  surface: '#FFFFFF',
  text: '#0F172A',
  textMuted: '#64748B',
  border: '#E2E8F0',
  income: '#16A34A',
  incomeSoft: '#DCFCE7',
  expense: '#DC2626',
  expenseSoft: '#FEE2E2',
  warning: '#D97706',
  warningSoft: '#FEF3C7',
  info: '#2563EB',
  infoSoft: '#DBEAFE',
  neutralSoft: '#F1F5F9',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };

export const breakpoints = { tablet: 600, wide: 900 };
export const contentMaxWidth = 1100;

export const shadow: ViewStyle = Platform.select<ViewStyle>({
  web: { boxShadow: '0 1px 3px rgba(15,23,42,0.08)' } as ViewStyle,
  default: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
})!;

export const categoryPalette = ['#0F766E', '#2563EB', '#7C3AED', '#DB2777', '#D97706', '#DC2626', '#0891B2', '#65A30D'];
