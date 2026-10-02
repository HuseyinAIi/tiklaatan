import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, F, radius, TAB_BAR_ALAN } from '../theme';
import Aurora from './Aurora';
import Cam from './Cam';

export { Cam };

/** Ekran iskeleti: aurora zemin + güvenli alan + (isteğe bağlı) kaydırma. */
export function Ekran({ children, kaydir = true, sekmeli = true, contentStyle, scrollRef }) {
  const alt = sekmeli ? TAB_BAR_ALAN : 40;
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Aurora />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {kaydir ? (
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={[{ paddingHorizontal: 18, paddingBottom: alt }, contentStyle]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          children
        )}
      </SafeAreaView>
    </View>
  );
}

/** iOS tarzı büyük başlık; ÖSYM sitesindeki gibi güçlü, sade tipografi. */
export function BuyukBaslik({ ust, baslik, alt, geri, sag }) {
  const router = useRouter();
  return (
    <View style={s.baslikKap}>
      {geri ? (
        <View style={s.geriSatir}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={10} accessibilityLabel="Geri">
            <Cam radius={radius.pill} style={s.geriBtn}>
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </Cam>
          </Pressable>
          <View style={{ flex: 1 }} />
          {sag}
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          {ust ? <Text style={s.ust}>{ust}</Text> : null}
          <Text style={[s.baslik, String(baslik).length > 22 && { fontSize: 25, lineHeight: 31, letterSpacing: -0.5 }]}>{baslik}</Text>
        </View>
        {!geri && sag ? <View style={{ marginBottom: 4 }}>{sag}</View> : null}
      </View>
      {alt ? <Text style={s.alt}>{alt}</Text> : null}
    </View>
  );
}

export function BolumBasligi({ children, sag }) {
  return (
    <View style={s.bolumSatir}>
      <Text style={s.bolum}>{children}</Text>
      {sag ? <Text style={s.bolumSag}>{sag}</Text> : null}
    </View>
  );
}

/** Cam kart (geriye dönük isim). */
export function Kart({ children, style, yogun, tint }) {
  return (
    <Cam style={[{ padding: 18 }, style]} yogun={yogun} tint={tint}>
      {children}
    </Cam>
  );
}

/** Hap şeklinde seçilebilir etiket (ÖSYM sitesindeki açık mavi haplar gibi). */
export function Chip({ etiket, secili, onPress, ikon }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.chip, secili ? s.chipSecili : null, { marginRight: 8, opacity: pressed ? 0.75 : 1 }]}>
      {ikon ? <Ionicons name={ikon} size={14} color={secili ? '#fff' : colors.pillText} style={{ marginRight: 6 }} /> : null}
      <Text style={[s.chipText, secili && { color: '#fff' }]}>{etiket}</Text>
    </Pressable>
  );
}

/** ÖSYM tarzı durum işareti: renkli kare + metin. */
export function Durum({ renk, etiket, kucuk }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={[s.kare, { backgroundColor: renk }, kucuk && { width: 8, height: 8 }]} />
      <Text style={[s.durumText, kucuk && { fontSize: 12 }]}>{etiket}</Text>
    </View>
  );
}

/** Küçük etiket (puan türü vb.). */
export function Rozet({ etiket, renk = colors.accent, zemin = colors.accentSoft }) {
  return (
    <View style={[s.rozet, { backgroundColor: zemin }]}>
      <Text style={[s.rozetText, { color: renk }]}>{etiket}</Text>
    </View>
  );
}

export function Buton({ etiket, onPress, ikon, tip = 'ana', yukleniyor, disabled, style }) {
  const kapali = disabled || yukleniyor;
  const ana = tip === 'ana';
  const renk = ana ? '#fff' : colors.navy;
  return (
    <Pressable
      onPress={onPress}
      disabled={kapali}
      style={({ pressed }) => [s.buton, ana ? s.butonAna : s.butonIkincil, { opacity: kapali ? 0.5 : pressed ? 0.85 : 1 }, style]}
    >
      {yukleniyor ? (
        <ActivityIndicator color={renk} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {ikon ? <Ionicons name={ikon} size={18} color={renk} style={{ marginRight: 8 }} /> : null}
          <Text style={[s.butonText, { color: renk }]}>{etiket}</Text>
        </View>
      )}
    </Pressable>
  );
}

