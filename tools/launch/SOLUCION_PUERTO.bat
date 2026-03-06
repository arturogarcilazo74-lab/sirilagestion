@echo off
title CAMBIO DE PUERTO MYSQL
color 1F

echo ========================================================
echo   CAMBIO DE PUERTO MYSQL (SOLUCION FINAL)
echo ========================================================
echo.
echo He detectado que tu MySQL sigue fallando porque el puerto
echo 3306 esta bloqueado o dañado.
echo.
echo HE CAMBIADO LA CONFIGURACION PARA USAR EL PUERTO 3307.
echo esto deberia esquivar el error.
echo.
echo ========================================================
echo PASO 1: REINICIAR XAMPP
echo ========================================================
echo.
echo 1. Ve a tu Panel de XAMPP.
echo 2. Dale STOP a MySQL (si esta prendido).
echo 3. Dale START a MySQL.
echo.
echo IMPORTANTE: Ahora deberias ver "Port: 3307" en el panel.
echo Si ves 3307 en verde, FUNCIONO.
echo.
echo Presiona enter cuando salga en VERDE el puerto 3307...
pause

echo.
echo ========================================================
echo PASO 2: RECUPERAR DATOS
echo ========================================================
echo.
echo Intentando recuperar datos desde el nuevo puerto...
cd server
node migrar_mysql_a_json.js

echo.
echo ========================================================
echo Lee el resultado arriba.
echo Si dice "MIGRACION COMPLETADA", cierra esto y reinicia.
echo ========================================================
pause
