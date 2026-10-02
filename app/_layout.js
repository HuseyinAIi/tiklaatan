import React from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';
import { AppProvider } from '../src/context/AppContext';
import { colors } from '../src/theme';

export default function RootLayout() {
  const [yuklendi, hata] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold });

  if (!yuklendi && !hata) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="dark" />
        {/* Bilgisayarda (web) telefon genişliğinde ortalanmış görünüm */}
        <View style={Platform.OS === 'web' ? s.webDis : s.tam}>
          <View style={Platform.OS === 'web' ? s.webTelefon : s.tam}>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'slide_from_right' }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="dogrula" />
              <Stack.Screen name="ilan/[id]" />
              <Stack.Screen name="pozisyon" />
            </Stack>
          </View>
        </View>
      </AppProvider>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  tam: { flex: 1, backgroundColor: colors.bg },
  webDis: { flex: 1, backgroundColor: colors.page, alignItems: 'center' },
  webTelefon: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    backgroundColor: colors.bg,
    overflow: 'hidden',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.stroke,
  },
});
