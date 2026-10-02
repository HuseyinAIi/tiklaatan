import React, { useState } from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, F, radius } from '../../src/theme';
import { Ekran, BuyukBaslik, Cam, Buton, BosDurum, Durum, Rozet, yazi } from '../../src/components/ui';
import SimulasyonSonuc from '../../src/components/SimulasyonSonuc';
import TercihSiralamasi from '../../src/components/TercihSiralamasi';
import PozisyonListesi from '../../src/components/PozisyonListesi';
import { pozisyonlar } from '../../src/utils/pozisyon';
import { useApp } from '../../src/context/AppContext';
import { ilanBul, turUygun, trTarih, ilanDurumu, sinavliMi } from '../../src/services/ilanService';
import { simuleEt } from '../../src/services/simulasyon';
import { ilanAciklama } from '../../src/data/ilanlar';

export default function IlanDetay() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const app = useApp();
  const ilan = ilanBul(String(id));
  const [sonuc, setSonuc] = useState(null);

  if (!ilan) {
    return (
      <Ekran sekmeli={false}>
        <BuyukBaslik geri baslik="İlan" />
        <BosDurum baslik="İlan bulunamadı" aciklama="İlan kaldırılmış veya liste yenilenmiş olabilir." />
      </Ekran>
    );
  }

  const d = ilanDurumu(ilan);
  const turUyumlu = turUygun(ilan, app.puanTuru);
  const turler = ilan.puanTurleri?.length ? ilan.puanTurleri.join(' · ') : 'KPSS';
  const poz = pozisyonlar(ilan);
  const coklu = !poz[0].tek;

  const calistir = () => {
    const r = simuleEt({ puan: app.puan, puanTuru: app.puanTuru, kurumId: ilan.kurumId, kontenjan: ilan.kontenjan || undefined, tabanSarti: ilan.tabanSarti });
    setSonuc(r);
    app.gecmiseEkle({
      kurum: ilan.kurum,
      baslik: ilan.baslik,
      ilanId: ilan.id,
      kurumId: ilan.kurumId,
      puanTuru: app.puanTuru,
      puan: app.puan,
      olasilik: r.olasilik,
      seviye: r.seviye.etiket,
      renk: r.seviye.renk,
      beklenenTaban: r.beklenenTaban,
    });
  };

  return (
    <Ekran sekmeli={false}>
      <BuyukBaslik
        geri
        ust={ilan.tur || 'Kamu personeli'}
        baslik={ilan.kurum}
        alt={ilan.baslik}
        sag={
          <Cam radius={radius.pill} style={{ paddingHorizontal: 12, paddingVertical: 7 }}>
            <Text style={{ fontFamily: F.sb, fontSize: 12.5, color: colors.textSoft }}>{ilan.kaynak}</Text>
          </Cam>
        }
      />

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: -6, marginBottom: 16, gap: 10 }}>
        <Durum renk={d.renk} etiket={d.etiket} />
        <Rozet etiket={turler} />
      </View>

      <View style={s.kutular}>
        <Kutu ikon="people-outline" etiket="Kontenjan" deger={ilan.kontenjan ? `${ilan.kontenjan}` : '—'} alt={ilan.kontenjan ? 'kişi' : 'ilanda'} />
        <Kutu ikon="trending-up-outline" etiket="Taban şartı" deger={ilan.tabanSarti ?? '—'} alt={ilan.tabanSarti ? 'puan' : 'ilanda'} />
        <Kutu
          ikon="calendar-outline"
          etiket="Son başvuru"
          deger={ilan.sonBasvuru ? trTarih(ilan.sonBasvuru).slice(0, 5) : '—'}
          alt={d.gun != null && d.gun >= 0 ? `${d.gun} gün kaldı` : ilan.sonBasvuru ? ilan.sonBasvuru.slice(0, 4) : 'ilanda'}
        />
      </View>

      {coklu ? (
        <PozisyonListesi ilan={ilan} />
      ) : (
        <>
      <Cam radius={radius.xl} tint={['rgba(76,157,255,0.14)', 'rgba(0,0,0,0)']} style={{ padding: 20, marginTop: 14 }}>
        <Text style={yazi.kartBaslik}>Atanma olasılığı simülasyonu</Text>
        <Text style={[yazi.soluk, { marginTop: 4 }]}>Yalnızca ÖSYM belgesiyle doğrulanmış puan üzerinden çalışır.</Text>

        {sinavliMi(ilan) ? (
          <View style={s.kilit}>
            <View style={s.kilitIkon}>
              <Ionicons name="document-text" size={22} color={colors.violet} />
            </View>
            <Text style={s.kilitBaslik}>Yazılı sınavla seçim</Text>
            <Text style={s.kilitText}>
              Bu kadroda KPSS yalnızca ön elemedir; atanacaklar kurumun kendi yazılı/sözlü sınavıyla belirlenir. Bu yüzden puana dayalı ihtimal hesaplanmaz. Ön eleme şartı ve sınav takvimi ilan metninde.
            </Text>
          </View>
        ) : !app.dogrulandi ? (
          <View style={s.kilit}>
            <View style={s.kilitIkon}>
              <Ionicons name="lock-closed" size={22} color={colors.text} />
            </View>
            <Text style={s.kilitBaslik}>Doğrulanmış puan gerekli</Text>
            <Text style={s.kilitText}>Bu ilandaki gerçekçi sıralamanı görmek için ÖSYM KPSS sonuç belgeni yükle.</Text>
            <Buton etiket="Puanını doğrula" ikon="shield-checkmark-outline" onPress={() => router.push('/dogrula')} style={{ marginTop: 16, alignSelf: 'stretch' }} />
          </View>
        ) : !turUyumlu ? (
          <View style={s.kilit}>
            <View style={s.kilitIkon}>
              <Ionicons name="swap-horizontal" size={22} color={colors.text} />
            </View>
            <Text style={s.kilitBaslik}>Puan türü uyuşmuyor</Text>
            <Text style={s.kilitText}>
              Bu ilan {turler} puanıyla alım yapıyor; senin doğrulanmış puanın {app.puanTuru}.
            </Text>
          </View>
        ) : sonuc ? (
          <View style={{ marginTop: 20 }}>
            <SimulasyonSonuc sonuc={sonuc} puan={app.puan} puanTuru={app.puanTuru} kurum={ilan.kurum} kontenjan={ilan.kontenjan} />
          </View>
        ) : (
          <Buton etiket="Simülasyonu çalıştır" ikon="play" onPress={calistir} style={{ marginTop: 18 }} />
        )}
      </Cam>

      {turUyumlu ? <TercihSiralamasi ilan={ilan} /> : null}
        </>
      )}

      <Cam radius={radius.xl} style={{ padding: 20, marginTop: 14 }}>
        <Text style={yazi.kartBaslik}>{ilan.demo ? 'İlan metni' : 'İlan özeti'}</Text>
        <Text style={[yazi.govde, { marginTop: 8, color: colors.textSoft }]}>{ilan.ozet || ilanAciklama(ilan)}</Text>

        {!ilan.puanTurleri?.length ? (
          <View style={s.uyari}>
            <Ionicons name="information-circle-outline" size={18} color={colors.devam} />
            <Text style={s.uyariText}>
              Puan türü ve taban puan özette yok; simülasyon senin puan türün ({app.puanTuru}) ile yapılır. Kesin şartlar için ilan metnine bak.
            </Text>
          </View>
        ) : null}


        {ilan.sartlar ? (
          <View style={{ marginTop: 18 }}>
            <Text style={s.altBaslik}>Genel şartlar</Text>
            {ilan.sartlar.split('\n').map((satir, i) => (
              <View key={i} style={s.madde}>
                <View style={s.maddeNokta} />
                <Text style={s.maddeText}>{satir.replace(/,$/, '')}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <Buton
          etiket={ilan.kaynak === 'Resmi Gazete' && ilan.url ? 'İlan metnini aç' : 'Kariyer Kapısı’nda başvur'}
          ikon="open-outline"
          tip="ikincil"
          style={{ marginTop: 20 }}
          onPress={() => Linking.openURL(ilan.url || (ilan.kaynak === 'Kariyer Kapısı' ? 'https://kariyerkapisi.gov.tr/isealim' : 'https://www.resmigazete.gov.tr'))}
        />
        {ilan.yayin ? (
          <Text style={[yazi.kucuk, { textAlign: 'center', marginTop: 12 }]}>
            Yayın {trTarih(ilan.yayin)} · {ilan.kaynak}
          </Text>
        ) : null}
      </Cam>
    </Ekran>
  );
}

function Kutu({ ikon, etiket, deger, alt }) {
  return (
    <Cam radius={radius.lg} style={s.kutu}>
      <Ionicons name={ikon} size={18} color={colors.accent} />
      <Text style={s.kutuEtiket}>{etiket}</Text>
      <Text style={s.kutuDeger} numberOfLines={1}>
        {String(deger)}
      </Text>
      <Text style={s.kutuAlt} numberOfLines={1}>
        {alt}
      </Text>
    </Cam>
  );
}

const s = StyleSheet.create({
  kutular: { flexDirection: 'row', gap: 10 },
  kutu: { flex: 1, padding: 14 },
  kutuEtiket: { fontFamily: F.m, fontSize: 12, color: colors.textFaint, marginTop: 10 },
  kutuDeger: { fontFamily: F.xb, fontSize: 22, color: colors.text, marginTop: 2, letterSpacing: -0.5 },
  kutuAlt: { fontFamily: F.m, fontSize: 12, color: colors.textSoft, marginTop: 1 },
  kilit: { alignItems: 'center', marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: colors.stroke },
  kilitIkon: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.track, borderWidth: 1, borderColor: colors.stroke, alignItems: 'center', justifyContent: 'center' },
  kilitBaslik: { fontFamily: F.b, fontSize: 17, color: colors.text, marginTop: 12 },
  kilitText: { fontFamily: F.r, textAlign: 'center', color: colors.textSoft, marginTop: 6, lineHeight: 20, fontSize: 14 },
  uyari: { flexDirection: 'row', gap: 8, marginTop: 14, padding: 12, borderRadius: 14, backgroundColor: colors.amberSoft, borderWidth: 1, borderColor: '#F3D9A0' },
  uyariText: { flex: 1, fontFamily: F.r, fontSize: 13, color: colors.text, lineHeight: 19 },
  altBaslik: { fontFamily: F.b, fontSize: 15, color: colors.text, marginBottom: 8 },
  kadro: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.stroke },
  kadroUnvan: { fontFamily: F.sb, fontSize: 14.5, color: colors.text },
  kadroBilgi: { fontFamily: F.r, fontSize: 13, color: colors.textSoft, marginTop: 2 },
  madde: { flexDirection: 'row', marginBottom: 8 },
  maddeNokta: { width: 6, height: 6, borderRadius: 1.5, backgroundColor: colors.accent, marginTop: 8, marginRight: 10 },
  maddeText: { flex: 1, fontFamily: F.r, fontSize: 14, color: colors.textSoft, lineHeight: 21 },
});
