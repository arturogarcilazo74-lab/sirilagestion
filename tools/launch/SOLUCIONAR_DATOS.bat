@echo off
title DIAGNOSTICO Y RECUPERACION
color 4F

echo ===================================================
echo   DIAGNOSTICO URGENTE - SIRILA
echo ===================================================
echo.
echo El sistema dice que "MySQL no esta disponible".
echo Esto significa que la base de datos esta APAGADA.
echo.
echo TUS DATOS ESTAN SEGUROS, SOLO ESTAN "DORMIDOS".
echo NECESITAMOS DESPERTARLOS.
echo.
echo ===================================================
echo PASO 1: ABRIR XAMPP
echo ===================================================
echo.
echo Voy a intentar abrir el PANEL DE CONTROL DE XAMPP.
echo Cuando se abra:
echo    1. Busca "MySQL" en la lista.
echo    2. Dale click al boton "Start".
echo    3. Espera a que se ponga VERDE.
echo.
echo Abriendo XAMPP...

if exist "C:\xampp\xampp-control.exe" (
    start "" "C:\xampp\xampp-control.exe"
) else (
    echo NO ENCONTRE XAMPP AUTOMATICAMENTE.
    echo Por favor buscalo en tu inicio y abre "XAMPP Control Panel".
)

echo.
echo ---------------------------------------------------
echo ESPERANDO A QUE ACTIVES MYSQL...
echo ---------------------------------------------------
echo presiona cualquier tecla cuando MySQL este en VERDE...
pause

echo.
echo ===================================================
echo PASO 2: RECUPERAR DATOS
echo ===================================================
echo.
echo Intentando extraer datos de MySQL...
echo.

cd server
node migrar_mysql_a_json.js

echo.
echo ===================================================
echo RESULTADO
echo ===================================================
echo.
echo Lee lo de arriba.
echo - Si dice "MIGRACION COMPLETADA" o "Datos guardados":
echo      ¡LISTO! Cierra esto y reinicia el servidor.
echo.
echo - Si dice "Error":
echo      MySQL sigue sin conectar.
echo.
pause
