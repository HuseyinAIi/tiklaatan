// Tıkla Atan — İlan sunucusu
//
// Kaynaklar (hepsi resmî):
//   1) ilan.gov.tr (Basın İlan Kurumu)   — Resmî Gazete'de yayımlanan KPSS'li memur / 4/B ilanları, tam metin (HTML)
//   2) Kariyer Kapısı (kariyerkapisi.gov.tr) — Cumhurbaşkanlığı kamu işe alım portalı, aktif ilan listesi
//   3) Resmî Gazete "Çeşitli İlanlar"      — PDF ilanlar (ilan.gov.tr'de olmayanları yakalamak için yedek)
//
// Akış: hızlı tarama (kural tabanlı, ~30 sn) → ilanlar hemen yayında → Groq ile ayrıntılar arka planda zenginleştirilir.
// Uçlar: GET /ilanlar   GET /yenile   GET /
//
// Çalıştırma: node index.js          (sunucu + 6 saatte bir yenileme)
//             node index.js --once   (bir kez tara, data/ilanlar.json yaz, çık)

const http = require('http');
const https = require('https');
const tls = require('tls');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

let pdfParse = null;
try {
  pdfParse = require('pdf-parse/lib/pdf-parse.js');
} catch {
  console.warn('[uyarı] pdf-parse kurulu değil; Resmî Gazete PDF yedeği kapalı. (server klasöründe: npm install)');
}

// ---------------- Ayarlar ----------------
const PORT = Number(process.env.PORT || 3001);
const RG_GUN = Number(process.env.RG_GUN || 21);
const YENILEME_SAAT = 6;
const DATA_DIR = path.join(__dirname, 'data');
const CIKTI = path.join(DATA_DIR, 'ilanlar.json');
const RG_ONBELLEK = path.join(DATA_DIR, 'rg-onbellek-v2.json');
const AI_ONBELLEK = path.join(DATA_DIR, 'ai-onbellek.json');
fs.mkdirSync(DATA_DIR, { recursive: true });

function envOku() {
  const env = {};
  for (const f of [path.join(__dirname, '..', '.env'), path.join(__dirname, '.env')]) {
    if (!fs.existsSync(f)) continue;
    for (const satir of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
      const m = satir.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  }
  return env;
}
const ENV = envOku();
const GROQ_KEY = process.env.GROQ_API_KEY || ENV.GROQ_API_KEY || ENV.EXPO_PUBLIC_GROQ_API_KEY || '';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toLocaleTimeString('tr-TR'), ...a);
const jsonOku = (f, v) => {
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch {
    return v;
  }
};
const jsonYaz = (f, v) => fs.writeFileSync(f, JSON.stringify(v, null, 1));

// ---------------- Metin yardımcıları ----------------
const AYLAR = { ocak: 1, şubat: 2, mart: 3, nisan: 4, mayıs: 5, haziran: 6, temmuz: 7, ağustos: 8, eylül: 9, ekim: 10, kasım: 11, aralık: 12 };
const iki = (n) => String(n).padStart(2, '0');
const isoTarih = (d) => `${d.getFullYear()}-${iki(d.getMonth() + 1)}-${iki(d.getDate())}`;
const bugunISO = () => isoTarih(new Date());
const gunEkle = (iso, n) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return isoTarih(d);
};

