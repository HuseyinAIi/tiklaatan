@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================
echo   Tikla Atan - ilk kurulum
echo ============================================
where node >nul 2>nul
if errorlevel 1 (
  echo [HATA] Node.js bulunamadi. https://nodejs.org adresinden LTS surumunu kurup tekrar calistirin.
  pause
  exit /b 1
)
echo [1/3] Paketler indiriliyor...
call npm install
echo [2/3] Expo telefondaki Expo Go surumuyle uyumlu hale getiriliyor...
call npx expo install expo@latest
call npx expo install --fix
if not exist .env (
  copy .env.example .env >nul
  echo [3/3] .env dosyasi olusturuldu. Gemini anahtarinizi icine yapistirabilirsiniz - bos kalirsa demo modu calisir.
)
echo.
echo Kurulum tamam! Uygulamayi baslatmak icin: baslat.bat
pause
