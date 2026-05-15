import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useAppTheme } from '@/lib/app-theme';

export default function TabLayout() {
  const { resolvedTheme } = useAppTheme();
  const isWeb = Platform.OS === 'web';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[resolvedTheme].tint,
        tabBarInactiveTintColor: Colors[resolvedTheme].tabIconDefault,
        tabBarStyle: [
          {
            backgroundColor: resolvedTheme === 'dark' ? '#111827' : '#FFFFFF',
            borderTopColor: resolvedTheme === 'dark' ? '#273244' : '#E5E7EB',
          },
          isWeb && {
            height: 66,
            paddingBottom: 8,
            paddingTop: 6,
          },
        ],
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Agenda',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="gearshape.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
