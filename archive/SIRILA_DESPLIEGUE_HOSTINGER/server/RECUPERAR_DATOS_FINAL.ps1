# Script de recuperación TOTAL de datos
# Este script hará TODO automáticamente

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RECUPERACIÓN DE DATOS - PASO A PASO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# PASO 1: Detener MySQL si está corriendo
Write-Host "[1/7] Deteniendo MySQL..." -ForegroundColor Yellow
Stop-Process -Name "mysqld" -Force -ErrorAction SilentlyContinue
Stop-Process -Name "mysql" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3
Write-Host "      OK - MySQL detenido" -ForegroundColor Green
Write-Host ""

# PASO 2: Hacer backup de la carpeta data actual (por seguridad)
Write-Host "[2/7] Haciendo backup de seguridad..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupPath = "C:\xampp\mysql\data_rescue_$timestamp"

if (Test-Path "C:\xampp\mysql\data\sirilagestion") {
    Copy-Item "C:\xampp\mysql\data\sirilagestion" -Destination "$backupPath\sirilagestion" -Recurse -Force
    Write-Host "      OK - Backup guardado en: $backupPath" -ForegroundColor Green
} else {
    Write-Host "      INFO - No hay datos actuales para respaldar" -ForegroundColor Gray
}
Write-Host ""

# PASO 3: Eliminar carpeta actual de sirilagestion
Write-Host "[3/7] Eliminando base de datos actual..." -ForegroundColor Yellow
if (Test-Path "C:\xampp\mysql\data\sirilagestion") {
    Remove-Item "C:\xampp\mysql\data\sirilagestion" -Recurse -Force
    Write-Host "      OK - Carpeta eliminada" -ForegroundColor Green
} else {
    Write-Host "      INFO - No existía" -ForegroundColor Gray
}
Write-Host ""

# PASO 4: Restaurar desde backup
Write-Host "[4/7] Restaurando datos desde backup del 21/01/2026..." -ForegroundColor Yellow
if (Test-Path "C:\xampp\mysql\data_backup_20260121_140502\sirilagestion") {
    Copy-Item "C:\xampp\mysql\data_backup_20260121_140502\sirilagestion" -Destination "C:\xampp\mysql\data\sirilagestion" -Recurse -Force
    Write-Host "      OK - Datos restaurados!" -ForegroundColor Green
} else {
    Write-Host "      ERROR - No se encontró el backup" -ForegroundColor Red
    Write-Host "      Ubicación esperada: C:\xampp\mysql\data_backup_20260121_140502\sirilagestion" -ForegroundColor Red
    exit 1
}
Write-Host ""

# PASO 5: Limpiar logs problemáticos
Write-Host "[5/7] Limpiando logs de MySQL..." -ForegroundColor Yellow
Remove-Item "C:\xampp\mysql\data\ib_logfile0" -Force -ErrorAction SilentlyContinue
Remove-Item "C:\xampp\mysql\data\ib_logfile1" -Force -ErrorAction SilentlyContinue
Remove-Item "C:\xampp\mysql\data\aria_log_control" -Force -ErrorAction SilentlyContinue
Remove-Item "C:\xampp\mysql\data\aria_log.00000001" -Force -ErrorAction SilentlyContinue
Write-Host "      OK - Logs limpiados" -ForegroundColor Green
Write-Host ""

# PASO 6: Intentar iniciar MySQL
Write-Host "[6/7] Iniciando MySQL..." -ForegroundColor Yellow
Write-Host "      Abriendo XAMPP Control Panel..." -ForegroundColor Gray
Start-Process "C:\xampp\xampp-control.exe"
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ACCIÓN REQUERIDA" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Busca la ventana de 'XAMPP Control Panel' que se acaba de abrir" -ForegroundColor White
Write-Host "2. Busca la fila que dice 'MySQL'" -ForegroundColor White
Write-Host "3. Haz clic en el botón 'Start' (a la derecha)" -ForegroundColor White
Write-Host "4. Si se pone verde = PERFECTO" -ForegroundColor Green
Write-Host "5. Si aparece un error, lee el mensaje" -ForegroundColor Yellow
Write-Host ""
Write-Host "Presiona ENTER cuando MySQL esté iniciado (o si dio error)..." -ForegroundColor Cyan
Read-Host

# PASO 7: Exportar a JSON
Write-Host ""
Write-Host "[7/7] Exportando datos a JSON..." -ForegroundColor Yellow
$currentDir = Get-Location
Set-Location "C:\Users\lapomiguel\Desktop\aula 4to\sirilagestion2\server"

Write-Host "      Ejecutando script de exportación..." -ForegroundColor Gray
node exportar_rapido.js

Set-Location $currentDir

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PROCESO COMPLETADO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "SIGUIENTE PASO:" -ForegroundColor Yellow
Write-Host "1. Reinicia tu servidor:" -ForegroundColor White
Write-Host "   - Detén el actual (Ctrl+C en la terminal)" -ForegroundColor Gray
Write-Host "   - Ejecuta: npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Abre tu navegador en:" -ForegroundColor White
Write-Host "   http://localhost:3001" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Deberías ver tus datos!" -ForegroundColor Green
Write-Host ""
Write-Host "Presiona ENTER para cerrar..." -ForegroundColor Gray
Read-Host
