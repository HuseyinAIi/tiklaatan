// "Bu ilana tercih yaptım" + uygulama içi sıralama: tercih eden doğrulanmış kullanıcılar arasında
// kaçıncı olduğun, kontenjan ve tercih edenlere göre oluşan taban puan.
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, F, radius } from '../theme';
import Cam from './Cam';
import { Buton, yazi } from './ui';
import { useApp } from '../context/AppContext';
import { tercihOzeti, tercihYap, tercihGeriAl, tercihAktif } from '../services/tercihService';

export default function TercihSiralamasi({ ilan }) {
  const app = useApp();
  const router = useRouter();
  const [ozet, setOzet] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [islem, setIslem] = useState(false);
  const [hata, setHata] = useState(null);
  const [tumunuGoster, setTumunuGoster] = useState(false);

  const yukle = useCallback(async () => {
    if (!tercihAktif() || !app.kullaniciId) return setYukleniyor(false);
    try {
      setOzet(await tercihOzeti({ ilan, kullaniciId: app.kullaniciId, puanTuru: app.puanTuru }));
      setHata(null);
    } catch (e) {
      setHata(e.message);
    } finally {
      setYukleniyor(false);
    }
  }, [ilan, app.kullaniciId, app.puanTuru]);

  useEffect(() => {
    yukle();
    const t = setInterval(yukle, 30000); // başkaları tercih yaptıkça sıra güncellensin
    return () => clearInterval(t);
  }, [yukle]);

  const degistir = async () => {
    setIslem(true);
    setHata(null);
    try {
      const r = ozet?.tercihEttim
        ? await tercihGeriAl({ ilan, kullaniciId: app.kullaniciId, puanTuru: app.puanTuru })
        : await tercihYap({ ilan, kullaniciId: app.kullaniciId, puan: app.puan, puanTuru: app.puanTuru, dogrulandi: app.dogrulandi });
      setOzet(r);
    } catch (e) {
      setHata(e.message);
    } finally {
      setIslem(false);
    }
  };

  const kontenjan = ozet?.kontenjan ?? ilan.kontenjan ?? null;
  const icerde = ozet?.tercihEttim && kontenjan ? ozet.siram <= kontenjan : null;
  const fark = ozet?.tercihEttim && ozet.taban != null ? Math.round((ozet.benimPuanim - ozet.taban) * 100) / 100 : null;

  // Liste: ilk (kontenjan + 3) kişi; ben dışarıdaysam benim satırım da
  let satirlar = ozet?.puanlar || [];
  if (!tumunuGoster) {
    const sinir = Math.max((kontenjan || 5) + 3, 8);
    const ilk = satirlar.slice(0, sinir);
    const ben = satirlar.find((x) => x.ben);
    satirlar = ben && !ilk.includes(ben) ? [...ilk, { ayrac: true }, ben] : ilk;
  }

  return (
    <Cam radius={radius.xl} tint={['rgba(43,227,240,0.10)', 'rgba(0,0,0,0)']} style={{ padding: 20, marginTop: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={yazi.kartBaslik}>Tercih sıralaması</Text>
          <Text style={[yazi.soluk, { marginTop: 4 }]}>Bu ilana tercih yaptığını işaretleyen doğrulanmış adaylar arasında anlık sıran.</Text>
        </View>
      </View>

      {!tercihAktif() ? (
        <Bilgi ikon="cloud-offline-outline" metin="Tercih sıralaması için ilan sunucusu gerekli (Profil → Sunucu adresi)." />
      ) : !app.dogrulandi ? (
        <View style={{ marginTop: 16 }}>
          <Bilgi ikon="lock-closed-outline" metin="Sıralamaya yalnızca ÖSYM belgesiyle doğrulanmış puanlar katılır." />
          <Buton etiket="Puanını doğrula" ikon="shield-checkmark-outline" onPress={() => router.push('/dogrula')} style={{ marginTop: 12 }} />
        </View>
      ) : yukleniyor ? (
        <ActivityIndicator color={colors.text} style={{ marginVertical: 24 }} />
      ) : (
        <>
          {/* Özet kutuları */}
          <View style={s.kutular}>
            <Kutu etiket="Sıran" deger={ozet?.tercihEttim ? `${ozet.siram}.` : '—'} alt={ozet ? `${ozet.toplam} kişi içinde` : ''} vurgu={icerde == null ? null : icerde ? colors.green : colors.red} />
            <Kutu etiket="Kontenjan" deger={kontenjan ?? '—'} alt={kontenjan ? 'kişi' : 'ilanda'} />
            <Kutu
              etiket="Tercih tabanı"
              deger={ozet?.taban != null ? ozet.taban.toFixed(2) : '—'}
              alt={ozet?.taban != null ? `${kontenjan}. sıradaki puan` : kontenjan ? 'kontenjan dolmadı' : 'kontenjan bilinmiyor'}
            />
          </View>

          {ozet?.tercihEttim ? (
            <View style={[s.durum, { backgroundColor: icerde === false ? colors.redSoft : colors.greenSoft, borderColor: icerde === false ? '#F3B7BD' : '#A9DCC1' }]}>
              <Ionicons name={icerde === false ? 'trending-down' : 'checkmark-circle'} size={20} color={icerde === false ? colors.red : colors.green} />
              <Text style={s.durumText}>
                {icerde == null
                  ? `${ozet.toplam} tercih eden arasında ${ozet.siram}. sıradasın. Kontenjan bilinmediği için yerleşme durumu hesaplanamıyor.`
                  : icerde
                    ? ozet.taban != null
                      ? `Şu an kontenjan içindesin. Tercih tabanının ${fark.toFixed(2)} puan üzerindesin.`
                      : `Şu an kontenjan içindesin; tercih edenler (${ozet.toplam}) henüz kontenjanı (${kontenjan}) doldurmadı.`
                    : `Şu an kontenjan dışındasın. Önünde ${ozet.siram - kontenjan} kişi fazla var; tabanın ${Math.abs(fark).toFixed(2)} puan altındasın.`}
              </Text>
            </View>
          ) : null}

          <Buton
            etiket={ozet?.tercihEttim ? 'Tercihimi geri al' : 'Bu ilana tercih yaptım'}
            ikon={ozet?.tercihEttim ? 'close-circle-outline' : 'checkmark-done'}
            tip={ozet?.tercihEttim ? 'ikincil' : 'ana'}
            yukleniyor={islem}
            onPress={degistir}
            style={{ marginTop: 16 }}
          />
          {hata ? <Text style={s.hata}>{hata}</Text> : null}

          {/* Sıralama listesi */}
          {ozet?.puanlar?.length ? (
            <View style={{ marginTop: 18 }}>
              <View style={s.listeBaslik}>
                <Text style={s.listeBaslikText}>{ozet.puanTuru} sıralaması</Text>
                <Text style={s.listeBaslikSag}>
                  En yüksek {ozet.enYuksek?.toFixed(2)} · en düşük {ozet.enDusuk?.toFixed(2)}
                </Text>
              </View>
              <View style={s.tablo}>
                {satirlar.map((x, i) =>
                  x.ayrac ? (
                    <View key={`a${i}`} style={s.ayracSatir}>
                      <Text style={s.ayracText}>• • •</Text>
                    </View>
                  ) : (
                    <React.Fragment key={x.sira}>
                      <View style={[s.satir, x.ben && s.benSatir]}>
                        <Text style={[s.sira, x.ben && { color: colors.text }]}>{x.sira}</Text>
                        <Text style={[s.aday, x.ben && { color: colors.text, fontFamily: F.b }]}>{x.ben ? 'Sen' : `Aday ${x.sira}`}</Text>
                        <Text style={[s.puan, x.ben && { color: colors.text }]}>{x.puan.toFixed(2)}</Text>
                      </View>
                      {kontenjan && x.sira === kontenjan ? (
                        <View style={s.kesik}>
                          <View style={s.kesikCizgi} />
                          <Text style={s.kesikText}>Kontenjan sınırı · {kontenjan} kişi</Text>
                          <View style={s.kesikCizgi} />
                        </View>
                      ) : null}
                    </React.Fragment>
                  ),
                )}
              </View>
              {ozet.puanlar.length > satirlar.filter((x) => !x.ayrac).length || tumunuGoster ? (
                <Pressable onPress={() => setTumunuGoster((x) => !x)} style={{ alignSelf: 'center', marginTop: 10, padding: 6 }}>
                  <Text style={s.tumu}>{tumunuGoster ? 'Daha az göster' : `Tümünü göster (${ozet.puanlar.length})`}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <Text style={[yazi.soluk, { marginTop: 14, textAlign: 'center' }]}>Henüz kimse bu ilana tercih yaptığını işaretlemedi. İlk sen ol.</Text>
          )}

          <Text style={[yazi.kucuk, { marginTop: 14, lineHeight: 17 }]}>
            Sıralama yalnızca uygulamada tercih yaptığını işaretleyenleri kapsar; gerçek başvuru sayısı daha fazla olabilir. Kimlik bilgisi gösterilmez.
          </Text>
        </>
      )}
    </Cam>
  );
}

function Kutu({ etiket, deger, alt, vurgu }) {
  return (
    <View style={[s.kutu, vurgu && { borderColor: vurgu + '88' }]}>
      <Text style={s.kutuEtiket}>{etiket}</Text>
      <Text style={[s.kutuDeger, vurgu && { color: vurgu }]} numberOfLines={1}>
        {String(deger)}
      </Text>
      <Text style={s.kutuAlt} numberOfLines={1}>
        {alt}
      </Text>
    </View>
  );
}

function Bilgi({ ikon, metin }) {
  return (
    <View style={s.bilgi}>
      <Ionicons name={ikon} size={18} color={colors.textSoft} />
      <Text style={s.bilgiText}>{metin}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  kutular: { flexDirection: 'row', gap: 8, marginTop: 18 },
  kutu: { flex: 1, minWidth: 0, backgroundColor: colors.surfaceAlt, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: colors.stroke },
  kutuEtiket: { fontFamily: F.m, fontSize: 11.5, color: colors.textFaint },
  kutuDeger: { fontFamily: F.xb, fontSize: 22, color: colors.text, marginTop: 3, letterSpacing: -0.5 },
  kutuAlt: { fontFamily: F.m, fontSize: 11, color: colors.textSoft, marginTop: 1 },
  durum: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, marginTop: 12, alignItems: 'flex-start' },
  durumText: { flex: 1, fontFamily: F.m, fontSize: 13.5, color: colors.text, lineHeight: 20 },
  hata: { fontFamily: F.m, color: colors.red, marginTop: 10, fontSize: 13 },
  listeBaslik: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
  listeBaslikText: { fontFamily: F.b, fontSize: 15, color: colors.text },
  listeBaslikSag: { fontFamily: F.m, fontSize: 11.5, color: colors.textFaint },
  tablo: { borderWidth: 1, borderColor: colors.stroke, borderRadius: 14, overflow: 'hidden' },
  satir: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.stroke },
  benSatir: { backgroundColor: colors.accentSoft },
  sira: { fontFamily: F.b, fontSize: 13, color: colors.textFaint, width: 34 },
  aday: { flex: 1, fontFamily: F.m, fontSize: 14, color: colors.textSoft },
  puan: { fontFamily: F.b, fontSize: 14, color: colors.textSoft },
  kesik: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, backgroundColor: colors.amberSoft },
  kesikCizgi: { flex: 1, height: 1, backgroundColor: colors.devam },
  kesikText: { fontFamily: F.b, fontSize: 11.5, color: colors.devam, marginHorizontal: 8 },
  ayracSatir: { alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.stroke },
  ayracText: { color: colors.textFaint, letterSpacing: 4 },
  tumu: { fontFamily: F.sb, fontSize: 13, color: colors.accent },
  bilgi: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 14, backgroundColor: colors.surfaceAlt, marginTop: 14 },
  bilgiText: { flex: 1, fontFamily: F.r, fontSize: 13.5, color: colors.textSoft, lineHeight: 19 },
});
