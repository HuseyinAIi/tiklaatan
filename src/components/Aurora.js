// Sayfa zemini: beyaz + sol üstte ÖSYM sitesindeki gibi çok soluk geometrik çizgiler.
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../theme';

const CIZGI = '#E6EBF3';

export default function Aurora() {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg, overflow: 'hidden' }]}>
      <View style={[s.kare, { width: 220, height: 220, top: -120, left: -110 }]} />
      <View style={[s.kare, { width: 160, height: 160, top: -60, left: -40 }]} />
      <View style={[s.kare, { width: 120, height: 120, top: 40, left: -90 }]} />
      <View style={[s.kare, { width: 90, height: 90, top: 70, left: -20 }]} />
    </View>
  );
}

const s = StyleSheet.create({
  kare: { position: 'absolute', borderWidth: 1.5, borderColor: CIZGI, transform: [{ rotate: '45deg' }] },
});
