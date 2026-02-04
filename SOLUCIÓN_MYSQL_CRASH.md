# 🚨 MYSQL SE CIERRA INMEDIATAMENTE - Soluciones

## ✅ SOLUCIÓN MÁS COMÚN (Prueba esto primero)

### Limpiar archivos de log corruptos

Este es el problema #1 más frecuente. Sigue estos pasos:

#### **Opción Automática (Recomendado):**

1. Asegúrate de que MySQL esté DETENIDO en XAMPP
2. Ejecuta el archivo: **`clear_mysql_logs.bat`** (doble clic)
3. El script hará backup y limpiará los logs automáticamente
4. Intenta iniciar MySQL de nuevo en XAMPP

#### **Opción Manual:**

1. Asegúrate de que MySQL esté DETENIDO en XAMPP
2. Ve a: `C:\xampp\mysql\data`
3. **Elimina estos archivos** (si existen):
   - `ib_logfile0`
   - `ib_logfile1`
   - `aria_log_control`
   - `aria_log.00000001`
4. **NO elimines las carpetas** ni otros archivos
5. Intenta iniciar MySQL de nuevo en XAMPP

---

## 🔍 Otras soluciones posibles

### 1. Puerto ocupado

**Verifica:** Ejecuta `fix_mysql_port.bat`

Si el puerto 3306 está ocupado por otro programa, sigue las instrucciones del script.

### 2. Permisos

**Prueba:** Ejecutar XAMPP como Administrador

1. Cierra XAMPP completamente
2. Clic derecho en "XAMPP Control Panel"
3. "Ejecutar como administrador"
4. Intenta iniciar MySQL

### 3. Otro servicio MySQL

Si tienes otro MySQL instalado en Windows puede causar conflictos.

**Abre PowerShell como Admin y ejecuta:**

```powershell
Get-Service | Where-Object {$_.Name -like "*mysql*"}
```

Si ves servicios MySQL que no sean de XAMPP, deténlos.

---

## 📋 CHECKLIST - Prueba en este orden

1. ✅ **Puerto libre** (ya verificado - el puerto 3306 está disponible)
2. ⬜ **Limpiar logs** → Ejecuta `clear_mysql_logs.bat`
3. ⬜ **Ejecutar como Admin** → Abre XAMPP como Administrador
4. ⬜ **Revisar logs de error** → Lee el archivo de error para ver el problema exacto

---

## 📖 Ver logs de error de MySQL

Para saber EXACTAMENTE qué está pasando:

**En XAMPP:**

- Haz clic en el botón "Logs" (junto a MySQL)
- Ve hasta el FINAL del archivo
- Busca líneas con "ERROR" o "Fatal"

**Ubicación manual:**

```
C:\xampp\mysql\data\mysql_error.log
```

---

## 🆘 SI NADA FUNCIONA

### Usa la alternativa JSON (mientras arreglas MySQL)

Tu servidor YA está configurado para funcionar sin MySQL:

```bash
# Simplemente inicia tu servidor:
npm run dev
```

El servidor detectará que MySQL no funciona y usará `database.json` automáticamente.

**Todo funcionará igual**, solo que los datos se guardarán en archivos JSON en vez de MySQL.

---

## 🎯 RECOMENDACIÓN INMEDIATA

**Ejecuta `clear_mysql_logs.bat` AHORA** - Esta es la solución al 80% de los casos.

Si después de eso MySQL sigue fallando:

1. Lee los logs de error
2. Copia aquí el mensaje de error específico
3. Mientras tanto, usa JSON para que tu app funcione

---

## 📂 Archivos de ayuda creados

- ✅ **`clear_mysql_logs.bat`** - Limpia logs automáticamente (PRUEBA ESTO PRIMERO)
- ✅ **`fix_mysql_port.bat`** - Verifica si el puerto está ocupado
- ✅ **`fix_mysql_crash.md`** - Guía detallada de todas las soluciones
- ✅ **`check_mysql.js`** - Verifica si MySQL funciona correctamente

---

**PRÓXIMOPASO:** Ejecuta `clear_mysql_logs.bat` y luego intenta iniciar MySQL en XAMPP.
