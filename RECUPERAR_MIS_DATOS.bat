@echo off
title RECUPERADOR DE DATOS SIRILA
color 1F

echo ========================================================
echo   RECUPERACION DE DATOS - SIRILA
echo ========================================================
echo.
echo El problema es que MySQL se apago y el sistema
echo esta usando un archivo vacio.
echo.
echo Vamos a intentar encender MySQL y recuperar tus datos.
echo.
echo --------------------------------------------------------
echo PASO 1: Iniciando MySQL...
echo --------------------------------------------------------

if exist "C:\xampp\mysql_start.bat" (
    echo Iniciando XAMPP MySQL...
    start /MIN "" "C:\xampp\mysql_start.bat"
    timeout /t 10
) else (
    echo NO SE ENCONTRO XAMPP.
    echo Por favor inicia XAMPP Control Panel manualmente
    echo y dale "Start" a MySQL.
    echo.
    echo Presiona cualquier tecla cuando MySQL este en VERDE...
    pause
)

echo.
echo --------------------------------------------------------
echo PASO 2: Recuperando datos a JSON...
echo --------------------------------------------------------
echo.
cd server
node migrar_mysql_a_json.js

echo.
echo --------------------------------------------------------
echo PASO 3: Finalizando...
echo --------------------------------------------------------
echo.
echo Si viste mensajes verdes arriba ("Datos guardados"),
echo YA PUEDES CERRAR ESTA VENTANA y reiniciar tu servidor.
echo.
echo Si hubo errores, contacta a soporte.
pause
