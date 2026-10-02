import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { PUAN_TURLERI, colors, F, radius } from '../theme';
import Cam from './Cam';
import { Buton } from './ui';

export default function PuanKarti() {
  const router = useRouter();
  const { puan, puanTuru, dogrulandi, kalanHak, MAX_HAK, demoDogrulama } = useApp();
  const egitim = PUAN_TURLERI.find((p) => p.kod === puanTuru)?.egitim || '';

  return (
    <Cam radius={radius.xl} tint={['rgba(76,157,255,0.20)', 'rgba(43,227,240,0.04)']} style={s.kart}>
      <View style={s.ust}>
        <Text style={s.ustEtiket}>KPSS 2026 · {egitim.toLocaleUpperCase('tr-TR')}</Text>
        <View style={s.hak}>
          <Text style={s.hakText}>
            {kalanHak}/{MAX_HAK} hak
          </Text>
        </View>
      </View>

      <Text style={s.kucuk}>{dogrulandi ? 'Doğrulanmış puanın' : 'Puanın henüz doğrulanmadı'}</Text>
      <View style={s.puanSatir}>
        <Text style={[s.puan, !dogrulandi && { color: colors.textFaint }]}>{dogrulandi && puan != null ? Number(puan).toFixed(2) : '--.--'}</Text>
        <View style={s.tur}>
          <Text style={s.turText}>{puanTuru}</Text>
        </View>
      </View>

      {dogrulandi ? (
        <View style={s.dogruSatir}>
          <Ionicons name="shield-checkmark" size={16} color={colors.green} />
          <Text style={s.dogruText}>{demoDogrulama ? 'Demo modunda doğrulandı' : 'ÖSYM sonuç belgesiyle doğrulandı'} · simülasyonlar açık</Text>
        </View>
      ) : (
        <>
          <Text style={s.aciklama}>Atanma ihtimalini görmek için ÖSYM sonuç belgeni yükle, puanını doğrulayalım.</Text>
          <Buton etiket="Puanını doğrula" ikon="shield-checkmark-outline" onPress={() => router.push('/dogrula')} style={{ marginTop: 16 }} />
        </>
      )}
    </Cam>
  );
}

const s = StyleSheet.create({
  kart: { padding: 20 },
  ust: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ustEtiket: { fontFamily: F.b, fontSize: 12, color: colors.textSoft, letterSpacing: 1 },
  hak: { backgroundColor: colors.track, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: colors.stroke },
  hakText: { fontFamily: F.sb, fontSize: 12, color: colors.textSoft },
  kucuk: { fontFamily: F.m, fontSize: 14, color: colors.textSoft, marginTop: 18 },
  puanSatir: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  puan: { fontFamily: F.xb, fontSize: 46, color: colors.text, letterSpacing: -1.5 },
  tur: { marginLeft: 12, backgroundColor: colors.accentSoft, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  turText: { fontFamily: F.b, fontSize: 13, color: colors.accent },
  dogruSatir: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  dogruText: { fontFamily: F.m, fontSize: 13, color: colors.textSoft, marginLeft: 6, flex: 1 },
  aciklama: { fontFamily: F.r, fontSize: 14, color: colors.textSoft, lineHeight: 20, marginTop: 8 },
});
