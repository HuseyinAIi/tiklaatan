import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiAyarla } from '../services/api';

const KEY = 'tiklaatan:v1';
const MAX_HAK = 3;

const BASLANGIC = {
  puanTuru: 'P94',
  puan: null,
  dogrulandi: false,
  adSoyad: null,
  sinavYili: null,
  dogrulamaTarihi: null,
  demoDogrulama: false,
  kalanHak: MAX_HAK,
  gecmis: [], // simülasyon geçmişi
  tercihListesi: [], // [{ kod, neden?, grup? }] — KPSS merkezi yerleştirme tercihleri (en fazla 30)
  tercihKaydedildi: null, // son kayıt zamanı
  onboardingTamam: false, // 4 kartlı tanıtım + kullanım/aydınlatma metni onayı
  girisYapildi: false,
  girisYontemi: null, // 'google' | 'apple' | 'eposta'
  profil: { ad: '', soyad: '', cinsiyet: null, bolum: '', egitim: null, eposta: '', epostaDogrulandi: false },
  manuelPuan: false, // puan yapay zekâ yerine elle girildi
};

const Ctx = createContext(null);

const yeniKimlik = () => `u${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

export function AppProvider({ children }) {
  const [state, setState] = useState(BASLANGIC);
  const [yuklendi, setYuklendi] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((s) => {
        if (s) {
          const kayit = { ...BASLANGIC, ...JSON.parse(s) };
          if (kayit.sunucuAdresi) apiAyarla(kayit.sunucuAdresi);
          setState(kayit);
        }
      })
      .catch(() => {})
      .finally(() => {
        // Cihaza özel anonim kimlik (tercih sıralaması için). İleride gerçek hesap sistemiyle değişecek.
        setState((st) => (st.kullaniciId ? st : { ...st, kullaniciId: yeniKimlik() }));
        setYuklendi(true);
      });
  }, []);

  useEffect(() => {
    if (yuklendi) AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
  }, [state, yuklendi]);

  const puanTuruSec = useCallback((puanTuru) => setState((s) => ({ ...s, puanTuru })), []);

  const hakKullan = useCallback(() => setState((s) => ({ ...s, kalanHak: Math.max(0, s.kalanHak - 1) })), []);

  const dogrula = useCallback(
    ({ puan, puanTuru, adSoyad, sinavYili, demo, cinsiyet, manuel }) =>
      setState((s) => ({
        ...s,
        puan,
        puanTuru,
        adSoyad: adSoyad || s.adSoyad,
        sinavYili,
        dogrulandi: true,
        demoDogrulama: !!demo,
        manuelPuan: !!manuel,
        profil: cinsiyet ? { ...s.profil, cinsiyet } : s.profil,
        dogrulamaTarihi: new Date().toISOString(),
      })),
    [],
  );

  const gecmiseEkle = useCallback(
    (kayit) =>
      setState((s) => ({
        ...s,
        gecmis: [{ ...kayit, id: String(Date.now()), tarih: new Date().toISOString() }, ...s.gecmis].slice(0, 50),
      })),
    [],
  );

  const tercihListesiAyarla = useCallback(
    (liste, kaydedildi = false) =>
      setState((s) => ({
        ...s,
        tercihListesi: typeof liste === 'function' ? liste(s.tercihListesi) : liste,
        tercihKaydedildi: kaydedildi ? new Date().toISOString() : s.tercihKaydedildi,
        tercihDegisti: !kaydedildi,
      })),
    [],
  );

  const onboardingBitir = useCallback(() => setState((s) => ({ ...s, onboardingTamam: true })), []);

  const profilKaydet = useCallback(
    (profil, girisYontemi) =>
      setState((s) => {
        const yeni = { ...s.profil, ...profil };
        const adSoyad = `${yeni.ad} ${yeni.soyad}`.trim();
        return { ...s, profil: yeni, girisYontemi: girisYontemi || s.girisYontemi, adSoyad: s.dogrulandi ? s.adSoyad : adSoyad || s.adSoyad };
      }),
    [],
  );

  const girisTamamla = useCallback(() => setState((s) => ({ ...s, girisYapildi: true })), []);

  const sunucuAdresiAyarla = useCallback((u) => {
    const aktif = apiAyarla(u);
    setState((s) => ({ ...s, sunucuAdresi: String(u || '').trim() || null }));
    return aktif;
  }, []);

  const sifirla = useCallback(
    () => setState((st) => ({ ...BASLANGIC, kullaniciId: st.kullaniciId, sunucuAdresi: st.sunucuAdresi, onboardingTamam: st.onboardingTamam })),
    [],
  );

  const value = useMemo(
    () => ({ ...state, yuklendi, MAX_HAK, puanTuruSec, hakKullan, dogrula, gecmiseEkle, sifirla, tercihListesiAyarla, sunucuAdresiAyarla, onboardingBitir, profilKaydet, girisTamamla }),
    [state, yuklendi, puanTuruSec, hakKullan, dogrula, gecmiseEkle, sifirla, tercihListesiAyarla, sunucuAdresiAyarla, onboardingBitir, profilKaydet, girisTamamla],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useApp = () => useContext(Ctx);
