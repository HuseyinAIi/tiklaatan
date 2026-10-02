// Metin biçimlendirme yardımcıları (Türkçe büyük/küçük harf kurallarıyla)
const KUCUK = new Set(['ve', 'ile', 'veya', 'de', 'da', 'için']);

/** "POSOF BELEDİYE BAŞKANLIĞI" → "Posof Belediye Başkanlığı"; "(BDDK)" gibi kısaltmalar korunur. */
export function baslikDuzen(s) {
  if (!s) return s;
  return String(s)
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((w, i) => {
      if (/^\([A-ZÇĞİÖŞÜ]{2,6}\)$/.test(w)) return w;
      if (/^\d/.test(w) || /^[IVX]+$/.test(w)) return w;
      const k = w.toLocaleLowerCase('tr-TR');
      if (i > 0 && KUCUK.has(k)) return k;
      return k
        .replace(/^(\(?)(.)/, (_, p, c) => p + c.toLocaleUpperCase('tr-TR'))
        .replace(/([-/])(.)/g, (_, a, c) => a + c.toLocaleUpperCase('tr-TR'));
    })
    .join(' ');
}

/** Ad soyaddan hitap için ilk ad: "ÇAĞLAR YILMAZ" → "Çağlar" */
export function ilkAd(adSoyad) {
  if (!adSoyad) return null;
  const ilk = String(adSoyad).trim().split(/\s+/)[0];
  if (!ilk || /demo|misafir/i.test(adSoyad)) return null;
  return baslikDuzen(ilk);
}
