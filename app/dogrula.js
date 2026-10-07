import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { uyari } from '../src/uyari';
import { colors, F, radius, PUAN_TURLERI, CINSIYETLER, KPSS_YILI } from '../src/theme';
import { Ekran, BuyukBaslik, Cam, Buton, Alan, Chip, yazi } from '../src/components/ui';
import { useApp } from '../src/context/AppContext';
import { belgeOku, uriToBase64, aiAktif } from '../src/services/gemini';

const puanParse = (t) => {
  const n = parseFloat(String(t).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

export default function DogrulaEkrani() {
  const router = useRouter();
  const app = useApp();
  const [puanTuru, setPuanTuru] = useState(app.puanTuru);
  const [cinsiyet, setCinsiyet] = useState(app.profil?.cinsiyet || null);
  const [puanText, setPuanText] = useState('');
  const [okuma, setOkuma] = useState(null); // son başarılı belge okuması (2026 kontrolünden geçmiş)
  const [elle, setElle] = useState(false); // "Notum yanlış okundu" → elle giriş
  const [belge, setBelge] = useState(null); // { ad, mimeType, base64?, uri }
  const [yukleniyor, setYukleniyor] = useState(false);
  const [sonuc, setSonuc] = useState(null); // { basarili, mesaj, okunan }

  const galeridenSec = async () => {
    const izin = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!izin.granted) return uyari('İzin gerekli', 'Galeriden görsel seçebilmek için izin vermelisiniz.');
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.85 });
    if (r.canceled || !r.assets?.length) return;
    const a = r.assets[0];
    setBelge({ ad: a.fileName || 'sonuc-belgesi.jpg', mimeType: a.mimeType || 'image/jpeg', base64: a.base64, uri: a.uri });
    setSonuc(null);
  };

  const dosyaSec = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
    if (r.canceled || !r.assets?.length) return;
    const a = r.assets[0];
    setBelge({ ad: a.name, mimeType: a.mimeType || (a.name?.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'), uri: a.uri });
    setSonuc(null);
  };

  const yilGecerli = (okuma) => {
    const yil = Number(okuma.sinavYili) || Number(String(okuma.sinavAdi || '').match(/20\d\d/)?.[0]);
    if (yil === KPSS_YILI) return null;
    return yil
      ? `Bu belge ${yil} yılına ait. Yalnızca ${KPSS_YILI} KPSS sonuç belgesi kabul edilir.`
      : `Belgedeki sınav yılı okunamadı. Yalnızca ${KPSS_YILI} KPSS sonuç belgesi kabul edilir; daha net bir görsel veya PDF deneyin.`;
  };

  const tamamla = (okuma, puan, manuel) => {
    app.dogrula({ puan, puanTuru, adSoyad: okuma.adSoyad, sinavYili: Number(okuma.sinavYili) || KPSS_YILI, demo: okuma.demo, cinsiyet, manuel });
    setSonuc({
      basarili: true,
      mesaj: okuma.demo
        ? `Demo modunda doğrulandı (${puanTuru}: ${puan}). Gerçek okuma için .env dosyasına Gemini/Groq anahtarı ekleyin.`
        : `Tebrikler${okuma.adSoyad ? ` ${okuma.adSoyad}` : ''}! ${puanTuru} puanınız ${puan} olarak ${manuel ? 'kaydedildi (elle girildi)' : 'doğrulandı'}.`,
    });
  };

  const dogrula = async () => {
    if (!cinsiyet) return uyari('Cinsiyet gerekli', 'Lütfen cinsiyetini seç.');
    if (!belge) return uyari('Belge gerekli', 'ÖSYM sonuç belgenizin görselini veya PDF\'ini seçin.');
    if (app.kalanHak <= 0) return uyari('Hakkınız kalmadı', 'Doğrulama hakkınız bitti. Destek ile iletişime geçin.');

    setYukleniyor(true);
    setSonuc(null);
    setOkuma(null);
    setElle(false);
    try {
      const base64 = belge.base64 || (await uriToBase64(belge.uri));
      const r = await belgeOku({ base64, mimeType: belge.mimeType, puanTuru });
      app.hakKullan();

      if (!r.osymBelgesi) return setSonuc({ basarili: false, mesaj: 'Yüklenen dosya ÖSYM KPSS sonuç belgesi olarak tanınmadı.' });
      if (r.supheliDurum) return setSonuc({ basarili: false, mesaj: `Belgede şüpheli durum tespit edildi: ${r.supheliDurum}` });
      const yilHata = yilGecerli(r);
      if (yilHata) return setSonuc({ basarili: false, mesaj: yilHata });

      setOkuma(r);
      const okunan = r.puanlar?.[puanTuru];
      if (okunan == null) {
        const bulunan = Object.entries(r.puanlar || {})
          .filter(([k, v]) => k !== 'diger' && v != null)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ');
        return setSonuc({ basarili: false, mesaj: `Belgede ${puanTuru} puanı okunamadı.${bulunan ? ` Bulunan puanlar: ${bulunan}. Puan türünü değiştirmeyi deneyin.` : ''}` });
      }
      tamamla(r, Number(okunan), false);
    } catch (e) {
      setSonuc({ basarili: false, mesaj: e.message || 'Bir hata oluştu.' });
    } finally {
      setYukleniyor(false);
    }
  };

  // "Notum yanlış okundu": belge zaten 2026 kontrolünden geçti; puanı kullanıcı elle girer (yeni hak harcanmaz).
  const elleKaydet = () => {
    const p = puanParse(puanText);
    if (p == null || p < 0 || p > 100) return uyari('Puan hatalı', 'Lütfen KPSS puanınızı girin (örn. 83.45).');
    tamamla(okuma, p, true);
    setElle(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Ekran sekmeli={false}>
        <BuyukBaslik
          geri
          ust="ÖSYM sonuç belgesi"
          baslik="Puan doğrulama"
          alt="Simülasyon sıralamalarının adil olması için puanını ÖSYM belgenle doğruluyoruz."
          sag={
            <Cam radius={radius.pill} style={{ paddingHorizontal: 12, paddingVertical: 7 }}>
              <Text style={{ fontFamily: F.sb, fontSize: 12.5, color: colors.textSoft }}>
                {app.kalanHak}/{app.MAX_HAK} hak
              </Text>
            </Cam>
          }
        />

        {!aiAktif() ? (
          <View style={s.demo}>
            <Ionicons name="flask-outline" size={18} color={colors.amber} />
            <Text style={s.demoText}>Demo modu: yapay zekâ anahtarı yok. Herhangi bir görselle akışı deneyebilirsin.</Text>
          </View>
        ) : null}

        <Cam radius={radius.xl} style={{ padding: 20 }}>
          <Adim no="1" baslik="Puan türünü seç" />
          <View style={s.turler}>
            {PUAN_TURLERI.map((p) => {
              const secili = puanTuru === p.kod;
              return (
                <Pressable key={p.kod} onPress={() => setPuanTuru(p.kod)} style={[s.tur, secili && s.turSecili]}>
                  <Text style={[s.turKod, secili && { color: colors.bg }]}>{p.kod}</Text>
                  <Text style={[s.turAd, secili && { color: 'rgba(255,255,255,0.8)' }]}>{p.egitim}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={s.ayrac} />
          <Adim no="2" baslik="Cinsiyetini seç" />
          <View style={{ flexDirection: 'row' }}>
            {CINSIYETLER.map((c) => (
              <Chip key={c.kod} etiket={c.ad} secili={cinsiyet === c.kod} onPress={() => setCinsiyet(c.kod)} />
            ))}
          </View>

          <View style={s.ayrac} />
          <Adim no="3" baslik={`${KPSS_YILI} KPSS sonuç belgeni yükle`} />
          <Text style={[yazi.soluk, { marginBottom: 12 }]}>ÖSYM AİS’ten indirdiğin PDF ya da karekodlu sonuç belgesinin ekran görüntüsü. Puanını yapay zekâ kendisi okur; elle girmene gerek yok.</Text>

          {belge ? (
            <View style={s.secilen}>
              <View style={s.secilenIkon}>
                <Ionicons name={belge.mimeType === 'application/pdf' ? 'document-text' : 'image'} size={20} color={colors.green} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.secilenAd} numberOfLines={1}>
                  {belge.ad}
                </Text>
                <Text style={s.secilenAlt}>{belge.mimeType === 'application/pdf' ? 'PDF belgesi' : 'Görsel'} · hazır</Text>
              </View>
              <Pressable onPress={() => setBelge(null)} hitSlop={10} accessibilityLabel="Belgeyi kaldır">
                <Ionicons name="close-circle" size={22} color={colors.textFaint} />
              </Pressable>
            </View>
          ) : (
            <View style={s.yukle}>
              <Pressable onPress={galeridenSec} style={({ pressed }) => [s.yukleBtn, pressed && { backgroundColor: colors.glassPressed }]}>
                <Ionicons name="image-outline" size={22} color={colors.text} />
                <Text style={s.yukleText}>Galeriden</Text>
              </Pressable>
              <View style={s.yukleAyrac} />
              <Pressable onPress={dosyaSec} style={({ pressed }) => [s.yukleBtn, pressed && { backgroundColor: colors.glassPressed }]}>
                <Ionicons name="document-outline" size={22} color={colors.text} />
                <Text style={s.yukleText}>PDF / Dosya</Text>
              </Pressable>
            </View>
          )}
        </Cam>

        <Buton
          etiket={yukleniyor ? 'Belge okunuyor…' : 'Belgeyi doğrula'}
          ikon="shield-checkmark-outline"
          onPress={dogrula}
          yukleniyor={yukleniyor}
          disabled={app.kalanHak <= 0}
          style={{ marginTop: 18 }}
        />

        {sonuc ? (
          <View style={[s.sonuc, { backgroundColor: sonuc.basarili ? colors.greenSoft : colors.redSoft, borderColor: sonuc.basarili ? '#A9DCC1' : '#F3B7BD' }]}>
            <Ionicons name={sonuc.basarili ? 'checkmark-circle' : 'alert-circle'} size={22} color={sonuc.basarili ? colors.green : colors.red} />
            <Text style={s.sonucText}>{sonuc.mesaj}</Text>
          </View>
        ) : null}
        {okuma && !elle ? (
          <Pressable onPress={() => setElle(true)} style={{ alignSelf: 'center', marginTop: 14, padding: 8 }}>
            <Text style={{ fontFamily: F.sb, fontSize: 14, color: colors.accent, textDecorationLine: 'underline' }}>Notum yanlış okundu</Text>
          </Pressable>
        ) : null}
        {elle ? (
          <Cam radius={radius.xl} style={{ padding: 16, marginTop: 12 }}>
            <Alan etiket={`${puanTuru} puanını belgede yazdığı gibi gir`} value={puanText} onChangeText={setPuanText} placeholder="Örn. 71,19513" keyboardType="decimal-pad" inputStyle={{ fontFamily: F.b, fontSize: 20 }} />
            <Buton etiket="Puanı kaydet" onPress={elleKaydet} style={{ marginTop: 12 }} />
          </Cam>
        ) : null}
        {sonuc?.basarili ? <Buton etiket="İlanlara dön" tip="ikincil" onPress={() => router.back()} style={{ marginTop: 12 }} /> : null}

        <View style={s.gizlilik}>
          <Ionicons name="lock-closed-outline" size={14} color={colors.textFaint} />
          <Text style={s.gizlilikText}>Belgen yalnızca puanını okumak için işlenir, saklanmaz. Kimlik bilgilerini karalayarak yükleyebilirsin.</Text>
        </View>
      </Ekran>
    </KeyboardAvoidingView>
  );
}

function Adim({ no, baslik }) {
  return (
    <View style={s.adim}>
      <View style={s.adimNo}>
        <Text style={s.adimNoText}>{no}</Text>
      </View>
      <Text style={s.adimBaslik}>{baslik}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  demo: { flexDirection: 'row', gap: 10, backgroundColor: colors.amberSoft, borderWidth: 1, borderColor: '#F3D9A0', padding: 12, borderRadius: 16, marginBottom: 14 },
  demoText: { flex: 1, fontFamily: F.r, color: colors.text, fontSize: 13, lineHeight: 19 },
  adim: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  adimNo: { width: 24, height: 24, borderRadius: 6, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  adimNoText: { fontFamily: F.b, fontSize: 13, color: colors.accent },
  adimBaslik: { fontFamily: F.b, fontSize: 16, color: colors.text },
  turler: { flexDirection: 'row', gap: 8 },
  tur: { flex: 1, paddingVertical: 12, borderRadius: 16, backgroundColor: colors.field, borderWidth: 1, borderColor: colors.stroke, alignItems: 'center' },
  turSecili: { backgroundColor: colors.text, borderColor: colors.text },
  turKod: { fontFamily: F.xb, fontSize: 17, color: colors.text },
  turAd: { fontFamily: F.m, fontSize: 11.5, color: colors.textSoft, marginTop: 2 },
  ayrac: { height: 1, backgroundColor: colors.stroke, marginVertical: 20 },
  yukle: { flexDirection: 'row', borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.strokeStrong, overflow: 'hidden' },
  yukleBtn: { flex: 1, alignItems: 'center', paddingVertical: 20 },
  yukleAyrac: { width: 1, backgroundColor: colors.stroke },
  yukleText: { fontFamily: F.sb, fontSize: 14, color: colors.text, marginTop: 8 },
  secilen: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, backgroundColor: colors.greenSoft, borderWidth: 1, borderColor: '#A9DCC1' },
  secilenIkon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#D3EFE0', alignItems: 'center', justifyContent: 'center' },
  secilenAd: { fontFamily: F.sb, fontSize: 14, color: colors.text },
  secilenAlt: { fontFamily: F.r, fontSize: 12, color: colors.textSoft, marginTop: 2 },
  sonuc: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 16, marginTop: 16, alignItems: 'flex-start', borderWidth: 1 },
  sonucText: { flex: 1, fontFamily: F.m, color: colors.text, lineHeight: 21, fontSize: 14 },
  gizlilik: { flexDirection: 'row', gap: 8, marginTop: 22, paddingHorizontal: 6 },
  gizlilikText: { flex: 1, fontFamily: F.r, color: colors.textFaint, fontSize: 12, lineHeight: 17 },
});
