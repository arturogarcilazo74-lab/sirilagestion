@echo off
title DESPLEGAR SIRILA EN HOSTINGER (SSH)
color 0A

:: Cambiamos al directorio raíz del proyecto para que los comandos funcionen relativamente
pushd "%~dp0..\.."

echo ============================================================
echo   DESPLIEGUE DE SIRILA EN HOSTINGER - VIA SSH
echo ============================================================
echo.
echo Este script subira el paquete ZIP a tu servidor y lo configurara.
echo.
echo SERVIDOR: 62.72.50.222:65002
echo USUARIO:  u654780111
echo CARPETA:  /home/u654780111/sirila-new/sirila-new
echo.
echo Necesitaras ingresar tu CONTRASENA SSH cuando te la pida.
echo.
set ZIP_NAME=SIRILA_LISTO_HOSTINGER.zip

if not exist "%ZIP_NAME%" (
    echo [ERROR] No se encuentra el archivo %ZIP_NAME% en la raiz.
    echo Asegurate de correr el script de "Preparar Paquete" primero.
    pause
    popd
    exit /b 1
)

pause

echo.
echo [1/3] Subiendo %ZIP_NAME% al servidor...
echo (Ingresa tu contrasena cuando aparezca el mensaje "password:")
echo.
scp -P 65002 "%ZIP_NAME%" u654780111@62.72.50.222:/home/u654780111/sirila-new/

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: No se pudo subir el archivo. Verifica tu conexion.
    pause
    popd
    exit /b 1
)

echo.
echo [OK] ZIP subido correctamente!
echo.
echo [2/3] Conectando al servidor para extraer e instalar...
echo (Ingresa tu contrasena de nuevo cuando aparezca)
echo.

ssh -p 65002 u654780111@62.72.50.222 "cd /home/u654780111/sirila-new && echo '--- Extrayendo archivos ---' && rm -rf sirila-new && mkdir sirila-new && cd sirila-new && unzip -o ../%ZIP_NAME% && echo '--- Instalando dependencias ---' && npm install --production && echo '--- INSTALACION COMPLETA ---'"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Hubo un problema durante la instalacion en el servidor.
    pause
    popd
    exit /b 1
)

echo.
echo [3/3] Configurando el servidor para que inicie automaticamente...
echo (Ingresa tu contrasena una vez mas)
echo.

ssh -p 65002 u654780111@62.72.50.222 "cd /home/u654780111/sirila-new/sirila-new && pkill -f 'node server.js' 2>/dev/null; nohup node server.js > server.log 2>&1 & echo 'Servidor iniciado!'"

echo.
echo ============================================================
echo   DESPLIEGUE COMPLETADO!
echo ============================================================
echo.
echo Tu aplicacion deberia estar corriendo en:
echo   https://sirila.losdeotayvista.com
echo.
echo Regresando a la carpeta original...
popd
pause
