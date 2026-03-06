@echo off
echo ========================================
echo     SCRIPT DE REPARACION DE MYSQL
echo ========================================
echo.

REM Verificar si XAMPP esta instalado
if exist "C:\xampp\mysql\bin\mysqld.exe" (
    echo [OK] XAMPP encontrado en C:\xampp
    set XAMPP_PATH=C:\xampp
) else if exist "C:\Program Files\xampp\mysql\bin\mysqld.exe" (
    echo [OK] XAMPP encontrado en C:\Program Files\xampp
    set XAMPP_PATH=C:\Program Files\xampp
) else if exist "C:\Program Files (x86)\xampp\mysql\bin\mysqld.exe" (
    echo [OK] XAMPP encontrado en C:\Program Files (x86)\xampp
    set XAMPP_PATH=C:\Program Files (x86)\xampp
) else (
    echo [ERROR] No se encontro XAMPP en las ubicaciones comunes
    echo.
    echo INSTRUCCIONES:
    echo 1. Descarga e instala XAMPP desde https://www.apachefriends.org
    echo 2. Durante la instalacion, asegurate de seleccionar MySQL
    echo 3. Vuelve a ejecutar este script
    goto :end
)

echo.
echo Verificando el estado de MySQL...
echo.

REM Verificar si MySQL esta corriendo
tasklist /FI "IMAGENAME eq mysqld.exe" 2>NUL | find /I /N "mysqld.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [OK] MySQL esta corriendo
    echo.
    echo Probando conexion a la base de datos...
    node test_db.js
    echo.
    echo ========================================
    echo Si la conexion fue exitosa, tu MySQL esta funcionando correctamente!
    echo Ahora puedes iniciar tu servidor con: npm run dev
    echo ========================================
) else (
    echo [AVISO] MySQL NO esta corriendo
    echo.
    echo Abriendo XAMPP Control Panel...
    echo.
    start "" "%XAMPP_PATH%\xampp-control.exe"
    echo.
    echo ========================================
    echo INSTRUCCIONES:
    echo 1. En el panel de XAMPP que se abrio, haz clic en "Start" junto a MySQL
    echo 2. Espera a que el modulo MySQL se ponga verde
    echo 3. Vuelve a ejecutar este script para verificar la conexion
    echo.
    echo SI APARECE UN ERROR:
    echo - Puerto 3306 ocupado: Cierra otros programas MySQL
    echo - Error de permisos: Ejecuta XAMPP como Administrador
    echo - Archivos corruptos: Reinstala XAMPP
    echo ========================================
)

:end
echo.
pause
