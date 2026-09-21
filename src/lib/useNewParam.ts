import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';

/** Abre o formulário quando a tela é aberta com `?novo=1` (atalhos "+ Nova conta" etc. do Início). */
export function useNewParam(open: () => void) {
  const { novo } = useLocalSearchParams<{ novo?: string }>();
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  });
  useEffect(() => {
    if (novo === '1') {
      openRef.current();
      router.setParams({ novo: undefined });
    }
  }, [novo]);
}
