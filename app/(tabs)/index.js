import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, ScrollView, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, F, radius, PUAN_TURLERI, TAB_BAR_ALAN } from '../../src/theme';
import { Ekran, BuyukBaslik, Chip, BosDurum, Alan, BolumBasligi, Durum, Cam } from '../../src/components/ui';
import PuanKarti from '../../src/components/PuanKarti';
import Logo from '../../src/components/Logo';
import SecimPenceresi, { SecimButonu } from '../../src/components/SecimPenceresi';
import ProBanner from '../../src/components/ProBanner';
import IlanKart from '../../src/components/IlanKart';
import { useApp } from '../../src/context/AppContext';
import { ilanlariGetir, turUygun, sinavliMi } from '../../src/services/ilanService';
import { simuleEt } from '../../src/services/simulasyon';
import { BOLUMLER, ilanBolumleri, pozisyonlar, uygunluk } from '../../src/utils/pozisyon';
import { ilkAd } from '../../src/utils/metin';

const SIRALAMALAR = [
  { kod: 'olasilik', ad: 'En yüksek olasılık' },
  { kod: 'tarih', ad: 'Son başvuru yakın' },
  { kod: 'kontenjan', ad: 'Kontenjan çok' },
];

const selam = () => {
  const s = new Date().getHours();
  return s < 6 ? 'İyi geceler' : s < 12 ? 'Günaydın' : s < 18 ? 'İyi günler' : 'İyi akşamlar';
};

