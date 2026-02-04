@echo off
title HABILITAR ACCESO CELULAR - SIRILA
color 0e

echo ========================================================
echo   HABILITANDO ACCESO DESDE EL CELULAR (FIREWALL)
echo ========================================================
echo.
echo Este script hara dos cosas:
echo 1. Abrira el puerto 3001 en el Firewall de Windows.
echo 2. Abrira el puerto 5173 (modo desarrollo/diseño).
echo.
echo REQUISITO: Ejecuta este archivo haciendo CLICK DERECHO 
echo             y eligiendo "EJECUTAR COMO ADMINISTRADOR".
echo --------------------------------------------------------
echo.

:: Intentar agregar reglas al firewall
netsh advfirewall firewall add rule name="Sirila Gestion 3001" dir=in action=allow protocol=TCP localport=3001 profile=any >nul 2>&1
netsh advfirewall firewall add rule name="Sirila Gestion 5173" dir=in action=allow protocol=TCP localport=5173 profile=any >nul 2>&1

if %errorlevel% equ 0 (
    echo [OK] Puertos habilitados en el Firewall.
) else (
    echo [ERROR] No se pudo cambiar el Firewall. 
    echo         Asegurate de usar "Ejecutar como Administrador".
)

echo.
echo --------------------------------------------------------
echo PASOS PARA EL CELULAR:
echo --------------------------------------------------------
echo 1. Abre el archivo "VER_IP_Y_URL_MOVIL.bat"
echo 2. Escribe esa direccion en tu navegador del celular.
echo.
echo IMPORTANTE: El celular DEBE estar en el mismo WiFi que la PC.
echo.
echo ========================================================
pause
