// Yapay zekâ katmanı: Groq (birincil, hızlı) + Google Gemini (PDF okuma ve yedek).
// Her ikisi de ücretsiz katmana sahip. Anahtarlar .env dosyasında:
//   EXPO_PUBLIC_GROQ_API_KEY    -> https://console.groq.com/keys
//   EXPO_PUBLIC_GEMINI_API_KEY  -> https://aistudio.google.com/apikey
// Hiç anahtar yoksa uygulama DEMO modunda çalışır.
//
// ÖNEMLİ: Demo sürümünde anahtarlar uygulamanın içine gömülür. Mağazaya çıkmadan önce
// bu çağrılar kendi sunucunuza taşınmalı, anahtarlar sadece sunucuda durmalıdır.

const temiz = (s) => (s || '').trim().replace(/^["']|["']$/g, '');

const GEMINI_KEY = temiz(process.env.EXPO_PUBLIC_GEMINI_API_KEY);
const GEMINI_MODEL = temiz(process.env.EXPO_PUBLIC_GEMINI_MODEL) || 'gemini-flash-latest';
const GROQ_KEY = temiz(process.env.EXPO_PUBLIC_GROQ_API_KEY);
const GROQ_MODEL = temiz(process.env.EXPO_PUBLIC_GROQ_MODEL);

const geminiVar = () => GEMINI_KEY.length > 10;
const groqVar = () => GROQ_KEY.length > 10;

export const aiAktif = () => geminiVar() || groqVar();
export const aiModel = () =>
  [groqVar() ? `Groq (${GROQ_MODEL || 'otomatik'})` : null, geminiVar() ? `Gemini (${GEMINI_MODEL})` : null].filter(Boolean).join(' + ') ||
  '—';

const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const GECICI = [429, 500, 502, 503, 504];
const benzersiz = (a) => a.filter((m, i) => m && a.indexOf(m) === i);

// ---------------- GROQ ----------------
// Görsel okuyabilen modeller (Groq model listesi değişebildiği için sırayla denenir)
const GROQ_GORSEL_MODELLER = benzersiz([GROQ_MODEL, 'meta-llama/llama-4-scout-17b-16e-instruct', 'qwen/qwen3.6-27b', 'meta-llama/llama-4-maverick-17b-128e-instruct']);
const GROQ_METIN_MODELLER = benzersiz([GROQ_MODEL, 'llama-3.3-70b-versatile', 'meta-llama/llama-4-scout-17b-16e-instruct', 'openai/gpt-oss-20b']);

async function groqCagir({ metin, gorsel, temperature }) {
  const modeller = gorsel ? GROQ_GORSEL_MODELLER : GROQ_METIN_MODELLER;
  const content = gorsel
    ? [
        { type: 'text', text: metin },
        { type: 'image_url', image_url: { url: `data:${gorsel.mimeType};base64,${gorsel.base64}` } },
      ]
    : metin;
  let sonHata = '';
  for (const model of modeller) {
    for (let deneme = 0; deneme < 2; deneme++) {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
        body: JSON.stringify({ model, temperature, messages: [{ role: 'user', content }] }),
      });
      let data = {};
      try {
        data = await res.json();
      } catch {}
      if (res.ok) {
        const text = data?.choices?.[0]?.message?.content || '';
        if (text) return text;
        sonHata = 'boş yanıt';
        break;
      }
      sonHata = data?.error?.message || `HTTP ${res.status}`;
      if (res.status === 401) throw new Error(`Groq anahtarı geçersiz: ${sonHata}`);
      if (!GECICI.includes(res.status)) break; // model yok / desteklenmiyor → sıradaki model
      if (deneme === 0) await bekle(1500);
    }
  }
  throw new Error(`Groq: ${sonHata}`);
}

// ---------------- GEMINI ----------------
const GEMINI_MODELLER = benzersiz([GEMINI_MODEL, 'gemini-flash-lite-latest', 'gemini-2.5-flash', 'gemini-2.5-flash-lite']);

