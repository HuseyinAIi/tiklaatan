// DEMO VERİSİ — Kurumların geçmiş yıllardaki yerleştirme sonuçları (temsilî rakamlar).
// Gerçek sürümde: ÖSYM KPSS-tercih sonuçları, kurumların kendi ilan ettiği
// "başarı listeleri" ve Kariyer Kapısı sonuç duyurularından toplanacak.
//
// Her kayıt: yil, kontenjan, basvuru (kişi), taban (son yerleşen puanı), tavan (ilk yerleşen)

export const KURUM_GECMIS = {
  'gaziantep-uni': {
    ad: 'GAZİANTEP ÜNİVERSİTESİ',
    il: 'Gaziantep',
    tip: 'Üniversite',
    gecmis: {
      P3: [
        { yil: 2022, kontenjan: 35, basvuru: 6100, taban: 81.42, tavan: 92.10 },
        { yil: 2023, kontenjan: 50, basvuru: 7400, taban: 80.15, tavan: 91.33 },
        { yil: 2024, kontenjan: 28, basvuru: 8200, taban: 83.06, tavan: 93.48 },
        { yil: 2025, kontenjan: 40, basvuru: 8900, taban: 82.37, tavan: 92.71 },
      ],
      P93: [
        { yil: 2023, kontenjan: 22, basvuru: 3900, taban: 79.84, tavan: 90.02 },
        { yil: 2024, kontenjan: 30, basvuru: 4300, taban: 78.62, tavan: 89.11 },
        { yil: 2025, kontenjan: 25, basvuru: 4700, taban: 80.45, tavan: 90.37 },
      ],
      P94: [
        { yil: 2022, kontenjan: 15, basvuru: 5200, taban: 84.31, tavan: 93.90 },
        { yil: 2024, kontenjan: 20, basvuru: 6100, taban: 82.95, tavan: 92.76 },
        { yil: 2025, kontenjan: 16, basvuru: 6800, taban: 85.12, tavan: 94.03 },
      ],
    },
  },
  'hanak-bld': {
    ad: 'HANAK BELEDİYE BAŞKANLIĞI',
    il: 'Ardahan',
    tip: 'Belediye',
    gecmis: {
      P94: [
        { yil: 2023, kontenjan: 2, basvuru: 410, taban: 74.80, tavan: 86.12 },
        { yil: 2025, kontenjan: 3, basvuru: 520, taban: 73.25, tavan: 88.40 },
      ],
    },
  },
  'gop-uni': {
    ad: 'TOKAT GAZİOSMANPAŞA ÜNİVERSİTESİ',
    il: 'Tokat',
    tip: 'Üniversite',
    gecmis: {
      P3: [
        { yil: 2022, kontenjan: 60, basvuru: 5400, taban: 76.90, tavan: 90.15 },
        { yil: 2023, kontenjan: 85, basvuru: 6200, taban: 75.40, tavan: 89.80 },
        { yil: 2024, kontenjan: 70, basvuru: 7000, taban: 77.85, tavan: 91.02 },
        { yil: 2025, kontenjan: 90, basvuru: 7600, taban: 76.70, tavan: 90.66 },
      ],
      P94: [
        { yil: 2024, kontenjan: 40, basvuru: 5100, taban: 79.40, tavan: 91.20 },
        { yil: 2025, kontenjan: 35, basvuru: 5600, taban: 80.12, tavan: 91.75 },
      ],
    },
  },
  'bornova-bld': {
    ad: 'BORNOVA BELEDİYE BAŞKANLIĞI',
    il: 'İzmir',
    tip: 'Belediye',
    gecmis: {
      P3: [
        { yil: 2022, kontenjan: 10, basvuru: 2900, taban: 84.20, tavan: 92.40 },
        { yil: 2024, kontenjan: 12, basvuru: 3400, taban: 85.05, tavan: 93.12 },
        { yil: 2025, kontenjan: 20, basvuru: 3800, taban: 83.60, tavan: 92.88 },
      ],
    },
  },
  'subasi-bld': {
    ad: 'SUBAŞI (YALOVA) BELEDİYE BAŞKANLIĞI',
    il: 'Yalova',
    tip: 'Belediye',
    gecmis: {
      P3: [{ yil: 2024, kontenjan: 1, basvuru: 380, taban: 86.75, tavan: 86.75 }],
    },
  },
  'ankara-uni': {
    ad: 'ANKARA ÜNİVERSİTESİ',
    il: 'Ankara',
    tip: 'Üniversite',
    gecmis: {
      P3: [
        { yil: 2023, kontenjan: 150, basvuru: 15400, taban: 83.10, tavan: 94.20 },
        { yil: 2024, kontenjan: 110, basvuru: 17800, taban: 84.85, tavan: 95.01 },
        { yil: 2025, kontenjan: 130, basvuru: 18900, taban: 84.20, tavan: 94.66 },
      ],
      P93: [
        { yil: 2022, kontenjan: 90, basvuru: 8800, taban: 77.30, tavan: 89.95 },
        { yil: 2023, kontenjan: 140, basvuru: 9600, taban: 75.95, tavan: 89.10 },
        { yil: 2024, kontenjan: 100, basvuru: 10300, taban: 78.40, tavan: 90.42 },
        { yil: 2025, kontenjan: 115, basvuru: 11200, taban: 78.05, tavan: 90.18 },
      ],
    },
  },
  'sahinbey-bld': {
    ad: 'ŞAHİNBEY BELEDİYE BAŞKANLIĞI',
    il: 'Gaziantep',
    tip: 'Belediye',
    gecmis: {
      P93: [
        { yil: 2023, kontenjan: 6, basvuru: 1500, taban: 80.90, tavan: 89.30 },
        { yil: 2025, kontenjan: 10, basvuru: 1900, taban: 79.75, tavan: 89.85 },
      ],
    },
  },
  'erciyes-uni': {
    ad: 'ERCİYES ÜNİVERSİTESİ',
    il: 'Kayseri',
    tip: 'Üniversite',
    gecmis: {
      P94: [
        { yil: 2022, kontenjan: 50, basvuru: 7100, taban: 81.25, tavan: 92.45 },
        { yil: 2023, kontenjan: 75, basvuru: 7900, taban: 80.10, tavan: 91.88 },
        { yil: 2025, kontenjan: 60, basvuru: 8800, taban: 82.40, tavan: 93.10 },
      ],
    },
  },
  'karatay-bld': {
    ad: 'KARATAY BELEDİYE BAŞKANLIĞI',
    il: 'Konya',
    tip: 'Belediye',
    gecmis: {
      P94: [
        { yil: 2024, kontenjan: 4, basvuru: 1200, taban: 83.35, tavan: 90.12 },
        { yil: 2025, kontenjan: 6, basvuru: 1350, taban: 82.10, tavan: 90.95 },
      ],
    },
  },
  ktu: {
    ad: 'KARADENİZ TEKNİK ÜNİVERSİTESİ',
    il: 'Trabzon',
    tip: 'Üniversite',
    gecmis: {
      P93: [
        { yil: 2023, kontenjan: 25, basvuru: 3100, taban: 77.80, tavan: 88.60 },
        { yil: 2025, kontenjan: 28, basvuru: 3600, taban: 78.65, tavan: 89.40 },
      ],
    },
  },
};

import { baslikDuzen } from '../utils/metin';

export const KURUM_LISTESI = Object.entries(KURUM_GECMIS).map(([id, k]) => ({
  id,
  ad: baslikDuzen(k.ad),
  il: k.il,
  tip: k.tip,
  puanTurleri: Object.keys(k.gecmis),
}));
