@echo off
setlocal
echo ======================================================
echo    GENERADOR DE INSTALADOR PARA WINDOWS (.EXE)
echo ======================================================
echo.
echo Este proceso convertira Sirila en una aplicacion de escritorio instalable.
echo Se requiere Node.js instalado en este equipo.
echo.

:: 1. Verificar Node_modules
if not exist node_modules (
    echo [1/4] Instalando dependencias necesarias...
    call npm install
) else (
    echo [1/4] Dependencias encontradas.
)

:: 2. Construir la Web (Vite)
echo [2/4] Preparando archivos del sistema...
set VITE_ELECTRON=true
call npm run build

:: 3. Generar el instalador (Electron Builder)
echo [3/4] Creando el instalador (.exe)... Esto puede tardar unos minutos.
call npm run electron:build

:: 4. Finalizar
echo.
echo ======================================================
echo    ¡PROCESO FINALIZADO CON EXITO!
echo ======================================================
echo.
echo El instalador se encuentra en la carpeta:
echo dist-installer/
echo.
echo Busque el archivo llamado "Sirila Gestion Setup X.X.X.exe"
echo.
pause
endlocal
