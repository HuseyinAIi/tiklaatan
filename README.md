# Tıkla Atan — KPSS İlan & Atanma Simülasyonu (Demo)

Android + iOS için tek kod tabanı: **Expo (React Native) + expo-router**.

## Ne yapıyor?

1. **Puan doğrulama** — Kullanıcı puan türünü (P3/P93/P94) ve puanını girer, ÖSYM sonuç belgesinin görselini veya PDF'ini yükler. Yapay zekâ (Google Gemini, ücretsiz) belgeyi okur, girilen puanla karşılaştırır. Eşleşirse hesap doğrulanır. Her hesaba 3 hak.
2. **İlanlar** — Kariyer Kapısı ve Resmi Gazete kaynaklı memur / sözleşmeli personel ilanları. Puan türüne göre sekmeler, arama, filtre (kaynak, sıralama, durum) ve **"Bana uygun"** (puan türü + taban şartı) filtresi. Doğrulanmışsa her ilanda atanma olasılığı görünür.
3. **İlan detayı + simülasyon** — Kontenjan, son başvuru, ilan metni/şartlar ve "Atanma Olasılığı Simülasyonu": geçmiş yıllar kaçla kapattı (grafik + tablo), tahmini 2026 tabanı, % olasılık ve "Çok Yüksek / Yüksek / Orta / Zor / Çok Zor" etiketi.
4. **Simülasyon sekmesi** — İlan olmasa da kurum seç (örn. *Gaziantep Üniversitesi*) → geçmiş tabanlar ve ihtimalin.
5. **Tercih Koçu (AI)** — Simülasyon sonucuna Türkçe, kişisel yorum.
6. **Geçmiş / Profil** — Yapılan simülasyonlar, doğrulama durumu, kalan hak.

## Çalıştırma (Windows)

1. [Node.js LTS](https://nodejs.org) kurulu olsun.
2. Telefona **Expo Go** uygulamasını yükleyin (Play Store / App Store).
3. Bu klasörde **`kurulum.bat`**'a çift tıklayın (bir kez).
4. **`baslat.bat`**'a çift tıklayın, çıkan QR kodu Expo Go ile okutun.
   - Telefon ve bilgisayar aynı Wi-Fi'da olmalı; olmazsa `npx expo start --tunnel`.

## Ücretsiz yapay zekâ anahtarı (isteğe bağlı)

Anahtar yoksa uygulama **demo modunda** çalışır (belge okunmuş gibi yapılır, yorumlar şablondan gelir).

1. https://aistudio.google.com/apikey → Google hesabıyla girin → **Create API key**.
2. Proje klasöründeki `.env` dosyasını açın: `EXPO_PUBLIC_GEMINI_API_KEY=buraya_anahtar`
3. `baslat.bat` ile yeniden başlatın. Profil sekmesinde "Yapay Zekâ: Açık" görünür.

Model varsayılanı `gemini-flash-latest` (her zaman güncel ücretsiz Flash modeli).

## Klasör yapısı

```
app/                      Ekranlar (expo-router: dosya = sayfa)
  (tabs)/index.js         İlanlar
  (tabs)/simulasyon.js    Kurum simülasyonu
  (tabs)/gecmis.js        Simülasyon geçmişi
  (tabs)/profil.js        Profil
  dogrula.js              ÖSYM puan doğrulama
  ilan/[id].js            İlan detayı + simülasyon
src/
  services/gemini.js      Belge okuma + AI yorum (Gemini)
  services/simulasyon.js  Atanma olasılığı hesabı
  services/ilanService.js İlan veri katmanı (ileride backend)
  data/ilanlar.js         DEMO ilanlar
  data/kurumGecmis.js     DEMO geçmiş yıl taban/tavan verileri
  context/AppContext.js   Kullanıcı durumu (cihazda saklanır)
  components/             Kartlar, butonlar, simülasyon görünümü
```

## Simülasyon nasıl hesaplanıyor?

Geçmiş yılların taban puanları yakın yıllara daha fazla ağırlık verilerek ortalanır, yıllık trend ve başvuru artışı eklenir, bu yılki kontenjan geçmiş ortalamasından azsa taban yukarı çekilir → **tahmini taban**. Adayın puanı ile tahmini taban arasındaki fark, yılların dalgalanmasına (standart sapma) bölünüp lojistik eğriyle **% olasılığa** çevrilir. Kontenjan 1–3 gibi çok küçükse belirsizlik artırılır. Yapay zekâ sadece yorum yazar; olasılığı kural tabanlı model hesaplar (tutarlı ve açıklanabilir olsun diye).

## Demo → gerçek ürün için sıradakiler

- **Backend (sunucu)**: Gemini anahtarını uygulamadan çıkarıp sunucuya taşımak (şu an demo için uygulamaya gömülü — mağazaya çıkmadan önce mutlaka taşınmalı).
- **İlan toplayıcı**: Kariyer Kapısı ve Resmi Gazete ilan bölümünü günlük tarayıp puan türü/taban/kontenjan ayrıştıran servis. Uygulama `EXPO_PUBLIC_API_URL/ilanlar` adresini hazır olarak bekliyor.
- **Gerçek geçmiş veriler**: Kurumların yerleştirme/başarı listeleri ve ÖSYM tercih sonuçlarından taban-tavan veritabanı.
- **Belge güvenliği**: ÖSYM sonuç belgesindeki doğrulama kodunun ÖSYM'nin belge doğrulama sayfasından teyit edilmesi, aynı belgenin birden fazla hesapta kullanımının engellenmesi.
- **Hesap sistemi + PRO abonelik** (uygulama içi satın alma).
- Mağaza derlemesi: `npx eas build -p android` / `-p ios`.

> Demo verilerdeki ilanlar ve geçmiş yıl rakamları temsilîdir, gerçek değildir.
