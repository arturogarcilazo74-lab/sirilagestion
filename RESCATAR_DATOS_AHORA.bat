@echo off
title RESCATE DE DATOS CORRUPTOS
color 1F

echo =======================================================
echo    MODO DE RECUPERACION DE EMERGENCIA
echo =======================================================
echo.
echo He configurado MySQL en "Modo de Recuperacion" (innodb_force_recovery=1).
echo.
echo PASO 1: Reiniciar MySQL
echo -------------------------------------------------------
echo Intentando detener MySQL por si esta trabado...
taskkill /F /IM mysqld.exe >nul 2>&1
echo.
echo AHORA: Abre XAMPP Control Panel y dale "Start" a MySQL.
echo Si ya estaba en verde/Start, dale Stop y luego Start.
echo.
echo [ESPERA HASTA QUE MYSQL ESTE EN VERDE INTERMITENTE O FIJO]
echo (Puede que no arranque perfecto, pero necesitamos que intente)
echo.
pause

echo.
echo PASO 2: Extrayendo datos...
echo -------------------------------------------------------
cd server
call node migrar_mysql_a_json.js
echo.

echo =======================================================
echo    SI VISTE "DATOS GUARDADOS EXITOSAMENTE":
echo =======================================================
echo 1. Cierra esta ventana.
echo 2. Deten MySQL en XAMPP.
echo 3. Abre "C:\xampp\mysql\bin\my.ini" y BORRA la linea "innodb_force_recovery = 1"
echo    (O avisame para quitarla)
echo 4. Reinicia tu aplicacion con "npm run dev".
echo.
echo SI FALLO:
echo Avisame para intentar un nivel de recuperacion mas fuerte.
echo.
pause