export default function IlanlarEkrani() {
  const { puan, puanTuru, dogrulandi, adSoyad } = useApp();
  const ad = dogrulandi ? ilkAd(adSoyad) : null;
  const [ilanlar, setIlanlar] = useState([]);
  const [bilgi, setBilgi] = useState({ canli: false });
  const [yenileniyor, setYenileniyor] = useState(false);
  const [tur, setTur] = useState('Tümü');
  const [arama, setArama] = useState('');
  const [filtreAcik, setFiltreAcik] = useState(false);
  const [sadeceUygun, setSadeceUygun] = useState(false);
  const [sadeceAktif, setSadeceAktif] = useState(true);
  const [kaynak, setKaynak] = useState('Tümü');
  const [il, setIl] = useState('Tümü');
  const [bolum, setBolum] = useState('Tümü');
  const [pencere, setPencere] = useState(null);
  const [siralama, setSiralama] = useState('olasilik');

  const yukle = async () => {
    setYenileniyor(true);
    const r = await ilanlariGetir();
    setIlanlar(r.ilanlar);
    setBilgi(r);
    setYenileniyor(false);
  };
  useEffect(() => {
    yukle();
  }, []);
  // Sunucu hâlâ tarıyorsa listeyi 20 sn'de bir sessizce tazele
  useEffect(() => {
    if (!bilgi.asama) return;
    const t = setTimeout(async () => {
      const r = await ilanlariGetir();
      setIlanlar(r.ilanlar);
      setBilgi(r);
    }, 20000);
    return () => clearTimeout(t);
  }, [bilgi]);

  const liste = useMemo(() => {
    const q = arama.trim().toLocaleLowerCase('tr-TR');
    let l = ilanlar
      .filter((i) => tur === 'Tümü' || pozisyonlar(i).some((p) => p.puanTurleri.includes(tur)))
      .filter((i) => il === 'Tümü' || i.il === il)
      .filter((i) => bolum === 'Tümü' || ilanBolumleri(i).some((b) => b.kod === bolum))
      .filter((i) => kaynak === 'Tümü' || i.kaynak === kaynak)
      .filter((i) => !sadeceAktif || i.durum === 'Aktif')
      .filter((i) => !q || `${i.kurum} ${i.baslik} ${i.il || ''}`.toLocaleLowerCase('tr-TR').includes(q))
      .map((i) => ({
        ilan: i,
        sim:
          dogrulandi && puan != null && turUygun(i, puanTuru) && !sinavliMi(i)
            ? simuleEt({ puan, puanTuru, kurumId: i.kurumId, kontenjan: i.kontenjan || undefined, tabanSarti: i.tabanSarti })
            : null,
      }));
    if (sadeceUygun && dogrulandi) l = l.filter((x) => pozisyonlar(x.ilan).some((p) => uygunluk(p, { dogrulandi, puan, puanTuru }).uygun));
    l.sort((a, b) => {
      if (siralama === 'olasilik') return (b.sim?.olasilik ?? -1) - (a.sim?.olasilik ?? -1);
      if (siralama === 'tarih') return (a.ilan.sonBasvuru || '9999').localeCompare(b.ilan.sonBasvuru || '9999');
      return (b.ilan.kontenjan || 0) - (a.ilan.kontenjan || 0);
    });
    return l;
  }, [ilanlar, tur, kaynak, il, bolum, arama, sadeceUygun, sadeceAktif, siralama, dogrulandi, puan, puanTuru]);

  const iller = useMemo(
    () => [...new Set(ilanlar.map((i) => i.il).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr')),
    [ilanlar],
  );
  const bolumler = useMemo(() => {
    const var_ = new Set(ilanlar.flatMap((i) => ilanBolumleri(i).map((b) => b.kod)));
    return [...BOLUMLER, { kod: 'genel', ad: 'Genel / Çeşitli', ikon: 'apps-outline' }].filter((b) => var_.has(b.kod));
  }, [ilanlar]);
  const filtreSayisi = [kaynak !== 'Tümü', !sadeceAktif, siralama !== 'olasilik'].filter(Boolean).length;
  const bolumSecenekleri = useMemo(
    () => [
      { kod: 'Tümü', ad: 'Tüm bölümler', ikon: 'briefcase-outline', adet: ilanlar.length },
      ...bolumler.map((b) => ({ ...b, adet: ilanlar.filter((i) => ilanBolumleri(i).some((x) => x.kod === b.kod)).length })),
    ],
    [bolumler, ilanlar],
  );
  const ilSecenekleri = useMemo(
    () => [{ kod: 'Tümü', ad: 'Tüm iller', adet: ilanlar.length }, ...iller.map((x) => ({ kod: x, ad: x, adet: ilanlar.filter((i) => i.il === x).length }))],
    [iller, ilanlar],
  );

  const ust = (
    <View>
      <View style={s.ustBar}>
        <Logo yukseklik={52} />
      </View>
      <View style={s.selamSatir}>
        <Text style={s.selam} numberOfLines={1}>
          {selam()}
          {ad ? ', ' : ''}
          {ad ? <Text style={s.ad}>{ad}</Text> : null}
        </Text>
        {dogrulandi && puan != null ? (
          <View style={s.puanRozet}>
            <Ionicons name="shield-checkmark" size={15} color={colors.green} />
            <View style={{ marginLeft: 6 }}>
              <Text style={s.puanRozetDeger}>{Number(puan).toFixed(2)}</Text>
              <Text style={s.puanRozetAlt}>{puanTuru} · doğrulandı</Text>
            </View>
          </View>
        ) : null}
      </View>
      <BuyukBaslik baslik="Kamu ilanları" alt="Kariyer Kapısı ve Resmî Gazete’deki güncel memur ve sözleşmeli personel alımları." />
      {!dogrulandi ? (
        <>
          <PuanKarti />
          <View style={{ height: 12 }} />
        </>
      ) : null}
      <ProBanner />

      <Text style={[s.satirBaslik, { marginTop: 22 }]}>Puan türü</Text>
      <View style={s.sarmal}>
        <Chip etiket="Tümü" secili={tur === 'Tümü'} onPress={() => setTur('Tümü')} />
        {PUAN_TURLERI.map((p) => (
          <Chip key={p.kod} etiket={p.ad} secili={tur === p.kod} onPress={() => setTur(p.kod)} />
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        <SecimButonu
          etiket="İş bölümü"
          ikon={bolum === 'Tümü' ? 'briefcase-outline' : bolumSecenekleri.find((b) => b.kod === bolum)?.ikon}
          deger={bolum === 'Tümü' ? 'Tüm bölümler' : bolumSecenekleri.find((b) => b.kod === bolum)?.ad || 'Tüm bölümler'}
          aktif={bolum !== 'Tümü'}
          onPress={() => setPencere('bolum')}
        />
        <SecimButonu etiket="İl" ikon="location-outline" deger={il === 'Tümü' ? 'Tüm iller' : il} aktif={il !== 'Tümü'} onPress={() => setPencere('il')} />
      </View>
      {il !== 'Tümü' ? <Text style={[s.not, { marginTop: 6 }]}>İl belirtilmeyen (Türkiye geneli) ilanlar bu filtrede gizlenir.</Text> : null}

      <Alan value={arama} onChangeText={setArama} placeholder="Unvan, kurum veya il ara" ikon="search" style={{ marginTop: 14 }} />

      <View style={{ flexDirection: 'row', marginTop: 12 }}>
        <Chip etiket={filtreSayisi ? `Filtrele (${filtreSayisi})` : "Filtrele"} ikon="options-outline" secili={filtreAcik} onPress={() => setFiltreAcik((x) => !x)} />
        {dogrulandi ? <Chip etiket="Bana uygun" ikon="checkmark-done" secili={sadeceUygun} onPress={() => setSadeceUygun((x) => !x)} /> : null}
      </View>

      {filtreAcik ? (
        <Cam radius={radius.lg} style={{ padding: 16, marginTop: 12 }}>
          <Text style={s.filtreBaslik}>Kaynak</Text>
          <View style={s.satir}>
            {['Tümü', 'Kariyer Kapısı', 'Resmi Gazete'].map((k) => (
              <Chip key={k} etiket={k} secili={kaynak === k} onPress={() => setKaynak(k)} />
            ))}
          </View>
          <Text style={s.filtreBaslik}>Sıralama</Text>
          <View style={s.satir}>
            {SIRALAMALAR.map((x) => (
              <Chip key={x.kod} etiket={x.ad} secili={siralama === x.kod} onPress={() => setSiralama(x.kod)} />
            ))}
          </View>
          <Text style={s.filtreBaslik}>Durum</Text>
          <View style={s.satir}>
            <Chip etiket="Sadece açık" secili={sadeceAktif} onPress={() => setSadeceAktif(true)} />
            <Chip etiket="Hepsi" secili={!sadeceAktif} onPress={() => setSadeceAktif(false)} />
          </View>
        </Cam>
      ) : null}

      <BolumBasligi sag={`${liste.length} ilan`}>Açık alımlar</BolumBasligi>
      <View style={s.bilgiSatir}>
        <Durum
          renk={bilgi.canli ? colors.green : colors.devam}
          kucuk
          etiket={
            bilgi.canli
              ? bilgi.asama
                ? `Canlı · ${bilgi.asama}…`
                : `Canlı · ${bilgi.guncelleme ? new Date(bilgi.guncelleme).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}`
              : bilgi.hata || 'Demo ilanlar'
          }
        />
      </View>
      <View style={s.lejant}>
        <Durum renk={colors.sonGun} etiket="Son gün" kucuk />
        <Durum renk={colors.devam} etiket="Devam ediyor" kucuk />
        <Durum renk={colors.yakin} etiket="Yeni" kucuk />
      </View>
    </View>
  );

  return (
    <Ekran kaydir={false}>
      <FlatList
        data={liste}
        keyExtractor={(x) => x.ilan.id}
        ListHeaderComponent={ust}
        renderItem={({ item }) => <IlanKart ilan={item.ilan} olasilik={item.sim} />}
        ListEmptyComponent={<BosDurum ikon="search-outline" baslik="İlan bulunamadı" aciklama="Filtreleri değiştirip tekrar dene." />}
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: TAB_BAR_ALAN }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={yenileniyor} onRefresh={yukle} tintColor={colors.text} />}
      />
      <SecimPenceresi
        gorunur={pencere === 'bolum'}
        kapat={() => setPencere(null)}
        baslik="İş bölümü"
        aciklama="İlandaki kadro adlarına göre gruplanır."
        secenekler={bolumSecenekleri}
        secili={bolum}
        sec={setBolum}
      />
      <SecimPenceresi
        gorunur={pencere === 'il'}
        kapat={() => setPencere(null)}
        baslik="İl seç"
        aciklama="İli belirtilen ilanlar arasından."
        secenekler={ilSecenekleri}
        secili={il}
        sec={setIl}
        aramali
      />
    </Ekran>
  );
}

const s = StyleSheet.create({
  sarmal: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 },
  satirBaslik: { fontFamily: F.sb, fontSize: 13, color: colors.textSoft, marginTop: 16, marginBottom: 8 },
  not: { fontFamily: F.r, fontSize: 12, color: colors.textFaint },
  ustBar: { alignItems: 'center', justifyContent: 'center', paddingTop: 10, paddingBottom: 14, marginHorizontal: -18, borderBottomWidth: 1, borderBottomColor: colors.stroke, marginBottom: 18 },
  selamSatir: { flexDirection: 'row', alignItems: 'center', borderLeftWidth: 4, borderLeftColor: colors.brand, paddingLeft: 12, minHeight: 44 },
  selam: { flex: 1, fontFamily: F.sb, fontSize: 19, color: colors.textSoft, marginRight: 10 },
  puanRozet: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.greenSoft, borderWidth: 1, borderColor: '#A9DCC1', borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 6 },
  puanRozetDeger: { fontFamily: F.xb, fontSize: 17, color: colors.navy, lineHeight: 20 },
  puanRozetAlt: { fontFamily: F.m, fontSize: 11, color: colors.green },
  ad: { fontFamily: F.xb, fontSize: 22, color: colors.brandDark, letterSpacing: -0.4 },
  filtreBaslik: { fontFamily: F.sb, fontSize: 13, color: colors.textSoft, marginBottom: 10, marginTop: 6 },
  satir: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, marginBottom: 6 },
  bilgiSatir: { marginTop: -4, marginBottom: 10 },
  lejant: { flexDirection: 'row', gap: 14, marginBottom: 14 },
});
