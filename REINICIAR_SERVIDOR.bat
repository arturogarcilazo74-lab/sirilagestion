@echo off
title Reiniciando Servidor con Soporte JSON
color 0B

echo ==============================================================
echo    REINICIANDO SERVIDOR SIRILA
echo ==============================================================
echo.

echo [PASO 1] Deteniendo servidores en ejecución...
echo.

:: Detener procesos de Node que estén corriendo el servidor
tasklist | findstr /i "node.exe" >nul
if %ERRORLEVEL% EQU 0 (
    echo Encontrados procesos Node.js activos...
    echo Deteniendo procesos del servidor...
    
    :: Intentar detener procesos en puerto 3001
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
        taskkill /F /PID %%a 2>nul
    )
    
    timeout /t 2 >nul
    echo [OK] Procesos anteriores detenidos.
) else (
    echo [INFO] No hay procesos Node activos.
)

echo.
echo [PASO 2] Iniciando servidor con soporte JSON...
echo.
echo IMPORTANTE:
echo - El servidor detectara automaticamente si MySQL esta disponible
echo - Si MySQL NO esta: Usara archivos JSON (funciona de inmediato)
echo - Si MySQL esta activo: Usara MySQL (mejor rendimiento)
echo.
echo Iniciando en 3 segundos...
timeout /t 3 >nul

:: Iniciar el nuevo servidor
cd /d "%~dp0"
start "Sirila Server (JSON Ready)" cmd /k "node server\server.js"

echo.
echo ==============================================================
echo  [EXITO] Servidor iniciado!
echo ==============================================================
echo.
echo Se ha abierto una nueva ventana con el servidor.
echo.
echo Verifica el mensaje en la ventana del servidor:
echo  - "Storage: MySQL Database" = Usando MySQL
echo  - "Storage: JSON File" = Usando archivos JSON
echo.
echo Tu URL sigue siendo: https://primaria-jaimenuno-sirila.loca.lt
echo (Si deseas acceso desde internet, ejecuta: INICIAR_SERVIDOR_INTERNET.bat)
echo.
pause