/** Cam giriş alanı. */
export function Alan({ etiket, style, inputStyle, ikon, ...props }) {
  return (
    <View style={style}>
      {etiket ? <Text style={s.alanEtiket}>{etiket}</Text> : null}
      <View style={s.alan}>
        {ikon ? <Ionicons name={ikon} size={18} color={colors.textFaint} style={{ marginRight: 10 }} /> : null}
        <TextInput placeholderTextColor={colors.textFaint} selectionColor={colors.accent} style={[s.alanInput, inputStyle]} {...props} />
      </View>
    </View>
  );
}

export function BosDurum({ ikon = 'file-tray-outline', baslik, aciklama }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 }}>
      <Cam radius={radius.pill} style={{ width: 64, height: 64, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={ikon} size={28} color={colors.textSoft} />
      </Cam>
      <Text style={{ fontFamily: F.b, fontSize: 17, marginTop: 16, color: colors.text }}>{baslik}</Text>
      {aciklama ? <Text style={{ fontFamily: F.r, color: colors.textSoft, textAlign: 'center', marginTop: 6, lineHeight: 20 }}>{aciklama}</Text> : null}
    </View>
  );
}

export function Ayrac() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.stroke, marginVertical: 12 }} />;
}

export const yazi = StyleSheet.create({
  govde: { fontFamily: F.r, fontSize: 15, lineHeight: 23, color: colors.body },
  soluk: { fontFamily: F.r, fontSize: 14, lineHeight: 20, color: colors.textSoft },
  kucuk: { fontFamily: F.m, fontSize: 12, color: colors.textFaint },
  kartBaslik: { fontFamily: F.b, fontSize: 19, color: colors.navy, letterSpacing: -0.3 },
});

const s = StyleSheet.create({
  baslikKap: { paddingTop: 12, paddingBottom: 18, minWidth: 0 },
  geriSatir: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  geriBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  ust: { fontFamily: F.sb, fontSize: 14, color: colors.textSoft, marginBottom: 4 },
  baslik: { fontFamily: F.b, fontSize: 32, color: colors.navy, letterSpacing: -0.6, lineHeight: 38 },
  alt: { fontFamily: F.r, fontSize: 15, color: colors.textSoft, marginTop: 8, lineHeight: 22 },
  bolumSatir: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 26, marginBottom: 12 },
  bolum: { fontFamily: F.b, fontSize: 22, color: colors.navy, letterSpacing: -0.3 },
  bolumSag: { fontFamily: F.m, fontSize: 13, color: colors.textSoft },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.pill },
  chipSecili: { backgroundColor: colors.navy },
  chipText: { fontFamily: F.m, fontSize: 13, color: colors.pillText },
  kare: { width: 11, height: 11, marginRight: 8 },
  durumText: { fontFamily: F.sb, fontSize: 13, color: colors.body },
  rozet: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  rozetText: { fontFamily: F.b, fontSize: 11.5, letterSpacing: 0.2 },
  buton: { minHeight: 50, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  butonAna: { backgroundColor: colors.navy },
  butonIkincil: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.strokeStrong },
  butonText: { fontFamily: F.sb, fontSize: 15.5 },
  alanEtiket: { fontFamily: F.sb, fontSize: 13, color: colors.body, marginBottom: 8 },
  alan: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.strokeStrong, paddingHorizontal: 14, minHeight: 50 },
  alanInput: { flex: 1, fontFamily: F.m, fontSize: 15.5, color: colors.body, paddingVertical: 12, outlineStyle: 'none' },
});
