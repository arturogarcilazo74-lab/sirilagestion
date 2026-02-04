# 🔧 Guía de Reparación de MySQL

## Estado Actual

❌ **MySQL NO está ejecutándose en tu sistema**

## Opciones de Solución

### ⚡ OPCIÓN 1: Iniciar MySQL (Recomendado para uso avanzado)

#### Métodos para iniciar MySQL

##### A) Usando el script automático (Más fácil)

1. Abre el archivo `server/repair_mysql.bat` haciendo doble clic
2. Sigue las instrucciones en pantalla
3. XAMPP Control Panel se abrirá automáticamente
4. Haz clic en el botón **"Start"** junto a MySQL
5. Espera a que el indicador se ponga verde

##### B) Manual (Si el script no funciona)

1. Busca "XAMPP Control Panel" en el menú Inicio de Windows
2. Haz clic derecho y selecciona **"Ejecutar como administrador"**
3. En el panel, busca la fila de **MySQL**
4. Haz clic en el botón **"Start"**
5. Espera a que el indicador se ponga verde

#### ¿No tienes XAMPP instalado?

1. Descarga XAMPP desde: <https://www.apachefriends.org/download.html>
2. Durante la instalación, asegúrate de seleccionar **MySQL**
3. Una vez instalado, sigue los pasos anteriores

#### Problemas comunes al iniciar MySQL

##### ❌ Error: "Puerto 3306 ya está en uso"

**Solución:**

```bash
# Ejecuta en PowerShell como Administrador:
netstat -ano | findstr :3306
# Anota el PID (número al final)
# Luego cierra el proceso:
taskkill /PID [número_del_pid] /F
```

##### ❌ Error: "Error de permisos"

**Solución:** Ejecuta XAMPP Control Panel como Administrador

##### ❌ MySQL se inicia pero se detiene inmediatamente

**Posibles causas:**

- Archivos de datos corruptos
- Configuración incorrecta en `my.ini`

**Solución:**

1. Abre XAMPP Control Panel
2. Haz clic en "Logs" junto a MySQL
3. Lee el último error
4. Si dice algo sobre "ibdata" o "aria", considera:
   - Hacer backup de `C:\xampp\mysql\data`
   - Reinstalar XAMPP

---

### 📁 OPCIÓN 2: Usar Almacenamiento JSON (Más simple)

**Tu servidor ya está configurado para usar JSON automáticamente si MySQL no está disponible.**

#### Ventajas

✅ No requiere instalar ni configurar MySQL
✅ Funciona inmediatamente
✅ Datos guardados en `server/database.json`
✅ Fácil de respaldar (solo copiar el archivo JSON)

#### Desventajas

⚠️ Menos eficiente con muchos datos
⚠️ No es ideal para múltiples usuarios simultáneos
⚠️ Búsquedas más lentas

#### ¿Cómo usar esta opción?

**¡No necesitas hacer nada!** Si MySQL no está disponible, el servidor usará JSON automáticamente.

---

## Verificar si MySQL está funcionando

### Método 1: Usar el script de diagnóstico

```bash
cd server
node check_mysql.js
```

### Método 2: Verificar manualmente

1. Abre PowerShell
2. Ejecuta:

```powershell
tasklist /FI "IMAGENAME eq mysqld.exe"
```

3. Si aparece "mysqld.exe", MySQL está corriendo
2. Si dice "no hay tareas", MySQL NO está corriendo

---

## Iniciar tu servidor

Una vez que MySQL esté funcionando (o decidas usar JSON):

```bash
npm run dev
```

El servidor automáticamente:

- ✅ Detectará si MySQL está disponible
- ✅ Usará MySQL si está disponible
- ✅ Usará JSON como respaldo si MySQL no está disponible
- ✅ Te mostrará en los logs qué sistema de almacenamiento está usando

---

## Logs del Servidor

Cuando inicies el servidor, verás uno de estos mensajes:

### Si MySQL está funcionando

```
✅ MySQL connected successfully!
📊 Using MySQL for data storage
```

### Si MySQL no está disponible

```
⚠️  MySQL not available: [mensaje de error]
📁 FALLBACK: Using JSON file storage (database.json)
```

---

## Archivos Importantes

- `server/.env` - Configuración de MySQL
- `server/database.json` - Almacenamiento JSON de respaldo
- `server/check_mysql.js` - Script de diagnóstico
- `server/repair_mysql.bat` - Script de reparación
- `server/db.js` - Lógica de conexión a MySQL
- `server/schema.sql` - Estructura de la base de datos

---

## Recomendaciones

### Para desarrollo personal

💡 Usa **JSON** (no necesitas hacer nada, ya está configurado)

### Para producción o muchos usuarios

💡 Usa **MySQL** (sigue la Opción 1 para iniciarlo)

---

## Migrar datos entre JSON y MySQL

### De JSON a MySQL

```bash
cd server
node migrar_mysql_a_json.js --reverse
```

### De MySQL a JSON

```bash
cd server
node migrar_mysql_a_json.js
```

---

## ¿Necesitas ayuda?

Si ninguna de estas soluciones funciona:

1. Toma captura de pantalla del error
2. Revisa los logs en XAMPP Control Panel → Logs (junto a MySQL)
3. Verifica el archivo `server/.env` tiene los valores correctos:

   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=sirilagestion
   PORT=3001
   ```
