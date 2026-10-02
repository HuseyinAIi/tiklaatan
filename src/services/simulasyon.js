// Atanma olasılığı simülasyonu (kural tabanlı, yapay zekâdan bağımsız).
// Mantık: Geçmiş yılların taban puanlarından bu yıl için "beklenen taban" tahmin edilir,
// kontenjan değişimi ve rekabet artışı ile düzeltilir; adayın puanı ile beklenen taban
// arasındaki fark, belirsizliğe (sapma) bölünerek lojistik eğriyle olasılığa çevrilir.

import { KURUM_GECMIS } from '../data/kurumGecmis';

const ortalama = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const sapma = (a) => {
  if (a.length < 2) return 0;
  const m = ortalama(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1));
};

export function gecmisVeri(kurumId, puanTuru) {
  const k = KURUM_GECMIS[kurumId];
  if (!k || !k.gecmis[puanTuru]) return [];
  return [...k.gecmis[puanTuru]].sort((a, b) => a.yil - b.yil);
}

export function seviye(o) {
  const olasilik = Math.round(o * 100) / 100;
  if (olasilik >= 0.8) return { etiket: 'Çok Yüksek', renk: '#138A55', mesaj: 'Puanın geçmiş yılların rahatça üzerinde. Atanma ihtimalin çok yüksek.' };
  if (olasilik >= 0.6) return { etiket: 'Yüksek', renk: '#4F9A1F', mesaj: 'Puanın geçmiş taban puanların üzerinde. Güçlü bir adaysın.' };
  if (olasilik >= 0.4) return { etiket: 'Orta', renk: '#C98A00', mesaj: 'Sınırdasın. Rekabet bu yıl nasıl gelirse sonuç ona göre değişir.' };
  if (olasilik >= 0.2) return { etiket: 'Zor', renk: '#E0640F', mesaj: 'Biraz zor. Geçmiş yıllarda bu puanla yerleşmek pek mümkün olmamış.' };
  return { etiket: 'Çok Zor', renk: '#D22B37', mesaj: 'Geçmiş verilere göre bu puanla atanma ihtimali oldukça düşük.' };
}

/**
 * @param {object} p
 * @param {number} p.puan          Adayın doğrulanmış puanı
 * @param {string} p.puanTuru      P3 / P93 / P94
 * @param {string} p.kurumId
 * @param {number} [p.kontenjan]   Bu yılki ilan kontenjanı (yoksa geçmiş ortalaması)
 * @param {number} [p.tabanSarti]  İlanın asgari puan şartı
 */
export function simuleEt({ puan, puanTuru, kurumId, kontenjan, tabanSarti }) {
  const veri = gecmisVeri(kurumId, puanTuru);

  if (tabanSarti && puan < tabanSarti) {
    return {
      olasilik: 0,
      beklenenTaban: null,
      guven: 'Kesin',
      veri,
      seviye: { etiket: 'Şart Sağlanmıyor', renk: '#D22B37', mesaj: `Bu ilan için en az ${tabanSarti} puan gerekiyor. Başvuru şartını sağlamıyorsun.` },
      fark: puan - tabanSarti,
    };
  }

  let beklenen;
  let belirsizlik;
  let guven;

  if (veri.length === 0) {
    // Geçmiş veri yok: puan türünün tipik yerleşme puanı, kontenjan ve ilanın asgari şartıyla kaba tahmin.
    const tipik = { P3: 80.5, P93: 76.5, P94: 78.5 }[puanTuru] || 78;
    const k = kontenjan || 3;
    const kontenjanEtkisi = -1.6 * Math.log(k / 5); // az kontenjan → yüksek taban, çok kontenjan → düşük taban
    beklenen = tipik + kontenjanEtkisi;
    if (tabanSarti) beklenen = Math.max(beklenen, tabanSarti + 8);
    beklenen = Math.min(92, Math.max(55, beklenen));
    belirsizlik = 4.5;
    guven = 'Düşük (geçmiş veri yok)';
  } else {
    const tabanlar = veri.map((v) => v.taban);
    // Yakın yıllara daha çok ağırlık
    const agirliklar = veri.map((_, i) => i + 1);
    const agirlikliOrt = veri.reduce((s, v, i) => s + v.taban * agirliklar[i], 0) / agirliklar.reduce((s, x) => s + x, 0);
    // Trend (yıllık değişim) — yarı etkisiyle
    const trend = veri.length > 1 ? (tabanlar[tabanlar.length - 1] - tabanlar[0]) / (veri[veri.length - 1].yil - veri[0].yil) : 0;
    // Rekabet: başvuru artışı tabanı yükseltir
    const sonBasvuru = veri[veri.length - 1].basvuru;
    const basvuruArtisi = veri.length > 1 ? sonBasvuru / veri[0].basvuru : 1;
    // Kontenjan etkisi: geçmiş ortalamasından az kontenjan → taban yükselir
    const ortKontenjan = ortalama(veri.map((v) => v.kontenjan));
    const k = kontenjan || ortKontenjan;
    const kontenjanEtkisi = 1.2 * Math.log(ortKontenjan / k);

    beklenen = agirlikliOrt + trend * 0.5 + kontenjanEtkisi + Math.log(basvuruArtisi) * 0.8;
    belirsizlik = Math.max(1.6, sapma(tabanlar) + (k <= 3 ? 1.8 : 0.8));
    guven = veri.length >= 3 ? 'Yüksek' : veri.length === 2 ? 'Orta' : 'Düşük';
  }

  const z = (puan - beklenen) / belirsizlik;
  let olasilik = 1 / (1 + Math.exp(-1.7 * z));
  olasilik = Math.min(0.98, Math.max(0.02, olasilik));

  return {
    olasilik,
    beklenenTaban: Math.round(beklenen * 100) / 100,
    belirsizlik: Math.round(belirsizlik * 100) / 100,
    guven,
    veri,
    seviye: seviye(olasilik),
    fark: Math.round((puan - beklenen) * 100) / 100,
  };
}
