// Profil > Sunucu adresi: telefonda (APK) bilgisayardaki ilan sunucusuna bağlanmak için.
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, F, radius } from '../theme';
import Cam from './Cam';
import { Alan, Buton, yazi } from './ui';
import { useApp } from '../context/AppContext';
import { apiUrl, apiVarsayilan } from '../services/api';

export default function SunucuAyari() {
  const app = useApp();
  const [deger, setDeger] = useState(app.sunucuAdresi || apiUrl() || '');
  const [sonuc, setSonuc] = useState(null); // { ok, mesaj }
  const [deniyor, setDeniyor] = useState(false);

  const dene = async () => {
    setDeniyor(true);
    setSonuc(null);
    const adres = app.sunucuAdresiAyarla(deger);
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      const r = await fetch(`${adres}/`, { signal: ctrl.signal });
      clearTimeout(t);
      const j = await r.json();
      setSonuc({ ok: true, mesaj: `Bağlandı: ${j.ilanSayisi ?? 0} ilan · ${adres}` });
    } catch {
      setSonuc({ ok: false, mesaj: `Bağlanamadı: ${adres}. Bilgisayarda sunucu.bat açık mı, telefon ve bilgisayar aynı Wi-Fi’da mı?` });
    } finally {
      setDeniyor(false);
    }
  };

  return (
    <Cam radius={radius.xl} style={{ padding: 18 }}>
      <Text style={yazi.soluk}>
        Telefonda ilanlar ve tercih sıralaması için bilgisayarındaki ilan sunucusunun adresini gir. Bilgisayarda <Text style={{ fontFamily: F.b }}>sunucu.bat</Text> penceresinde
        “Telefon için adres” satırında yazar (örn. 192.168.1.35:3001).
      </Text>
      <Alan value={deger} onChangeText={setDeger} placeholder="192.168.1.35:3001" autoCapitalize="none" autoCorrect={false} keyboardType="url" ikon="server-outline" style={{ marginTop: 12 }} />
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
        <Buton etiket="Kaydet ve dene" ikon="wifi" yukleniyor={deniyor} onPress={dene} style={{ flex: 1 }} />
        <Buton
          etiket="Varsayılan"
          tip="ikincil"
          onPress={() => {
            app.sunucuAdresiAyarla('');
            setDeger(apiVarsayilan());
            setSonuc(null);
          }}
        />
      </View>
      {sonuc ? (
        <View style={[s.sonuc, { backgroundColor: sonuc.ok ? colors.greenSoft : colors.redSoft }]}>
          <Ionicons name={sonuc.ok ? 'checkmark-circle' : 'alert-circle'} size={18} color={sonuc.ok ? colors.green : colors.red} />
          <Text style={s.sonucText}>{sonuc.mesaj}</Text>
        </View>
      ) : null}
    </Cam>
  );
}

const s = StyleSheet.create({
  sonuc: { flexDirection: 'row', gap: 8, padding: 10, borderRadius: radius.md, marginTop: 10, alignItems: 'flex-start' },
  sonucText: { flex: 1, fontFamily: F.m, fontSize: 13, color: colors.body, lineHeight: 18 },
});