async function geminiCagir({ metin, gorsel, json, temperature }) {
  const parts = gorsel ? [{ inline_data: { mime_type: gorsel.mimeType, data: gorsel.base64 } }, { text: metin }] : [{ text: metin }];
  let sonHata = '';
  for (const model of GEMINI_MODELLER) {
    for (let deneme = 0; deneme < 2; deneme++) {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_KEY },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: { temperature, ...(json ? { responseMimeType: 'application/json' } : {}) },
        }),
      });
      let data = {};
      try {
        data = await res.json();
      } catch {}
      if (res.ok) {
        const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
        if (text) return text;
        sonHata = 'boş yanıt';
        break;
      }
      sonHata = data?.error?.message || `HTTP ${res.status}`;
      if (res.status === 404) break;
      if (!GECICI.includes(res.status)) throw new Error(`Gemini hatası: ${sonHata}`);
      if (deneme === 0) await bekle(1500);
    }
  }
  throw new Error(`Gemini: ${sonHata}`);
}

/** Sırayla uygun sağlayıcıları dener. PDF sadece Gemini ile okunabilir. */
async function yzCagir({ metin, gorsel, json = false, temperature = 0.4 }) {
  const pdf = gorsel?.mimeType === 'application/pdf';
  const saglayicilar = [];
  if (groqVar() && !pdf) saglayicilar.push(['Groq', groqCagir]);
  if (geminiVar()) saglayicilar.push(['Gemini', geminiCagir]);
  if (!saglayicilar.length) {
    throw new Error(pdf ? 'PDF okumak için Gemini anahtarı gerekli. Belgenin ekran görüntüsünü (görsel) yükleyebilirsiniz.' : 'Yapay zekâ anahtarı tanımlı değil.');
  }
  const hatalar = [];
  for (const [, fn] of saglayicilar) {
    try {
      return await fn({ metin, gorsel, json, temperature });
    } catch (e) {
      hatalar.push(e.message);
    }
  }
  throw new Error(
    `Yapay zekâ şu an yanıt veremedi, birkaç dakika sonra tekrar deneyin.\n(${hatalar.join(' | ')})`,
  );
}

function jsonAyikla(text) {
  const t = text.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(t);
  } catch {
    const m = t.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error('json');
  }
}