const KUCUK_KELIME = new Set(['ve', 'ile', 'veya', 'de', 'da', 'için']);
/** "POSOF BELEDİYE BAŞKANLIĞI" → "Posof Belediye Başkanlığı"; parantez içi kısaltmalar korunur. */
function baslikDuzen(s) {
  if (!s) return s;
  return s
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((w, i) => {
      if (/^\(?[A-ZÇĞİÖŞÜ]{2,6}\)?$/.test(w) && /^\(/.test(w)) return w; // (BDDK)
      if (/^\d/.test(w) || /^[IVX]+$/.test(w)) return w;
      const k = w.toLocaleLowerCase('tr-TR');
      if (i > 0 && KUCUK_KELIME.has(k)) return k;
      return k.replace(/^(\(?)(.)/, (_, p, c) => p + c.toLocaleUpperCase('tr-TR')).replace(/([-/])(.)/g, (_, a, c) => a + c.toLocaleUpperCase('tr-TR'));
    })
    .join(' ');
}
/** Kurum adını ilan dilinden temizle: "Posof Belediye Başkanlığından:" → "Posof Belediye Başkanlığı" */
function kurumTemizle(s) {
  return baslikDuzen((s || '').replace(/(?:ndan|nden|dan|den|tan|ten)\s*:?\s*$/i, '').replace(/:$/, ''));
}

function slug(s) {
  return (s || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

function htmlMetin(s) {
  return (s || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h\d)>/gi, '\n')
    .replace(/<\/t[dh]>/gi, ' | ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

function tarihleriBul(metin) {
  const sonuc = [];
  for (const m of metin.matchAll(/\b(\d{1,2})[./](\d{1,2})[./](20\d{2})\b/g)) sonuc.push(`${m[3]}-${iki(m[2])}-${iki(m[1])}`);
  for (const m of metin.matchAll(/\b(\d{1,2})\s+(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s+(20\d{2})\b/gi)) {
    const ay = AYLAR[m[2].toLocaleLowerCase('tr-TR')];
    if (ay) sonuc.push(`${m[3]}-${iki(ay)}-${iki(m[1])}`);
  }
  return sonuc.filter((t) => !isNaN(new Date(t)));
}

/** Son başvuru: "başvuru" geçen cümlelerdeki, yayından sonraki 60 gün içindeki en geç tarih. */
function sonBasvuruBul(metin, yayin) {
  const ust = yayin ? gunEkle(yayin, 60) : '9999-12-31';
  const alt = yayin || '2000-01-01';
  const cumleler = metin.split(/(?<=[.;:])\s+|\n/);
  let aday = [];
  for (const c of cumleler) if (/başvuru|müracaat/i.test(c)) aday.push(...tarihleriBul(c));
  aday = aday.filter((t) => t >= alt && t <= ust).sort();
  return aday.length ? aday[aday.length - 1] : null;
}

function puanTurleriBul(metin) {
  const set = new Set();
  for (const m of metin.matchAll(/KPSS\s*[-_]?\s*P\s*[-_]?\s*(3|93|94)\b|\bP\s?(3|93|94)\b(?!\d)/gi)) set.add(`P${m[1] || m[2]}`);
  if (!set.size && /KPSS/i.test(metin)) {
    if (/ortaöğretim|lise mezunu/i.test(metin)) set.add('P94');
    if (/önlisans|ön lisans/i.test(metin)) set.add('P93');
    if (/\blisans\b/i.test(metin)) set.add('P3');
  }
  return ['P3', 'P93', 'P94'].filter((p) => set.has(p));
}

function tabanBul(metin) {
  const m =
    metin.match(/(?:en az|asgari|en düşük)\s*(\d{2})(?:[.,]\d+)?\s*(?:\(|puan)/i) ||
    metin.match(/(\d{2})(?:[.,]\d+)?\s*(?:\([^)]*\)\s*)?(?:ve üzeri|ve daha fazla)\s*puan/i) ||
    metin.match(/puan(?:ı|ın)?\s*(?:en az)?\s*(\d{2})\s*(?:ve üzeri|olan)/i);
  const n = m ? Number(m[1]) : null;
  return n && n >= 40 && n <= 95 ? n : null;
}

function kontenjanBul(metin) {
  const m = metin.match(/(\d{1,4})\s*\(\s*[a-zçğıöşü\s]+\)\s*(?:adet|kişi|kadro|sözleşmeli|memur|personel)/i) || metin.match(/toplam\s*(\d{1,4})\s*(?:adet|kişi|kadro)/i);
  const n = m ? Number(m[1]) : null;
  return n && n > 0 && n < 5000 ? n : null;
}

function turBul(metin) {
  if (/4\/B|sözleşmeli personel/i.test(metin)) return 'Sözleşmeli (4/B)';
  if (/memur|zabıta|itfaiye|kadro/i.test(metin)) return 'Memur';
  return 'Kamu personeli';
}

function durumHesapla(sonBasvuru, yayin) {
  if (sonBasvuru) return sonBasvuru >= bugunISO() ? 'Aktif' : 'Sona Erdi';
  if (yayin && gunEkle(yayin, 30) < bugunISO()) return 'Sona Erdi';
  return 'Aktif';
}

async function getir(url, opts = {}, deneme = 3) {
  for (let i = 0; i < deneme; i++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 30000);
      const res = await fetch(url, { ...opts, signal: ctrl.signal, headers: { 'User-Agent': UA, 'Accept-Language': 'tr-TR,tr;q=0.9', ...(opts.headers || {}) } });
      clearTimeout(t);
      return res;
    } catch (e) {
      if (i === deneme - 1) throw e;
      await bekle(1500 * (i + 1));
    }
  }
}


// ---------------- Eksik sertifika zinciri (AIA) desteği ----------------
// Bazı kamu siteleri ara sertifikayı göndermiyor; tarayıcılar bunu sertifikadaki "CA Issuers" adresinden
// kendileri indirir, Node indirmez. Burada aynısını yapıp doğrulamayı AÇIK tutarak bağlanıyoruz.
const AJANLAR = {};
function derToPem(buf) {
  const t = buf.toString('latin1');
  if (t.includes('-----BEGIN CERTIFICATE-----')) return t;
  return `-----BEGIN CERTIFICATE-----\n${buf.toString('base64').match(/.{1,64}/g).join('\n')}\n-----END CERTIFICATE-----\n`;
}
function hamIndir(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod
      .get(url, { timeout: 15000 }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) return resolve(hamIndir(res.headers.location));
        const parcalar = [];
        res.on('data', (c) => parcalar.push(c));
        res.on('end', () => resolve(Buffer.concat(parcalar)));
      })
      .on('error', reject);
  });
}
const aiaAdresleri = (infoAccess) =>
  String(infoAccess || '')
    .split('\n')
    .filter((l) => /CA Issuers/i.test(l))
    .map((l) => l.replace(/^.*?URI:/i, '').trim())
    .filter(Boolean);

