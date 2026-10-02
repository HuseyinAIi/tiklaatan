// Uygulama içi tercih sıralaması: "Bu ilana tercih yaptım" diyen doğrulanmış kullanıcılar arasında sıra.
import { apiUrl } from './api';

export const tercihAktif = () => !!apiUrl();

async function istek(yol, secenek) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const r = await fetch(`${apiUrl()}${yol}`, { ...secenek, signal: ctrl.signal });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.hata || `Sunucu hatası (${r.status})`);
    return j;
  } catch (e) {
    if (e.name === 'AbortError' || /fetch/i.test(e.message)) throw new Error(`İlan sunucusuna ulaşılamadı (${apiUrl()}). Bilgisayarda sunucu.bat açık mı, adres doğru mu?`);
    throw e;
  } finally {
    clearTimeout(t);
  }
}

export function tercihOzeti({ ilan, kullaniciId, puanTuru }) {
  const q = new URLSearchParams({ ilan: ilan.id, kullanici: kullaniciId || '', tur: puanTuru || '', kontenjan: String(ilan.kontenjan || '') });
  return istek(`/tercih?${q}`);
}

export function tercihYap({ ilan, kullaniciId, puan, puanTuru, dogrulandi }) {
  return istek('/tercih', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ilanId: ilan.id, kullaniciId, puan, puanTuru, dogrulandi, kontenjan: ilan.kontenjan || null }),
  });
}

export function tercihGeriAl({ ilan, kullaniciId, puanTuru }) {
  return istek('/tercih', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ilanId: ilan.id, kullaniciId, puanTuru, sil: true, kontenjan: ilan.kontenjan || null }),
  });
}
