import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { ComponentProps } from 'react';
import { ColorValue } from 'react-native';

import { DataProvider } from '@/context/DataContext';
import { useLayout } from '@/lib/useLayout';
import { colors } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

function tabIcon(active: IconName, inactive: IconName) {
  function TabIcon({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) {
    return <Ionicons name={focused ? active : inactive} size={Math.min(size, 22)} color={color} />;
  }
  return TabIcon;
}

export default function AppLayout() {
  const { isWide } = useLayout();

  // Em telas largas o menu vira lateral e mostra todas as seções; no celular, 5 abas + "Mais".
  const extra = (title: string) => ({ title, href: isWide ? undefined : null });

  return (
    <DataProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarPosition: isWide ? 'left' : 'bottom',
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
          tabBarStyle: { backgroundColor: colors.surface, borderColor: colors.border },
          sceneStyle: { backgroundColor: colors.bg },
        }}>
        <Tabs.Screen name="index" options={{ title: 'Início', tabBarIcon: tabIcon('home', 'home-outline') }} />
        <Tabs.Screen name="contas" options={{ title: 'Contas', tabBarIcon: tabIcon('receipt', 'receipt-outline') }} />
        <Tabs.Screen name="caixa" options={{ title: 'Caixa', tabBarIcon: tabIcon('swap-vertical', 'swap-vertical-outline') }} />
        <Tabs.Screen name="metas" options={{ title: 'Metas', tabBarIcon: tabIcon('flag', 'flag-outline') }} />
        <Tabs.Screen name="lembretes" options={{ ...extra('Lembretes'), tabBarIcon: tabIcon('notifications', 'notifications-outline') }} />
        <Tabs.Screen name="relatorios" options={{ ...extra('Relatórios'), tabBarIcon: tabIcon('bar-chart', 'bar-chart-outline') }} />
        <Tabs.Screen name="categorias" options={{ ...extra('Categorias'), tabBarIcon: tabIcon('pricetags', 'pricetags-outline') }} />
        <Tabs.Screen name="equipe" options={{ ...extra('Equipe'), tabBarIcon: tabIcon('people', 'people-outline') }} />
        <Tabs.Screen name="ideias" options={{ ...extra('Roadmap'), tabBarIcon: tabIcon('bulb', 'bulb-outline') }} />
        <Tabs.Screen name="perfil" options={{ ...extra('Meu perfil'), tabBarIcon: tabIcon('person-circle', 'person-circle-outline') }} />
        <Tabs.Screen name="mais" options={{ title: 'Mais', href: isWide ? null : undefined, tabBarIcon: tabIcon('ellipsis-horizontal-circle', 'ellipsis-horizontal-circle-outline') }} />
      </Tabs>
    </DataProvider>
  );
}
