// Tıkla Atan tasarım sistemi — ÖSYM kurumsal dili
// Beyaz zemin, lacivert başlıklar, ince gri çerçeveli kartlar, açık mavi hap butonlar,
// durum için renkli kareler (kırmızı = son gün, turuncu = devam ediyor, turkuaz = yaklaşıyor/yeni).

export const colors = {
  // Zemin ve yüzeyler
  bg: '#FFFFFF',
  page: '#F3F5F9', // web'de telefon çerçevesinin dışı
  surface: '#FFFFFF',
  surfaceAlt: '#F6F8FB',
  field: '#F6F8FB',
  track: '#E8ECF3',
  stroke: '#E1E5EE',
  strokeStrong: '#C9D0DD',
  pill: '#EEF3FA', // ÖSYM'deki açık mavi hap
  pillText: '#1F2A6B',

  // Uyumluluk için eski adlar (cam yüzey anahtarları artık düz yüzey)
  glass: '#FFFFFF',
  glassStrong: '#F6F8FB',
  glassPressed: '#EEF3FA',
  highlight: '#FFFFFF',

  // Metin
  navy: '#1A1F71', // ÖSYM başlık laciverti
  text: '#1A1F71',
  body: '#2E3445',
  textSoft: '#4A5268',
  textFaint: '#8A92A6',

  // Marka (logodan): turkuaz tik + lacivert
  brand: '#00C1B0',
  brandDark: '#008A7E', // beyaz zeminde okunaklı koyu turkuaz
  brandSoft: '#E3F8F5',
  brandNavy: '#0B2A56',

  // Vurgu
  accent: '#1F4FB8',
  accentDeep: '#1A1F71',
  accentSoft: '#E8EFFB',

  // ÖSYM durum renkleri
  sonGun: '#E3051B',
  devam: '#F5A300',
  yakin: '#14D2E0',

  // Anlam
  green: '#138A55',
  greenSoft: '#E7F6EE',
  red: '#D22B37',
  redSoft: '#FDECEE',
  amber: '#B87A00',
  amberSoft: '#FFF6E0',
  violet: '#5B43B0',
  violetSoft: '#F0ECFB',
  gold: '#B98200',
};

// Inter — ağırlık başına ayrı aile adı (Android'de fontWeight özel fontlarda çalışmaz)
export const F = {
  r: 'Inter_400Regular',
  m: 'Inter_500Medium',
  sb: 'Inter_600SemiBold',
  b: 'Inter_700Bold',
  xb: 'Inter_800ExtraBold',
};

export const radius = { sm: 8, md: 10, lg: 12, xl: 14, pill: 999 };

export const PUAN_TURLERI = [
  { kod: 'P3', ad: 'P3 · Lisans', egitim: 'Lisans' },
  { kod: 'P93', ad: 'P93 · Önlisans', egitim: 'Önlisans' },
  { kod: 'P94', ad: 'P94 · Ortaöğretim', egitim: 'Ortaöğretim' },
];

export const BRAND = 'Tıkla Atan';
export const TAB_BAR_ALAN = 96; // içerik alt boşluğu (alt menünün altında kalmasın)
