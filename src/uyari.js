// Alert.alert web tarayıcıda çalışmadığı için hem mobil hem web'de çalışan uyarı yardımcısı.
import { Alert, Platform } from 'react-native';

export function uyari(baslik, mesaj, butonlar) {
  if (Platform.OS !== 'web') return Alert.alert(baslik, mesaj, butonlar);
  if (!butonlar || butonlar.length < 2) {
    window.alert(`${baslik}\n\n${mesaj || ''}`);
    butonlar?.[0]?.onPress?.();
    return;
  }
  const onay = butonlar.find((b) => b.style !== 'cancel');
  if (window.confirm(`${baslik}\n\n${mesaj || ''}`)) onay?.onPress?.();
}