/** Yerel dosya URI'sini base64'e çevirir (PDF veya görsel). */
export async function uriToBase64(uri) {
  const res = await fetch(uri);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const s = String(reader.result || '');
      resolve(s.includes(',') ? s.split(',')[1] : s);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const BELGE_PROMPT = `Sen bir belge doğrulama asistanısın. Ekteki dosya ÖSYM KPSS sonuç belgesi olmalı.
Belgeyi dikkatle oku ve SADECE aşağıdaki yapıda geçerli bir JSON döndür (açıklama veya yorum satırı ekleme):
{
  "osymBelgesi": true veya false (bu gerçekten ÖSYM KPSS sonuç belgesi mi),
  "sinavAdi": "örn. 2026 KPSS Ortaöğretim" veya null,
  "sinavYili": sınavın yapıldığı yıl, sayı veya null (belge başlığındaki "2026 KPSS" gibi ifadeden al),
  "adSoyad": metin veya null,
  "puanlar": { "P3": sayı veya null, "P93": sayı veya null, "P94": sayı veya null },
  "dogrulamaKodu": metin veya null,
  "supheliDurum": belgede düzenleme/eksiklik/üstüne yazı gibi şüpheli bir şey varsa açıklaması, yoksa null
}
Kurallar:
- Belgede puan türü "KPSSP3", "KPSSP93", "KPSSP94" gibi yazar; bunlar sırasıyla P3, P93, P94'tür.
- Puanları belgede yazdığı gibi, tüm ondalık basamaklarıyla ve ondalık ayırıcı nokta olacak şekilde ver (örn. "71,19513" → 71.19513).
- Kullanıcının gizlilik için T.C. kimlik no, ad-soyad veya fotoğraf alanını karalaması/kapatması NORMALDİR, şüpheli sayma.
- "supheliDurum" yalnızca puan, puan türü veya sınav bilgisi alanlarında oynama/silinti/yapıştırma izi varsa ya da belge ÖSYM belgesi gibi görünmüyorsa doldurulur.
- Okuyamadığın alanı null bırak.`;

/** Sonuç belgesini okur. beyanPuan yalnızca demo modunda kullanılır. */
export async function belgeOku({ base64, mimeType, beyanPuan, puanTuru }) {
  if (!aiAktif()) {
    // DEMO MODU: Yapay zekâ anahtarı yoksa belge "okunmuş gibi" yapılır.
    await bekle(1800);
    return {
      demo: true,
      osymBelgesi: true,
      sinavAdi: 'KPSS 2026 (demo)',
      sinavYili: 2026,
      adSoyad: 'Demo Kullanıcı',
      puanlar: { P3: null, P93: null, P94: null, [puanTuru]: beyanPuan != null ? Number(beyanPuan) : 70 },
      dogrulamaKodu: 'DEMO-0000',
      supheliDurum: null,
    };
  }
  const text = await yzCagir({ metin: BELGE_PROMPT, gorsel: { base64, mimeType }, json: true, temperature: 0 });
  try {
    const r = jsonAyikla(text);
    // Sayıları normalize et ("83,45" gibi gelirse)
    for (const k of ['P3', 'P93', 'P94']) {
      const v = r?.puanlar?.[k];
      if (typeof v === 'string') r.puanlar[k] = parseFloat(v.replace(',', '.')) || null;
    }
    return r;
  } catch {
    throw new Error("Belge okunamadı. Daha net bir görsel veya ÖSYM PDF'i deneyin.");
  }
}

/** Simülasyon sonucuna Türkçe, samimi bir koç yorumu üretir. */
export async function simulasyonYorumu({ kurum, puanTuru, puan, sonuc, kontenjan }) {
  const veriMetni = sonuc.veri
    .map((v) => `${v.yil}: kontenjan ${v.kontenjan}, başvuru ~${v.basvuru}, taban ${v.taban}, tavan ${v.tavan}`)
    .join('\n');

  if (!aiAktif()) {
    await bekle(900);
    return yerelYorum({ kurum, puan, sonuc });
  }

  const prompt = `Sen KPSS tercih danışmanısın. Kısa, net ve samimi Türkçe ile (en fazla 5 cümle) adayı bilgilendir.
Kesin söz verme, "ihtimal" dilini kullan. Madde işareti kullanma.

Kurum: ${kurum}
Puan türü: ${puanTuru}
Adayın puanı: ${puan}
Bu yılki kontenjan: ${kontenjan ?? 'bilinmiyor'}
Geçmiş yıllar:
${veriMetni || 'veri yok'}
Model tahmini: beklenen taban ${sonuc.beklenenTaban}, atanma olasılığı %${Math.round(sonuc.olasilik * 100)} (${sonuc.seviye.etiket}), veri güveni: ${sonuc.guven}.

Geçen yıllar kaçla kapattığını, adayın konumunu ve ne yapması gerektiğini (ör. alternatif kurum, yedek tercih) söyle.`;
  try {
    return await yzCagir({ metin: prompt, temperature: 0.6 });
  } catch (e) {
    // Yorum kritik değil: yapay zekâ yoğunsa yerel yorumla devam et
    return `${yerelYorum({ kurum, puan, sonuc, notsuz: true })}\n\n(Yapay zekâ şu an yoğun olduğu için otomatik yorum gösterildi.)`;
  }
}

function yerelYorum({ kurum, puan, sonuc, notsuz }) {
  if (!sonuc.veri.length) {
    return `${kurum} için elimizde geçmiş yıl verisi yok; bu yüzden tahmin kaba bir öngörü. Puanın (${puan}) benzer kurumların ortalamasına göre değerlendirildi. Başvurunu yap ama yedek tercihlerini de mutlaka doldur.`;
  }
  const son = sonuc.veri[sonuc.veri.length - 1];
  const enDusuk = Math.min(...sonuc.veri.map((v) => v.taban));
  const enYuksek = Math.max(...sonuc.veri.map((v) => v.taban));
  return `${kurum} geçen yıllarda ${enDusuk} ile ${enYuksek} arasında kapattı; son olarak ${son.yil} yılında ${son.taban} ile son kişiyi aldı. Bu yıl için tahmini taban ${sonuc.beklenenTaban}. Senin puanın ${puan}, yani tahmini tabanın ${sonuc.fark >= 0 ? `${sonuc.fark} puan üzerindesin` : `${Math.abs(sonuc.fark)} puan altındasın`}. ${sonuc.seviye.mesaj}${notsuz ? '' : ' (Demo modu: yapay zekâ anahtarı eklenince burada kişisel yorum görünecek.)'}`;
}

/** Genel amaçlı: yapay zekâdan JSON yanıt al (Groq → Gemini). Anahtar yoksa null döner. */
export async function yzJson(metin, { temperature = 0.3 } = {}) {
  if (!aiAktif()) return null;
  const t = await yzCagir({ metin, json: true, temperature });
  return jsonAyikla(t);
}
