import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, F, radius } from '../../src/theme';
import { Ekran, BuyukBaslik, Cam, Buton, Alan, Chip, yazi } from '../../src/components/ui';
import SimulasyonSonuc from '../../src/components/SimulasyonSonuc';
import { useApp } from '../../src/context/AppContext';
import { KURUM_LISTESI } from '../../src/data/kurumGecmis';
import { simuleEt } from '../../src/services/simulasyon';

export default function SimulasyonEkrani() {
  const router = useRouter();
  const app = useApp();
  const [arama, setArama] = useState('');
  const [secili, setSecili] = useState(null);
  const [kontenjanText, setKontenjanText] = useState('');
  const [sonuc, setSonuc] = useState(null);

  const sonuclar = useMemo(() => {
    const q = arama.trim().toLocaleLowerCase('tr-TR');
    return KURUM_LISTESI.filter((k) => !q || `${k.ad} ${k.il}`.toLocaleLowerCase('tr-TR').includes(q));
  }, [arama]);

  const sec = (k) => {
    setSecili(k);
    setSonuc(null);
    setKontenjanText('');
  };

  const calistir = () => {
    const kontenjan = parseInt(kontenjanText, 10);
    const r = simuleEt({
      puan: app.puan,
      puanTuru: app.puanTuru,
      kurumId: secili.id,
      kontenjan: Number.isFinite(kontenjan) && kontenjan > 0 ? kontenjan : undefined,
    });
    setSonuc(r);
    app.gecmiseEkle({
      kurum: secili.ad,
      baslik: 'Kurum simülasyonu',
      kurumId: secili.id,
      puanTuru: app.puanTuru,
      puan: app.puan,
      olasilik: r.olasilik,
      seviye: r.seviye.etiket,
      renk: r.seviye.renk,
      beklenenTaban: r.beklenenTaban,
    });
  };

  return (
    <Ekran>
      <BuyukBaslik baslik="Simülasyon" alt="Gitmek istediğin kurumu seç; geçmiş yıllarda kaçla kapattığını ve senin ihtimalini görelim." />

      {!app.dogrulandi ? (
        <Cam radius={radius.xl} style={{ padding: 24, alignItems: 'center' }}>
          <View style={s.kilitIkon}>
            <Ionicons name="lock-closed" size={22} color={colors.text} />
          </View>
          <Text style={s.kilitBaslik}>Önce puanını doğrula</Text>
          <Text style={s.kilitText}>Simülasyon yalnızca ÖSYM belgesiyle doğrulanmış puanla çalışır.</Text>
          <Buton etiket="Puanını doğrula" ikon="shield-checkmark-outline" onPress={() => router.push('/dogrula')} style={{ marginTop: 18, alignSelf: 'stretch' }} />
        </Cam>
      ) : (
        <>
          <Cam radius={radius.lg} tint={[colors.accentSoft, 'rgba(0,0,0,0)']} style={s.puanSerit}>
            <Ionicons name="shield-checkmark" size={18} color={colors.green} />
            <Text style={s.puanSeritText}>Doğrulanmış puanın</Text>
            <View style={{ flex: 1 }} />
            <Text style={s.puanSeritDeger}>
              {app.puanTuru} · {Number(app.puan).toFixed(2)}
            </Text>
          </Cam>

          {!secili ? (
            <>
              <Alan
                value={arama}
                onChangeText={setArama}
                placeholder="Kurum ara (örn. Gaziantep Üniversitesi)"
                ikon="search"
                style={{ marginTop: 14, marginBottom: 12 }}
              />
              {sonuclar.map((k) => {
                const uygun = k.puanTurleri.includes(app.puanTuru);
                return (
                  <Pressable key={k.id} onPress={() => sec(k)} style={({ pressed }) => [{ marginBottom: 10, transform: [{ scale: pressed ? 0.985 : 1 }] }]}>
                    <Cam radius={radius.lg} style={s.kurum}>
                      <View style={s.kurumIkon}>
                        <Ionicons name={k.tip === 'Üniversite' ? 'school' : 'business'} size={18} color={colors.accent} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.kurumAd} numberOfLines={1}>
                          {k.ad}
                        </Text>
                        <Text style={s.kurumAlt}>
                          {k.il} · {k.tip} · {k.puanTurleri.join(', ')}
                        </Text>
                        {!uygun ? <Text style={s.kurumUyari}>{app.puanTuru} için geçmiş veri yok</Text> : null}
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
                    </Cam>
                  </Pressable>
                );
              })}
            </>
          ) : (
            <Cam radius={radius.xl} style={{ padding: 20, marginTop: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={s.kurumIkon}>
                  <Ionicons name={secili.tip === 'Üniversite' ? 'school' : 'business'} size={18} color={colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.kurumAd}>{secili.ad}</Text>
                  <Text style={s.kurumAlt}>
                    {secili.il} · {secili.tip}
                  </Text>
                </View>
                <Chip etiket="Değiştir" onPress={() => sec(null)} />
              </View>

              {!sonuc ? (
                <>
                  <View style={{ height: 1, backgroundColor: colors.stroke, marginVertical: 18 }} />
                  <Alan
                    etiket="Bu yılki kontenjan (biliyorsan)"
                    value={kontenjanText}
                    onChangeText={setKontenjanText}
                    keyboardType="number-pad"
                    placeholder="Boş bırakırsan geçmiş ortalaması alınır"
                  />
                  <Buton etiket="Simülasyonu çalıştır" ikon="play" onPress={calistir} style={{ marginTop: 16 }} />
                </>
              ) : (
                <View style={{ marginTop: 22 }}>
                  <SimulasyonSonuc sonuc={sonuc} puan={app.puan} puanTuru={app.puanTuru} kurum={secili.ad} kontenjan={parseInt(kontenjanText, 10) || undefined} />
                </View>
              )}
            </Cam>
          )}
          <Text style={[yazi.kucuk, { textAlign: 'center', marginTop: 18, lineHeight: 17 }]}>
            Geçmiş yıl rakamları şimdilik temsilî demo verisidir.
          </Text>
        </>
      )}
    </Ekran>
  );
}

const s = StyleSheet.create({
  kilitIkon: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.track, borderWidth: 1, borderColor: colors.stroke, alignItems: 'center', justifyContent: 'center' },
  kilitBaslik: { fontFamily: F.b, fontSize: 18, color: colors.text, marginTop: 14 },
  kilitText: { fontFamily: F.r, color: colors.textSoft, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  puanSerit: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
  puanSeritText: { fontFamily: F.m, fontSize: 14, color: colors.textSoft },
  puanSeritDeger: { fontFamily: F.xb, fontSize: 16, color: colors.text },
  kurum: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  kurumIkon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  kurumAd: { fontFamily: F.b, color: colors.text, fontSize: 14.5 },
  kurumAlt: { fontFamily: F.r, color: colors.textSoft, fontSize: 12.5, marginTop: 3 },
  kurumUyari: { fontFamily: F.m, color: colors.devam, fontSize: 12, marginTop: 3 },
});
