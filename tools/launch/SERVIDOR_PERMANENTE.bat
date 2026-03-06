@echo off
chcp 65001 >nul
color 0A
title SERVIDOR PERMANENTE SIRILA

echo ========================================
echo 🌐 SERVIDOR PERMANENTE SIRILA
echo ========================================
echo.

REM Ir al directorio del servidor
cd /d "%~dp0server"

REM Iniciar servidor en segundo plano
echo ✅ Iniciando servidor backend...
start /B node server.js
echo.
echo ⏳ Esperando que el servidor inicie (10 segundos)...
timeout /t 10 /nobreak >nul

echo.
echo ========================================
echo 🌍 CREANDO TÚNEL DE INTERNET
echo ========================================
echo.
echo ⏳ Generando URL pública...
echo    (Esto puede tardar hasta 30 segundos)
echo.

REM Volver a la raíz
cd /d "%~dp0"

REM Iniciar cloudflare tunnel
cloudflared tunnel --url http://localhost:3001

REM Si el túnel se cierra, mantener ventana abierta
echo.
echo ========================================
echo ⚠️ EL TÚNEL SE HA CERRADO
echo ========================================
pause
