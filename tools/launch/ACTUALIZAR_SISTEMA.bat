@echo off
title Actualizar Sistema Sirila
color 0B

echo ==============================================================
echo    ACTUALIZADOR DE SISTEMA SIRILA (MOBILE/WEB)
echo ==============================================================
echo.
echo Este proceso preparara la version mas reciente de la aplicacion
echo para que se pueda ver en telefonos y tabletas.
echo.
echo [1/2] Limpiando archivos antiguos...
if exist dist-app rmdir /s /q dist-app

echo.
echo [2/2] Generando nueva version (Build)...
echo Esto puede tomar 1-2 minutos. Por favor espera...
echo.

call npm run build

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ==============================================================
    echo  [EXITO] Sistema actualizado correctamente!
    echo ==============================================================
    echo.
    echo Ahora puedes abrir la App en tu celular y veras los cambios.
    echo.
    echo NOTA: En el celular, ve a:
    echo Configuraicon -> Boton Rojo "Limpiar Cache y Actualizar"
    echo para forzar la carga de esta nueva version.
    echo.
) else (
    echo.
    echo [ERROR] Hubo un problema al actualizar. 
    echo Verifica que tengas Node.js instalado y no tengas errores de codigo.
    echo.
)

pause
