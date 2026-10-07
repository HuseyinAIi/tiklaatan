import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, F, radius, PUAN_TURLERI, CINSIYETLER } from '../src/theme';
import { Ekran, BuyukBaslik, Cam, Buton, Alan, Chip, yazi } from '../src/components/ui';
import { uyari } from '../src/uyari';
import { useApp } from '../src/context/AppContext';
import { sosyalGiris, epostaKoduGonder, epostaKoduDogrula, epostaGecerli, DEMO_KOD } from '../src/services/auth';

export default function Giris() {
  const router = useRouter();
  const app = useApp();
  const [adim, setAdim] = useState('secim'); // 'secim' | 'form' | 'kod'
  const [yontem, setYontem] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [f, setF] = useState({ ...app.profil });
  const [kod, setKod] = useState('');
  const guncelle = (k, v) => setF((x) => ({ ...x, [k]: v }));

  const bitir = (profil, y) => {
    app.profilKaydet(profil, y);
    app.girisTamamla();
    router.replace('/');
  };

  const sosyal = async (saglayici) => {
    setYukleniyor(true);
    try {
      const r = await sosyalGiris(saglayici);
      setYontem(saglayici);
      setF((x) => ({ ...x, ad: r.ad || x.ad, soyad: r.soyad || x.soyad, eposta: r.eposta || x.eposta, epostaDogrulandi: r.epostaDogrulandi }));
      setAdim('form');
    } catch (e) {
      uyari('Giriş yapılamadı', e.message);
    } finally {
      setYukleniyor(false);
    }
  };

  const epostaIle = () => {
    setYontem('eposta');
    setAdim('form');
  };

  const formuGonder = async () => {
    if (!f.ad.trim() || !f.soyad.trim()) return uyari('Eksik bilgi', 'Ad ve soyadını yaz.');
    if (!f.cinsiyet) return uyari('Eksik bilgi', 'Cinsiyetini seç.');
    if (!f.egitim) return uyari('Eksik bilgi', 'Eğitim düzeyini seç.');
    if (!f.bolum.trim()) return uyari('Eksik bilgi', 'Mezun olduğun bölüm / programı yaz.');
    if (!epostaGecerli(f.eposta)) return uyari('E-posta hatalı', 'Geçerli bir e-posta adresi yaz.');
    if (f.epostaDogrulandi) return bitir(f, yontem);
    setYukleniyor(true);
    try {
      await epostaKoduGonder(f.eposta.trim());
      setAdim('kod');
    } catch (e) {
      uyari('Kod gönderilemedi', e.message);
    } finally {
      setYukleniyor(false);
    }
  };

  const kodDogrula = async () => {
    setYukleniyor(true);
    try {
      if (await epostaKoduDogrula(f.eposta, kod)) bitir({ ...f, epostaDogrulandi: true }, yontem);
      else uyari('Kod hatalı', 'Girdiğin kod doğru değil. Tekrar dene.');
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Ekran sekmeli={false}>
        {adim === 'secim' ? (
          <>
            <BuyukBaslik baslik="Giriş yap" alt="Hesabınla devam et. İlanları görmek için giriş yeterli; simülasyon için puanını doğrulaman gerekir." />
            <Buton etiket="Google ile devam et" ikon="logo-google" tip="ikincil" onPress={() => sosyal('google')} yukleniyor={yukleniyor} />
            <Buton etiket="Apple ile devam et" ikon="logo-apple" tip="ikincil" onPress={() => sosyal('apple')} disabled={yukleniyor} style={{ marginTop: 10 }} />
            <View style={s.veya}>
              <View style={s.cizgi} />
              <Text style={s.veyaText}>veya</Text>
              <View style={s.cizgi} />
            </View>
            <Buton etiket="E-posta ile devam et" ikon="mail-outline" onPress={epostaIle} disabled={yukleniyor} />
            <Text style={[yazi.kucuk, { marginTop: 18, textAlign: 'center' }]}>Demo sürümü: Google/Apple girişi henüz gerçek hesaba bağlı değil.</Text>
          </>
        ) : null}

        {adim === 'form' ? (
          <>
            <BuyukBaslik geri baslik="Bilgilerin" alt="Sana uygun ilanları ve simülasyonu gösterebilmemiz için birkaç bilgi." />
            <Cam radius={radius.xl} style={{ padding: 18, gap: 14 }}>
              <Alan etiket="Ad" value={f.ad} onChangeText={(v) => guncelle('ad', v)} autoCapitalize="words" />
              <Alan etiket="Soyad" value={f.soyad} onChangeText={(v) => guncelle('soyad', v)} autoCapitalize="words" />
              <View>
                <Text style={s.etiket}>Cinsiyet</Text>
                <View style={s.satir}>
                  {CINSIYETLER.map((c) => (
                    <Chip key={c.kod} etiket={c.ad} secili={f.cinsiyet === c.kod} onPress={() => guncelle('cinsiyet', c.kod)} />
                  ))}
                </View>
              </View>
              <View>
                <Text style={s.etiket}>Eğitim düzeyi</Text>
                <View style={s.satir}>
                  {PUAN_TURLERI.map((p) => (
                    <Chip key={p.kod} etiket={p.egitim} secili={f.egitim === p.egitim} onPress={() => guncelle('egitim', p.egitim)} />
                  ))}
                </View>
              </View>
              <Alan etiket="Mezun olunan bölüm / program" value={f.bolum} onChangeText={(v) => guncelle('bolum', v)} placeholder="Örn. Bilgisayar Programcılığı" />
              <Alan
                etiket="E-posta adresi"
                value={f.eposta}
                onChangeText={(v) => guncelle('eposta', v)}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!f.epostaDogrulandi}
              />
            </Cam>
            <Buton etiket={f.epostaDogrulandi ? 'Kaydet ve gir' : 'Devam et'} onPress={formuGonder} yukleniyor={yukleniyor} style={{ marginTop: 18 }} />
          </>
        ) : null}

        {adim === 'kod' ? (
          <>
            <BuyukBaslik geri baslik="E-postanı doğrula" alt={`${f.eposta} adresine 6 haneli bir kod gönderdik.`} />
            <Cam radius={radius.xl} style={{ padding: 18 }}>
              <Alan etiket="Doğrulama kodu" value={kod} onChangeText={setKod} keyboardType="number-pad" maxLength={6} inputStyle={{ fontFamily: F.b, fontSize: 22, letterSpacing: 4 }} />
              <Text style={[yazi.kucuk, { marginTop: 10 }]}>Demo sürümü: gerçek e-posta gönderimi henüz yok, kod {DEMO_KOD}.</Text>
            </Cam>
            <Buton etiket="Doğrula ve gir" onPress={kodDogrula} yukleniyor={yukleniyor} disabled={kod.length < 6} style={{ marginTop: 18 }} />
          </>
        ) : null}
      </Ekran>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  etiket: { fontFamily: F.sb, fontSize: 13, color: colors.body, marginBottom: 8 },
  satir: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  veya: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 18 },
  cizgi: { flex: 1, height: 1, backgroundColor: colors.stroke },
  veyaText: { fontFamily: F.m, color: colors.textFaint, fontSize: 13 },
});
