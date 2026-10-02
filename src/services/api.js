// İlan sunucusu adresi. Varsayılan: .env içindeki EXPO_PUBLIC_API_URL.
// Telefonda (APK) "localhost" çalışmadığı için adres Profil > Sunucu adresi'nden değiştirilebilir;
// kullanıcı ayarı cihazda saklanır ve bu varsayılanı geçersiz kılar.
const temizle = (u) => String(u || '').trim().replace(/^["']|["']$/g, '').replace(/\/+$/, '');

const VARSAYILAN = temizle(process.env.EXPO_PUBLIC_API_URL);
let AKTIF = VARSAYILAN;

export const apiUrl = () => AKTIF;
export const apiVarsayilan = () => VARSAYILAN;
export function apiAyarla(u) {
  const t = temizle(u);
  AKTIF = t ? (/^https?:\/\//i.test(t) ? t : `http://${t}`) : VARSAYILAN;
  return AKTIF;
}
