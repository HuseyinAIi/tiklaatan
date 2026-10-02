import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, F, radius } from '../theme';
import Cam from './Cam';
import { Durum } from './ui';
import { ilanDurumu, trTarih, sinavliMi } from '../services/ilanService';
import { pozisyonlar, uygunluk } from '../utils/pozisyon';
import { useApp } from '../context/AppContext';

export default function IlanKart({ ilan, olasilik }) {
  const router = useRouter();
  const d = ilanDurumu(ilan);
  const turler = ilan.puanTurleri?.length ? ilan.puanTurleri.join(' · ') : 'KPSS';
  const app = useApp();
  const poz = pozisyonlar(ilan);
  const uygunSayi = app.dogrulandi ? poz.filter((p) => uygunluk(p, app).uygun).length : null;
  const sinavli = sinavliMi(ilan);
  const yuzde = olasilik && !sinavli ? Math.round(olasilik.olasilik * 100) : null;
  const tahmini = olasilik && /Düşük/.test(olasilik.guven);

  return (
    <Pressable onPress={() => router.push(`/ilan/${ilan.id}`)} style={({ pressed }) => [{ marginBottom: 12, transform: [{ scale: pressed ? 0.985 : 1 }] }]}>
      <Cam radius={radius.lg} style={[s.kart, !d.aktif && { opacity: 0.6 }]}>
        <View style={s.ust}>
          <Durum renk={d.renk} etiket={d.etiket} kucuk />
          <Text style={s.kaynak}>{ilan.kaynak}</Text>
        </View>

        <Text style={s.kurum} numberOfLines={2}>
          {ilan.kurum}
        </Text>
        <Text style={s.baslik} numberOfLines={2}>
          {ilan.baslik}
        </Text>

        {!poz[0].tek ? (
          <View style={s.pozSatir}>
            <View style={s.pozEtiket}>
              <Ionicons name="layers-outline" size={13} color={colors.pillText} />
              <Text style={s.pozEtiketText}>{poz.length} pozisyon</Text>
            </View>
            {uygunSayi != null ? (
              <View style={[s.pozEtiket, { backgroundColor: uygunSayi ? colors.greenSoft : colors.redSoft }]}>
                <Ionicons name={uygunSayi ? 'checkmark-circle' : 'close-circle'} size={13} color={uygunSayi ? colors.green : colors.red} />
                <Text style={[s.pozEtiketText, { color: uygunSayi ? colors.green : colors.red }]}>{uygunSayi ? `${uygunSayi} tanesi sana uygun` : 'Sana uygun pozisyon yok'}</Text>
              </View>
            ) : null}
            <Text style={s.pozListe} numberOfLines={1}>
              {poz.map((p) => p.unvan).join(' · ')}
            </Text>
          </View>
        ) : null}

        <View style={s.meta}>
          <Meta ikon="ribbon-outline" text={turler} />
          {ilan.il ? <Meta ikon="location-outline" text={ilan.il} /> : null}
          <Meta ikon="people-outline" text={ilan.kontenjan ? `${ilan.kontenjan} kişi` : 'Kontenjan ilanda'} />
          {ilan.tabanSarti ? <Meta ikon="trending-up-outline" text={`Taban ${ilan.tabanSarti}`} /> : null}
          <Meta ikon="calendar-outline" text={ilan.sonBasvuru ? trTarih(ilan.sonBasvuru) : 'Tarih ilanda'} />
        </View>

        <View style={s.alt}>
          {sinavli ? (
            <View style={s.satir}>
              <View style={[s.ikonKutu, { backgroundColor: colors.violetSoft }]}>
                <Ionicons name="document-text" size={16} color={colors.violet} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.sinavBaslik}>Yazılı sınavla seçim</Text>
                <Text style={s.sinavAlt}>KPSS ön eleme; sıralamayı kurum sınavı belirler</Text>
              </View>
            </View>
          ) : yuzde != null ? (
            <>
              <View style={s.satir}>
                <Text style={[s.yuzde, { color: olasilik.seviye.renk }]}>
                  {tahmini ? '~' : ''}%{yuzde}
                </Text>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[s.seviye, { color: olasilik.seviye.renk }]}>{olasilik.seviye.etiket} ihtimal</Text>
                  <Text style={s.seviyeAlt}>{tahmini ? 'Tahmini · bu kurumun geçmiş verisi yok' : `Tahmini taban ${olasilik.beklenenTaban?.toFixed(1)}`}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
              </View>
              <View style={s.bar}>
                <View style={[s.barDolu, { width: `${Math.max(yuzde, 3)}%`, backgroundColor: olasilik.seviye.renk, opacity: tahmini ? 0.65 : 1 }]} />
              </View>
            </>
          ) : (
            <View style={s.satir}>
              <View style={s.ikonKutu}>
                <Ionicons name="lock-closed" size={14} color={colors.textSoft} />
              </View>
              <Text style={s.kilit}>Atanma ihtimali için puanını doğrula</Text>
            </View>
          )}
        </View>
      </Cam>
    </Pressable>
  );
}

function Meta({ ikon, text }) {
  return (
    <View style={s.metaOge}>
      <Ionicons name={ikon} size={14} color={colors.textFaint} />
      <Text style={s.metaText} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  pozSatir: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 10 },
  pozEtiket: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.pill, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  pozEtiketText: { fontFamily: F.sb, fontSize: 12, color: colors.pillText },
  pozListe: { width: '100%', fontFamily: F.r, fontSize: 12.5, color: colors.textFaint, marginTop: 2 },
  kart: { padding: 18 },
  ust: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kaynak: { fontFamily: F.m, fontSize: 12, color: colors.textFaint },
  kurum: { fontFamily: F.b, fontSize: 17, color: colors.text, marginTop: 12, letterSpacing: -0.3, lineHeight: 22 },
  baslik: { fontFamily: F.m, fontSize: 14.5, color: colors.textSoft, marginTop: 4, lineHeight: 20 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, columnGap: 14, rowGap: 6 },
  metaOge: { flexDirection: 'row', alignItems: 'center', maxWidth: '100%' },
  metaText: { fontFamily: F.m, fontSize: 13, color: colors.textSoft, marginLeft: 5 },
  alt: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.stroke },
  satir: { flexDirection: 'row', alignItems: 'center' },
  yuzde: { fontFamily: F.xb, fontSize: 28, letterSpacing: -1, minWidth: 64 },
  seviye: { fontFamily: F.b, fontSize: 14, color: colors.text },
  seviyeAlt: { fontFamily: F.r, fontSize: 12, color: colors.textFaint, marginTop: 2 },
  etiket: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  nokta: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  etiketText: { fontFamily: F.b, fontSize: 12 },
  bar: { height: 5, borderRadius: 3, backgroundColor: colors.track, marginTop: 12, overflow: 'hidden' },
  barDolu: { height: 5, borderRadius: 3 },
  ikonKutu: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  sinavBaslik: { fontFamily: F.b, fontSize: 14, color: colors.text },
  sinavAlt: { fontFamily: F.r, fontSize: 12, color: colors.textFaint, marginTop: 2 },
  kilit: { fontFamily: F.m, fontSize: 13, color: colors.textSoft },
});
