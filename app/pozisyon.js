// Tek bir pozisyonun (kadronun) sayfası: uygunluk, simülasyon ve o kadroya özel tercih sıralaması.
import React, { useState } from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, F, radius } from '../src/theme';
import { Ekran, BuyukBaslik, Cam, Buton, BosDurum, Durum, Rozet, yazi } from '../src/components/ui';
import SimulasyonSonuc from '../src/components/SimulasyonSonuc';
import TercihSiralamasi from '../src/components/TercihSiralamasi';
import { useApp } from '../src/context/AppContext';
import { ilanBul, ilanDurumu, sinavliMi, trTarih } from '../src/services/ilanService';
import { simuleEt } from '../src/services/simulasyon';
import { pozisyonlar, uygunluk } from '../src/utils/pozisyon';

export default function PozisyonEkrani() {
  const { id, k } = useLocalSearchParams();
  const router = useRouter();
  const app = useApp();
  const ilan = ilanBul(String(id));
  const poz = ilan ? pozisyonlar(ilan).find((p) => String(p.k) === String(k)) : null;
  const [sonuc, setSonuc] = useState(null);

  if (!ilan || !poz) {
    return (
      <Ekran sekmeli={false}>
        <BuyukBaslik geri baslik="Pozisyon" />
        <BosDurum baslik="Pozisyon bulunamadı" aciklama="İlan listesi yenilenmiş olabilir." />
      </Ekran>
    );
  }

  const d = ilanDurumu(ilan);
  const u = uygunluk(poz, app);
  const turUyar = !poz.puanTurleri.length || poz.puanTurleri.includes(app.puanTuru);
  const sinavli = sinavliMi(ilan);
  // Pozisyona özel tercih kaydı: ilan kimliği + pozisyon sırası, kontenjan = pozisyonun adedi
  const tercihIlan = { ...ilan, id: `${ilan.id}__${poz.k}`, kontenjan: poz.adet };

  const calistir = () => {
    const r = simuleEt({ puan: app.puan, puanTuru: app.puanTuru, kurumId: ilan.kurumId, kontenjan: poz.adet || undefined, tabanSarti: poz.taban });
    setSonuc(r);
    app.gecmiseEkle({
      kurum: ilan.kurum,
      baslik: poz.unvan,
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
      <BuyukBaslik geri ust={ilan.kurum} baslik={poz.unvan} alt={`${poz.bolum.ad} · ${ilan.baslik}`} />

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: -6, marginBottom: 16, gap: 10, flexWrap: 'wrap' }}>
        <Durum renk={d.renk} etiket={d.etiket} />
        {poz.puanTurleri.length ? <Rozet etiket={poz.puanTurleri.join(' · ')} /> : null}
      </View>

      <View style={s.kutular}>
        <Kutu ikon="people-outline" etiket="Kontenjan" deger={poz.adet ?? '—'} alt={poz.adet ? 'kişi' : 'ilanda'} />
        <Kutu ikon="trending-up-outline" etiket="Taban şartı" deger={poz.taban ?? '—'} alt={poz.taban ? 'puan' : 'ilanda'} />
        <Kutu ikon="calendar-outline" etiket="Son başvuru" deger={ilan.sonBasvuru ? trTarih(ilan.sonBasvuru).slice(0, 5) : '—'} alt={d.gun != null && d.gun >= 0 ? `${d.gun} gün kaldı` : 'ilanda'} />
      </View>

      {poz.egitim ? (
        <Cam radius={radius.lg} style={s.egitim}>
          <Ionicons name="school-outline" size={18} color={colors.navy} />
          <Text style={s.egitimText}>
            <Text style={{ fontFamily: F.b, color: colors.navy }}>Aranan nitelik: </Text>
            {poz.egitim}
          </Text>
        </Cam>
      ) : null}

      {u.uygun != null ? (
        <View style={[s.uygun, { backgroundColor: u.uygun ? colors.greenSoft : colors.redSoft, borderColor: u.uygun ? '#A9DCC1' : '#F3B7BD' }]}>
          <Ionicons name={u.uygun ? 'checkmark-circle' : 'close-circle'} size={20} color={u.uygun ? colors.green : colors.red} />
          <Text style={s.uygunText}>
            <Text style={{ fontFamily: F.b }}>{u.uygun ? 'Bu pozisyon sana uygun. ' : 'Bu pozisyona başvuramazsın. '}</Text>
            {u.neden}.
          </Text>
        </View>
      ) : null}

      <Cam radius={radius.xl} style={{ padding: 20, marginTop: 14 }}>
        <Text style={yazi.kartBaslik}>Atanma olasılığı</Text>
        <Text style={[yazi.soluk, { marginTop: 4 }]}>Bu kadronun kontenjanı ve şartı üzerinden hesaplanır.</Text>
        {sinavli ? (
          <Text style={[yazi.govde, { marginTop: 14 }]}>Bu kadroda atananlar kurumun kendi sınavıyla belirlenir; puana dayalı ihtimal hesaplanmaz.</Text>
        ) : !app.dogrulandi ? (
          <Buton etiket="Puanını doğrula" ikon="shield-checkmark-outline" onPress={() => router.push('/dogrula')} style={{ marginTop: 16 }} />
        ) : !turUyar ? (
          <Text style={[yazi.govde, { marginTop: 14 }]}>
            Bu kadro {poz.puanTurleri.join('/')} puanıyla alım yapıyor; senin doğrulanmış puanın {app.puanTuru}.
          </Text>
        ) : sonuc ? (
          <View style={{ marginTop: 20 }}>
            <SimulasyonSonuc sonuc={sonuc} puan={app.puan} puanTuru={app.puanTuru} kurum={`${ilan.kurum} – ${poz.unvan}`} kontenjan={poz.adet} />
          </View>
        ) : (
          <Buton etiket="Simülasyonu çalıştır" ikon="play" onPress={calistir} style={{ marginTop: 16 }} />
        )}
      </Cam>

      {turUyar ? <TercihSiralamasi ilan={tercihIlan} /> : null}

      <Buton
        etiket="İlan metnini aç"
        ikon="open-outline"
        tip="ikincil"
        style={{ marginTop: 18 }}
        onPress={() => Linking.openURL(ilan.url || (ilan.kaynak === 'Kariyer Kapısı' ? 'https://kariyerkapisi.gov.tr/isealim' : 'https://www.resmigazete.gov.tr'))}
      />
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
  kutuDeger: { fontFamily: F.xb, fontSize: 22, color: colors.navy, marginTop: 2, letterSpacing: -0.5 },
  kutuAlt: { fontFamily: F.m, fontSize: 12, color: colors.textSoft, marginTop: 1 },
  egitim: { flexDirection: 'row', gap: 10, padding: 14, marginTop: 12, alignItems: 'flex-start' },
  egitimText: { flex: 1, fontFamily: F.r, fontSize: 14, color: colors.body, lineHeight: 20 },
  uygun: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: radius.md, borderWidth: 1, marginTop: 12, alignItems: 'flex-start' },
  uygunText: { flex: 1, fontFamily: F.r, fontSize: 14, color: colors.body, lineHeight: 20 },
});
