// Alttan açılan seçim penceresi (iş bölümü, il vb.) + onu açan açılır-kutu butonu.
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, Modal, FlatList, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, F, radius } from '../theme';
import { Alan } from './ui';

/** Açılır kutu görünümlü buton: üstte küçük etiket, altta seçili değer. */
export function SecimButonu({ etiket, deger, aktif, onPress, ikon, style }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.buton, aktif && s.butonAktif, pressed && { opacity: 0.8 }, style]}>
      {ikon ? <Ionicons name={ikon} size={18} color={aktif ? colors.navy : colors.textSoft} style={{ marginRight: 10 }} /> : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.butonEtiket}>{etiket}</Text>
        <Text style={[s.butonDeger, aktif && { color: colors.navy }]} numberOfLines={1}>
          {deger}
        </Text>
      </View>
      <Ionicons name="chevron-down" size={18} color={colors.textSoft} />
    </Pressable>
  );
}

/**
 * @param {{gorunur:boolean, kapat:Function, baslik:string, aciklama?:string,
 *          secenekler:{kod:string, ad:string, ikon?:string, adet?:number}[],
 *          secili:string, sec:Function, aramali?:boolean}} p
 */
export default function SecimPenceresi({ gorunur, kapat, baslik, aciklama, secenekler, secili, sec, aramali }) {
  const [arama, setArama] = useState('');
  const liste = useMemo(() => {
    const q = arama.trim().toLocaleLowerCase('tr-TR');
    return q ? secenekler.filter((x) => x.ad.toLocaleLowerCase('tr-TR').includes(q)) : secenekler;
  }, [arama, secenekler]);

  const secVeKapat = (kod) => {
    sec(kod);
    setArama('');
    kapat();
  };

  return (
    <AltPencere gorunur={gorunur} kapat={kapat} baslik={baslik} aciklama={aciklama}>
          {aramali ? <Alan value={arama} onChangeText={setArama} placeholder="Ara" ikon="search" style={{ marginHorizontal: 20, marginBottom: 8 }} /> : null}

          <FlatList
            data={liste}
            keyExtractor={(x) => x.kod}
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<Text style={s.bos}>Sonuç yok</Text>}
            renderItem={({ item, index }) => {
              const sec_ = item.kod === secili;
              return (
                <Pressable
                  onPress={() => secVeKapat(item.kod)}
                  style={({ pressed }) => [s.satir, index < liste.length - 1 && s.cizgi, sec_ && s.satirSecili, pressed && { backgroundColor: colors.surfaceAlt }]}
                >
                  {item.ikon ? (
                    <View style={[s.ikon, sec_ && { backgroundColor: colors.navy }]}>
                      <Ionicons name={item.ikon} size={18} color={sec_ ? '#fff' : colors.navy} />
                    </View>
                  ) : null}
                  <Text style={[s.ad, sec_ && { fontFamily: F.b, color: colors.navy }]} numberOfLines={1}>
                    {item.ad}
                  </Text>
                  {item.adet != null ? <Text style={s.adet}>{item.adet}</Text> : null}
                  <Ionicons name={sec_ ? 'radio-button-on' : 'radio-button-off'} size={20} color={sec_ ? colors.navy : colors.strokeStrong} style={{ marginLeft: 10 }} />
                </Pressable>
              );
            }}
          />
    </AltPencere>
  );
}

/** Alttan açılan genel pencere iskeleti (web'de sayfanın üst katmanında, telefonda Modal). */
export function AltPencere({ gorunur, kapat, baslik, aciklama, children, altKisim }) {
  const insets = useSafeAreaInsets();
  const icerik = (
    <View style={s.kok}>
      <Pressable style={s.karartma} onPress={kapat} accessibilityLabel="Kapat" />
      <View style={[s.pencere, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={s.tutamac} />
        <View style={s.baslikSatir}>
          <View style={{ flex: 1 }}>
            <Text style={s.baslik}>{baslik}</Text>
            {aciklama ? <Text style={s.aciklama}>{aciklama}</Text> : null}
          </View>
          <Pressable onPress={kapat} hitSlop={10} style={s.kapat} accessibilityLabel="Kapat">
            <Ionicons name="close" size={20} color={colors.navy} />
          </Pressable>
        </View>
        {children}
        {altKisim ? <View style={s.altKisim}>{altKisim}</View> : null}
      </View>
    </View>
  );
  // Web'de Modal'ın kapanış animasyonu bazı tarayıcılarda takılabildiği için sayfa içi katman kullanılır.
  if (Platform.OS === 'web') {
    if (!gorunur || typeof document === 'undefined') return null;
    // Sayfanın en üst katmanına (body) taşı: alt menü ve kaydırma alanlarının üstünde görünsün
    const { createPortal } = require('react-dom');
    // RN-web 'position: fixed' stilini desteklemediği için düz bir DOM katmanı kullanılır
    return createPortal(
      React.createElement('div', { style: { position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', flexDirection: 'column' } }, <View style={{ flex: 1 }}>{icerik}</View>),
      document.body,
    );
  }
  return (
    <Modal visible={gorunur} transparent animationType="slide" onRequestClose={kapat}>
      {icerik}
    </Modal>
  );
}

const s = StyleSheet.create({
  buton: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.strokeStrong, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 9, minWidth: 0 },
  butonAktif: { borderColor: colors.navy, backgroundColor: colors.pill },
  butonEtiket: { fontFamily: F.m, fontSize: 11.5, color: colors.textFaint },
  butonDeger: { fontFamily: F.sb, fontSize: 14.5, color: colors.body, marginTop: 1 },
  kok: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  karartma: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(16,20,60,0.45)' },
  pencere: { width: '100%', maxWidth: 430, maxHeight: '78%', backgroundColor: colors.surface, borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingTop: 8 },
  tutamac: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.strokeStrong, marginBottom: 10 },
  baslikSatir: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, paddingBottom: 12 },
  baslik: { fontFamily: F.b, fontSize: 20, color: colors.navy },
  aciklama: { fontFamily: F.r, fontSize: 13, color: colors.textSoft, marginTop: 3 },
  kapat: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.pill, alignItems: 'center', justifyContent: 'center' },
  satir: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 6, borderRadius: 8 },
  satirSecili: { backgroundColor: colors.pill },
  cizgi: { borderBottomWidth: 1, borderBottomColor: colors.stroke },
  ikon: { width: 34, height: 34, borderRadius: 8, backgroundColor: colors.pill, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  ad: { flex: 1, fontFamily: F.m, fontSize: 15, color: colors.body },
  adet: { fontFamily: F.sb, fontSize: 13, color: colors.textFaint, backgroundColor: colors.surfaceAlt, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden' },
  altKisim: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.stroke },
  bos: { fontFamily: F.r, color: colors.textFaint, textAlign: 'center', padding: 20 },
});
