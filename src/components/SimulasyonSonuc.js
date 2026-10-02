import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, F, radius } from '../theme';
import { Buton } from './ui';
import Cam from './Cam';
import { simulasyonYorumu, aiAktif } from '../services/gemini';

// Simülasyon sonucu: olasılık halkası, geçmiş yıllar grafiği + tablo, yapay zekâ yorumu.
export default function SimulasyonSonuc({ sonuc, puan, puanTuru, kurum, kontenjan, onYorum }) {
  const [yorum, setYorum] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState(null);
  const yuzde = Math.round(sonuc.olasilik * 100);
  const renk = sonuc.seviye.renk;

  const yorumAl = async () => {
    setYukleniyor(true);
    setHata(null);
    try {
      const y = await simulasyonYorumu({ kurum, puanTuru, puan, sonuc, kontenjan });
      setYorum(y);
      onYorum && onYorum(y);
    } catch (e) {
      setHata(e.message);
    } finally {
      setYukleniyor(false);
    }
  };

  const tabanlar = sonuc.veri.map((v) => v.taban);
  const degerler = [...tabanlar, puan, sonuc.beklenenTaban].filter((x) => x != null);
  const min = Math.floor(Math.min(...degerler) - 3);
  const max = Math.ceil(Math.max(...degerler) + 1);
  const H = 120;
  const yuk = (v) => Math.max(8, ((v - min) / (max - min || 1)) * H);

  return (
    <View>
      <View style={s.gosterge}>
        <View style={[s.halka, { borderColor: renk + '33' }]}>
          <View style={[s.halkaIc, { borderColor: renk }]}>
            <Text style={[s.yuzde, { color: colors.text }]}>%{yuzde}</Text>
            <Text style={s.yuzdeAlt}>atanma</Text>
          </View>
        </View>
        <View style={{ flex: 1, marginLeft: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[s.kare, { backgroundColor: renk }]} />
            <Text style={[s.seviye, { color: renk }]}>{sonuc.seviye.etiket}</Text>
          </View>
          <Text style={s.mesaj}>{sonuc.seviye.mesaj}</Text>
        </View>
      </View>

      <View style={s.bar}>
        <View style={[s.barDolu, { width: `${Math.max(yuzde, 2)}%`, backgroundColor: renk }]} />
      </View>

      <View style={s.istatistik}>
        <Ist etiket="Senin puanın" deger={Number(puan).toFixed(2)} />
        <Ist etiket="Tahmini taban" deger={sonuc.beklenenTaban != null ? sonuc.beklenenTaban.toFixed(2) : '—'} />
        <Ist etiket="Veri güveni" deger={sonuc.guven.split(' ')[0]} />
      </View>

      {sonuc.veri.length > 0 ? (
        <View style={{ marginTop: 22 }}>
          <Text style={s.altBaslik}>Geçmiş yıllarda kaçla kapattı?</Text>
          <View style={[s.grafik, { height: H + 46 }]}>
            {sonuc.veri.map((v) => (
              <View key={v.yil} style={s.sutunKap}>
                <Text style={s.sutunDeger}>{v.taban.toFixed(1)}</Text>
                <View style={[s.sutun, { height: yuk(v.taban), backgroundColor: v.taban <= puan ? colors.green : '#C3CBDA' }]} />
                <Text style={s.sutunYil}>{v.yil}</Text>
              </View>
            ))}
            {sonuc.beklenenTaban != null ? (
              <View style={s.sutunKap}>
                <Text style={[s.sutunDeger, { color: colors.accent }]}>{sonuc.beklenenTaban.toFixed(1)}</Text>
                <View style={[s.sutun, s.tahmin, { height: yuk(sonuc.beklenenTaban) }]} />
                <Text style={[s.sutunYil, { color: colors.accent, fontFamily: F.b }]}>2026*</Text>
              </View>
            ) : null}
            <View pointerEvents="none" style={[s.cizgi, { bottom: 22 + yuk(puan) }]}>
              <View style={s.cizgiEtiket}>
                <Text style={s.cizgiText}>Sen {Number(puan).toFixed(1)}</Text>
              </View>
            </View>
          </View>
          <View style={s.lejant}>
            <Lejant renk={colors.green} etiket="Bu puanla yerleşilen yıl" />
            <Lejant renk="rgba(255,255,255,0.18)" etiket="Yerleşilemeyen" />
            <Lejant renk={colors.accent} etiket="2026 tahmini" cizgili />
          </View>

          <View style={s.tablo}>
            <View style={[s.satir, { backgroundColor: colors.surfaceAlt }]}>
              {['Yıl', 'Kontenjan', 'Başvuru', 'Taban', 'Tavan'].map((h) => (
                <Text key={h} style={[s.hucre, s.hucreBaslik]}>
                  {h}
                </Text>
              ))}
            </View>
            {sonuc.veri.map((v, i) => (
              <View key={v.yil} style={[s.satir, i === sonuc.veri.length - 1 && { borderBottomWidth: 0 }]}>
                <Text style={[s.hucre, { fontFamily: F.sb }]}>{v.yil}</Text>
                <Text style={s.hucre}>{v.kontenjan}</Text>
                <Text style={s.hucre}>{v.basvuru.toLocaleString('tr-TR')}</Text>
                <Text style={[s.hucre, { color: v.taban <= puan ? colors.green : colors.text, fontFamily: F.sb }]}>{v.taban.toFixed(2)}</Text>
                <Text style={s.hucre}>{v.tavan.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <View style={s.veriYok}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textSoft} />
          <Text style={s.veriYokText}>Bu kurum için geçmiş yıl verisi henüz yok; tahmin benzer kurumların ortalamasına dayanıyor.</Text>
        </View>
      )}

      <View style={{ marginTop: 20 }}>
        {yorum ? (
          <Cam radius={radius.md} tint={[colors.violetSoft, 'rgba(76,157,255,0.04)']} style={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="sparkles" size={16} color={colors.violet} />
              <Text style={s.yorumBaslik}>Tercih Koçu{aiAktif() ? '' : ' · demo'}</Text>
            </View>
            <Text style={s.yorumText}>{yorum}</Text>
          </Cam>
        ) : (
          <Buton etiket="Tercih Koçu'na yorumlat" ikon="sparkles-outline" tip="ikincil" yukleniyor={yukleniyor} onPress={yorumAl} />
        )}
        {hata ? <Text style={s.hata}>{hata}</Text> : null}
      </View>
    </View>
  );
}

function Ist({ etiket, deger }) {
  return (
    <View style={s.ist}>
      <Text style={s.istEtiket}>{etiket}</Text>
      <Text style={s.istDeger} numberOfLines={1}>
        {deger}
      </Text>
    </View>
  );
}

function Lejant({ renk, etiket, cizgili }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 14, marginTop: 4 }}>
      <View style={[{ width: 10, height: 10, borderRadius: 3, marginRight: 6 }, cizgili ? { borderWidth: 1.5, borderColor: renk, borderStyle: 'dashed' } : { backgroundColor: renk }]} />
      <Text style={{ fontFamily: F.m, fontSize: 11.5, color: colors.textSoft }}>{etiket}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  gosterge: { flexDirection: 'row', alignItems: 'center' },
  halka: { width: 108, height: 108, borderRadius: 54, borderWidth: 6, alignItems: 'center', justifyContent: 'center' },
  halkaIc: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt },
  yuzde: { fontFamily: F.xb, fontSize: 28, letterSpacing: -1 },
  yuzdeAlt: { fontFamily: F.m, fontSize: 11.5, color: colors.textSoft, marginTop: -2 },
  kare: { width: 10, height: 10, borderRadius: 2, marginRight: 8 },
  seviye: { fontFamily: F.xb, fontSize: 22, letterSpacing: -0.5 },
  mesaj: { fontFamily: F.r, color: colors.textSoft, marginTop: 6, fontSize: 14, lineHeight: 20 },
  bar: { height: 6, backgroundColor: colors.track, borderRadius: 3, marginTop: 20, overflow: 'hidden' },
  barDolu: { height: 6, borderRadius: 3 },
  istatistik: { flexDirection: 'row', marginTop: 14, gap: 8 },
  ist: { flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: colors.stroke },
  istEtiket: { fontFamily: F.m, fontSize: 11.5, color: colors.textFaint },
  istDeger: { fontFamily: F.b, fontSize: 17, color: colors.text, marginTop: 3 },
  altBaslik: { fontFamily: F.b, fontSize: 16, color: colors.text, marginBottom: 6 },
  grafik: { flexDirection: 'row', alignItems: 'flex-end', paddingTop: 22, position: 'relative' },
  sutunKap: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  sutun: { width: 30, borderRadius: 8 },
  tahmin: { backgroundColor: colors.accentSoft, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.accent },
  sutunDeger: { fontFamily: F.sb, fontSize: 11, color: colors.textSoft, marginBottom: 4 },
  sutunYil: { fontFamily: F.m, fontSize: 11.5, color: colors.textSoft, marginTop: 6, height: 16 },
  cizgi: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1.5, borderTopColor: colors.violet, borderStyle: 'dashed' },
  cizgiEtiket: { position: 'absolute', right: 0, top: -12, backgroundColor: colors.violet, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  cizgiText: { fontFamily: F.b, fontSize: 10.5, color: '#fff' },
  lejant: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  tablo: { marginTop: 14, borderWidth: 1, borderColor: colors.stroke, borderRadius: 14, overflow: 'hidden' },
  satir: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: colors.stroke },
  hucre: { flex: 1, fontFamily: F.r, fontSize: 12.5, color: colors.text, textAlign: 'center' },
  hucreBaslik: { fontFamily: F.sb, color: colors.textSoft, fontSize: 11.5 },
  veriYok: { flexDirection: 'row', marginTop: 18, padding: 12, borderRadius: 14, backgroundColor: colors.surfaceAlt, gap: 8 },
  veriYokText: { flex: 1, fontFamily: F.r, fontSize: 13, color: colors.textSoft, lineHeight: 19 },
  yorumBaslik: { fontFamily: F.b, color: colors.violet, marginLeft: 6, fontSize: 14 },
  yorumText: { fontFamily: F.r, color: colors.text, lineHeight: 22, fontSize: 14.5 },
  hata: { fontFamily: F.m, color: colors.red, marginTop: 10, fontSize: 13 },
});