async function ajanAl(host) {
  if (AJANLAR[host]) return AJANLAR[host];
  const yaprak = await new Promise((resolve, reject) => {
    const sock = tls.connect(443, host, { servername: host, rejectUnauthorized: false }, () => {
      const c = sock.getPeerCertificate(true);
      sock.end();
      resolve(c);
    });
    sock.setTimeout(15000, () => sock.destroy(new Error('zaman aşımı')));
    sock.on('error', reject);
  });
  const ekler = [];
  let adresler = yaprak?.infoAccess?.['CA Issuers - URI'] || [];
  for (let seviye = 0; seviye < 3 && adresler.length; seviye++) {
    const sonraki = [];
    for (const u of adresler) {
      try {
        const pem = derToPem(await hamIndir(u));
        ekler.push(pem);
        const x = new crypto.X509Certificate(pem);
        if (x.issuer !== x.subject) sonraki.push(...aiaAdresleri(x.infoAccess));
      } catch (e) {
        log('[tls] ara sertifika indirilemedi', u, e.message);
      }
    }
    adresler = sonraki;
  }
  AJANLAR[host] = new https.Agent({ keepAlive: true, ca: [...tls.rootCertificates, ...ekler] });
  log(`[tls] ${host}: ${ekler.length} ara sertifika eklendi`);
  return AJANLAR[host];
}

/** fetch benzeri, ama eksik zinciri tamamlayan https isteği. */
async function guvenliGetir(url, { method = 'GET', headers = {}, body } = {}) {
  const u = new URL(url);
  const agent = await ajanAl(u.hostname);
  for (let deneme = 0; deneme < 3; deneme++) {
    try {
      return await new Promise((resolve, reject) => {
        const req = https.request(
          u,
          { method, agent, headers: { 'User-Agent': UA, 'Accept-Language': 'tr-TR,tr;q=0.9', ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}), ...headers }, timeout: 30000 },
          (res) => {
            const parcalar = [];
            res.on('data', (c) => parcalar.push(c));
            res.on('end', () => {
              const metin = Buffer.concat(parcalar).toString('utf8');
              resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, text: async () => metin, json: async () => JSON.parse(metin) });
            });
          },
        );
        req.on('timeout', () => req.destroy(new Error('zaman aşımı')));
        req.on('error', reject);
        if (body) req.write(body);
        req.end();
      });
    } catch (e) {
      if (deneme === 2) throw e;
      await bekle(1500 * (deneme + 1));
    }
  }
}

/** Kural tabanlı ortak ayrıştırıcı (yapay zekâ gelmeden önceki hızlı sürüm). */
function kuralIleAyristir(metin, yayin) {
  return {
    puanTurleri: puanTurleriBul(metin),
    tabanSarti: tabanBul(metin),
    kontenjan: kontenjanBul(metin),
    sonBasvuru: sonBasvuruBul(metin, yayin),
    tur: turBul(metin),
  };
}

function kpssPersonelMi(metin) {
  const t = metin.replace(/\s+/g, ' ');
  const kpss = /KPSS|Kamu Personel Seçme Sınavı/i.test(t);
  const alim = /alın(?:acak|acaktır)|alımı|istihdam edil|personel al|atama yapılacak|ataması yapılacak/i.test(t);
  const akademik = /öğretim üyesi|öğretim görevlisi|araştırma görevlisi|doçent|profesör/i.test(t);
  const iptal = /iptal (?:ilanı|edilmiştir)|düzeltme ilanı/i.test(t.slice(0, 400));
  return kpss && alim && !iptal && !(akademik && !/memur|sözleşmeli personel|4\/B/i.test(t));
}

// ---------------- 1) ilan.gov.tr ----------------
const IGT_API = 'https://www.ilan.gov.tr/api/api/services/app';
const IGT_H = {
  'Content-Type': 'application/json-patch+json',
  Accept: 'text/plain',
  'X-Request-Origin': 'IGT-UI',
  'X-Requested-With': 'XMLHttpRequest',
  Origin: 'https://www.ilan.gov.tr',
  Referer: 'https://www.ilan.gov.tr/ilan/tum-ilanlar/personel-alimi?ats=5',
};
const IGT_KATEGORI = /KPSS|Mahalli İdare|Sözleşmeli|4\/B|Memur|Kadro Alım/i;

