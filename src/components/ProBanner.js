import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { uyari } from '../uyari';
import { colors, F, radius } from '../theme';
import Cam from './Cam';

export default function ProBanner() {
  return (
    <Pressable onPress={() => uyari('Yakında', 'Tercih Rehberi PRO bir sonraki sürümde geliyor.')} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      <Cam radius={radius.lg} tint={['rgba(180,140,255,0.22)', 'rgba(90,42,140,0.05)']} style={s.kart}>
        <View style={s.ikon}>
          <Ionicons name="sparkles" size={20} color={colors.gold} />
        </View>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={s.baslik}>Tercih Rehberi PRO</Text>
          <Text style={s.alt}>Yüzlerce kadronun puan dağılımını ve rakiplerini gör.</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textSoft} />
      </Cam>
    </Pressable>
  );
}

const s = StyleSheet.create({
  kart: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  ikon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.amberSoft, alignItems: 'center', justifyContent: 'center' },
  baslik: { fontFamily: F.b, fontSize: 16, color: colors.text },
  alt: { fontFamily: F.r, fontSize: 13, color: colors.textSoft, marginTop: 3, lineHeight: 18 },
});
