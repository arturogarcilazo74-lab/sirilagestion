@echo off
echo ============================================
echo   RESTAURAR DATOS DESDE BACKUP
echo ============================================
echo.
echo Se encontro un backup de hoy:
echo   C:\xampp\mysql\data_backup_20260121_140502
echo.
echo Este script va a:
echo 1. Restaurar la base de datos desde el backup
echo 2. Intentar iniciar MySQL
echo 3. Exportar los datos a JSON
echo.
pause
echo.

REM Paso 1: Asegurarse de que MySQL este detenido
echo [1/5] Verificando que MySQL este detenido...
tasklist /FI "IMAGENAME eq mysqld.exe" 2>NUL | find /I /N "mysqld.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [!] MySQL esta corriendo. Detenlo desde XAMPP Control Panel
    echo y vuelve a ejecutar este script.
    pause
    exit /b 1
)
echo [OK] MySQL esta detenido
echo.

REM Paso 2: Hacer backup del data actual (por si acaso)
echo [2/5] Haciendo backup del data actual...
set BACKUP_ACTUAL=C:\xampp\mysql\data_actual_backup_%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%
set BACKUP_ACTUAL=%BACKUP_ACTUAL: =0%

if exist "C:\xampp\mysql\data\sirilagestion" (
    xcopy "C:\xampp\mysql\data\sirilagestion" "%BACKUP_ACTUAL%\sirilagestion\" /E /I /Q /Y > nul
    echo [OK] Backup actual guardado en: %BACKUP_ACTUAL%
) else (
    echo [INFO] No hay base de datos actual para respaldar
)
echo.

REM Paso 3: Restaurar desde backup
echo [3/5] Restaurando base de datos desde backup...
xcopy "C:\xampp\mysql\data_backup_20260121_140502\sirilagestion" "C:\xampp\mysql\data\sirilagestion\" /E /I /Q /Y > nul

if %ERRORLEVEL% EQU 0 (
    echo [OK] Base de datos restaurada
) else (
    echo [ERROR] No se pudo restaurar la base de datos
    pause
    exit /b 1
)
echo.

REM Paso 4: Limpiar logs problematicos
echo [4/5] Limpiando logs problematicos...
cd C:\xampp\mysql\data

if exist ib_logfile0 del /F /Q ib_logfile0 2>nul
if exist ib_logfile1 del /F /Q ib_logfile1 2>nul
if exist aria_log_control del /F /Q aria_log_control 2>nul
if exist aria_log.00000001 del /F /Q aria_log.00000001 2>nul

echo [OK] Logs limpiados
echo.

REM Paso 5: Abrir XAMPP para iniciar MySQL
echo [5/5] Abriendo XAMPP Control Panel...
echo.
echo ============================================
echo   IMPORTANTE - LEE ESTO
echo ============================================
echo.
echo 1. Se va a abrir XAMPP Control Panel
echo 2. Haz clic en "Start" junto a MySQL
echo 3. Espera a que se ponga verde
echo 4. Vuelve a esta ventana y presiona cualquier tecla
echo.

start "" "C:\xampp\xampp-control.exe"

echo Esperando a que inicies MySQL...
pause
echo.

REM Verificar si MySQL esta corriendo
echo Verificando MySQL...
timeout /t 3 /nobreak > nul

tasklist /FI "IMAGENAME eq mysqld.exe" 2>NUL | find /I /N "mysqld.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [OK] MySQL esta corriendo!
    echo.
    echo ============================================
    echo   SIGUIENTE PASO: Exportar a JSON
    echo ============================================
    echo.
    echo Ahora vamos a exportar los datos a JSON
    echo para que tu aplicacion pueda usarlos.
    echo.
    pause
    
    cd "%~dp0"
    node migrar_mysql_a_json.js
    
    if %ERRORLEVEL% EQU 0 (
        echo.
        echo ============================================
        echo   EXITO! Datos recuperados
        echo ============================================
        echo.
        echo Tus datos han sido restaurados en:
        echo   server\database.json
        echo.
        echo Reinicia tu servidor (npm run dev) para verlos
        echo.
    ) else (
        echo.
        echo [ERROR] No se pudo exportar a JSON
        echo Verifica que MySQL este corriendo
        echo.
    )
) else (
    echo [!] MySQL NO esta corriendo
    echo.
    echo Posibles razones:
    echo - No lo iniciaste en XAMPP
    echo - Se cerro inmediatamente (revisa los logs en XAMPP)
    echo.
    echo Intenta:
    echo 1. Iniciar MySQL en XAMPP
    echo 2. Si falla, revisa los logs (boton "Logs" en XAMPP)
    echo 3. Ejecuta este script de nuevo
    echo.
)

pause
