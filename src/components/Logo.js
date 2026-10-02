// Tıkla Atan logosu (assets/banner.png: ikon + yazı + "Hemen Tıkla")
import React from 'react';
import { Image } from 'react-native';

const ORAN = 1248 / 340;

export default function Logo({ yukseklik = 40, style }) {
  return (
    <Image
      source={require('../../assets/banner.png')}
      style={[{ height: yukseklik, width: yukseklik * ORAN }, style]}
      resizeMode="contain"
      accessibilityLabel="Tıkla Atan"
    />
  );
}