async function ilanGovTr() {
  const liste = [];
  for (let sayfa = 0; sayfa < 15; sayfa++) {
    const res = await guvenliGetir(`${IGT_API}/Ad/AdsByFilter`, {
      method: 'POST',
      headers: IGT_H,
      body: JSON.stringify({ keys: { ats: [5] }, skipCount: sayfa * 20, maxResultCount: 20 }),
    });
    if (!res.ok) throw new Error(`ilan.gov.tr HTTP ${res.status}`);
    const j = await res.json();
    const ads = j?.result?.ads || [];
    liste.push(...ads);
    if (ads.length < 20 || liste.length >= (j?.result?.numFound || 0)) break;
  }
  const uygun = liste.filter((a) => {
    const kat = (a.values || []).map((v) => v.value).join(' ');
    return IGT_KATEGORI.test(kat) && !/iptal|düzeltme/i.test(a.title || '');
  });
  log(`[igt] ${liste.length} personel ilanı, ${uygun.length} tanesi KPSS'li memur/sözleşmeli kategorisinde`);

  const ilanlar = [];
  for (const a of uygun) {
    try {
      const r = await guvenliGetir(`${IGT_API}/AdDetail/GetAdDetail?id=${encodeURIComponent(a.id)}&isKiwiAd=false`, { headers: IGT_H });
      if (!r.ok) continue;
      const d = (await r.json())?.result || {};
      const metin = htmlMetin(d.content || '');
      const rgTarih = (a.adTypeFilters || []).find((f) => /Resm/i.test(f.key))?.value;
      const yayin = rgTarih ? rgTarih.split('.').reverse().join('-') : (a.publishStartDate || '').slice(0, 10) || null;
      if (!kpssPersonelMi(metin)) continue;
      const k = kuralIleAyristir(metin, yayin);
      const kat = (a.values || []).map((v) => v.value).join(' ');
      ilanlar.push({
        id: `igt-${a.id}`,
        kaynak: 'Resmi Gazete',
        kaynakDetay: `ilan.gov.tr · ${a.adSourceName || 'Basın İlan Kurumu'}`,
        kurum: kurumTemizle(a.advertiserName),
        baslik: baslikDuzen((a.title || '').replace(/\s*\([^)]*\)\s*$/, '')) || 'Personel Alım İlanı',
        il: a.addressCityName ? baslikDuzen(a.addressCityName) : null,
        kapsam: 'Türkiye Geneli',
        yayin,
        ...k,
        tur: /sözleşmeli|4\/B/i.test(kat) ? 'Sözleşmeli (4/B)' : /KPSS B|Mahalli/i.test(kat) ? 'Memur' : k.tur,
        puanTuru: k.puanTurleri[0] || null,
        url: `https://www.ilan.gov.tr${a.urlStr || ''}`,
        ozet: null,
        _metin: metin.slice(0, 9000),
      });
    } catch (e) {
      log('[igt] detay alınamadı', a.id, e.message);
    }
    await bekle(150);
  }
  return ilanlar;
}

// ---------------- 2) Kariyer Kapısı ----------------
const KK_TURLER = ['B Grubu Memur', 'Sözleşmeli Personel İlanları', 'Merkezi Yerleştirme (ÖSYM)', 'A Grubu Memur (Kariyer Meslek)'];

async function kariyerKapisi() {
  const res = await getir('https://api.kariyerkapisi.gov.tr/api/ilan/GetIseAlimPage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Origin: 'https://kariyerkapisi.gov.tr', Referer: 'https://kariyerkapisi.gov.tr/isealim' },
    body: JSON.stringify({ Il: '', IlanTuru: '', SearchText: '' }),
  });
  if (!res.ok) throw new Error(`Kariyer Kapısı HTTP ${res.status}`);
  const j = await res.json();
  const liste = Array.isArray(j.searchIlan) ? j.searchIlan : [];
  return liste
    .filter((x) => KK_TURLER.includes(x.ilanTuru))
    .map((x) => {
      const ham = x.ilanBaslik || '';
      const parcalar = ham.split(' - ');
      const baslik = parcalar.length > 1 ? parcalar[parcalar.length - 1] : ham;
      const sonBasvuru = x.bitTarih ? x.bitTarih.slice(0, 10) : null;
      const yayin = x.basTarih ? x.basTarih.slice(0, 10) : null;
      const pt = puanTurleriBul(ham);
      return {
        id: `kk-${x.guid}`,
        kaynak: 'Kariyer Kapısı',
        kaynakDetay: 'kariyerkapisi.gov.tr',
        kurum: baslikDuzen(x.kurumAdi),
        birim: x.birimAdi ? baslikDuzen(x.birimAdi) : null,
        baslik: baslikDuzen(baslik),
        tur: /memur/i.test(x.ilanTuru) ? 'Memur' : /sözleşmeli/i.test(x.ilanTuru) ? 'Sözleşmeli (4/B)' : x.ilanTuru,
        puanTurleri: pt,
        puanTuru: pt[0] || null,
        tabanSarti: null,
        kontenjan: kontenjanBul(ham),
        il: null,
        kapsam: 'Türkiye Geneli',
        yayin,
        sonBasvuru,
        durum: x.sonDurumu === 'Aktif' ? durumHesapla(sonBasvuru, yayin) : 'Sona Erdi',
        url: x.basvuruLinki && x.ilanTipi !== 1 ? x.basvuruLinki : `https://kariyerkapisi.gov.tr/IlanDetay?i=${x.guid}`,
        ozet: `${baslikDuzen(x.kurumAdi)} tarafından yayımlanan ${x.ilanTuru.toLocaleLowerCase('tr-TR')}. Başvurular ${
          sonBasvuru ? sonBasvuru.split('-').reverse().join('.') : 'ilanda belirtilen tarih'
        } tarihine kadar Kariyer Kapısı üzerinden e-Devlet ile yapılır. Kadro, puan türü ve taban puan ayrıntıları ilan metnindedir.`,
      };
    });
}

