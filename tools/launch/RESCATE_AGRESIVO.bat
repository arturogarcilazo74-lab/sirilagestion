@echo off
title RESCATE FINAL (MODO AGRESIVO)
color 4F

echo =======================================================
echo    MODO DE RECUPERACION AGRESIVO (NIVEL 6)
echo =======================================================
echo.
echo He configurado MySQL en el nivel maximo de recuperacion.
echo Esto ignorara logs corruptos y nos dejara leer los datos.
echo.

echo PASO 1: Limpiando logs trabados...
echo -------------------------------------------------------
taskkill /F /IM mysqld.exe >nul 2>&1
timeout /t 2 >nul
cd /d "C:\xampp\mysql\data"
if exist "ib_logfile0" del "ib_logfile0"
if exist "ib_logfile1" del "ib_logfile1"
echo Logs eliminados.
echo.

echo PASO 2: Reinicia MySQL
echo -------------------------------------------------------
echo 1. Abre XAMPP Control Panel.
echo 2. Dale "Start" a MySQL.
echo.
echo AVISO: MySQL podria tardar o no mostrarse en verde perfecto,
echo pero necesitamos que arranque el proceso mysqld.exe.
echo.
pause

echo.
echo PASO 3: Intentando extraccion de datos...
echo -------------------------------------------------------
cd /d "c:\Users\lapomiguel\Desktop\aula 4to\sirilagestion2\server"
call node migrar_mysql_a_json.js
echo.
echo.

echo =======================================================
echo    STATUS DE LA MISION
echo =======================================================
echo SI VISTE "Datos guardados exitosamente":
echo   1. Cierra esta ventana.
echo   2. Deten MySQL.
echo   3. VE A C:\xampp\mysql\bin\my.ini y BORRA "innodb_force_recovery = 6"
echo   4. Reinicia tu app.
echo.
echo SI FALLO:
echo   Lo siento, la base de datos esta demasiado dañada.
echo   Tendremos que usar el backup del JSON si existe.
echo.
pause
