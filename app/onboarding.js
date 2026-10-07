import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, F, radius } from '../src/theme';
import { Buton, Cam } from '../src/components/ui';
import Aurora from '../src/components/Aurora';
import { useApp } from '../src/context/AppContext';

const KARTLAR = [
  {
    ikon: 'newspaper-outline',
    baslik: 'Tüm memur ilanları tek yerde',
    metin: 'Kariyer Kapısı ve Resmî Gazete’deki KPSS’li memur ve sözleşmeli personel ilanlarını listele, ara, filtrele; ilan metnini ve şartlarını oku.',
  },
  {
    ikon: 'shield-checkmark-outline',
    baslik: 'Puanını belgeyle doğrula',
    metin: '2026 KPSS sonuç belgeni yükle, yapay zekâ puanını kendisi okusun. Elle puan girmene gerek yok; yanlış okursa düzeltebilirsin.',
  },
  {
    ikon: 'analytics-outline',
    baslik: 'Atanma simülasyonu',
    metin: 'Gitmek istediğin kurumun geçmiş yıllarda kaçla kapattığını gör; puanına göre atanma ihtimalini ve “Bana uygun” ilanları keşfet.',
  },
  {
    ikon: 'git-compare-outline',
    baslik: 'Tercih sıralaman (PRO)',
    metin:
      'Doğrulanmış adaylar arasında tercih yapmayı düşünenler içinde kaçıncı sırada olduğunu gör. Merkezi atama tercih bölümü, ÖSYM kılavuzu yayımlandığında açılacak: yakında.',
  },
];

export default function Onboarding() {
  const router = useRouter();
  const app = useApp();
  const [i, setI] = useState(0);
  const [onay, setOnay] = useState(false);
  const son = i === KARTLAR.length - 1;
  const k = KARTLAR[i];

  const ileri = () => {
    if (!son) return setI(i + 1);
    if (!onay) return;
    app.onboardingBitir();
    router.replace('/giris');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Aurora />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={s.ust}>
          <Text style={s.marka}>Tıkla Atan</Text>
          <Text style={s.sayac}>
            {i + 1}/{KARTLAR.length}
          </Text>
        </View>

        <View style={s.orta}>
          <Cam radius={radius.xl} style={s.kart}>
            <View style={s.ikon}>
              <Ionicons name={k.ikon} size={34} color={colors.accent} />
            </View>
            <Text style={s.baslik}>{k.baslik}</Text>
            <Text style={s.metin}>{k.metin}</Text>
          </Cam>

          <View style={s.noktalar}>
            {KARTLAR.map((_, n) => (
              <View key={n} style={[s.nokta, n === i && s.noktaAktif]} />
            ))}
          </View>

          {son ? (
            <Pressable onPress={() => setOnay((x) => !x)} style={s.onay} accessibilityRole="checkbox" accessibilityState={{ checked: onay }}>
              <Ionicons name={onay ? 'checkbox' : 'square-outline'} size={24} color={onay ? colors.accent : colors.textFaint} />
              <Text style={s.onayText}>
                Kullanım koşullarını ve aydınlatma metnini okudum, kabul ediyorum. Uygulamadaki tahmin ve sıralamalar bilgilendirme amaçlıdır; resmî bir
                kesinlik veya garanti taşımaz.
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View style={s.alt}>
          {i > 0 ? <Buton etiket="Geri" tip="ikincil" onPress={() => setI(i - 1)} style={{ flex: 1 }} /> : null}
          <Buton etiket={son ? 'Başla' : 'İleri'} ikon={son ? 'checkmark' : 'arrow-forward'} onPress={ileri} disabled={son && !onay} style={{ flex: 2 }} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  ust: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 22, paddingTop: 12 },
  marka: { fontFamily: F.xb, fontSize: 20, color: colors.navy, letterSpacing: -0.4 },
  sayac: { fontFamily: F.m, fontSize: 13, color: colors.textFaint },
  orta: { flex: 1, justifyContent: 'center', paddingHorizontal: 18 },
  kart: { padding: 26, alignItems: 'center' },
  ikon: { width: 72, height: 72, borderRadius: 20, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  baslik: { fontFamily: F.b, fontSize: 24, color: colors.navy, textAlign: 'center', letterSpacing: -0.4 },
  metin: { fontFamily: F.r, fontSize: 15.5, lineHeight: 24, color: colors.textSoft, textAlign: 'center', marginTop: 12 },
  noktalar: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 20 },
  nokta: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.strokeStrong },
  noktaAktif: { width: 22, backgroundColor: colors.accent },
  onay: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginTop: 22, padding: 14, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.stroke },
  onayText: { flex: 1, fontFamily: F.r, fontSize: 13, lineHeight: 19, color: colors.body },
  alt: { flexDirection: 'row', gap: 10, paddingHorizontal: 18, paddingBottom: 12 },
});
