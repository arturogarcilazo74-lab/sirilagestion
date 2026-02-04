@echo off
title REPARADOR DE ERROR DE MYSQL
color 4F

echo =======================================================
echo    REPARACION DE "MYSQL SHUTDOWN UNEXPECTEDLY"
echo =======================================================
echo.
echo Este error ocurre porque unos archivos temporales de MySQL
echo se dañaron (se corrompieron). 
echo.
echo Vamos a borrarlos (es seguro) paraque MySQL genere nuevos.
echo NO SE BORRARAN TUS ALUMNOS, solo archivos de arranque.
echo.
echo -------------------------------------------------------
echo PASO 1: Deteniendo procesos trabados...
echo -------------------------------------------------------
taskkill /F /IM mysqld.exe >nul 2>&1
echo Listo.

echo.
echo -------------------------------------------------------
echo PASO 2: Realizando la reparacion...
echo -------------------------------------------------------
cd /d "C:\xampp\mysql\data"

if not exist "ib_logfile0" (
    echo No encontre los archivos en C:\xampp\mysql\data.
    echo Verificando otra ruta...
    goto :error
)

echo Eliminando archivos corruptos (ib_logfile0, ib_logfile1)...
del "ib_logfile0"
del "ib_logfile1"

echo.
echo [EXITO] Archivos eliminados. MySQL deberia arrancar ahora.
echo.

echo -------------------------------------------------------
echo PASO 3: Probando arranque...
echo -------------------------------------------------------
echo.
echo Por favor, ve al Panel de XAMPP y dale "Start" a MySQL ahora.
echo.
pause

exit

:error
echo [ERROR] No pude encontrar la carpeta de datos de MySQL.
echo Avisame para buscarla manualmente.
pause
