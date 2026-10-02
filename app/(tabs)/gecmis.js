import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, F, radius } from '../../src/theme';
import { Ekran, BuyukBaslik, Cam, BosDurum, BolumBasligi } from '../../src/components/ui';
import { useApp } from '../../src/context/AppContext';
import { baslikDuzen } from '../../src/utils/metin';

function gunEtiketi(iso) {
  const d = new Date(iso);
  const bugun = new Date();
  const dun = new Date();
  dun.setDate(bugun.getDate() - 1);
  if (d.toDateString() === bugun.toDateString()) return 'Bugün';
  if (d.toDateString() === dun.toDateString()) return 'Dün';
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function GecmisEkrani() {
  const { gecmis } = useApp();
  const router = useRouter();

  const gruplar = [];
  for (const k of gecmis) {
    const g = gunEtiketi(k.tarih);
    const son = gruplar[gruplar.length - 1];
    if (son && son.g === g) son.l.push(k);
    else gruplar.push({ g, l: [k] });
  }

  return (
    <Ekran>
      <BuyukBaslik baslik="Geçmiş" alt="Çalıştırdığın simülasyonlar burada saklanır." />
      {!gecmis.length ? (
        <BosDurum ikon="time-outline" baslik="Henüz simülasyon yok" aciklama="Bir ilana girip ya da Simülasyon sekmesinden kurum seçip atanma ihtimalini hesapla." />
      ) : (
        gruplar.map((grup) => (
          <View key={grup.g}>
            <BolumBasligi sag={`${grup.l.length}`}>{grup.g}</BolumBasligi>
            <Cam radius={radius.xl} style={{ paddingHorizontal: 16 }}>
              {grup.l.map((item, i) => (
                <Pressable
                  key={item.id}
                  onPress={() => item.ilanId && router.push(`/ilan/${item.ilanId}`)}
                  style={({ pressed }) => [s.satir, i < grup.l.length - 1 && s.cizgi, pressed && { opacity: 0.7 }]}
                >
                  <View style={[s.yuzde, { borderColor: item.renk }]}>
                    <Text style={s.yuzdeText}>%{Math.round(item.olasilik * 100)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.kurum} numberOfLines={1}>
                      {baslikDuzen(item.kurum)}
                    </Text>
                    <Text style={s.baslik} numberOfLines={1}>
                      {item.baslik}
                    </Text>
                    <Text style={s.alt}>
                      {item.puanTuru} {Number(item.puan).toFixed(2)} · tahmini taban {item.beklenenTaban ?? '—'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[s.seviye, { color: item.renk }]}>{item.seviye}</Text>
                    <Text style={s.saat}>{new Date(item.tarih).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</Text>
                  </View>
                  {item.ilanId ? <Ionicons name="chevron-forward" size={16} color={colors.textFaint} style={{ marginLeft: 6 }} /> : null}
                </Pressable>
              ))}
            </Cam>
          </View>
        ))
      )}
    </Ekran>
  );
}

const s = StyleSheet.create({
  satir: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  cizgi: { borderBottomWidth: 1, borderBottomColor: colors.stroke },
  yuzde: { width: 52, height: 52, borderRadius: 26, borderWidth: 3, alignItems: 'center', justifyContent: 'center', marginRight: 14, backgroundColor: colors.surfaceAlt },
  yuzdeText: { fontFamily: F.xb, fontSize: 14, color: colors.text },
  kurum: { fontFamily: F.b, color: colors.text, fontSize: 15 },
  baslik: { fontFamily: F.m, color: colors.textSoft, fontSize: 13, marginTop: 2 },
  alt: { fontFamily: F.r, color: colors.textSoft, fontSize: 12, marginTop: 3 },
  seviye: { fontFamily: F.b, fontSize: 12.5 },
  saat: { fontFamily: F.m, fontSize: 11.5, color: colors.textFaint, marginTop: 4 },
});
