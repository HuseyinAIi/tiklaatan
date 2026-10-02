@echo off
chcp 65001 >nul
echo Telefonunuzdaki Expo Go uygulamasiyla ekrandaki QR kodu okutun.
echo (Telefon ve bilgisayar ayni Wi-Fi aginda olmali. Olmuyorsa: npx expo start --tunnel)
call npx expo start -c
