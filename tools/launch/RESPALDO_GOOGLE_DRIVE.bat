@echo off
title ☁️ SirilaGestion - Respaldo en Google Drive
color 0b

:: --- CONFIGURACIÓN ---
:: Ajusta esta ruta si tu Google Drive está en otra letra o carpeta
set "DRIVE_FOLDER=G:\Mi unidad\RESPALDOS_SIRILA"
set "LOCAL_DB=server\database.json"

echo ======================================================
echo    RESPALDO AUTOMATICO A GOOGLE DRIVE
echo ======================================================
echo.

:: Verificar si existe la DB local
if not exist "%LOCAL_DB%" (
    color 0c
    echo [ERROR] No se encuentra el archivo database.json en la carpeta server.
    echo Asegurate de ejecutar este script desde la carpeta raiz de la app.
    pause
    exit
)

:: Crear carpeta en Drive si no existe
if not exist "%DRIVE_FOLDER%" (
    echo [INFO] Creando carpeta en Google Drive...
    mkdir "%DRIVE_FOLDER%"
)

:: Generar nombre con fecha para el respaldo (Año-Mes-Dia)
set "datestr=%date:~6,4%-%date:~3,2%-%date:~0,2%"
set "timestamp=%time:~0,2%-%time:~3,2%"
set "timestamp=%timestamp: =0%"

set "BACKUP_NAME=database_backup_%datestr%_%timestamp%.json"

echo [1/2] Copiando base de datos a: %DRIVE_FOLDER%
copy "%LOCAL_DB%" "%DRIVE_FOLDER%\database.json" /Y > nul

echo [2/2] Creando copia historica: %BACKUP_NAME%
copy "%LOCAL_DB%" "%DRIVE_FOLDER%\%BACKUP_NAME%" /Y > nul

echo.
echo ======================================================
echo    ¡RESPLADO COMPLETADO CON EXITO!
echo ======================================================
echo Los datos estan protegidos en tu Google Drive.
echo.
timeout /t 5
