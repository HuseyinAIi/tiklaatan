// KPSS merkezi yerleştirme tercih listesi (ÖSYM AİS tercih ekranı düzeninde).
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, F, radius } from '../../src/theme';
import { Ekran, BuyukBaslik, Cam, Buton, yazi } from '../../src/components/ui';
import { ProgramAramaPenceresi, TercihDetayPenceresi, AiDoldurPenceresi } from '../../src/components/TercihPencereleri';
import { useApp } from '../../src/context/AppContext';
import { uyari } from '../../src/uyari';
import { kilavuzGetir, durumGetir, listeKaydet, otomatikDoldur, programAdi, birlesikSans, sansEtiketi, MAKS_TERCIH } from '../../src/services/tercihMerkez';

export default function TercihEkrani() {
  const app = useApp();
  const router = useRouter();
  const liste = app.tercihListesi || [];
  const [kilavuz, setKilavuz] = useState(null);
  const [durum, setDurum] = useState(null);
  const [hata, setHata] = useState(null);
  const [pencere, setPencere] = useState(null); // 'ara' | 'ai' | { detay: index }
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [aiYukleniyor, setAiYukleniyor] = useState(false);
  const [aiBilgi, setAiBilgi] = useState(null);

  const yukle = useCallback(async () => {
    try {
      setKilavuz(await kilavuzGetir());
      if (app.kullaniciId) setDurum(await durumGetir(app.kullaniciId));
      setHata(null);
    } catch (e) {
      setHata(e.message);
    }
  }, [app.kullaniciId]);

  useEffect(() => {
    yukle();
  }, [yukle]);

  // Durum verisini sadece kaydedilmiş liste ile uyumluysa satırlara eşle
  const durumHarita = useMemo(() => {
    const m = new Map();
    if (durum?.kayitli && !app.tercihDegisti) for (const t of durum.tercihler) m.set(t.kod, t);
    return m;
  }, [durum, app.tercihDegisti]);

  const tasi = (i, yon) =>
    app.tercihListesiAyarla((l) => {
      const j = i + yon;
      if (j < 0 || j >= l.length) return l;
      const y = [...l];
      [y[i], y[j]] = [y[j], y[i]];
      return y;
    });
  const kaldir = (i) => app.tercihListesiAyarla((l) => l.filter((_, k) => k !== i));
  const ekle = (kod) => app.tercihListesiAyarla((l) => (l.some((t) => t.kod === kod) || l.length >= MAKS_TERCIH ? l : [...l, { kod }]));

  const kaydet = async () => {
    setKaydediliyor(true);
    try {
      const r = await listeKaydet({ kullaniciId: app.kullaniciId, puan: app.puan, puanTuru: app.puanTuru, dogrulandi: app.dogrulandi, tercihler: liste });
      app.tercihListesiAyarla(liste, true);
      setDurum(r);
      setHata(null);
    } catch (e) {
      uyari('Kaydedilemedi', e.message);
    } finally {
      setKaydediliyor(false);
    }
  };

  const aiOlustur = async (secenek) => {
    if (!kilavuz) return;
    setAiYukleniyor(true);
    try {
      const r = await otomatikDoldur({ kilavuz, puan: app.puan, puanTuru: app.puanTuru, ...secenek });
      if (!r.tercihler.length) {
        uyari('Uygun program bulunamadı', 'Seçtiğin il/bölüm ve mezuniyetle eşleşen program yok. Filtreleri genişletip tekrar dene.');
        return;
      }
      app.tercihListesiAyarla(r.tercihler);
      setAiBilgi(
        `${r.tercihler.length} tercih ${r.yzKullanildi ? 'yapay zekâ tarafından notuna göre' : 'puanına göre'} sıralandı (${r.havuzBoyutu} uygun program içinden). Kontrol edip kaydet.`,
      );
      setPencere(null);
    } finally {
      setAiYukleniyor(false);
    }
  };

  if (!app.dogrulandi) {
    return (
      <Ekran>
        <BuyukBaslik baslik="Tercih" alt="KPSS merkezi yerleştirme tercih listeni hazırla." />
        <Cam radius={radius.xl} style={{ padding: 24, alignItems: 'center' }}>
          <Ionicons name="lock-closed-outline" size={30} color={colors.navy} />
          <Text style={[yazi.kartBaslik, { marginTop: 10 }]}>Önce puanını doğrula</Text>
          <Text style={[yazi.soluk, { textAlign: 'center', marginTop: 6 }]}>
            Tercih listesi ve diğer adaylarla yerleştirme simülasyonu yalnızca ÖSYM belgesiyle doğrulanmış puanla çalışır.
          </Text>
          <Buton etiket="Puanını doğrula" ikon="shield-checkmark-outline" onPress={() => router.push('/dogrula')} style={{ marginTop: 16, alignSelf: 'stretch' }} />
        </Cam>
      </Ekran>
    );
  }

  const detayIndex = typeof pencere === 'object' && pencere ? pencere.detay : null;
  const detayTercih = detayIndex != null ? liste[detayIndex] : null;
  const yerlestigim = durum?.kayitli && !app.tercihDegisti ? durum.yerlestigim : null;
  const yerlestigimProgram = yerlestigim ? kilavuz?.harita.get(yerlestigim.kod) : null;

  return (
    <Ekran>
      <BuyukBaslik baslik="Tercih" alt={`KPSS merkezi yerleştirme · ${app.puanTuru} · ${Number(app.puan).toFixed(2)} puan · en fazla ${MAKS_TERCIH} tercih`} />

      {kilavuz?.ornek ? (
        <View style={s.uyari}>
          <Ionicons name="information-circle" size={18} color={colors.amber} />
          <Text style={s.uyariText}>
            <Text style={{ fontFamily: F.b }}>Örnek kılavuz. </Text>
            2026 KPSS tercih kılavuzu ÖSYM tarafından yayımlandığında kodlar ve kontenjanlar gerçek kılavuzla değişecek.
          </Text>
        </View>
      ) : null}
      {hata ? (
        <View style={[s.uyari, { backgroundColor: colors.redSoft, borderColor: '#F3B7BD' }]}>
          <Ionicons name="cloud-offline-outline" size={18} color={colors.red} />
          <Text style={s.uyariText}>{hata}</Text>
          <Pressable onPress={yukle} hitSlop={8}>
            <Text style={{ fontFamily: F.b, color: colors.red }}>Tekrar dene</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Yerleştirme durumu */}
      <Cam radius={radius.xl} style={{ padding: 18 }}>
        <Text style={s.kucukBaslik}>UYGULAMA İÇİ YERLEŞTİRME</Text>
        {!durum?.kayitli ? (
          <Text style={[yazi.govde, { marginTop: 6 }]}>
            Listeni kaydet; uygulamada tercih kaydeden diğer doğrulanmış adaylarla birlikte ÖSYM yöntemiyle yerleştirme yapılsın.
          </Text>
        ) : app.tercihDegisti ? (
          <Text style={[yazi.govde, { marginTop: 6 }]}>Listende kaydedilmemiş değişiklik var. Sonucu görmek için kaydet.</Text>
        ) : yerlestigim ? (
          <>
            <Text style={[s.sonucBuyuk, { color: colors.green }]}>{yerlestigim.sira}. tercihine yerleşiyorsun</Text>
            <Text style={s.sonucProgram}>{programAdi(yerlestigimProgram)}</Text>
          </>
        ) : (
          <>
            <Text style={[s.sonucBuyuk, { color: colors.red }]}>Hiçbir tercihine yerleşemiyorsun</Text>
            <Text style={yazi.soluk}>Listenin altına şansı yüksek (garanti) tercihler eklemeyi düşün.</Text>
          </>
        )}
        {durum?.kayitli ? (
          <Text style={[s.not, { marginTop: 10 }]}>
            {durum.puanTuru} tercihi kaydeden {durum.adaySayisi} aday · aralarında puan sıran {durum.genelSiram}.
            {durum.testAdaySayisi ? ` (${durum.testAdaySayisi} tanesi test adayı)` : ''}
          </Text>
        ) : null}
      </Cam>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        <Buton etiket="Yapay zekâ ile doldur" ikon="sparkles" onPress={() => setPencere('ai')} disabled={!kilavuz} style={{ flex: 1.25 }} />
        <Buton etiket="Kılavuzdan ekle" ikon="add" tip="ikincil" onPress={() => setPencere('ara')} disabled={!kilavuz} style={{ flex: 1 }} />
      </View>
      {aiBilgi ? <Text style={[s.not, { marginTop: 8 }]}>✨ {aiBilgi}</Text> : null}

      {/* ÖSYM tarzı tercih tablosu */}
      <Cam radius={radius.lg} style={{ marginTop: 16 }}>
        <View style={s.tabloBaslik}>
          <Text style={s.tabloBaslikText}>TERCİH BİLGİLERİ</Text>
          <Text style={s.tabloBaslikSag}>
            {liste.length}/{MAKS_TERCIH}
          </Text>
        </View>
        <View style={s.sutunlar}>
          <Text style={[s.sutun, { width: 64 }]}>Sıra</Text>
          <Text style={[s.sutun, { flex: 1 }]}>Kod · Program adı</Text>
        </View>
        {!kilavuz && !hata ? <ActivityIndicator color={colors.navy} style={{ margin: 24 }} /> : null}
        {liste.map((t, i) => {
          const p = kilavuz?.harita.get(t.kod);
          const d = durumHarita.get(t.kod);
          const { sans } = birlesikSans(p, app.puan, d, durum?.adaySayisi || 0);
          const e = sansEtiketi(sans);
          const yerlesti = yerlestigim && yerlestigim.sira === i + 1;
          return (
            <View key={t.kod} style={[s.satir, yerlesti && { backgroundColor: colors.greenSoft }]}>
              <View style={s.siraKol}>
                <View style={[s.siraNo, yerlesti && { backgroundColor: colors.green }]}>
                  <Text style={s.siraNoText}>{i + 1}</Text>
                </View>
                <View style={s.oklar}>
                  <Pressable onPress={() => tasi(i, -1)} disabled={i === 0} hitSlop={6} accessibilityLabel="Yukarı taşı">
                    <Ionicons name="caret-up" size={16} color={i === 0 ? colors.stroke : colors.navy} />
                  </Pressable>
                  <Pressable onPress={() => tasi(i, 1)} disabled={i === liste.length - 1} hitSlop={6} accessibilityLabel="Aşağı taşı">
                    <Ionicons name="caret-down" size={16} color={i === liste.length - 1 ? colors.stroke : colors.navy} />
                  </Pressable>
                </View>
              </View>
              <Pressable style={{ flex: 1, minWidth: 0 }} onPress={() => setPencere({ detay: i })}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={s.kod}>{t.kod}</Text>
                  <View style={[s.sans, { borderColor: e.renk }]}>
                    <Text style={[s.sansText, { color: e.renk }]}>
                      {sans == null ? '—' : `%${Math.round(sans * 100)}`} {e.etiket}
                    </Text>
                  </View>
                </View>
                <Text style={s.program}>{programAdi(p)}</Text>
                {d ? (
                  <Text style={s.not}>
                    {d.buSiradaSayisi} kişi {i + 1}. sıraya yazdı{d.buSiradaSiram ? `; aralarında ${d.buSiradaSiram}. sıradasın` : ''} · yazan {d.toplamListeleyen} kişide puan sıran {d.siramTum}.
                  </Text>
                ) : t.neden ? (
                  <Text style={[s.not, { color: colors.violet }]} numberOfLines={2}>
                    ✨ {t.neden}
                  </Text>
                ) : null}
                <Text style={s.nitelik}>Ayrıntı ve nitelikler ›</Text>
              </Pressable>
              <Pressable onPress={() => kaldir(i)} hitSlop={8} style={s.sil} accessibilityLabel="Tercihi kaldır">
                <Ionicons name="close" size={18} color={colors.textFaint} />
              </Pressable>
            </View>
          );
        })}
        {kilavuz && liste.length < MAKS_TERCIH ? (
          <Pressable onPress={() => setPencere('ara')} style={({ pressed }) => [s.bosSatir, pressed && { backgroundColor: colors.surfaceAlt }]}>
            <View style={[s.siraNo, { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.stroke }]}>
              <Text style={[s.siraNoText, { color: colors.textFaint }]}>{liste.length + 1}</Text>
            </View>
            <Text style={s.bosText}>Kod gir veya kılavuzdan program seç …</Text>
          </Pressable>
        ) : null}
      </Cam>

      <Buton
        etiket={app.tercihDegisti || !durum?.kayitli ? 'Kaydet ve yerleştir' : 'Kaydedildi · yeniden hesapla'}
        ikon="save-outline"
        yukleniyor={kaydediliyor}
        disabled={!liste.length && !durum?.kayitli}
        onPress={kaydet}
        style={{ marginTop: 16 }}
      />
      {liste.length ? (
        <Pressable
          onPress={() =>
            uyari('Listeyi temizle', 'Tüm tercihler silinecek. Emin misin?', [
              { text: 'Vazgeç', style: 'cancel' },
              { text: 'Temizle', style: 'destructive', onPress: () => app.tercihListesiAyarla([]) },
            ])
          }
          style={{ alignSelf: 'center', padding: 12 }}
        >
          <Text style={{ fontFamily: F.sb, color: colors.red }}>Listeyi temizle</Text>
        </Pressable>
      ) : null}

      <ProgramAramaPenceresi
        gorunur={pencere === 'ara'}
        kapat={() => setPencere(null)}
        kilavuz={kilavuz}
        puan={app.puan}
        puanTuru={app.puanTuru}
        mevcut={liste}
        ekle={ekle}
      />
      <AiDoldurPenceresi
        gorunur={pencere === 'ai'}
        kapat={() => setPencere(null)}
        kilavuz={kilavuz}
        puanTuru={app.puanTuru}
        yukleniyor={aiYukleniyor}
        olustur={aiOlustur}
        mevcutSayi={liste.length}
      />
      <TercihDetayPenceresi
        gorunur={detayTercih != null}
        kapat={() => setPencere(null)}
        tercih={detayTercih}
        sira={(detayIndex ?? 0) + 1}
        toplam={liste.length}
        program={detayTercih ? kilavuz?.harita.get(detayTercih.kod) : null}
        durum={detayTercih ? durumHarita.get(detayTercih.kod) : null}
        adaySayisi={durum?.adaySayisi}
        puan={app.puan}
        yukari={() => {
          tasi(detayIndex, -1);
          setPencere({ detay: detayIndex - 1 });
        }}
        asagi={() => {
          tasi(detayIndex, 1);
          setPencere({ detay: detayIndex + 1 });
        }}
        kaldir={() => {
          kaldir(detayIndex);
          setPencere(null);
        }}
      />
    </Ekran>
  );
}

const s = StyleSheet.create({
  uyari: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: radius.md, backgroundColor: colors.amberSoft, borderWidth: 1, borderColor: '#F3D9A0', marginBottom: 12, alignItems: 'flex-start' },
  uyariText: { flex: 1, fontFamily: F.r, fontSize: 13, color: colors.body, lineHeight: 19 },
  kucukBaslik: { fontFamily: F.b, fontSize: 11.5, color: colors.textSoft, letterSpacing: 1 },
  sonucBuyuk: { fontFamily: F.xb, fontSize: 21, marginTop: 6, letterSpacing: -0.3 },
  sonucProgram: { fontFamily: F.sb, fontSize: 13.5, color: colors.navy, marginTop: 4, lineHeight: 19 },
  not: { fontFamily: F.r, fontSize: 12.5, color: colors.textFaint, marginTop: 4, lineHeight: 17 },
  tabloBaslik: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.navy, paddingHorizontal: 14, paddingVertical: 10 },
  tabloBaslikText: { fontFamily: F.b, fontSize: 13, color: '#fff', letterSpacing: 1 },
  tabloBaslikSag: { fontFamily: F.sb, fontSize: 12.5, color: 'rgba(255,255,255,0.8)' },
  sutunlar: { flexDirection: 'row', backgroundColor: colors.pill, paddingHorizontal: 12, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.stroke },
  sutun: { fontFamily: F.b, fontSize: 11.5, color: colors.pillText },
  satir: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.stroke, gap: 10 },
  siraKol: { width: 54, flexDirection: 'row', alignItems: 'center', gap: 4 },
  siraNo: { width: 28, height: 28, borderRadius: 6, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  siraNoText: { fontFamily: F.b, fontSize: 13, color: '#fff' },
  oklar: { alignItems: 'center' },
  kod: { fontFamily: F.b, fontSize: 13.5, color: colors.accent, letterSpacing: 0.6 },
  sans: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  sansText: { fontFamily: F.b, fontSize: 11.5 },
  program: { fontFamily: F.sb, fontSize: 12.5, color: colors.navy, marginTop: 3, lineHeight: 17 },
  nitelik: { fontFamily: F.sb, fontSize: 12, color: colors.accent, marginTop: 4 },
  sil: { paddingTop: 2 },
  bosSatir: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  bosText: { fontFamily: F.m, fontSize: 13.5, color: colors.textFaint },
});
