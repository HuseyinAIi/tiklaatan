// KPSS merkezi yerleştirme tercihi: kılavuz, liste kaydetme, uygulama içi yerleştirme ve
// yapay zekâ ile otomatik doldurma.
import { yzJson, aiAktif } from './gemini';
import { bolumBul } from '../utils/pozisyon';

import { apiUrl } from './api';
export const MAKS_TERCIH = 30;

async function istek(yol, secenek) {
  if (!apiUrl()) throw new Error('İlan sunucusu adresi tanımlı değil (Profil → Sunucu adresi).');
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const r = await fetch(`${apiUrl()}${yol}`, { ...secenek, signal: ctrl.signal });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.hata || `Sunucu hatası (${r.status})`);
    return j;
  } catch (e) {
    if (e.name === 'AbortError' || /fetch|network/i.test(e.message)) throw new Error(`İlan sunucusuna ulaşılamadı (${apiUrl()}). Bilgisayarda sunucu.bat açık mı, adres doğru mu?`);
    throw e;
  } finally {
    clearTimeout(t);
  }
}

let KILAVUZ = null;
export async function kilavuzGetir() {
  if (KILAVUZ) return KILAVUZ;
  const j = await istek('/kilavuz');
  KILAVUZ = { ...j, harita: new Map((j.programlar || []).map((p) => [p.kod, p])) };
  return KILAVUZ;
}

export const programAdi = (p) =>
  p ? `${p.kurum.toLocaleUpperCase('tr-TR')} / ${p.unvan.toLocaleUpperCase('tr-TR')} / ${p.il.toLocaleUpperCase('tr-TR')} / ${p.ilce} / ${p.kadroTuru} / ${p.kontenjan}` : 'Kod kılavuzda bulunamadı';

export function durumGetir(kullaniciId) {
  return istek(`/tercih-durum?kullanici=${encodeURIComponent(kullaniciId || '')}`);
}

export function listeKaydet({ kullaniciId, puan, puanTuru, dogrulandi, tercihler }) {
  return istek('/tercih-listesi', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kullaniciId, puan, puanTuru, dogrulandi, tercihler: tercihler.map((t) => t.kod) }),
  });
}

export function testAdaylari(govde) {
  return istek('/test-adaylari', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(govde) });
}

/** Geçen yılın taban puanına göre yerleşme ihtimali (0–1). */
export function tarihselSans(p, puan) {
  if (!p || p.gecenYilTaban == null || puan == null) return null;
  const beklenen = p.gecenYilTaban + 0.3; // puanlar her yıl hafifçe yükseliyor
  const sapma = 2.2 + (p.kontenjan <= 2 ? 0.8 : 0);
  const z = (puan - beklenen) / sapma;
  return Math.min(0.98, Math.max(0.02, 1 / (1 + Math.exp(-1.7 * z))));
}

/** Uygulama içi yerleştirme sonucu ile geçmiş yıl tahminini birleştirir. */
export function birlesikSans(p, puan, durum, adaySayisi) {
  const t = tarihselSans(p, puan);
  if (!durum || adaySayisi < 10) return { sans: t, kaynak: 'gecmis' };
  let app;
  if (durum.durum === 'yerlestin') app = 0.92;
  else if (durum.durum === 'ustTercih') app = durum.onumdekiYerlesen < (durum.kontenjan || 0) ? 0.9 : 0.12;
  else if (durum.durum === 'dolu') app = 0.1;
  else app = 0.85;
  // Uygulamadaki aday sayısı arttıkça uygulama verisine daha çok güven
  const w = Math.min(0.7, adaySayisi / 300);
  return { sans: t == null ? app : (1 - w) * t + w * app, kaynak: 'birlesik' };
}

export function sansEtiketi(s) {
  if (s == null) return { etiket: '—', renk: '#8A92A6' };
  if (s >= 0.8) return { etiket: 'Garanti', renk: '#138A55' };
  if (s >= 0.55) return { etiket: 'Yüksek', renk: '#4F9A1F' };
  if (s >= 0.35) return { etiket: 'Orta', renk: '#C98A00' };
  if (s >= 0.15) return { etiket: 'Zor', renk: '#E0640F' };
  return { etiket: 'Hayal', renk: '#D22B37' };
}

/**
 * Otomatik doldurma. Önce kural tabanlı aday havuzu ve "hayal / hedef / garanti" dengesi kurulur;
 * yapay zekâ varsa bu havuzdan kişisel nota göre sıralama + gerekçe ister.
 */
