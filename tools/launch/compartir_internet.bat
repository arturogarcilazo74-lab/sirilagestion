@echo off
setlocal
title Servidor Publico Escuela

echo ================================================================
echo   INICIANDO MODO ONLINE (INTENTO 2)
echo ================================================================
echo.

:: 1. Iniciar Backend
echo [1/3] Iniciando Servidor de Datos (Puerto 3001)...
start "Backend Server" /min cmd /k "node server/server.js"
timeout /t 3 >nul

:: 2. Iniciar Frontend
echo [2/3] Iniciando Interfaz Visual (Puerto 5173)...
start "Frontend Interface" /min cmd /k "npm run dev"
timeout /t 5 >nul

echo.
echo [3/3] Conecando a Internet (Serveo)...
echo ----------------------------------------------------------------
echo   Espera el mensaje con el LINK (ej: https://...serveo.net)
echo.
echo   SI NO FUNCIONA: Cierra y avisame.
echo ----------------------------------------------------------------
echo.

:: Agregado: "StrictHostKeyChecking=no" para evitar que pida confirmar "yes/no"
:: INTENTO 1: Serveo.net (Gratis, ilimitado)
echo Intentando conectar por Serveo...
ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=60 -R 80:localhost:3001 serveo.net

:: Si Serveo se cierra o falla, pasa al siguiente:
echo.
echo [AVISO] Serveo se desconecto o fallo.
echo Intentando Plan B (Pinggy.io)...
echo Nota: Pinggy dura 60 minutos por sesion gratuita.
timeout /t 3
ssh -p 443 -R0:localhost:3001 a.pinggy.io

:: Si falla Pinggy, intenta LocalTunnel
echo.
echo [AVISO] Pinggy finalizo.
echo Intentando Plan C (LocalTunnel)...
echo.
echo ==============================================================
echo  TU "TUNNEL PASSWORD" ES:
curl.exe -4 -s icanhazip.com
echo ==============================================================
echo.
echo NOTA: Usando puerto 3001 (Version estable)
call npx localtunnel --port 3001 --subdomain primaria-jaimenuno-sirila
