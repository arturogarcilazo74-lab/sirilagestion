@echo off
echo ============================================
echo   LIMPIAR LOGS DE MYSQL (Solucion comun)
echo ============================================
echo.
echo ATENCION: Esta solucion funciona para muchos casos
echo donde MySQL se cierra inmediatamente.
echo.
echo Este script va a:
echo 1. Hacer BACKUP de tus datos
echo 2. Eliminar archivos de log problematicos
echo 3. Dejar MySQL listo para arrancar
echo.

pause

REM Verificar que XAMPP existe
if not exist "C:\xampp\mysql\data" (
    echo [ERROR] No se encuentra XAMPP en C:\xampp
    echo.
    echo Si XAMPP esta en otra ubicacion, edita este script
    echo y cambia la ruta.
    pause
    exit /b 1
)

echo.
echo Paso 1: Verificando que MySQL este DETENIDO...
tasklist /FI "IMAGENAME eq mysqld.exe" 2>NUL | find /I /N "mysqld.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [!] MySQL esta corriendo. Por favor DETELO desde XAMPP Control Panel
    echo y vuelve a ejecutar este script.
    pause
    exit /b 1
)
echo [OK] MySQL esta detenido
echo.

echo Paso 2: Haciendo BACKUP de datos...
set BACKUP_DIR=C:\xampp\mysql\data_backup_%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%
set BACKUP_DIR=%BACKUP_DIR: =0%
echo Copiando a: %BACKUP_DIR%

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"
xcopy "C:\xampp\mysql\data\*.*" "%BACKUP_DIR%\" /E /I /Q /Y > nul

if %ERRORLEVEL% EQU 0 (
    echo [OK] Backup completado
) else (
    echo [ERROR] No se pudo hacer backup. Abortando.
    pause
    exit /b 1
)
echo.

echo Paso 3: Eliminando archivos de log problematicos...
cd C:\xampp\mysql\data

if exist ib_logfile0 (
    del /F /Q ib_logfile0
    echo [OK] Eliminado: ib_logfile0
)

if exist ib_logfile1 (
    del /F /Q ib_logfile1
    echo [OK] Eliminado: ib_logfile1
)

if exist aria_log_control (
    del /F /Q aria_log_control
    echo [OK] Eliminado: aria_log_control
)

if exist aria_log.00000001 (
    del /F /Q aria_log.00000001
    echo [OK] Eliminado: aria_log.00000001
)

echo.
echo ============================================
echo   LISTO!
echo ============================================
echo.
echo Backup guardado en:
echo   %BACKUP_DIR%
echo.
echo Ahora intenta INICIAR MySQL desde XAMPP Control Panel
echo.
echo Si MySQL arranca correctamente, el problema esta resuelto!
echo Si sigue fallando, revisa los logs:
echo   - Haz clic en "Logs" en XAMPP
echo   - O abre: C:\xampp\mysql\data\mysql_error.log
echo.
echo ============================================
pause
