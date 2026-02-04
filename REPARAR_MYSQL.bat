@echo off
title Reparar MySQL - XAMPP
color 0E

echo ==============================================================
echo    DIAGNOSTICO Y REPARACION DE MYSQL
echo ==============================================================
echo.

echo [PASO 1] Verificando puerto 3306...
netstat -ano | findstr :3306
if %ERRORLEVEL% EQU 0 (
    echo [ADVERTENCIA] El puerto 3306 esta ocupado.
    echo Necesitas detener el proceso que lo esta usando.
    echo.
    pause
    goto :end
) else (
    echo [OK] Puerto 3306 disponible.
)
echo.

echo [PASO 2] Buscando procesos de MySQL...
tasklist | findstr /i "mysqld"
if %ERRORLEVEL% EQU 0 (
    echo [ADVERTENCIA] Hay procesos MySQL corriendo.
    echo Voy a intentar detenerlos...
    taskkill /F /IM mysqld.exe 2>NUL
    timeout /t 3
)
echo [OK] No hay procesos MySQL conflictivos.
echo.

echo [PASO 3] Verificando XAMPP...
if not exist "C:\xampp\mysql\bin\mysqld.exe" (
    echo [ERROR] No se encontro MySQL en C:\xampp
    echo.
    echo SOLUCION: Reinstala XAMPP desde:
    echo https://www.apachefriends.org/download.html
    echo.
    pause
    goto :end
)
echo [OK] MySQL encontrado en C:\xampp
echo.

echo [PASO 4] Revisando archivos de datos...
if exist "C:\xampp\mysql\data\ibdata1" (
    echo [VERIFICANDO] Archivos de datos encontrados...
    
    :: Verificar si hay archivos de error
    if exist "C:\xampp\mysql\data\*.err" (
        echo [ADVERTENCIA] Se encontraron archivos de error.
        echo Ubicacion: C:\xampp\mysql\data\
        echo.
        echo Presiona una tecla para intentar reparar...
        pause
        goto :repair
    )
) else (
    echo [INFO] Archivos de datos no encontrados. Primera instalacion.
)
echo.

echo [PASO 5] Intentando iniciar MySQL...
echo.
echo Abriendo Panel de Control XAMPP...
start "" "C:\xampp\xampp-control.exe"
echo.
echo ==============================================================
echo  INSTRUCCIONES:
echo ==============================================================
echo.
echo 1. En el panel XAMPP, haz clic en "Start" junto a MySQL
echo 2. Si aparece el mismo error, cierra el panel y presiona
echo    cualquier tecla aqui para intentar la REPARACION
echo.
pause

:repair
cls
echo ==============================================================
echo    REPARACION DE MYSQL
echo ==============================================================
echo.
echo [OPCION 1] Renombrar archivos de log conflictivos...
echo.

cd /d "C:\xampp\mysql\data"

if exist "ib_logfile0" (
    echo Renombrando ib_logfile0...
    ren ib_logfile0 ib_logfile0.bak
)

if exist "ib_logfile1" (
    echo Renombrando ib_logfile1...
    ren ib_logfile1 ib_logfile1.bak
)

if exist "ibdata1" (
    echo [INFO] ibdata1 existe. No se modificara.
) else (
    echo [ADVERTENCIA] ibdata1 no existe. Se creara al iniciar MySQL.
)

echo.
echo [OK] Archivos de log renombrados.
echo.
echo Ahora intenta iniciar MySQL de nuevo desde el panel XAMPP.
echo.
echo Si el error persiste, presiona una tecla para la OPCION 2...
pause

:option2
cls
echo ==============================================================
echo    OPCION 2: REINSTALACION LIMPIA DE MYSQL
echo ==============================================================
echo.
echo ADVERTENCIA: Esto borrara TODOS los datos de MySQL.
echo.
echo Si aceptas, se hara lo siguiente:
echo 1. Respaldar carpeta mysql\data
echo 2. Limpiar instalacion de MySQL
echo 3. Reiniciar desde cero
echo.
set /p "respuesta=¿Deseas continuar? (si/no): "

if /i not "%respuesta%"=="si" (
    echo.
    echo Operacion cancelada.
    echo.
    echo ALTERNATIVA: Usa almacenamiento en archivos JSON
    echo Lee el archivo: USAR_JSON_EN_VEZ_DE_MYSQL.md
    echo.
    pause
    goto :end
)

echo.
echo [PASO 1] Deteniendo servicios MySQL...
net stop MySQL 2>NUL
taskkill /F /IM mysqld.exe 2>NUL
timeout /t 3

echo [PASO 2] Creando respaldo...
set "BACKUP_DIR=C:\xampp\mysql\data_backup_%date:~-4%%date:~-7,2%%date:~-10,2%_%time:~0,2%%time:~3,2%%time:~6,2%"
set "BACKUP_DIR=%BACKUP_DIR: =0%"

if exist "C:\xampp\mysql\data" (
    echo Respaldando a: %BACKUP_DIR%
    xcopy "C:\xampp\mysql\data" "%BACKUP_DIR%\" /E /I /Y
    echo [OK] Respaldo creado.
)

echo [PASO 3] Limpiando datos...
cd /d "C:\xampp\mysql\data"
del /Q ib_logfile* 2>NUL
del /Q *.err 2>NUL

echo [PASO 4] Inicializando MySQL...
cd /d "C:\xampp\mysql\bin"
mysqld --initialize-insecure --user=mysql --datadir="C:\xampp\mysql\data"

echo.
echo ==============================================================
echo  REPARACION COMPLETADA
echo ==============================================================
echo.
echo Ahora:
echo 1. Abre el Panel de Control XAMPP
echo 2. Haz clic en "Start" junto a MySQL
echo 3. MySQL deberia iniciar correctamente
echo.
echo Respaldo guardado en: %BACKUP_DIR%
echo.
pause

:end
echo.
echo Presiona cualquier tecla para salir...
pause >nul
