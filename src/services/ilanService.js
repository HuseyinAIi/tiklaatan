// İlan veri katmanı.
// EXPO_PUBLIC_API_URL tanımlıysa (örn. http://localhost:3001) canlı ilanları ilan sunucusundan
// (server/ klasörü: Kariyer Kapısı + Resmî Gazete) çeker; ulaşılamazsa demo verisine düşer.

import { ILANLAR } from '../data/ilanlar';
import { KURUM_LISTESI } from '../data/kurumGecmis';
import { baslikDuzen } from '../utils/metin';

import { apiUrl } from './api';

const demoIlanlar = ILANLAR.map((i) => ({ ...i, kurum: baslikDuzen(i.kurum), baslik: baslikDuzen(i.baslik), puanTurleri: [i.puanTuru], demo: true }));
let SON = { ilanlar: demoIlanlar, canli: false, guncelleme: null, kaynaklar: null, hata: null };

const normal = (s) => (s || '').toLocaleUpperCase('tr-TR').replace(/\s+/g, ' ').trim();

// Canlı ilanın kurumunu, geçmiş yıl verisi olan kurumlarla eşleştir (simülasyon için)
function kurumEslestir(ilan) {
  const k = normal(ilan.kurum);
  const bul = KURUM_LISTESI.find((x) => k.includes(normal(x.ad)) || normal(x.ad).includes(k));
  return bul ? bul.id : ilan.kurumId;
}

export async function ilanlariGetir() {
  if (!apiUrl()) return SON;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    const r = await fetch(`${apiUrl()}/ilanlar`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    const liste = Array.isArray(j) ? j : j.ilanlar || [];
    if (!liste.length) {
      SON = { ...SON, hata: j.calisiyor ? 'İlan sunucusu ilk taramayı yapıyor, birazdan yenileyin.' : 'Sunucuda henüz ilan yok.' };
      return SON;
    }
    SON = {
      ilanlar: liste.map((i) => ({
        ...i,
        kurum: baslikDuzen(i.kurum),
        puanTurleri: i.puanTurleri || (i.puanTuru ? [i.puanTuru] : []),
        kurumId: kurumEslestir(i),
      })),
      canli: true,
      guncelleme: j.guncelleme || null,
      kaynaklar: j.kaynaklar || null,
      asama: j.asama || null,
      hata: null,
    };
  } catch (e) {
    SON = { ...SON, hata: `İlan sunucusuna ulaşılamadı (${apiUrl()}). Demo ilanlar gösteriliyor.` };
  }
  return SON;
}

export function ilanBul(id) {
  return SON.ilanlar.find((i) => i.id === id) || demoIlanlar.find((i) => i.id === id);
}

/** İlan bu puan türüne açık mı? Puan türü belirtilmemişse (null) "olabilir" kabul edilir. */
export function turUygun(ilan, tur) {
  const l = ilan.puanTurleri || [];
  return !l.length || l.includes(tur);
}

export function kalanGun(tarih) {
  if (!tarih) return null;
  const bugun = new Date();
  bugun.setHours(0, 0, 0, 0);
  const t = new Date(`${tarih}T00:00:00`);
  if (isNaN(t)) return null;
  return Math.round((t - bugun) / 86400000);
}

export const trTarih = (iso) => (iso ? iso.split('-').reverse().join('.') : '—');

/** ÖSYM sitesindeki renk dili: kırmızı = son gün, turuncu = devam ediyor, turkuaz = yeni yayımlandı. */
export function ilanDurumu(ilan) {
  const gun = kalanGun(ilan.sonBasvuru);
  if (ilan.durum === 'Sona Erdi' || (gun != null && gun < 0)) return { renk: '#A3AABB', etiket: 'Başvuru kapandı', aktif: false, gun };
  if (gun != null && gun <= 2) return { renk: '#E3051B', etiket: gun === 0 ? 'Son gün' : `Son ${gun + 1} gün`, aktif: true, gun };
  const yeni = ilan.yayin && kalanGun(ilan.yayin) != null && kalanGun(ilan.yayin) >= -3;
  if (yeni) return { renk: '#14D2E0', etiket: gun != null ? `Yeni · ${gun} gün kaldı` : 'Yeni yayımlandı', aktif: true, gun };
  return { renk: '#F5A300', etiket: gun != null ? `Devam ediyor · ${gun} gün` : 'Devam ediyor', aktif: true, gun };
}

/** Kendi yazılı sınavı / mülakatı olan ilanlar: KPSS sadece ön eleme, sıralama sınavla belirlenir. */
export function sinavliMi(ilan) {
  const t = `${ilan.baslik || ''} ${ilan.ilanTuru || ''}`;
  return /giriş sınavı|sınav duyurusu|yazılı sınav|sözlü sınav|uzman yardımcı|müfettiş yardımcı|denetçi yardımcı|meslek personeli|kariyer meslek|A Grubu/i.test(t);
}
