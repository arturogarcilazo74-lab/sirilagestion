@echo off
title CONECTAR CELULAR A SIRILA
color 0B
setlocal enabledelayedexpansion

echo =======================================================
echo    CONFIGURACION DE ACCESO LOCAL PARA CELULAR
echo =======================================================
echo.
echo Para que esto funcione:
echo 1. Tu PC y tu Celular deben estar en la MISMA RED WI-FI.
echo 2. El servidor de Sirila debe estar abierto.
echo.
echo -------------------------------------------------------
echo BUSCANDO TU DIRECCION IP...
echo -------------------------------------------------------

:: Intentar obtener IP de Wi-Fi o Ethernet usando PowerShell
for /f "tokens=*" %%a in ('powershell -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -like '*Wi-Fi*' -or $_.InterfaceAlias -like '*Ethernet*' -or $_.InterfaceAlias -like '*WLAN*' } | Select-Object -ExpandProperty IPAddress | Select-Object -First 1"') do set MY_IP=%%a

if "%MY_IP%"=="" (
    :: Fallback a ipconfig si PowerShell falla
    for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr "IPv4"') do (
        set temp_ip=%%i
        set MY_IP=!temp_ip: =!
    )
)

echo.
echo TU DIRECCION IP ES: %MY_IP%
echo.
echo >>> EN TU CELULAR, ESCRIBE ESTO EN EL NAVEGADOR:
echo.
echo     http://%MY_IP%:3001
echo.
echo -------------------------------------------------------
echo.
echo SI NO CARGA:
echo 1. Revisa que el celular NO este usando Datos Moviles (4G/5G).
echo 2. Revisa que el programa "iniciar_sirila.bat" este abierto.
echo 3. Intenta desactivar temporalmente el Antivirus/Firewall de Windows.
echo.
echo =======================================================
pause
