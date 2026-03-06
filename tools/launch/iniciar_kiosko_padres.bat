@echo off
setlocal
cd /d "%~dp0"
title Sirila Gestion - KIOSKO PADRES

:: LIMPIEZA PREVIA
taskkill /F /IM node.exe >nul 2>&1

echo ===================================================================
echo               SIRILA GESTION - KIOSKO PADRES
echo ===================================================================
echo.
echo [1/3] Verificando Base de Datos (XAMPP MySQL)...

if exist "C:\xampp\mysql_start.bat" (
    start /MIN "" "C:\xampp\mysql_start.bat"
) else (
    echo       Nota: Si no tienes XAMPP en C:\xampp, inicia MySQL manualmente.
)

echo [2/3] Preparando Kiosko (Esperando servidor)...
:: Espera 7 seg y abre en modo pantalla completa (Kiosk)
:: Intenta con Chrome, luego Edge, luego navegador predeterminado
start /min cmd /c "timeout /t 7 /nobreak >nul && (start chrome --kiosk http://localhost:3001/padres --incognito || start msedge --kiosk http://localhost:3001/padres --inprivate || start http://localhost:3001/padres)"

echo.
echo [3/3] Iniciando Servidor...
echo       ALERTA: NO CIERRES ESTA VENTANA NEGRA.
echo       -----------------------------------------------------
echo       Para SALIR del modo Kiosko presiona: ALT + F4
echo       o mueve el mouse a la parte superior (si aparece X).
echo       -----------------------------------------------------
echo.

cd server
node server.js
pause
