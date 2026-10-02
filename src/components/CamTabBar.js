// Alt menü: beyaz, üstte ince çizgi, seçili sekmede lacivert ikon ve üstte vurgu çizgisi.
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, F } from '../theme';

const IKON = {
  index: ['briefcase', 'briefcase-outline'],
  tercih: ['list', 'list-outline'],
  simulasyon: ['analytics', 'analytics-outline'],
  gecmis: ['time', 'time-outline'],
  profil: ['person', 'person-outline'],
};

export default function CamTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {state.routes.map((route, i) => {
        const odak = state.index === i;
        const { options } = descriptors[route.key];
        const etiket = options.title ?? route.name;
        const [dolu, bos] = IKON[route.name] || ['ellipse', 'ellipse-outline'];
        const bas = () => {
          const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!odak && !e.defaultPrevented) navigation.navigate(route.name);
        };
        return (
          <Pressable key={route.key} onPress={bas} style={s.oge} accessibilityRole="button" accessibilityState={{ selected: odak }}>
            <View style={[s.cizgi, odak && { backgroundColor: colors.navy }]} />
            <Ionicons name={odak ? dolu : bos} size={22} color={odak ? colors.navy : colors.textFaint} />
            <Text style={[s.etiket, { color: odak ? colors.navy : colors.textFaint, fontFamily: odak ? F.b : F.m }]}>{etiket}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.stroke },
  oge: { flex: 1, alignItems: 'center', paddingTop: 8, paddingBottom: 4 },
  cizgi: { position: 'absolute', top: -1, height: 3, width: 36, borderRadius: 2, backgroundColor: 'transparent' },
  etiket: { fontSize: 11, marginTop: 3 },
});
