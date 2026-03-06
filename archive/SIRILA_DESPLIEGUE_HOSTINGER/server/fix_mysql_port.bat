@echo off
echo ============================================
echo   SOLUCION: Puerto MySQL Ocupado
echo ============================================
echo.

echo Verificando que procesos estan usando el puerto 3306...
echo.

netstat -ano | findstr :3306

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [!] El puerto 3306 ESTA EN USO
    echo.
    echo Opciones:
    echo 1. Anota el PID (ultimo numero) de la linea de arriba
    echo 2. Abre el Administrador de Tareas
    echo 3. Ve a "Detalles"
    echo 4. Busca el proceso con ese PID y haz clic derecho -^> Finalizar tarea
    echo.
    echo O ejecuta este comando en PowerShell como Administrador:
    echo   taskkill /PID [numero_del_pid] /F
    echo.
) else (
    echo [OK] El puerto 3306 esta LIBRE
    echo.
    echo El problema NO es el puerto.
    echo Revisa los logs de MySQL para ver el error real:
    echo   C:\xampp\mysql\data\mysql_error.log
    echo.
    echo O haz clic en "Logs" en XAMPP Control Panel
)

echo.
echo ============================================
pause
