// Tercih ekranının alttan açılan pencereleri: kılavuzda program arama, tercih ayrıntısı, yapay zekâ ile doldurma.
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, F, radius } from '../theme';
import { AltPencere } from './SecimPenceresi';
import { Alan, Buton, Chip } from './ui';
import { programAdi, tarihselSans, birlesikSans, sansEtiketi, MAKS_TERCIH } from '../services/tercihMerkez';
import { BOLUMLER, bolumBul } from '../utils/pozisyon';

const yuzde = (x) => (x == null ? '—' : `%${Math.round(x * 100)}`);
const puanYaz = (x) => (x == null ? '—' : Number(x).toFixed(2).replace('.', ','));

/* ---------------- Kılavuzda program arama ---------------- */
export function ProgramAramaPenceresi({ gorunur, kapat, kilavuz, puan, puanTuru, mevcut, ekle }) {
  const [arama, setArama] = useState('');
  const programlar = useMemo(() => (kilavuz?.programlar || []).filter((p) => p.puanTuru === puanTuru), [kilavuz, puanTuru]);
  const liste = useMemo(() => {
    const q = arama.trim().toLocaleLowerCase('tr-TR');
    const l = q ? programlar.filter((p) => `${p.kod} ${p.kurum} ${p.unvan} ${p.il} ${p.ilce}`.toLocaleLowerCase('tr-TR').includes(q)) : programlar;
    return l.slice(0, 120);
  }, [arama, programlar]);
  const dolu = mevcut.length >= MAKS_TERCIH;

  return (
    <AltPencere gorunur={gorunur} kapat={kapat} baslik="Kılavuzdan program ekle" aciklama={`${puanTuru} puan türündeki ${programlar.length} program · dokunarak listeye ekle`}>
      <Alan value={arama} onChangeText={setArama} placeholder="Kod, kurum, unvan veya il ara" ikon="search" style={{ marginHorizontal: 20, marginBottom: 8 }} />
      {dolu ? <Text style={[st.not, { marginHorizontal: 20, color: colors.red }]}>Listen dolu (30 tercih). Eklemek için önce bir tercihi kaldır.</Text> : null}
      <FlatList
        data={liste}
        keyExtractor={(p) => p.kod}
        style={{ flexShrink: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<Text style={st.bos}>Sonuç yok</Text>}
        renderItem={({ item: p, index }) => {
          const var_ = mevcut.some((t) => t.kod === p.kod);
          const sans = tarihselSans(p, puan);
          const e = sansEtiketi(sans);
          return (
            <Pressable
              disabled={var_ || dolu}
              onPress={() => ekle(p.kod)}
              style={({ pressed }) => [st.aramaSatir, index < liste.length - 1 && st.cizgi, pressed && { backgroundColor: colors.surfaceAlt }, (var_ || dolu) && { opacity: 0.55 }]}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={st.kod}>{p.kod}</Text>
                <Text style={st.programAd}>{programAdi(p)}</Text>
                <Text style={st.not}>
                  Geçen yıl taban {puanYaz(p.gecenYilTaban)} ·{' '}
                  <Text style={{ color: e.renk, fontFamily: F.b }}>
                    {yuzde(sans)} {e.etiket}
                  </Text>
                </Text>
              </View>
              <Ionicons name={var_ ? 'checkmark-circle' : 'add-circle-outline'} size={24} color={var_ ? colors.green : colors.navy} />
            </Pressable>
          );
        }}
      />
    </AltPencere>
  );
}

/* ---------------- Tercih ayrıntısı ---------------- */
export function TercihDetayPenceresi({ gorunur, kapat, tercih, sira, toplam, program: p, durum, adaySayisi, puan, yukari, asagi, kaldir }) {
  if (!tercih) return null;
  const { sans, kaynak } = birlesikSans(p, puan, durum, adaySayisi || 0);
  const e = sansEtiketi(sans);
  const dagilim = durum?.siraDagilimi || {};
  const siralar = Object.keys(dagilim)
    .map(Number)
    .sort((a, b) => a - b)
    .slice(0, 12);
  const enCok = Math.max(1, ...Object.values(dagilim));
  const durumMetni = {
    yerlestin: { t: 'Şu anki uygulama içi yerleştirmede BU tercihine yerleşiyorsun.', r: colors.green },
    ustTercih: { t: 'Daha üstteki bir tercihine yerleştiğin için buraya sıra gelmiyor.', r: colors.accent },
    dolu: { t: 'Senden yüksek puanlı adaylar kontenjanı dolduruyor.', r: colors.red },
    bos: { t: 'Kontenjan senden önce dolmuyor; bu tercihe sıra gelirse yerleşirsin.', r: colors.green },
  }[durum?.durum];

  return (
    <AltPencere
      gorunur={gorunur}
      kapat={kapat}
      baslik={`${sira}. tercih`}
      aciklama={p ? `${p.kurum} · ${p.unvan}` : tercih.kod}
      altKisim={
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Buton etiket="Yukarı" ikon="arrow-up" tip="ikincil" disabled={sira <= 1} onPress={yukari} style={{ flex: 1 }} />
          <Buton etiket="Aşağı" ikon="arrow-down" tip="ikincil" disabled={sira >= toplam} onPress={asagi} style={{ flex: 1 }} />
          <Buton etiket="Kaldır" ikon="trash-outline" tip="ikincil" onPress={kaldir} style={{ flex: 1 }} />
        </View>
      }
    >
      <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }}>
        <View style={st.kutu}>
          <Text style={st.kod}>{tercih.kod}</Text>
          <Text style={[st.programAd, { fontSize: 14 }]}>{programAdi(p)}</Text>
          {p ? <Text style={[st.not, { marginTop: 6 }]}>{p.istihdam} · Nitelik: {p.nitelik} ({p.nitelikKodlari?.join(', ')})</Text> : null}
        </View>

        {tercih.neden ? (
          <View style={[st.kutu, { backgroundColor: colors.violetSoft, borderColor: '#DCD3F5' }]}>
            <Text style={[st.kucukBaslik, { color: colors.violet }]}>✨ Sana özel</Text>
            <Text style={st.govde}>{tercih.neden}</Text>
          </View>
        ) : null}

        <View style={st.istatistik}>
          <Ist etiket="Şansın" deger={yuzde(sans)} alt={e.etiket} renk={e.renk} />
          <Ist etiket="Kontenjan" deger={p?.kontenjan ?? '—'} alt="kişi" />
          <Ist etiket="Geçen yıl taban" deger={puanYaz(p?.gecenYilTaban)} alt={`tavan ${puanYaz(p?.gecenYilTavan)}`} />
        </View>
        <Text style={[st.not, { marginTop: 6 }]}>
          {kaynak === 'birlesik' ? 'Şans; geçen yılın taban puanı ve uygulamadaki adaylarla yapılan yerleştirme birlikte değerlendirilerek hesaplandı.' : 'Şans geçen yılın taban puanına göre hesaplandı (uygulamada henüz yeterli aday yok).'}
        </Text>

        <Text style={st.bolum}>Uygulamadaki adaylar</Text>
        {durum ? (
          <>
            <View style={st.istatistik}>
              <Ist etiket="Bu programı yazan" deger={durum.toplamListeleyen} alt="aday" />
              <Ist etiket={`${sira}. sıraya yazan`} deger={durum.buSiradaSayisi} alt={durum.buSiradaSiram ? `sen ${durum.buSiradaSiram}. sıradasın` : ''} />
              <Ist etiket="Puan sıran" deger={`${durum.siramTum}.`} alt={`${durum.toplamListeleyen} kişi içinde`} />
            </View>
            {durumMetni ? (
              <View style={[st.durum, { borderColor: durumMetni.r }]}>
                <View style={[st.kare, { backgroundColor: durumMetni.r }]} />
                <Text style={st.govde}>
                  {durumMetni.t} Uygulamada buraya yerleşen {durum.yerlesenSayisi}/{durum.kontenjan} kişi
                  {durum.simTaban != null ? `, en düşük puan ${puanYaz(durum.simTaban)}` : ''}.
                </Text>
              </View>
            ) : null}

            <Text style={[st.kucukBaslik, { marginTop: 14 }]}>Kaç kişi bu programı kaçıncı sıraya yazdı?</Text>
            {siralar.length ? (
              siralar.map((n) => (
                <View key={n} style={st.barSatir}>
                  <Text style={[st.barEtiket, n === sira && { color: colors.navy, fontFamily: F.b }]}>{n}. sıra</Text>
                  <View style={st.barIz}>
                    <View style={[st.bar, { width: `${(dagilim[n] / enCok) * 100}%`, backgroundColor: n === sira ? colors.navy : colors.strokeStrong }]} />
                  </View>
                  <Text style={[st.barDeger, n === sira && { color: colors.navy, fontFamily: F.b }]}>{dagilim[n]}</Text>
                </View>
              ))
            ) : (
              <Text style={st.not}>Henüz başka aday bu programı yazmadı.</Text>
            )}
          </>
        ) : (
          <Text style={st.not}>Listeni kaydettiğinde, bu programı yazan diğer adaylar arasındaki yerin burada görünür.</Text>
        )}
      </ScrollView>
    </AltPencere>
  );
}

