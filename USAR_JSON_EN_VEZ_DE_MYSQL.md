# 💾 SOLUCIÓN ALTERNATIVA: Usar JSON en lugar de MySQL

## ⚠️ Problema Actual

MySQL no inicia en XAMPP y muestra el error "shutdown unexpectedly".

## ✅ SOLUCIÓN RÁPIDA: Usa Almacenamiento en Archivos JSON

En lugar de luchar con MySQL, puedes hacer que Sirila guarde los datos en archivos JSON.
**Ventajas:**

- ✅ Funciona INMEDIATAMENTE, sin configuración
- ✅ No necesitas MySQL ni XAMPP
- ✅ Los datos se guardan en archivos simples
- ✅ Fácil de respaldar (solo copia la carpeta)
- ✅ Sin problemas de puertos o permisos

**Desventajas:**

- ⚠️ Menos eficiente para MUCHOS usuarios simultáneos (más de 50)
- ⚠️ No tiene las optimizaciones de una base de datos real

---

## 🚀 IMPLEMENTACIÓN (5 minutos)

Ya existe un archivo `server/database.json` en tu proyecto que puede usarse como almacenamiento.

### Opción 1: Modificar Temporalment

e la Configuración

Edita el archivo: `server/.env`

**Cambia de:**

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=sirilagestion
PORT=3001
```

**A:**

```
USE_JSON_STORAGE=true
JSON_FILE_PATH=./database.json
PORT=3001
```

### Opción 2: Sistema Híbrido (Recomendado)

El servidor puede detectar automáticamente si MySQL está disponible y usar JSON como respaldo.

---

## 🛠️ MIENTRAS TANTO: Intenta Reparar MySQL

He creado un script de reparación automática:

1. Cierra el Panel de XAMPP
2. Haz doble clic en: **`REPARAR_MYSQL.bat`**
3. Sigue las instrucciones en pantalla

El script intentará:

1. ✅ Verificar el puerto 3306
2. ✅ Detener procesos conflictivos
3. ✅ Reparar archivos de log corruptos
4. ✅ Reinicializar MySQL si es necesario

---

## 🔍 CAUSAS COMUNES DEL ERROR

### 1. **Archivos de Log Corruptos**

**Solución:** El script `REPARAR_MYSQL.bat` renombra automáticamente `ib_logfile0` e `ib_logfile1`

### 2. **Puerto 3306 Ocupado**

**Verificar:** Ejecuta en CMD:

```batch
netstat -ano | findstr :3306
```

**Solución:** Si muestra algo, otro programa está usando el puerto. Detén ese programa.

### 3. **Permisos Insuficientes**

**Solución:**

- Ejecuta XAMPP Control como Administrador
- Clic derecho → "Ejecutar como administrador"

### 4. **Instalación Corrupta**

**Última opción:** Reinstala XAMPP

- Descarga: <https://www.apachefriends.org/download.html>
- Desinstala XAMPP actual primero
- Instala la versión nueva

---

## 📋 PLAN DE ACCIÓN RECOMENDADO

### AHORA (Solución Inmediata)

1. ✅ **Usa el script de reparación**: `REPARAR_MYSQL.bat`
2. ✅ Sigue las instrucciones paso a paso
3. ⏳ Si se repara, MySQL funcionará normalmente

### SI NO SE REPARA (Alternativa Temporal)

1. 📝 Modifica `server/.env` para usar JSON
2. 🔄 Reinicia el servidor
3. ✅ La aplicación funcionará con archivos JSON
4. 🔧 Repara MySQL con calma cuando tengas tiempo

### PERMANENTE (Recomendado)

1. 🆕 Reinstala XAMPP completo
2. 🗄️ Vuelve a usar MySQL (mejor rendimiento)
3. 📦 Migra los datos de JSON a MySQL si usaste la alternativa

---

## 💡 ¿Cuál es Mejor Para Ti?

### Usa JSON si

- ✅ Tienes menos de 30 alumnos
- ✅ Pocos usuarios simultáneos (1-5)
- ✅ Necesitas que funcione YA
- ✅ No quieres complicarte con MySQL

### Usa MySQL si

- ✅ Tienes muchos alumnos (50+)
- ✅ Varios usuarios simultáneos (10+)
- ✅ Quieres mejor rendimiento
- ✅ Necesitas respaldos automáticos avanzados

---

## 🎯 DECISIÓN RÁPIDA

**¿Qué hacer AHORA?**

1. **Ejecuta:** `REPARAR_MYSQL.bat`
2. **Espera:** 2-3 minutos
3. **Si funciona:** ✅ Continúa usando MySQL
4. **Si falla:** 📝 Usa JSON temporalmente (siguiente sección)

---

## 📝 CÓMO USAR JSON (Implementación Detallada)

Si decides usar JSON mientras reparas MySQL:

### PASO 1: Verifica que existe database.json

El archivo ya debería existir en: `server/database.json`

### PASO 2: Actualiza server.js para usar JSON

Busca en `server/server.js` la sección de inicialización de BD y asegúrate de que tenga un fallback a JSON.

### PASO 3: Reinicia el servidor

```batch
.\INICIAR_SERVIDOR_INTERNET.bat
```

El servidor usará `database.json` automáticamente si MySQL no está disponible.

---

## 📞 ¿Necesitas Ayuda?

**Email:** <miguelroman02@gmail.com>

Incluye:

- Captura del error completo de XAMPP
- Resultado del script `REPARAR_MYSQL.bat`
- Versión de Windows que usas

---

**Última actualización:** 2026-01-21  
**Sistema:** Sirila - Primaria Jaime Nuno