// ---------------- 3) Resmî Gazete PDF (yedek) ----------------
async function rgGunListesi(tarih) {
  const y = tarih.getFullYear();
  const a = iki(tarih.getMonth() + 1);
  const g = iki(tarih.getDate());
  const taban = `https://www.resmigazete.gov.tr/ilanlar/eskiilanlar/${y}/${a}/`;
  const res = await getir(`${taban}${y}${a}${g}-4.htm`);
  if (!res.ok) return [];
  const buf = Buffer.from(await res.arrayBuffer());
  let html = buf.toString('utf8');
  const cs = (html.match(/charset=["']?([\w-]+)/i) || [])[1];
  if (cs && !/utf-?8/i.test(cs)) {
    try {
      html = new TextDecoder(cs.toLowerCase()).decode(buf);
    } catch {
      html = new TextDecoder('windows-1254').decode(buf);
    }
  }
  const sonuc = [];
  for (const m of html.matchAll(/<a[^>]+href=["']?([^"'\s>]+\.pdf)["']?[^>]*>([\s\S]*?)<\/a>/gi)) {
    const baslik = htmlMetin(m[2]).replace(/\s+/g, ' ');
    if (baslik) sonuc.push({ url: m[1].startsWith('http') ? m[1] : taban + m[1], baslik, yayin: `${y}-${a}-${g}` });
  }
  return sonuc;
}

async function resmiGazete(mevcutKurumlar) {
  if (!pdfParse) return [];
  const onbellek = jsonOku(RG_ONBELLEK, {});
  const tumu = [];
  for (let i = 0; i < RG_GUN; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    try {
      tumu.push(...(await rgGunListesi(d)));
    } catch (e) {
      log('[rg] gün alınamadı', isoTarih(d), e.message);
    }
  }
  // ilan.gov.tr'de zaten olan (aynı gün + aynı kurum) ilanları atla
  const atla = (k) => mevcutKurumlar.has(`${k.yayin}|${slug(kurumTemizle(k.baslik))}`);
  const islenecek = tumu.filter((k) => !atla(k) && !/Merkez Bankası|Borsa|Noterlik/i.test(k.baslik));
  log(`[rg] ${tumu.length} PDF, ${islenecek.length} tanesi ilan.gov.tr'de yok → inceleniyor`);
  const ilanlar = [];
  for (let i = 0; i < islenecek.length; i += 4) {
    const parca = await Promise.all(
      islenecek.slice(i, i + 4).map(async (k) => {
        if (onbellek[k.url]) return onbellek[k.url];
        try {
          const res = await getir(k.url);
          if (!res.ok) return null;
          const metin = ((await pdfParse(Buffer.from(await res.arrayBuffer()))).text || '').replace(/[ \t]+/g, ' ');
          let ilan = null;
          if (kpssPersonelMi(metin)) {
            const kr = kuralIleAyristir(metin, k.yayin);
            const kurum = kurumTemizle(k.baslik);
            ilan = {
              id: `rg-${k.url.split('/').pop().replace('.pdf', '')}`,
              kaynak: 'Resmi Gazete',
              kaynakDetay: 'resmigazete.gov.tr',
              kurum,
              baslik: 'Personel Alım İlanı',
              il: (k.baslik.match(/^(\S+)\s+İli\b/i) || [])[1] ? baslikDuzen(k.baslik.match(/^(\S+)\s+İli\b/i)[1]) : null,
              kapsam: 'Türkiye Geneli',
              yayin: k.yayin,
              ...kr,
              puanTuru: kr.puanTurleri[0] || null,
              url: k.url,
              ozet: null,
              _metin: metin.slice(0, 9000),
            };
          }
          onbellek[k.url] = { ilan };
          return onbellek[k.url];
        } catch (e) {
          return null;
        }
      }),
    );
    for (const p of parca) if (p?.ilan) ilanlar.push(p.ilan);
  }
  jsonYaz(RG_ONBELLEK, onbellek);
  return ilanlar;
}

// ---------------- Groq ile zenginleştirme ----------------
const GROQ_MODELLER = ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile', 'meta-llama/llama-4-scout-17b-16e-instruct', 'openai/gpt-oss-20b'];
let groqSon = 0;
let groqKapali = false;

async function groqCikar(ilan) {
  if (!GROQ_KEY || groqKapali || !ilan._metin) return null;
  const prompt = `Türk kamu kurumu personel alım ilanından bilgileri çıkar. SADECE geçerli JSON döndür, başka metin yazma.
{"baslik": "kısa başlık, örn: 3 Zabıta Memuru Alacak / 18 Sözleşmeli Personel Alacak",
 "tur": "Memur" | "Sözleşmeli (4/B)" | "Kamu personeli",
 "kontenjan": toplam alınacak kişi sayısı (sayı) veya null,
 "puanTurleri": ilanda istenen KPSS puan türleri, sadece "P3","P93","P94" değerleri,
 "tabanSarti": istenen en düşük KPSS puanı (sayı) veya null,
 "sonBasvuru": "YYYY-MM-DD" son başvuru tarihi veya null,
 "kadrolar": [{"unvan": "kadro/pozisyon adı", "adet": sayı, "puanTuru": "P3|P93|P94", "egitim": "aranan bölüm/öğrenim, kısa", "taban": bu kadro için en düşük KPSS puanı veya null}],
 "ozet": "2 cümle: kimler başvurabilir ve başvuru nasıl/nereye yapılır"}

Kurum: ${ilan.kurum}
Yayın tarihi: ${ilan.yayin || 'bilinmiyor'}
Metin:
${ilan._metin.slice(0, 3800)}`;

  for (const model of GROQ_MODELLER) {
    for (let deneme = 0; deneme < 3; deneme++) {
      const fark = Date.now() - groqSon;
      if (fark < 9000) await bekle(9000 - fark); // ücretsiz katman: dakikada ~6 istek
      groqSon = Date.now();
      try {
        const res = await getir('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
          body: JSON.stringify({ model, temperature: 0, max_tokens: 900, response_format: { type: 'json_object' }, messages: [{ role: 'user', content: prompt }] }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          const t = data?.choices?.[0]?.message?.content || '';
          const m = t.match(/\{[\s\S]*\}/);
          return m ? JSON.parse(m[0]) : null;
        }
        if (res.status === 401) {
          groqKapali = true;
          log('[ai] Groq anahtarı geçersiz; zenginleştirme kapalı');
          return null;
        }
        if (res.status === 429) {
          const sn = Number(res.headers.get('retry-after')) || 20;
          if (/per day|TPD|RPD/i.test(data?.error?.message || '')) break; // bu modelin günlük kotası bitti → sıradaki model
          await bekle(Math.min(sn, 60) * 1000);
          continue;
        }
        if (res.status >= 500) {
          await bekle(4000);
          continue;
        }
        break; // 400/404: model desteklenmiyor → sıradaki
      } catch {
        await bekle(3000);
      }
    }
  }
  return null;
}

function aiUygula(ilan, ai) {
  if (!ai) return ilan;
  const pt = (Array.isArray(ai.puanTurleri) ? ai.puanTurleri : []).filter((p) => ['P3', 'P93', 'P94'].includes(p));
  const sayi = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : null);
  const tarih = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && (!ilan.yayin || v >= ilan.yayin) ? v : null);
  const taban = sayi(ai.tabanSarti);
  return {
    ...ilan,
    baslik: ai.baslik ? baslikDuzen(ai.baslik) : ilan.baslik,
    tur: ['Memur', 'Sözleşmeli (4/B)', 'Kamu personeli'].includes(ai.tur) ? ai.tur : ilan.tur,
    kontenjan: sayi(ai.kontenjan) ?? ilan.kontenjan,
    puanTurleri: pt.length ? pt : ilan.puanTurleri,
    puanTuru: (pt.length ? pt : ilan.puanTurleri)[0] || null,
    tabanSarti: taban && taban >= 40 && taban <= 95 ? taban : ilan.tabanSarti,
    sonBasvuru: tarih(ai.sonBasvuru) ?? ilan.sonBasvuru,
    kadrolar: Array.isArray(ai.kadrolar) ? ai.kadrolar.slice(0, 25).map((k) => ({ ...k, unvan: baslikDuzen(k.unvan || '') })) : [],
    ozet: typeof ai.ozet === 'string' && ai.ozet.length > 20 ? ai.ozet : ilan.ozet,
    aiIle: true,
  };
}

// ---------------- Toplama / yayın ----------------
let DURUM = { guncelleme: null, kaynaklar: {}, ilanlar: [], calisiyor: false, asama: null };
DURUM = { ...DURUM, ...jsonOku(CIKTI, {}), calisiyor: false, asama: null };
let HAM = []; // _metin dahil iç liste

function yayinla(ilanlar, asama) {
  const aiOnbellek = jsonOku(AI_ONBELLEK, {});
  const temiz = ilanlar
    .map((x) => aiUygula(x, aiOnbellek[x.id]))
    .map((x) => {
      const { _metin, ...g } = x;
      if (!g.ozet && _metin) g.ozet = _metin.replace(/\s+/g, ' ').slice(0, 320) + '…';
      return { ...g, kurumId: slug(g.kurum), durum: g.kaynak === 'Kariyer Kapısı' && g.durum === 'Sona Erdi' ? 'Sona Erdi' : durumHesapla(g.sonBasvuru, g.yayin) };
    })
    .sort((a, b) => (b.yayin || '').localeCompare(a.yayin || ''));
  DURUM = { ...DURUM, guncelleme: new Date().toISOString(), ilanlar: temiz, asama };
  jsonYaz(CIKTI, { guncelleme: DURUM.guncelleme, kaynaklar: DURUM.kaynaklar, ilanlar: temiz });
}

async function yenile() {
  if (DURUM.calisiyor) return;
  DURUM.calisiyor = true;
  const t0 = Date.now();
  log('İlanlar yenileniyor…');
  const kaynaklar = {};
  let ilanlar = [];
  const eski = (k) => DURUM.ilanlar.filter((x) => x.kaynak === k);

  // 1) Kariyer Kapısı + ilan.gov.tr (hızlı)
  const [kk, igt] = await Promise.allSettled([kariyerKapisi(), ilanGovTr()]);
  if (kk.status === 'fulfilled') {
    ilanlar.push(...kk.value);
    kaynaklar['Kariyer Kapısı'] = { durum: 'ok', adet: kk.value.length };
  } else {
    kaynaklar['Kariyer Kapısı'] = { durum: 'hata', hata: kk.reason?.message };
    ilanlar.push(...eski('Kariyer Kapısı'));
    log('[kk] hata:', kk.reason?.message);
  }
  if (igt.status === 'fulfilled') {
    ilanlar.push(...igt.value);
    kaynaklar['ilan.gov.tr'] = { durum: 'ok', adet: igt.value.length };
  } else {
    kaynaklar['ilan.gov.tr'] = { durum: 'hata', hata: igt.reason?.message };
    log('[igt] hata:', igt.reason?.message);
  }
  DURUM.kaynaklar = kaynaklar;
  yayinla(ilanlar, 'Resmî Gazete taranıyor');
  log(`[1/3] ${ilanlar.length} ilan yayında (${((Date.now() - t0) / 1000).toFixed(0)} sn) · KK ${kaynaklar['Kariyer Kapısı'].adet ?? 'hata'} · ilan.gov.tr ${kaynaklar['ilan.gov.tr'].adet ?? 'hata'}`);

  // 2) Resmî Gazete PDF yedeği
  try {
    const mevcut = new Set(ilanlar.filter((x) => x.kaynak === 'Resmi Gazete').map((x) => `${x.yayin}|${slug(x.kurum)}`));
    const rg = await resmiGazete(mevcut);
    ilanlar.push(...rg);
    kaynaklar['Resmî Gazete PDF'] = { durum: 'ok', adet: rg.length };
  } catch (e) {
    kaynaklar['Resmî Gazete PDF'] = { durum: 'hata', hata: e.message };
    log('[rg] hata:', e.message);
  }
  // ilan.gov.tr çalışmadıysa eski Resmî Gazete kayıtlarını koru
  if (igt.status !== 'fulfilled') {
    const ids = new Set(ilanlar.map((x) => x.id));
    ilanlar.push(...eski('Resmi Gazete').filter((x) => !ids.has(x.id)));
  }
  HAM = ilanlar;
  yayinla(ilanlar, GROQ_KEY ? 'Ayrıntılar yapay zekâ ile dolduruluyor' : null);
  log(`[2/3] ${ilanlar.length} ilan yayında`);

  // 3) Yapay zekâ ile zenginleştirme (önbellekte olmayan, aktif ilanlar)
  if (GROQ_KEY) {
    const aiOnbellek = jsonOku(AI_ONBELLEK, {});
    const bekleyen = ilanlar.filter((x) => x._metin && !aiOnbellek[x.id] && durumHesapla(x.sonBasvuru, x.yayin) === 'Aktif');
    log(`[3/3] ${bekleyen.length} ilan yapay zekâ ile zenginleştirilecek (~${Math.ceil((bekleyen.length * 9) / 60)} dk)`);
    let n = 0;
    for (const ilan of bekleyen) {
      const ai = await groqCikar(ilan);
      if (ai) {
        aiOnbellek[ilan.id] = ai;
        jsonYaz(AI_ONBELLEK, aiOnbellek);
      }
      n++;
      if (n % 3 === 0 || n === bekleyen.length) yayinla(ilanlar, `Ayrıntılar dolduruluyor (${n}/${bekleyen.length})`);
      if (groqKapali) break;
    }
  }
  yayinla(ilanlar, null);
  DURUM.calisiyor = false;
  log(`Tamam: ${DURUM.ilanlar.length} ilan, ${DURUM.ilanlar.filter((x) => x.durum === 'Aktif').length} aktif (${((Date.now() - t0) / 60000).toFixed(1)} dk)`);
}

// ---------------- Tercih sıralaması ----------------
// Uygulamada "Bu ilana tercih yaptım" diyen DOĞRULANMIŞ kullanıcılar ilan + puan türü bazında sıralanır.
// Kayıt: data/tercihler.json → { [ilanId]: { [kullaniciId]: { puan, puanTuru, ad, tarih } } }
const TERCIH_DOSYA = path.join(DATA_DIR, 'tercihler.json');
let TERCIHLER = jsonOku(TERCIH_DOSYA, {});
const tercihKaydet = () => jsonYaz(TERCIH_DOSYA, TERCIHLER);

function tercihOzeti(ilanId, kullaniciId, puanTuruIstek, kontenjanIstek) {
  const ilan = DURUM.ilanlar.find((x) => x.id === ilanId);
  const kayitlar = TERCIHLER[ilanId] || {};
  const benim = kullaniciId ? kayitlar[kullaniciId] : null;
  const puanTuru = benim?.puanTuru || puanTuruIstek || null;
  // Farklı puan türleri farklı ölçektedir; sıralama aynı puan türündekiler arasında yapılır.
  const liste = Object.entries(kayitlar)
    .filter(([, v]) => !puanTuru || v.puanTuru === puanTuru)
    .map(([id, v]) => ({ id, puan: v.puan }))
    .sort((a, b) => b.puan - a.puan);
  const kontenjan = ilan?.kontenjan || (Number(kontenjanIstek) > 0 ? Number(kontenjanIstek) : null);
  const siram = benim ? liste.findIndex((x) => x.id === kullaniciId) + 1 : null;
  const taban = kontenjan && liste.length >= kontenjan ? liste[kontenjan - 1].puan : null;
  return {
    ilanId,
    puanTuru,
    kontenjan,
    toplam: liste.length,
    tumTurlerToplam: Object.keys(kayitlar).length,
    tercihEttim: !!benim,
    siram,
    benimPuanim: benim?.puan ?? null,
    taban, // tercih edenler arasında kontenjanın son kişisinin puanı (kontenjan dolmadıysa null)
    enDusuk: liste.length ? liste[liste.length - 1].puan : null,
    enYuksek: liste.length ? liste[0].puan : null,
    // kimlik içermeyen sıralı puan listesi (ilk 200)
    puanlar: liste.slice(0, 200).map((x, i) => ({ sira: i + 1, puan: x.puan, ben: x.id === kullaniciId })),
  };
}

function govdeOku(req) {
  return new Promise((resolve) => {
    let b = '';
    req.on('data', (c) => {
      b += c;
      if (b.length > 1e5) req.destroy();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(b || '{}'));
      } catch {
        resolve({});
      }
    });
  });
}

