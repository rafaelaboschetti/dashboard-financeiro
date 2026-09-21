import { useWindowDimensions } from 'react-native';

import { breakpoints } from '@/theme';

/** Tamanho da tela: celular (<600), tablet (>=600) ou largo/desktop (>=900, usa menu lateral). */
export function useLayout() {
  const { width, height } = useWindowDimensions();
  return { width, height, isTablet: width >= breakpoints.tablet, isWide: width >= breakpoints.wide };
}
