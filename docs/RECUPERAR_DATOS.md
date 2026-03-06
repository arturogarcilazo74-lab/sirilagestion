# 💾 GUÍA DE RECUPERACIÓN DE DATOS

## 🎯 Situación Actual

Tu archivo `database.json` está vacío, pero tus datos pueden estar en uno de estos lugares:

1. **MySQL** (si estaba funcionando antes)
2. **Archivos de backup** en la carpeta server
3. **Backup de MySQL** en carpetas de XAMPP

---

## ✅ OPCIÓN 1: Recuperar desde MySQL (Si MySQL funcionaba antes)

### Paso 1: Iniciar MySQL

1. Abre XAMPP Control Panel
2. Haz clic en "Start" junto a MySQL
3. **Si MySQL se cierra inmediatamente:**
   - Ejecuta `server/clear_mysql_logs.bat`
   - Intenta iniciar MySQL de nuevo

### Paso 2: Exportar datos de MySQL a JSON

Una vez que MySQL esté corriendo:

```bash
cd server
node migrar_mysql_a_json.js
```

Este script:

- Se conectará a MySQL
- Extraerá TODOS tus datos (estudiantes, tareas, eventos, etc.)
- Los guardará en `database.json`
- Creará un backup del archivo anterior

### Paso 3: Verificar y reiniciar

```bash
# Verifica que database.json tenga datos
# Luego reinicia tu servidor
npm run dev
```

---

## ✅ OPCIÓN 2: Buscar archivos de backup

### Ubicaciones posibles de backups

#### A) En la carpeta `server`

```
server/database.backup.*.json
server/database*.json
```

#### B) Backups de XAMPP MySQL

```
C:\xampp\mysql\data_backup*\sirilagestion\
```

### Cómo restaurar desde un backup

1. **Si encuentras un archivo `database.backup.XXXX.json`:**

   ```bash
   # En la carpeta server
   copy database.backup.XXXX.json database.json
   ```

2. **Si encuentras datos en un backup de MySQL:**
   - Necesitarás importar esos datos de vuelta a MySQL
   - Luego usar la OPCIÓN 1

---

## ✅ OPCIÓN 3: Recuperar desde backup de MySQL manualmente

Si tienes carpetas de backup en `C:\xampp\mysql\`:

### Paso 1: Localizar el backup

```
C:\xampp\mysql\data_backup_FECHA\
```

### Paso 2: Restaurar la carpeta de base de datos

1. Detén MySQL en XAMPP
2. Copia la carpeta `sirilagestion` del backup
3. Pégala en: `C:\xampp\mysql\data\`
4. Reemplaza si existe
5. Inicia MySQL
6. Ejecuta: `node server/migrar_mysql_a_json.js`

---

## 🔍 Script de Diagnóstico

Para saber dónde están tus datos:

```bash
cd server
node recuperar_datos.js
```

Este script te dirá:

- ✅ Si hay datos en MySQL
- ✅ Si hay archivos de backup
- ✅ Dónde buscar tus datos
- ✅ Qué hacer para recuperarlos

---

## 🆘 SOLUCIÓN PASO A PASO RECOMENDADA

### Para recuperar tus datos AHORA

**1. Primero, ejecuta el diagnóstico:**

```bash
cd server
node recuperar_datos.js
```

**2. Si dice "HAY DATOS EN MYSQL":**

```bash
# Asegúrate de que MySQL esté corriendo en XAMPP
# Luego:
node migrar_mysql_a_json.js
```

**3. Si dice "No hay datos en MySQL":**

- Busca archivos `database.backup.*.json` en la carpeta `server`
- O busca carpetas `data_backup*` en `C:\xampp\mysql\`

**4. Si encuentras un backup JSON:**

```bash
# En PowerShell, dentro de la carpeta server:
copy database.backup.XXXXXXXXX.json database.json
```

**5. Reinicia el servidor:**

```bash
npm run dev
```

---

## 📋 Checklist de Recuperación

Marca lo que has intentado:

- [ ] Ejecuté `node recuperar_datos.js` para diagnóstico
- [ ] Revisé si MySQL tiene datos
- [ ] Busqué archivos `database.backup.*.json` en `server/`
- [ ] Busqué carpetas de backup en `C:\xampp\mysql\`
- [ ] Ejecuté `node migrar_mysql_a_json.js` (si MySQL funciona)
- [ ] Restauré desde un archivo de backup
- [ ] Reinicié el servidor con `npm run dev`

---

## ❓ Preguntas Frecuentes

### ¿Cuándo se crearon los backups?

- Cada vez que ejecutaste `clear_mysql_logs.bat`
- Cada vez que se exportó MySQL a JSON
- Cuando el servidor migró datos

### ¿Qué datos se pueden recuperar?

- Estudiantes
- Tareas y asignaciones
- Eventos del calendario
- Registros de comportamiento
- Eventos financieros
- Configuración escolar
- Tareas del personal

### ¿Perderé datos al exportar MySQL a JSON?

No. El script de exportación:

- Hace backup del `database.json` actual
- Luego guarda los nuevos datos
- Los datos en MySQL no se eliminan

---

## 🎯 SIGUIENTE PASO INMEDIATO

**Ejecuta esto AHORA para saber dónde están tus datos:**

```bash
cd server
node recuperar_datos.js
```

El script te dirá exactamente qué hacer según lo que encuentre.
