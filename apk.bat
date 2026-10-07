@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ==========================================================
echo   Tikla Atan - Android APK olusturma
echo   Expo EAS ucretsiz bulut derlemesi kullanilir.
echo ==========================================================
echo.
echo [1/4] Gerekli paketler kontrol ediliyor...
call npx expo install expo-build-properties
echo.
echo [2/4] Expo hesabina giris.
echo       Hesabin yoksa once https://expo.dev/signup adresinden ucretsiz ac.
call npx eas-cli@latest whoami >nul 2>nul || call npx eas-cli@latest login
echo.
echo [3/4] Proje Expo'ya baglaniyor. Soru sorarsa Y / Enter ile onayla.
call npx eas-cli@latest init
echo.
echo [4/4] APK bulutta derleniyor - 10-20 dakika surebilir.
echo       "Generate a new Android Keystore?" sorusuna Y de.
call npx eas-cli@latest build -p android --profile apk --clear-cache
echo.
echo Bitti! Yukarida verilen linkten APK'yi indirip telefona kurabilirsin.
echo Link ayrica https://expo.dev hesabinda "Builds" bolumunde durur.
pause
