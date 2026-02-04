@echo off
title CLAVE DE ACCESO SIRILA
color 1F
echo.
echo =======================================================
echo    CLAVE DE ACCESO PARA LOCAL TUNNEL
echo =======================================================
echo.
echo Esta es la "Tunnel Password" que te pide la pagina:
echo.
echo -------------------------------------------------------
curl.exe -4 -s icanhazip.com
echo -------------------------------------------------------
echo.
echo 1. Copia el numero de arriba (ej. 187.134...)
echo 2. Pegalo en la casilla "Tunnel Password"
echo 3. Dale click al boton azul "Click to Submit"
echo.
echo NOTA: Esta clave puede cambiar si apagas tu modem.
echo       Usa este archivo para verla siempre actualizada.
echo.
echo =======================================================
pause
