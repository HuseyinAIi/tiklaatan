import React from 'react';
import { Tabs } from 'expo-router';
import CamTabBar from '../../src/components/CamTabBar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CamTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' } }}
    >
      <Tabs.Screen name="index" options={{ title: 'İlanlar' }} />
      <Tabs.Screen name="tercih" options={{ title: 'Tercih' }} />
      <Tabs.Screen name="simulasyon" options={{ title: 'Simülasyon' }} />
      <Tabs.Screen name="gecmis" options={{ title: 'Geçmiş' }} />
      <Tabs.Screen name="profil" options={{ title: 'Profil' }} />
    </Tabs>
  );
}
