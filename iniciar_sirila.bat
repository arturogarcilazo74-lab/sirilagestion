@echo off
setlocal
cd /d "%~dp0"
title Sirila Gestion - Servidor

:: LIMPIEZA PREVIA
taskkill /F /IM node.exe >nul 2>&1

echo ===================================================================
echo               SIRILA GESTION 
echo ===================================================================
echo.
echo [1/3] Verificando Base de Datos (XAMPP MySQL)...

if exist "C:\xampp\mysql_start.bat" (
    start /MIN "" "C:\xampp\mysql_start.bat"
) else (
    echo       Nota: Si no tienes XAMPP en C:\xampp, inicia MySQL manualmente.
)

echo [2/3] Preparando apertura automatica...
:: Lanza un proceso paralelo que espera 7 segundos y abre el navegador
start /min cmd /c "timeout /t 7 /nobreak >nul && start http://localhost:3001"

echo.
echo [3/3] Iniciando Servidor...
echo       ALERTA: NO CIERRES ESTA VENTANA.
echo       La aplicacion se abrira en tu navegador en unos segundos.
echo.

cd server
node server.js
pause