export async function otomatikDoldur({ kilavuz, puan, puanTuru, iller = [], bolumler = [], mezuniyet = '', not = '', strateji = 'dengeli' }) {
  const mez = mezuniyet.trim().toLocaleLowerCase('tr-TR');
  const genelNitelik = /herhangi bir|lise ve dengi|lise mezunu olmak\.?$/i;
  let havuz = kilavuz.programlar
    .filter((p) => p.puanTuru === puanTuru)
    .filter((p) => !iller.length || iller.includes(p.il))
    .filter((p) => !bolumler.length || bolumler.includes(bolumBul(`${p.unvan} ${p.nitelik}`).kod))
    // Belirli bölüm mezuniyeti isteyen kadroları, kullanıcının mezuniyetiyle uyuşmuyorsa ele
    .filter((p) => genelNitelik.test(p.nitelik) || (mez && mez.split(/[ ,]+/).some((k) => k.length > 3 && p.nitelik.toLocaleLowerCase('tr-TR').includes(k))))
    .map((p) => ({ p, s: tarihselSans(p, puan) }));

  const oran = { riskli: [10, 14, 6], dengeli: [6, 14, 10], garantici: [3, 12, 15] }[strateji] || [6, 14, 10];
  const sirala = (a) => a.sort((x, y) => y.p.gecenYilTaban - x.p.gecenYilTaban);
  const hayal = sirala(havuz.filter((x) => x.s >= 0.12 && x.s < 0.45)).slice(0, oran[0]);
  const hedef = sirala(havuz.filter((x) => x.s >= 0.45 && x.s < 0.8)).slice(0, oran[1]);
  const garanti = sirala(havuz.filter((x) => x.s >= 0.8)).slice(0, oran[2]);
  let secilen = [...hayal, ...hedef, ...garanti];
  // Eksik kalırsa en yakın şanslılarla tamamla
  if (secilen.length < MAKS_TERCIH) {
    const var_ = new Set(secilen.map((x) => x.p.kod));
    const ek = havuz.filter((x) => !var_.has(x.p.kod) && x.s >= 0.12).sort((a, b) => Math.abs(a.s - 0.6) - Math.abs(b.s - 0.6));
    secilen = [...secilen, ...ek].slice(0, MAKS_TERCIH);
    secilen = [...secilen].sort((a, b) => a.s - b.s); // düşük şanstan (en çok istenen) yükseğe
  }

  const kuralGerekce = (x) => {
    const parca = [`%${Math.round(x.s * 100)} şans`, `geçen yıl ${x.p.gecenYilTaban.toFixed(2).replace('.', ',')} ile kapandı`];
    if (iller.includes(x.p.il)) parca.push(`${x.p.il} tercihine uygun`);
    parca.push(x.s >= 0.8 ? 'garanti tercih' : x.s >= 0.45 ? 'hedef tercih' : 'hayal tercih');
    return parca.join(' · ');
  };

  let sonuc = secilen.map((x) => ({ kod: x.p.kod, neden: kuralGerekce(x), grup: x.s >= 0.8 ? 'garanti' : x.s >= 0.45 ? 'hedef' : 'hayal' }));
  let yzKullanildi = false;

  if (aiAktif() && (not.trim() || mezuniyet.trim())) {
    try {
      const adaylar = [...havuz]
        .filter((x) => x.s >= 0.1)
        .sort((a, b) => b.p.gecenYilTaban - a.p.gecenYilTaban)
        .slice(0, 70)
        .map((x) => `${x.p.kod} | ${x.p.kurum} / ${x.p.unvan} / ${x.p.il}-${x.p.ilce} | kontenjan ${x.p.kontenjan} | geçen yıl taban ${x.p.gecenYilTaban} | şans %${Math.round(x.s * 100)} | nitelik: ${x.p.nitelik}`)
        .join('\n');
      const j = await yzJson(`Sen KPSS tercih danışmanısın. Aday için en fazla 30 tercihlik ÖSYM listesi hazırla.
Kurallar: ÖSYM adayı listedeki kontenjanı dolmamış en üst tercihine yerleştirir; bu yüzden en çok istenenler üstte, garanti olanlar altta olmalı.
Strateji: ${strateji}. Listeye mutlaka birkaç yüksek şanslı (garanti) tercih koy. Sadece aşağıdaki kodlardan seç, kod uydurma.
Adayın puanı: ${puan} (${puanTuru}). Mezuniyeti: ${mezuniyet || 'belirtilmedi'}. Adayın notu: ${not || '-'}.
Adaylar (kod | program | kontenjan | taban | şans | nitelik):
${adaylar}

SADECE şu JSON'u döndür: {"tercihler":[{"kod":"...","neden":"bu adaya özel kısa gerekçe, en fazla 14 kelime"}]}`);
      const gecerli = new Set(havuz.map((x) => x.p.kod));
      const ai = (j?.tercihler || []).filter((t) => t && gecerli.has(String(t.kod)));
      const tekil = [...new Map(ai.map((t) => [String(t.kod), t])).values()].slice(0, MAKS_TERCIH);
      if (tekil.length >= 5) {
        sonuc = tekil.map((t) => {
          const x = havuz.find((h) => h.p.kod === String(t.kod));
          return { kod: String(t.kod), neden: `${String(t.neden || '').trim()} · %${Math.round(x.s * 100)} şans`, grup: x.s >= 0.8 ? 'garanti' : x.s >= 0.45 ? 'hedef' : 'hayal' };
        });
        yzKullanildi = true;
      }
    } catch {
      // Yapay zekâ yoğun/erişilemez: kural tabanlı liste kullanılır
    }
  }
  return { tercihler: sonuc, yzKullanildi, havuzBoyutu: havuz.length };
}