/* ---------------- Yapay zekâ ile doldur ---------------- */
export function AiDoldurPenceresi({ gorunur, kapat, kilavuz, puanTuru, yukleniyor, olustur, mevcutSayi }) {
  const [strateji, setStrateji] = useState('dengeli');
  const [iller, setIller] = useState([]);
  const [bolumler, setBolumler] = useState([]);
  const [mezuniyet, setMezuniyet] = useState('');
  const [not, setNot] = useState('');
  const ilListesi = useMemo(
    () => [...new Set((kilavuz?.programlar || []).filter((p) => p.puanTuru === puanTuru).map((p) => p.il))].sort((a, b) => a.localeCompare(b, 'tr')),
    [kilavuz, puanTuru],
  );
  const bolumListesi = useMemo(() => {
    const var_ = new Set((kilavuz?.programlar || []).filter((p) => p.puanTuru === puanTuru).map((p) => bolumBul(`${p.unvan} ${p.nitelik}`).kod));
    return BOLUMLER.filter((b) => var_.has(b.kod));
  }, [kilavuz, puanTuru]);
  const degistir = (dizi, ayarla, x) => ayarla(dizi.includes(x) ? dizi.filter((y) => y !== x) : [...dizi, x]);

  return (
    <AltPencere
      gorunur={gorunur}
      kapat={kapat}
      baslik="Yapay zekâ ile doldur"
      aciklama="Puanına ve isteklerine göre 30 tercihlik dengeli bir liste hazırlar."
      altKisim={
        <>
          {mevcutSayi ? <Text style={[st.not, { marginBottom: 8, textAlign: 'center' }]}>Mevcut {mevcutSayi} tercihin yeni listeyle değiştirilecek.</Text> : null}
          <Buton etiket="Listeyi oluştur" ikon="sparkles" yukleniyor={yukleniyor} onPress={() => olustur({ strateji, iller, bolumler, mezuniyet, not })} />
        </>
      }
    >
      <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }} keyboardShouldPersistTaps="handled">
        <Text style={st.kucukBaslik}>Strateji</Text>
        <View style={st.sarmal}>
          {[
            ['riskli', 'Riskli', 'Hayal tercihleri ağırlıklı'],
            ['dengeli', 'Dengeli', 'Hayal + hedef + garanti'],
            ['garantici', 'Garantici', 'Açıkta kalmamaya odaklı'],
          ].map(([k, ad]) => (
            <Chip key={k} etiket={ad} secili={strateji === k} onPress={() => setStrateji(k)} />
          ))}
        </View>
        <Text style={st.not}>
          {{ riskli: 'Yüksek tabanlı programlara daha çok yer verir.', dengeli: 'ÖSYM’nin önerdiği gibi: üstte istediğin, altta garanti tercihler.', garantici: 'Şansı yüksek programları çoğaltır, açıkta kalma riskini azaltır.' }[strateji]}
        </Text>

        <Alan etiket="Mezun olduğun bölüm" value={mezuniyet} onChangeText={setMezuniyet} placeholder={puanTuru === 'P94' ? 'Örn. Lise (genel), bilgisayar sertifikam var' : 'Örn. Hemşirelik, Bilgisayar programcılığı'} style={{ marginTop: 16 }} />
        <Text style={[st.not, { marginTop: 4 }]}>Belirli bölüm isteyen kadrolar yalnızca mezuniyetin uyuşuyorsa önerilir.</Text>

        <Text style={[st.kucukBaslik, { marginTop: 16 }]}>Tercih ettiğin iller {iller.length ? `(${iller.length})` : '(boşsa hepsi)'}</Text>
        <View style={st.sarmal}>
          {ilListesi.map((x) => (
            <Chip key={x} etiket={x} secili={iller.includes(x)} onPress={() => degistir(iller, setIller, x)} />
          ))}
        </View>

        <Text style={[st.kucukBaslik, { marginTop: 16 }]}>İş bölümleri {bolumler.length ? `(${bolumler.length})` : '(boşsa hepsi)'}</Text>
        <View style={st.sarmal}>
          {bolumListesi.map((b) => (
            <Chip key={b.kod} etiket={b.ad} ikon={b.ikon} secili={bolumler.includes(b.kod)} onPress={() => degistir(bolumler, setBolumler, b.kod)} />
          ))}
        </View>

        <Alan
          etiket="Yapay zekâya notun"
          value={not}
          onChangeText={setNot}
          placeholder="Örn. Ailemin yanında, Doğu’ya gitmek istemiyorum, masa başı iş"
          multiline
          inputStyle={{ minHeight: 70, textAlignVertical: 'top' }}
          style={{ marginTop: 16 }}
        />
      </ScrollView>
    </AltPencere>
  );
}

