// İlan içindeki pozisyonların listesi: her pozisyon için bölüm, kontenjan, puan türü, taban ve
// kullanıcıya uygunluk. Pozisyona dokununca o pozisyonun simülasyon + tercih sayfası açılır.
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, F, radius } from '../theme';
import Cam from './Cam';
import { Chip, yazi } from './ui';
import { useApp } from '../context/AppContext';
import { pozisyonlar, uygunluk } from '../utils/pozisyon';

export default function PozisyonListesi({ ilan }) {
  const router = useRouter();
  const app = useApp();
  const tum = pozisyonlar(ilan).map((p) => ({ ...p, u: uygunluk(p, app) }));
  const uygunSayi = tum.filter((p) => p.u.uygun).length;
  const [sadeceUygun, setSadeceUygun] = useState(app.dogrulandi && uygunSayi > 0);
  const liste = sadeceUygun ? tum.filter((p) => p.u.uygun) : tum;

  return (
    <Cam radius={radius.xl} style={{ padding: 20, marginTop: 14 }}>
      <Text style={yazi.kartBaslik}>Pozisyonlar</Text>
      <Text style={[yazi.soluk, { marginTop: 4 }]}>
        Bu ilanda {tum.length} ayrı pozisyon var.
        {app.dogrulandi ? ` ${uygunSayi ? `${uygunSayi} tanesi puanına ve puan türüne uygun.` : 'Puanına uygun pozisyon görünmüyor.'}` : ' Uygunluğu görmek için puanını doğrula.'} Bir pozisyona dokun: o kadronun simülasyonu ve tercih sıralaması açılır.
      </Text>

      {app.dogrulandi ? (
        <View style={{ flexDirection: 'row', marginTop: 14 }}>
          <Chip etiket={`Bana uygun (${uygunSayi})`} ikon="checkmark-done" secili={sadeceUygun} onPress={() => setSadeceUygun(true)} />
          <Chip etiket={`Tümü (${tum.length})`} secili={!sadeceUygun} onPress={() => setSadeceUygun(false)} />
        </View>
      ) : null}

      <View style={s.tablo}>
        {liste.length ? (
          liste.map((p, i) => (
            <Pressable
              key={p.k}
              onPress={() => router.push({ pathname: '/pozisyon', params: { id: ilan.id, k: String(p.k) } })}
              style={({ pressed }) => [s.satir, i < liste.length - 1 && s.cizgi, pressed && { backgroundColor: colors.surfaceAlt }]}
            >
              <View style={s.ikon}>
                <Ionicons name={p.bolum.ikon} size={18} color={colors.navy} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.unvan}>{p.unvan}</Text>
                <Text style={s.bilgi}>
                  {[p.bolum.ad, p.adet ? `${p.adet} kişi` : null, p.puanTurleri.join('/') || null, p.taban ? `en az ${p.taban}` : null].filter(Boolean).join(' · ')}
                </Text>
                {p.egitim ? <Text style={s.egitim}>{p.egitim}</Text> : null}
                {p.u.uygun != null ? (
                  <View style={[s.uygun, { backgroundColor: p.u.uygun ? colors.greenSoft : colors.redSoft }]}>
                    <View style={[s.kare, { backgroundColor: p.u.uygun ? colors.green : colors.red }]} />
                    <Text style={[s.uygunText, { color: p.u.uygun ? colors.green : colors.red }]}>{p.u.uygun ? 'Sana uygun' : 'Uygun değil'} · {p.u.neden}</Text>
                  </View>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
            </Pressable>
          ))
        ) : (
          <Text style={[yazi.soluk, { padding: 16, textAlign: 'center' }]}>Puanına uygun pozisyon yok. “Tümü”ne dokunarak hepsini görebilirsin.</Text>
        )}
      </View>
    </Cam>
  );
}

const s = StyleSheet.create({
  tablo: { marginTop: 14, borderWidth: 1, borderColor: colors.stroke, borderRadius: radius.md, overflow: 'hidden' },
  satir: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 12 },
  cizgi: { borderBottomWidth: 1, borderBottomColor: colors.stroke },
  ikon: { width: 36, height: 36, borderRadius: 8, backgroundColor: colors.pill, alignItems: 'center', justifyContent: 'center' },
  unvan: { fontFamily: F.b, fontSize: 15.5, color: colors.navy },
  bilgi: { fontFamily: F.m, fontSize: 13, color: colors.textSoft, marginTop: 3 },
  egitim: { fontFamily: F.r, fontSize: 12.5, color: colors.textFaint, marginTop: 2 },
  uygun: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, marginTop: 8 },
  kare: { width: 8, height: 8, marginRight: 6 },
  uygunText: { fontFamily: F.sb, fontSize: 12 },
});