// ---------------- Tercih modülü ----------------
const TERCIH = require('./tercih')({ DATA_DIR, jsonOku, jsonYaz });

// ---------------- HTTP ----------------
function sunucu() {
  http
    .createServer(async (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      if (req.method === 'OPTIONS') return res.end();
      const url = new URL(req.url, 'http://x');
      if (url.pathname === '/ilanlar') {
        return res.end(
          JSON.stringify({ guncelleme: DURUM.guncelleme, kaynaklar: DURUM.kaynaklar, calisiyor: DURUM.calisiyor, asama: DURUM.asama, ilanlar: DURUM.ilanlar }),
        );
      }
      // GET /tercih?ilan=ID&kullanici=UID&tur=P94  → sıralama özeti
      if (url.pathname === '/tercih' && req.method === 'GET') {
        return res.end(JSON.stringify(tercihOzeti(url.searchParams.get('ilan'), url.searchParams.get('kullanici'), url.searchParams.get('tur'), url.searchParams.get('kontenjan'))));
      }
      // POST /tercih { ilanId, kullaniciId, puan, puanTuru, dogrulandi, sil }
      if (url.pathname === '/tercih' && req.method === 'POST') {
        const g = await govdeOku(req);
        const puan = Number(g.puan);
        if (!g.ilanId || !g.kullaniciId || !/^[\w-]{8,64}$/.test(g.kullaniciId)) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ hata: 'Eksik bilgi' }));
        }
        if (g.sil) {
          if (TERCIHLER[g.ilanId]) delete TERCIHLER[g.ilanId][g.kullaniciId];
        } else {
          if (!g.dogrulandi || !Number.isFinite(puan) || puan < 0 || puan > 100 || !['P3', 'P93', 'P94'].includes(g.puanTuru)) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ hata: 'Sadece doğrulanmış puanla tercih yapılabilir' }));
          }
          TERCIHLER[g.ilanId] = TERCIHLER[g.ilanId] || {};
          TERCIHLER[g.ilanId][g.kullaniciId] = { puan, puanTuru: g.puanTuru, tarih: new Date().toISOString() };
        }
        tercihKaydet();
        return res.end(JSON.stringify(tercihOzeti(g.ilanId, g.kullaniciId, g.puanTuru, g.kontenjan)));
      }
      // Tercih kılavuzu ve uygulama içi yerleştirme
      if (url.pathname === '/kilavuz') return res.end(JSON.stringify(TERCIH.kilavuz()));
      if (url.pathname === '/tercih-durum') return res.end(JSON.stringify(TERCIH.ozet(url.searchParams.get('kullanici'))));
      if (url.pathname === '/tercih-listesi' && req.method === 'POST') {
        try {
          return res.end(JSON.stringify(TERCIH.listeKaydet(await govdeOku(req))));
        } catch (e) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ hata: e.message }));
        }
      }
      if (url.pathname === '/test-adaylari' && req.method === 'POST') {
        return res.end(JSON.stringify(TERCIH.testAdaylari(await govdeOku(req))));
      }
      if (url.pathname === '/yenile') {
        yenile().catch((e) => log('yenileme hatası', e));
        return res.end(JSON.stringify({ ok: true }));
      }
      res.end(JSON.stringify({ ad: 'Tıkla Atan ilan sunucusu', uclar: ['/ilanlar', '/yenile'], ilanSayisi: DURUM.ilanlar.length, kaynaklar: DURUM.kaynaklar, asama: DURUM.asama, guncelleme: DURUM.guncelleme }));
    })
    .listen(PORT, '0.0.0.0', () => {
      log(`İlan sunucusu hazır: http://localhost:${PORT}/ilanlar  ${GROQ_KEY ? '(Groq açık)' : '(Groq anahtarı yok)'}`);
      const ipler = Object.values(require('os').networkInterfaces())
        .flat()
        .filter((x) => x && x.family === 'IPv4' && !x.internal)
        .map((x) => `${x.address}:${PORT}`);
      if (ipler.length) log(`Telefon için adres (uygulamada Profil > Sunucu adresi): ${ipler.join('  veya  ')}`);
    });
}

process.on('unhandledRejection', (e) => log('beklenmeyen hata:', e?.message || e));

if (process.argv.includes('--once')) {
  yenile().then(() => process.exit(0));
} else {
  sunucu();
  yenile().catch((e) => log('yenileme hatası', e));
  setInterval(() => yenile().catch((e) => log('yenileme hatası', e)), YENILEME_SAAT * 3600e3);
}