function Ist({ etiket, deger, alt, renk }) {
  return (
    <View style={st.ist}>
      <Text style={st.istEtiket} numberOfLines={1}>
        {etiket}
      </Text>
      <Text style={[st.istDeger, renk && { color: renk }]} numberOfLines={1}>
        {String(deger)}
      </Text>
      {alt ? (
        <Text style={st.istAlt} numberOfLines={1}>
          {alt}
        </Text>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  aramaSatir: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  cizgi: { borderBottomWidth: 1, borderBottomColor: colors.stroke },
  kod: { fontFamily: F.b, fontSize: 13, color: colors.accent, letterSpacing: 0.6 },
  programAd: { fontFamily: F.sb, fontSize: 13, color: colors.navy, marginTop: 2, lineHeight: 18 },
  not: { fontFamily: F.r, fontSize: 12.5, color: colors.textFaint, marginTop: 3, lineHeight: 17 },
  bos: { fontFamily: F.r, color: colors.textFaint, textAlign: 'center', padding: 20 },
  kutu: { borderWidth: 1, borderColor: colors.stroke, borderRadius: radius.md, padding: 12, marginBottom: 10, backgroundColor: colors.surfaceAlt },
  kucukBaslik: { fontFamily: F.b, fontSize: 13.5, color: colors.navy, marginBottom: 8 },
  govde: { flex: 1, fontFamily: F.r, fontSize: 14, color: colors.body, lineHeight: 20 },
  bolum: { fontFamily: F.b, fontSize: 17, color: colors.navy, marginTop: 18, marginBottom: 10 },
  istatistik: { flexDirection: 'row', gap: 8 },
  ist: { flex: 1, minWidth: 0, borderWidth: 1, borderColor: colors.stroke, borderRadius: radius.md, padding: 10 },
  istEtiket: { fontFamily: F.m, fontSize: 11, color: colors.textFaint },
  istDeger: { fontFamily: F.xb, fontSize: 19, color: colors.navy, marginTop: 2 },
  istAlt: { fontFamily: F.m, fontSize: 11, color: colors.textSoft },
  durum: { flexDirection: 'row', gap: 8, borderLeftWidth: 3, paddingLeft: 10, paddingVertical: 6, marginTop: 12, alignItems: 'flex-start' },
  kare: { width: 9, height: 9, marginTop: 6 },
  barSatir: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  barEtiket: { width: 58, fontFamily: F.m, fontSize: 12.5, color: colors.textSoft },
  barIz: { flex: 1, height: 10, backgroundColor: colors.track, borderRadius: 3, overflow: 'hidden', marginHorizontal: 8 },
  bar: { height: 10, borderRadius: 3 },
  barDeger: { width: 30, textAlign: 'right', fontFamily: F.sb, fontSize: 12.5, color: colors.textSoft },
  sarmal: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 },
});
