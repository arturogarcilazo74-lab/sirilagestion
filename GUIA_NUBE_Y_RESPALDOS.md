# 🚀 Guía de Migración a la Nube (Railway/Render)

Esta guía te permitirá subir SirilaGestion a internet para que funcione 24/7 sin necesidad de tener tu PC encendida.

## Opción Recomendada: Railway.app

Railway es muy sencillo y ofrece un plan gratuito/económico ideal para bases de datos MySQL.

### Pasos para el Despliegue

1. **Crear Cuenta**: Ve a [Railway.app](https://railway.app/) y crea una cuenta. (Nota: Railway ofrece créditos de prueba gratuitos, pero requiere verificar una tarjeta o cuenta de GitHub para evitar abusos).
2. **Nuevo Proyecto**:
   - Haz clic en **"+ New"** -> **"Database"** -> **"Add MySQL"**.
   - Una vez creada, haz clic en la base de datos MySQL, ve a la pestaña **"Variables"** y copia los valores (o simplemente deja que la app se conecte sola si los pones en el mismo proyecto).
3. **Subir el Código**:
   - Tienes dos opciones:
     a) Conectar tu cuenta de **GitHub** y seleccionar este repositorio (recomendado).
     b) Instalar el **Railway CLI** en tu PC y ejecutar `railway up`.
4. **Configurar Variables de Entorno (IMPORTANTE)**:
   En el panel de Railway de tu **Servidor** (no de la DB), añade estas variables:
   - `PORT`: `3001`
   - `NODE_ENV`: `production`
   - Si usas MySQL de Railway, él las inyectará automáticamente si están en el mismo proyecto. Si no, ponlas manual: `MYSQLHOST`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLPORT`, `MYSQLDATABASE`.
5. **Comando de Construcción**:
   Railway leerá tu `package.json`. Asegúrate de que el comando de instalación sea `npm install` y el de inicio `npm start`.

---

## ☁️ Uso de Google Drive (Respaldo)

Si prefieres seguir usando tu PC pero quieres seguridad en la nube:

1. **Instala Google Drive para Escritorio**: [Descárgalo aquí](https://www.google.com/intl/es/drive/download/).
2. **Ejecuta `RESPALDO_GOOGLE_DRIVE.bat`**: He creado este archivo en tu carpeta de Sirila.
3. **¿Qué hace?**:
   - Copia tu base de datos actual a tu carpeta de Google Drive.
   - Crea una copia con fecha (ej. `database_backup_2024-02-04.json`) para que nunca pierdas nada accidentalmente.
   - Puedes programar este archivo para que se ejecute solo al apagar la PC.

---

## 📱 Conectar el Celular a la Nube

Una vez que tu servidor esté en Railway (ej. `sirila-production.up.railway.app`):

1. Abre la App en tu celular.
2. Ve a **Configuración** -> **Cambiar URL del Servidor**.
3. Escribe tu nueva dirección de Railway.
4. Presiona **Guardar y Recargar**.
5. ¡Ahora tu celular se conectará directamente a internet!
