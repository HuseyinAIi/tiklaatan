// Tercih modülü: tercih kılavuzu + uygulama içi yerleştirme simülasyonu (ÖSYM yöntemi).
//
// ÖSYM merkezi yerleştirmesi: adaylar puana göre büyükten küçüğe sıralanır; her aday, tercih
// listesinde kontenjanı henüz dolmamış EN ÜST tercihine yerleştirilir. Burada aynısı, uygulamada
// tercih listesini kaydeden doğrulanmış kullanıcılar üzerinde yapılır.
//
// Kılavuz kaynağı: data/kilavuz.json varsa o (gerçek ÖSYM kılavuzu ayrıştırılıp buraya konacak),
// yoksa veri/kilavuz-ornek.json (ÖRNEK veri, gerçek değildir).

const fs = require('fs');
const path = require('path');

module.exports = function tercihModulu({ DATA_DIR, jsonOku, jsonYaz }) {
  const gercek = path.join(DATA_DIR, 'kilavuz.json');
  const KILAVUZ_DOSYA = process.env.KILAVUZ || (fs.existsSync(gercek) ? gercek : path.join(__dirname, 'veri', 'kilavuz-ornek.json'));
  const KILAVUZ = jsonOku(KILAVUZ_DOSYA, { programlar: [] });
  const PROG = new Map((KILAVUZ.programlar || []).map((p) => [p.kod, p]));

  const LISTE_DOSYA = path.join(DATA_DIR, 'tercih-listeleri.json');
  let LISTELER = jsonOku(LISTE_DOSYA, {}); // kullaniciId → { puan, puanTuru, tercihler: [kod], tarih, test? }
  const kaydet = () => jsonYaz(LISTE_DOSYA, LISTELER);

  function yerlestir(puanTuru) {
    const adaylar = Object.entries(LISTELER)
      .filter(([, v]) => v.puanTuru === puanTuru && Array.isArray(v.tercihler) && v.tercihler.length)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.puan - a.puan || String(a.tarih).localeCompare(String(b.tarih)));
    const kalan = {};
    const yerlesen = {}; // kod → [{ id, puan }]
    const sonuc = {}; // id → { kod, sira }
    for (const a of adaylar) {
      for (let i = 0; i < a.tercihler.length; i++) {
        const kod = a.tercihler[i];
        const p = PROG.get(kod);
        if (!p) continue;
        if (kalan[kod] === undefined) kalan[kod] = p.kontenjan;
        if (kalan[kod] > 0) {
          kalan[kod]--;
          (yerlesen[kod] = yerlesen[kod] || []).push({ id: a.id, puan: a.puan });
          sonuc[a.id] = { kod, sira: i + 1 };
          break;
        }
      }
    }
    return { adaylar, sonuc, yerlesen };
  }

  function ozet(kullaniciId) {
    const ben = LISTELER[kullaniciId];
    if (!ben) return { kayitli: false, kilavuzOrnek: !!KILAVUZ.ornek };
    const { adaylar, sonuc, yerlesen } = yerlestir(ben.puanTuru);
    const tercihler = ben.tercihler.map((kod, i) => {
      const p = PROG.get(kod);
      const listeleyen = adaylar.filter((a) => a.tercihler.includes(kod));
      const siraDagilimi = {};
      for (const a of listeleyen) {
        const s = a.tercihler.indexOf(kod) + 1;
        siraDagilimi[s] = (siraDagilimi[s] || 0) + 1;
      }
      const ayniSirada = adaylar.filter((a) => a.tercihler[i] === kod); // zaten puana göre sıralı
      const yer = yerlesen[kod] || [];
      const onumdekiYerlesen = yer.filter((x) => x.puan > ben.puan).length;
      const benimYerim = sonuc[kullaniciId];
      let durum = 'bos';
      if (benimYerim && benimYerim.kod === kod) durum = 'yerlestin';
      else if (benimYerim && benimYerim.sira < i + 1) durum = 'ustTercih';
      else if (p && onumdekiYerlesen >= p.kontenjan) durum = 'dolu';
      return {
        kod,
        sira: i + 1,
        toplamListeleyen: listeleyen.length,
        siraDagilimi, // { "1": 4, "2": 7, ... } kaç kişi bu programı kaçıncı sıraya yazmış
        buSiradaSayisi: ayniSirada.length,
        buSiradaSiram: ayniSirada.findIndex((a) => a.id === kullaniciId) + 1,
        siramTum: 1 + listeleyen.filter((a) => a.puan > ben.puan).length, // bu programı yazanlar arasında puan sıram
        kontenjan: p ? p.kontenjan : null,
        yerlesenSayisi: yer.length,
        onumdekiYerlesen,
        simTaban: yer.length ? Math.min(...yer.map((x) => x.puan)) : null,
        durum,
      };
    });
    return {
      kayitli: true,
      kilavuzOrnek: !!KILAVUZ.ornek,
      puanTuru: ben.puanTuru,
      adaySayisi: adaylar.length,
      testAdaySayisi: adaylar.filter((a) => a.test).length,
      genelSiram: adaylar.findIndex((a) => a.id === kullaniciId) + 1,
      yerlestigim: sonuc[kullaniciId] || null,
      tercihler,
    };
  }

  function listeKaydet(g) {
    const puan = Number(g.puan);
    if (!g.kullaniciId || !/^[\w-]{8,64}$/.test(g.kullaniciId)) throw new Error('Geçersiz kullanıcı');
    if (!g.dogrulandi || !Number.isFinite(puan) || puan < 0 || puan > 100) throw new Error('Sadece doğrulanmış puanla tercih kaydedilebilir');
    if (!['P3', 'P93', 'P94'].includes(g.puanTuru)) throw new Error('Geçersiz puan türü');
    const tercihler = [...new Set((g.tercihler || []).map(String))].filter((k) => PROG.get(k)?.puanTuru === g.puanTuru).slice(0, 30);
    if (!tercihler.length) {
      delete LISTELER[g.kullaniciId];
    } else {
      LISTELER[g.kullaniciId] = { puan, puanTuru: g.puanTuru, tercihler, tarih: new Date().toISOString() };
    }
    kaydet();
    return ozet(g.kullaniciId);
  }

  // Geliştirme / deneme için test adayları (gerçek kullanıcı değildir, "test" olarak işaretlenir)
  function testAdaylari({ n = 200, puanTuru = 'P94', sil = false }) {
    if (sil) {
      for (const [id, v] of Object.entries(LISTELER)) if (v.test) delete LISTELER[id];
      kaydet();
      return { silindi: true };
    }
    const programlar = (KILAVUZ.programlar || []).filter((p) => p.puanTuru === puanTuru);
    const rastgele = (a, b) => a + Math.random() * (b - a);
    const normal = () => Math.sqrt(-2 * Math.log(Math.random() || 1e-9)) * Math.cos(2 * Math.PI * Math.random());
    let eklenen = 0;
    for (let i = 0; i < Math.min(Number(n) || 0, 2000); i++) {
      const puan = Math.round(Math.min(97, Math.max(60, 77 + normal() * 6.5)) * 1000) / 1000;
      const aday = programlar
        .filter((p) => p.gecenYilTaban <= puan + 3 && p.gecenYilTaban >= puan - 12)
        .map((p) => ({ kod: p.kod, skor: p.gecenYilTaban + rastgele(-3, 3) }))
        .sort((a, b) => b.skor - a.skor)
        .slice(0, Math.round(rastgele(8, 30)))
        .map((x) => x.kod);
      if (aday.length) {
        LISTELER[`test-${Date.now().toString(36)}-${i}-${Math.random().toString(36).slice(2, 6)}`] = { puan, puanTuru, tercihler: aday, tarih: new Date().toISOString(), test: true };
        eklenen++;
      }
    }
    kaydet();
    return { eklendi: eklenen, toplam: Object.keys(LISTELER).length };
  }

  return { kilavuz: () => KILAVUZ, listeKaydet, ozet, testAdaylari };
};
