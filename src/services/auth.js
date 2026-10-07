// Giriş katmanı. Şu an DEMO: gerçek Google / Apple girişi ve e-posta kodu için sunucu ve
// istemci kimlikleri gerekir (Google Cloud OAuth istemcisi, Apple Developer hesabı, e-posta servisi).
// Bu dosya, gerçek sağlayıcı bağlanınca yalnızca burası değişsin diye ayrı tutuldu.

export const DEMO_KOD = '123456';

const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

/** Google / Apple ile giriş. Başarılıysa sağlayıcıdan gelen bilgiyi döndürür. */
export async function sosyalGiris(saglayici) {
  await bekle(500);
  // TODO: expo-auth-session (Google) / expo-apple-authentication (Apple) ile gerçek giriş.
  return { saglayici, ad: '', soyad: '', eposta: '', epostaDogrulandi: true, demo: true };
}

/** E-postaya doğrulama kodu gönderir. */
export async function epostaKoduGonder(eposta) {
  await bekle(500);
  // TODO: sunucuda e-posta servisi ile gerçek kod gönder.
  return { demo: true, kod: DEMO_KOD, eposta };
}

/** Girilen kodu doğrular. */
export async function epostaKoduDogrula(eposta, kod) {
  await bekle(300);
  return String(kod).trim() === DEMO_KOD;
}

export const epostaGecerli = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e).trim());
