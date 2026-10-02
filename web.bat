@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================
echo   Tikla Atan - bilgisayarda (tarayicida) ac
echo ============================================
where node >nul 2>nul
if errorlevel 1 (
  echo [HATA] Node.js bulunamadi. https://nodejs.org adresinden LTS surumunu kurun, sonra bu dosyayi tekrar calistirin.
  pause
  exit /b 1
)
if not exist node_modules (
  echo [1/3] Paketler indiriliyor - ilk seferde birkac dakika surebilir...
  call npm install
  if errorlevel 1 goto hata
)
if not exist node_modules\react-native-web (
  echo [2/3] Web paketleri ekleniyor...
  call npx expo install react-native-web react-dom @expo/metro-runtime
)
if not exist node_modules\expo-blur goto tasarim
if not exist node_modules\@expo-google-fonts\inter goto tasarim
if not exist node_modules\expo-build-properties goto tasarim
goto tasarimtamam
:tasarim
echo Tasarim paketleri ekleniyor - cam efekti ve Inter yazi tipi...
call npx expo install expo-blur expo-font @expo-google-fonts/inter expo-build-properties
:tasarimtamam
if not exist .env copy .env.example .env >nul
echo Ilan sunucusu ayri pencerede baslatiliyor...
start "" "%~dp0sunucu.bat"
echo [3/3] Uygulama baslatiliyor. Tarayici otomatik acilacak: http://localhost:8081
echo Kapatmak icin bu pencereyi kapatin veya Ctrl+C.
call npx expo start --web -c
goto son
:hata
echo.
echo [HATA] Kurulum basarisiz oldu. Bu pencerenin ekran goruntusunu Claude'a gonderin.
:son
pause
