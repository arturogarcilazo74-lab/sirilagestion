@echo off
title Sirila - Modo Desarrollo
echo ==========================================
echo   SIRILA GESTION - MODO DESARROLLADOR
echo ==========================================
echo.
echo [1/2] Encendiendo el Cerebro (Base de Datos API - Puerto 3001)...
start "Sirila Backend" cmd /k "color 0A && node server/server.js"

echo.
echo [2/2] Encendiendo la Interfaz (Vite - Puerto 5173)...
echo.
echo Espere a que diga "Local: http://localhost:5173/" y abre esa direccion.
echo.
npm run dev
