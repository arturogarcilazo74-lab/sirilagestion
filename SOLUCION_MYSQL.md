# ⚠️ SOLUCIÓN: MySQL No Guarda Datos

## Problema

El servidor Sirila funciona pero los datos NO se guardan porque MySQL no está corriendo.

## ✅ Solución Rápida (3 Pasos)

### PASO 1: Inicia MySQL

Haz **doble clic** en el archivo:

```
INICIAR_MYSQL.bat
```

El script buscará e iniciará MySQL automáticamente.

---

### PASO 2: Verifica que MySQL esté corriendo

**Opción A - Panel de Control XAMPP:**

1. Abre el Panel de Control de XAMPP
2. Busca la línea que dice "MySQL"
3. Debe estar en **verde** y decir "Running"
4. Si no está verde, haz clic en el botón **"Start"** junto a MySQL

**Opción B - Ventana del Script:**
El script `INICIAR_MYSQL.bat` te dirá si MySQL está corriendo:

- ✅ `[EXITO] MySQL esta corriendo!` → Todo bien
- ❌ `[ADVERTENCIA]` → Sigue las instrucciones en pantalla

---

### PASO 3: Reinicia el Servidor Sirila

1. **Cierra** la ventana del servidor actual (si está abierta)
2. Haz doble clic en: `INICIAR_SERVIDOR_INTERNET.bat`
3. Ahora debería decir: `[OK] MySQL esta corriendo correctamente!`

---

## 🔍 ¿Cómo Sé que Funciona?

Cuando MySQL está corriendo correctamente verás:

```
[PASO 2] Verificando MySQL/Base de Datos...
Comprobando si MySQL esta corriendo (Puerto 3306)...
[OK] MySQL esta corriendo correctamente!
```

---

## 🛠️ Si No Tienes XAMPP Instalado

### Descarga e Instala XAMPP

1. **Descarga** desde: <https://www.apachefriends.org/download.html>
   - Elige la versión para Windows
   - Tamaño: ~150 MB

2. **Instala**:
   - Ejecuta el instalador
   - Solo necesitas marcar: **MySQL** (Apache es opcional)
   - Ruta recomendada: `C:\xampp`

3. **Inicia XAMPP**:
   - Abre el "Panel de Control de XAMPP"
   - Haz clic en "Start" junto a MySQL
   - Espera a que se ponga verde

4. **Listo**: Ahora ejecuta `INICIAR_MYSQL.bat` y luego `INICIAR_SERVIDOR_INTERNET.bat`

---

## 📋 Alternativa: MySQL como Servicio Windows

Si instalaste MySQL como servicio de Windows (no XAMPP):

1. Presiona **Windows + R**
2. Escribe: `services.msc`
3. Busca "MySQL" o "MySQL80"
4. Clic derecho → **Iniciar**

---

## ⚙️ Configuración Permanente

Para que MySQL inicie automáticamente al encender la PC:

### En XAMPP

1. Abre el Panel de Control de XAMPP
2. Haz clic en "Config" (esquina superior derecha)
3. Marca: ✅ "Autostart of modules: MySQL"
4. Guarda

### En MySQL Servicio

1. Abre `services.msc`
2. Busca "MySQL"
3. Doble clic → Tipo de inicio: **Automático**
4. Aplica

---

## 🔴 Errores Comunes

### Error: "Puerto 3306 ocupado"

**Causa**: Otro programa está usando el puerto de MySQL.

**Solución**:

1. Abre el Administrador de Tareas (Ctrl+Shift+Esc)
2. Busca procesos llamados "mysqld.exe" o "mysql"
3. Termina esos procesos
4. Vuelve a ejecutar `INICIAR_MYSQL.bat`

### Error: "Access denied for user 'root'"

**Causa**: La contraseña de MySQL no coincide.

**Solución**:

1. Abre: `server\.env`
2. Verifica que diga:

   ```
   DB_USER=root
   DB_PASSWORD=
   ```

3. Si tu MySQL tiene contraseña, ponla en `DB_PASSWORD=tucontraseña`

### Error: "Can't connect to MySQL server"

**Causa**: MySQL no está corriendo o bloqueado por firewall.

**Solución**:

1. Verifica que MySQL esté verde en XAMPP
2. Desactiva temporalmente el antivirus/firewall
3. Ejecuta XAMPP como Administrador

---

## 📞 ¿Sigues con Problemas?

Si después de seguir todos los pasos MySQL no inicia:

1. Toma una captura de pantalla del error
2. Envía un email a: <miguelroman02@gmail.com>
3. Incluye:
   - Captura del Panel de XAMPP
   - Captura del error en la ventana del servidor
   - Versión de Windows que usas

---

## 📝 Resumen de Archivos

- **`INICIAR_MYSQL.bat`** → Inicia MySQL automáticamente
- **`INICIAR_SERVIDOR_INTERNET.bat`** → Inicia el servidor con verificación de MySQL
- **`server\.env`** → Configuración de conexión a la base de datos
- Este archivo → Guía de solución de problemas

---

**Última actualización**: 2026-01-21  
**Sistema**: Sirila - Primaria Jaime Nuno
