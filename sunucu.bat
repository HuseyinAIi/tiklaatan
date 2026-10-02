@echo off
chcp 65001 >nul
cd /d "%~dp0server"
title Tikla Atan - Ilan Sunucusu
echo ============================================
echo   Tikla Atan - Ilan sunucusu
echo   Kariyer Kapisi + Resmi Gazete taraniyor
echo ============================================
if not exist node_modules (
  echo Sunucu paketleri indiriliyor...
  call npm install
)
echo Ilk tarama birkac dakika surebilir. Bu pencere acik kaldikca ilanlar 6 saatte bir guncellenir.
echo Adres: http://localhost:3001/ilanlar
node index.js
pause
