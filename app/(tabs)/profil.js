import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { uyari } from '../../src/uyari';
import { colors, F, radius, PUAN_TURLERI } from '../../src/theme';
import { Ekran, BuyukBaslik, Cam, Buton, BolumBasligi, Durum, yazi } from '../../src/components/ui';
import { useApp } from '../../src/context/AppContext';
import { aiAktif, aiModel } from '../../src/services/gemini';
import { baslikDuzen } from '../../src/utils/metin';
import { testAdaylari } from '../../src/services/tercihMerkez';
import SunucuAyari from '../../src/components/SunucuAyari';

export default function ProfilEkrani() {
  const app = useApp();
  const router = useRouter();

  const sifirla = () =>
    uyari('Demo verisini sıfırla', 'Doğrulama, haklar ve geçmiş silinecek. Emin misin?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sıfırla', style: 'destructive', onPress: app.sifirla },
    ]);

  const bas = (app.adSoyad || 'M').trim()[0].toLocaleUpperCase('tr-TR');

  return (
    <Ekran>
      <BuyukBaslik baslik="Profil" />

      <Cam radius={radius.xl} tint={[colors.accentSoft, 'rgba(0,0,0,0)']} style={{ padding: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{bas}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.ad}>{app.adSoyad ? baslikDuzen(app.adSoyad) : 'Misafir kullanıcı'}</Text>
            <View style={{ marginTop: 6 }}>
              {app.dogrulandi ? (
                <Durum renk={colors.green} etiket={app.demoDogrulama ? 'Demo doğrulama' : app.manuelPuan ? 'Puan elle girildi' : 'ÖSYM ile doğrulandı'} kucuk />
              ) : (
                <Durum renk={colors.sonGun} etiket="Doğrulanmadı" kucuk />
              )}
            </View>
          </View>
        </View>

        <View style={s.istatistik}>
          <Ist etiket="Puan" deger={app.puan != null ? Number(app.puan).toFixed(2) : '—'} />
          <Ist etiket="Puan türü" deger={app.puanTuru} />
          <Ist etiket="Kalan hak" deger={`${app.kalanHak}/${app.MAX_HAK}`} />
        </View>
        {!app.dogrulandi ? <Buton etiket="Puanını doğrula" ikon="shield-checkmark-outline" onPress={() => router.push('/dogrula')} style={{ marginTop: 16 }} /> : null}
      </Cam>

      <BolumBasligi>Hesap</BolumBasligi>
      <Cam radius={radius.xl} style={{ paddingHorizontal: 16 }}>
        <Satir ikon="ribbon-outline" etiket="Eğitim düzeyi" deger={PUAN_TURLERI.find((p) => p.kod === app.puanTuru)?.egitim} />
        <Satir ikon="mail-outline" etiket="E-posta" deger={app.profil?.eposta || '—'} />
        <Satir ikon="school-outline" etiket="Bölüm / program" deger={app.profil?.bolum || '—'} />
        <Satir ikon="calendar-outline" etiket="Sınav yılı" deger={app.sinavYili || '—'} />
        <Satir ikon="analytics-outline" etiket="Simülasyon sayısı" deger={app.gecmis.length} son />
      </Cam>

      <BolumBasligi>Yapay zekâ</BolumBasligi>
      <Cam radius={radius.xl} style={{ paddingHorizontal: 16 }}>
        <Satir ikon="sparkles-outline" etiket="Durum" deger={aiAktif() ? 'Açık' : 'Demo modu'} degerRenk={aiAktif() ? colors.green : colors.amber} />
        <Satir ikon="hardware-chip-outline" etiket="Model" deger={aiModel()} son />
      </Cam>

      <BolumBasligi>Hakkında</BolumBasligi>
      <Cam radius={radius.xl} style={{ padding: 18 }}>
        <Text style={yazi.soluk}>
          Tıkla Atan; Kariyer Kapısı ve Resmî Gazete’deki memur ve sözleşmeli personel ilanlarını KPSS puanına göre listeler, atanma ihtimalini tahmin eder.
          Tahminler bilgilendirme amaçlıdır, kesinlik içermez.
        </Text>
      </Cam>

      <BolumBasligi>Sunucu adresi</BolumBasligi>
      <SunucuAyari />

      <BolumBasligi>Geliştirici araçları</BolumBasligi>
      <Cam radius={radius.xl} style={{ padding: 18 }}>
        <Text style={yazi.soluk}>
          Tercih sıralamasını denemek için sunucuya “test” olarak işaretli sahte adaylar ekler. Test adayları sıralama ekranında ayrıca belirtilir; yayına çıkmadan önce silinmeli.
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <Buton
            etiket={`200 test adayı (${app.puanTuru})`}
            tip="ikincil"
            style={{ flex: 1 }}
            onPress={async () => {
              try {
                const r = await testAdaylari({ n: 200, puanTuru: app.puanTuru });
                uyari('Eklendi', `${r.eklendi} test adayı eklendi. Tercih ekranında “Kaydet ve yerleştir”e bas.`);
              } catch (e) {
                uyari('Hata', e.message);
              }
            }}
          />
          <Buton
            etiket="Testleri sil"
            tip="ikincil"
            style={{ flex: 1 }}
            onPress={async () => {
              try {
                await testAdaylari({ sil: true });
                uyari('Silindi', 'Tüm test adayları silindi.');
              } catch (e) {
                uyari('Hata', e.message);
              }
            }}
          />
        </View>
      </Cam>

      <Pressable onPress={sifirla} style={({ pressed }) => [s.sifirla, pressed && { opacity: 0.6 }]}>
        <Ionicons name="refresh" size={16} color={colors.red} />
        <Text style={s.sifirlaText}>Demo verisini sıfırla</Text>
      </Pressable>
    </Ekran>
  );
}

function Ist({ etiket, deger }) {
  return (
    <View style={s.ist}>
      <Text style={s.istEtiket}>{etiket}</Text>
      <Text style={s.istDeger}>{deger}</Text>
    </View>
  );
}

function Satir({ ikon, etiket, deger, son, degerRenk }) {
  return (
    <View style={[s.satir, !son && s.cizgi]}>
      <Ionicons name={ikon} size={18} color={colors.textSoft} />
      <Text style={s.satirEtiket}>{etiket}</Text>
      <Text style={[s.satirDeger, degerRenk && { color: degerRenk }]} numberOfLines={1}>
        {String(deger ?? '—')}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: '#BBD0F2', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  avatarText: { fontFamily: F.xb, fontSize: 24, color: colors.text },
  ad: { fontFamily: F.b, fontSize: 19, color: colors.text, letterSpacing: -0.3 },
  istatistik: { flexDirection: 'row', gap: 8, marginTop: 18 },
  ist: { flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: colors.stroke },
  istEtiket: { fontFamily: F.m, fontSize: 11.5, color: colors.textFaint },
  istDeger: { fontFamily: F.b, fontSize: 17, color: colors.text, marginTop: 3 },
  satir: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15 },
  cizgi: { borderBottomWidth: 1, borderBottomColor: colors.stroke },
  satirEtiket: { fontFamily: F.m, fontSize: 15, color: colors.text, marginLeft: 12, flex: 1 },
  satirDeger: { fontFamily: F.sb, fontSize: 14, color: colors.textSoft, maxWidth: '55%' },
  sifirla: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 26, padding: 12 },
  sifirlaText: { fontFamily: F.sb, color: colors.red, marginLeft: 6 },
});
