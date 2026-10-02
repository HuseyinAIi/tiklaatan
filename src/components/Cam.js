// Kart yüzeyi (ÖSYM stili): beyaz zemin, 1px açık gri çerçeve, yumuşak köşe. Gölge/cam efekti yok.
// Bileşen adı geriye dönük uyumluluk için "Cam" olarak kaldı.
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radius as R } from '../theme';

export default function Cam({ children, style, radius = R.lg, yogun = false }) {
  const flat = StyleSheet.flatten(style) || {};
  const r = flat.borderRadius ?? radius;
  return (
    <View
      style={[
        { borderRadius: r, backgroundColor: yogun ? colors.surfaceAlt : colors.surface, borderWidth: 1, borderColor: colors.stroke, minWidth: 0, overflow: 'hidden' },
        style,
      ]}
    >
      {children}
    </View>
  );
}
