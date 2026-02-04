#!/bin/bash

# --- GENERADOR DE APP PARA MAC (.DMG) ---
# Nota: Este script debe ejecutarse en una computadora con macOS.

echo "======================================================"
echo "   GENERADOR DE INSTALADOR PARA MAC (.DMG)"
echo "======================================================"
echo ""

# 1. Verificar si estamos en Mac
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "ERROR: Este script solo puede ejecutarse en un Mac (macOS)."
    echo "Para Windows, por favor usa el archivo .bat"
    exit 1
fi

# 2. Verificar dependencias
if ! [ -x "$(command -v node)" ]; then
  echo 'Error: Node.js no está instalado.' >&2
  exit 1
fi

# 3. Instalación y Construcción
echo "[1/3] Instalando dependencias..."
npm install

echo "[2/3] Construyendo archivos web..."
npm run build

echo "[3/3] Generando archivo .dmg..."
npm run electron:build

echo ""
echo "======================================================"
echo "   ¡PROCESO FINALIZADO!"
echo "======================================================"
echo ""
echo "Encontrará el archivo .dmg en la carpeta: dist/"
echo ""
