@echo off
title SUBIR DATOS A LA NUBE (AIVEN)
color 0B

echo ===================================================
echo   SUBIR INFORMACION A LA NUBE - SIRILA
echo ===================================================
echo.
echo Este proceso enviara tus alumnos, tareas y datos 
echo de tu computadora a la base de datos de internet.
echo.
echo REQUISITOS:
echo   1. MySQL debe estar VERDE en XAMPP.
echo   2. Debes tener conexion a internet.
echo.
pause

echo.
echo Iniciando proceso...
cd server
node subir_a_la_nube.js

echo.
echo ---------------------------------------------------
echo PROCESO FINALIZADO
echo ---------------------------------------------------
echo.
pause
