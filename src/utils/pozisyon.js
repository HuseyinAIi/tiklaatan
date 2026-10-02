// İlan içindeki pozisyonlar (kadrolar), iş bölümü sınıflandırması ve kullanıcıya uygunluk.

export const BOLUMLER = [
  { kod: 'buro', ad: 'Büro & İdari', ikon: 'document-text-outline', kalip: /memur|büro|sekreter|vhki|veri hazırlama|şef|muhasebe|mali|idari|ayniyat|evrak|santral|tekniker yardımcı|halkla ilişkiler|kütüphane|arşiv/i },
  { kod: 'saglik', ad: 'Sağlık', ikon: 'medkit-outline', kalip: /hemşire|ebe|sağlık|laborant|eczacı|fizyoterap|diyetisyen|radyoloji|anestezi|tıbbi|ameliyathane|odyometri|diş|paramedik|acil tıp|hekim|biyolog/i },
  { kod: 'bilisim', ad: 'Bilişim', ikon: 'laptop-outline', kalip: /bilişim|bilgisayar|yazılım|programcı|sistem|ağ |network|veri tabanı|siber|bilgi işlem/i },
  { kod: 'teknik', ad: 'Teknik', ikon: 'construct-outline', kalip: /mühendis|tekniker|teknisyen|elektrik|inşaat|harita|makine|mimar|şehir plancı|elektronik|kaynak|tesisat|peyzaj|jeoloji|ziraat|veteriner/i },
  { kod: 'guvenlik', ad: 'Zabıta & Güvenlik', ikon: 'shield-outline', kalip: /zabıta|itfaiye|güvenlik|koruma|bekçi/i },
  { kod: 'hukuk', ad: 'Hukuk', ikon: 'scale-outline', kalip: /avukat|hukuk|icra|zabıt katibi|mübaşir/i },
  { kod: 'sosyal', ad: 'Sosyal & Eğitim', ikon: 'people-outline', kalip: /sosyal çalışma|psikolog|çocuk gelişim|öğretmen|eğitim|rehber|sosyolog/i },
  { kod: 'destek', ad: 'Destek Hizmetleri', ikon: 'hammer-outline', kalip: /destek|temizlik|aşçı|şoför|sürücü|hizmetli|garson|bahçıvan|işçi|bakım onarım/i },
];

export function bolumBul(metin) {
  const t = String(metin || '');
  // Önce daha ayırt edici olanlar (zabıta "memuru" büro'ya düşmesin)
  const sira = ['guvenlik', 'saglik', 'bilisim', 'hukuk', 'teknik', 'sosyal', 'destek', 'buro'];
  for (const kod of sira) {
    const b = BOLUMLER.find((x) => x.kod === kod);
    if (b.kalip.test(t)) return b;
  }
  return { kod: 'genel', ad: 'Genel / Çeşitli', ikon: 'apps-outline' };
}

/** İlanın pozisyon listesi. Kadro bilgisi yoksa ilanın kendisi tek pozisyon sayılır. */
export function pozisyonlar(ilan) {
  const k = Array.isArray(ilan.kadrolar) ? ilan.kadrolar.filter((x) => x && (x.unvan || x.adet)) : [];
  if (!k.length) {
    return [
      {
        k: 0,
        tek: true,
        unvan: ilan.baslik,
        adet: ilan.kontenjan || null,
        puanTurleri: ilan.puanTurleri || [],
        egitim: null,
        taban: ilan.tabanSarti || null,
        bolum: bolumBul(`${ilan.baslik} ${ilan.tur || ''}`),
      },
    ];
  }
  return k.map((x, i) => {
    const pt = x.puanTuru && /^P(3|93|94)$/.test(x.puanTuru) ? [x.puanTuru] : ilan.puanTurleri || [];
    return {
      k: i,
      tek: false,
      unvan: x.unvan || `Pozisyon ${i + 1}`,
      adet: Number(x.adet) > 0 ? Number(x.adet) : null,
      puanTurleri: pt,
      egitim: x.egitim || null,
      taban: Number(x.taban) > 0 ? Number(x.taban) : ilan.tabanSarti || null,
      bolum: bolumBul(`${x.unvan || ''} ${x.egitim || ''}`),
    };
  });
}

export function ilanBolumleri(ilan) {
  const set = new Map();
  for (const p of pozisyonlar(ilan)) set.set(p.bolum.kod, p.bolum);
  return [...set.values()];
}

/** Pozisyon kullanıcıya uygun mu? { uygun: true|false|null, neden } (null = bilinmiyor) */
export function uygunluk(poz, { dogrulandi, puan, puanTuru }) {
  if (!dogrulandi || puan == null) return { uygun: null, neden: 'Puanını doğrula' };
  if (poz.puanTurleri.length && !poz.puanTurleri.includes(puanTuru)) return { uygun: false, neden: `${poz.puanTurleri.join('/')} puanı isteniyor` };
  if (poz.taban && puan < poz.taban) return { uygun: false, neden: `En az ${poz.taban} puan gerekli` };
  if (!poz.puanTurleri.length) return { uygun: true, neden: 'Puan türü ilanda belirtilmemiş', belirsiz: true };
  return { uygun: true, neden: poz.taban ? `Şartı sağlıyorsun (en az ${poz.taban})` : 'Puan türün uyuyor' };
}
