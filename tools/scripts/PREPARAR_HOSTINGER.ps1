# Script para Crear Paquete de Despliegue - SirilaGestion
$destination = "SIRILA_DESPLIEGUE_HOSTINGER.zip"

if (Test-Path $destination) { Remove-Item $destination }

Write-Host "[*] Preparando archivos para Hostinger..."

# Crear carpeta temporal para no ensuciar el repo
$tempDir = "deploy_temp"
if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir }
New-Item -ItemType Directory -Path $tempDir | Out-Null
New-Item -ItemType Directory -Path "$tempDir/server" | Out-Null

# Copiar archivos del servidor y frontend compilado
Copy-Item -Path "server/*" -Destination "$tempDir/server" -Recurse -Exclude ".env", "node_modules", "database.json"
Copy-Item -Path "server/.env.production" -Destination "$tempDir/server/.env"
Copy-Item -Path "dist-app" -Destination $tempDir -Recurse

# Copiar server.js raiz (entry point para Hostinger) y package.json de produccion
# IMPORTANTE: Usamos Copy-Item en vez de Out-File para evitar el BOM de PowerShell
Copy-Item -Path "server_entry.js" -Destination "$tempDir/server.js"
Copy-Item -Path "package.production.json" -Destination "$tempDir/package.json"

Write-Host "[*] Creando ZIP..."
Compress-Archive -Path "$tempDir/*" -DestinationPath $destination

# Limpiar
Remove-Item -Recurse -Force $tempDir

Write-Host ""
Write-Host "[OK] Archivo '$destination' creado con exito!"
Write-Host ""
Write-Host "Estructura del ZIP:"
Write-Host "  server.js        <- Entry point (raiz)"
Write-Host "  package.json     <- Solo dependencias del servidor"
Write-Host "  server/          <- Codigo del servidor"
Write-Host "  dist-app/        <- Frontend compilado"
Write-Host ""
Write-Host "En Hostinger: Archivo de entrada = server.js"
Write-Host "Sube este archivo al panel de Implementaciones de Hostinger."
