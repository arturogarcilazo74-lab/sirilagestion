# 🔴 MySQL se cierra inesperadamente - SOLUCIÓN

## 🎯 Error específico

```
Error: MySQL shutdown unexpectedly.
This may be due to a blocked port, missing dependencies, 
improper privileges, a crash, or a shutdown by another method.
```

## 🔍 PASO 1: Revisar los logs de MySQL

Esto es CRÍTICO para saber qué está pasando exactamente.

### En XAMPP Control Panel

1. Haz clic en el botón **"Logs"** (junto a MySQL)
2. Se abrirá un archivo de texto con errores
3. Ve hasta el FINAL del archivo
4. Busca líneas que digan **"ERROR"** o **"Fatal"**

### Ubicación manual de logs

```
C:\xampp\mysql\data\mysql_error.log
```

---

## ✅ SOLUCIONES según el error en los logs

### 🔧 SOLUCIÓN 1: Puerto 3306 ocupado

**Si el log dice:** `Can't start server: Bind on TCP/IP port: Address already in use`

#### Opción A: Cerrar el proceso que está usando el puerto

```powershell
# Abre PowerShell como Administrador y ejecuta:
netstat -ano | findstr :3306

# Verás algo como:
# TCP    0.0.0.0:3306    0.0.0.0:0    LISTENING    1234

# Anota el número al final (PID) y ejecútalo:
taskkill /PID 1234 /F

# Luego intenta iniciar MySQL de nuevo en XAMPP
```

#### Opción B: Cambiar el puerto de MySQL

1. En XAMPP, haz clic en **"Config"** (junto a MySQL)
2. Selecciona **"my.ini"**
3. Busca la línea: `port=3306`
4. Cámbiala a: `port=3307`
5. Guarda el archivo
6. Actualiza `server/.env` también:

   ```
   DB_PORT=3307
   ```

7. Intenta iniciar MySQL de nuevo

---

### 🔧 SOLUCIÓN 2: Archivos de log corruptos

**Si el log dice:** `aria_chk`, `ibdata`, o mensajes sobre tablas corruptas

#### Pasos de reparación

1. **Asegúrate de que MySQL esté DETENIDO** en XAMPP
2. **Haz BACKUP de la carpeta de datos:**

   ```
   Copia C:\xampp\mysql\data
   Pega en C:\xampp\mysql\data_backup_[fecha]
   ```

3. **Elimina los archivos de log problemáticos:**

   ```
   C:\xampp\mysql\data\ib_logfile0
   C:\xampp\mysql\data\ib_logfile1
   C:\xampp\mysql\data\aria_log_control
   C:\xampp\mysql\data\aria_log.00000001
   ```

   ⚠️ **IMPORTANTE:** Solo elimina estos archivos, NO elimines las carpetas de bases de datos

4. **Inicia MySQL de nuevo** en XAMPP

---

### 🔧 SOLUCIÓN 3: Permisos incorrectos

**Si el log dice:** `Permission denied` o `Access is denied`

#### Solución

1. Cierra XAMPP completamente
2. Haz clic derecho en **"XAMPP Control Panel"**
3. Selecciona **"Ejecutar como administrador"**
4. Intenta iniciar MySQL de nuevo

---

### 🔧 SOLUCIÓN 4: Archivos de datos corruptos

**Si el log dice:** `Table is marked as crashed` o `InnoDB: corrupted`

#### Opción A: Reparación automática (Más fácil)

1. Abre PowerShell como Administrador
2. Navega a la carpeta de MySQL:

   ```powershell
   cd C:\xampp\mysql\bin
   ```

3. Ejecuta el comando de reparación:

   ```powershell
   .\myisamchk.exe -r C:\xampp\mysql\data\*\*.MYI
   ```

#### Opción B: Reparación manual

1. Haz BACKUP completo de: `C:\xampp\mysql\data`
2. Detén MySQL (si está corriendo)
3. Elimina estos archivos:

   ```
   C:\xampp\mysql\data\ibdata1
   C:\xampp\mysql\data\ib_logfile0
   C:\xampp\mysql\data\ib_logfile1
   ```

4. **IMPORTANTE:** Esto recreará las tablas del sistema, pero perderás los datos de bases de datos InnoDB
5. Inicia MySQL de nuevo

---

### 🔧 SOLUCIÓN 5: Otro servicio MySQL instalado

Si tienes otro MySQL instalado en Windows:

```powershell
# Abre PowerShell como Administrador
Get-Service | Where-Object {$_.Name -like "*mysql*"}

# Si ves otros servicios MySQL, deténlos:
Stop-Service -Name "MySQL80" -Force
# (Reemplaza "MySQL80" con el nombre que aparezca)
```

---

## 🚀 SOLUCIÓN RÁPIDA (Si nada más funciona)

### Reinstalar MySQL en XAMPP

1. **Backup de datos:**

   ```
   Copia C:\xampp\mysql\data a otra ubicación
   ```

2. **Desinstala MySQL de XAMPP:**

   ```
   Elimina la carpeta: C:\xampp\mysql
   ```

3. **Descarga XAMPP de nuevo** y solo instala el componente MySQL

4. **Restaura las carpetas de bases de datos** (no los archivos ib*ni aria*)

---

## 💡 ALTERNATIVA: Usar JSON (RECOMENDADO si tienes prisa)

Si necesitas que tu aplicación funcione YA y resolver MySQL después:

1. **No hagas nada más con MySQL**
2. **Simplemente ejecuta tu servidor:**

   ```bash
   npm run dev
   ```

3. El servidor detectará que MySQL no está disponible
4. Usará automáticamente `database.json`
5. **Todo funcionará igual**, solo usará archivos en vez de MySQL

---

## 📋 Checklist de diagnóstico

Marca lo que has intentado:

- [ ] Revisar logs de MySQL (`C:\xampp\mysql\data\mysql_error.log`)
- [ ] Verificar que el puerto 3306 no esté ocupado
- [ ] Ejecutar XAMPP como Administrador
- [ ] Eliminar archivos de log de InnoDB
- [ ] Hacer backup de datos
- [ ] Cambiar puerto de MySQL
- [ ] Verificar que no haya otro MySQL instalado
- [ ] Usar la alternativa JSON (mientras arreglas MySQL)

---

## 🆘 Si nada funciona

1. **Copia el ÚLTIMO ERROR del log** (`C:\xampp\mysql\data\mysql_error.log`)
2. **Usa la alternativa JSON** para que tu app funcione mientras tanto
3. **Busca el error específico** en Google o foros de XAMPP

Recuerda: **Tu aplicación puede funcionar perfectamente con JSON** mientras resuelves esto.
