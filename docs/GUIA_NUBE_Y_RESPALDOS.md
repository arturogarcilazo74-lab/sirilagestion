# 🚀 Guía de Migración a la Nube (Aiven + Render)

Esta guía te permitirá subir SirilaGestion a internet para que funcione 24/7 sin pedirte tarjeta de crédito.

## 1. La Base de Datos (Ya la tienes en Aiven)

Tus credenciales de Aiven son:

- **Host**: `(Ver en Aiven Console)`
- **Port**: `24668`
- **User**: `avnadmin`
- **Password**: `(Disponible en el archivo server/.env local)`
- **Database**: `defaultdb`

## 2. Subir tus datos actuales a la Nube

Antes de usar el celular, debemos enviar tus alumnos a Aiven:

1. Asegúrate de que **MySQL esté en VERDE** en tu XAMPP local.
2. Ejecuta el archivo: **`SUBIR_A_LA_NUBE.bat`** en tu carpeta de Sirila.
3. Espera a que diga "MIGRACIÓN COMPLETADA".

## 3. Configurar la App en Render.com

Render es gratuito y no pide tarjeta para este tipo de aplicaciones.

1. Ve a [Render.com](https://render.com/) e inicia sesión con GitHub.
2. Haz clic en **"New +"** -> **"Web Service"**.
3. Conecta tu repositorio de GitHub.
4. Configuración:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Selecciona **Free** (Gratis).
5. Ve a la pestaña **Environment** y añade estas variables:
   - `MYSQLHOST`: (Copia el Host de Aiven)
   - `MYSQLPORT`: `24668`
   - `MYSQLUSER`: `avnadmin`
   - `MYSQLPASSWORD`: (Copia el Password de Aiven)
   - `MYSQLDATABASE`: `defaultdb`
   - `NODE_ENV`: `production`

6. Haz clic en **"Create Web Service"**.

## 4. Conectar el Celular

Una vez que Render termine (puede tardar 5-10 min):

1. Copia tu URL de Render (ej: `https://sirila-gestion.onrender.com`).
2. En tu celular, ve a **Configuración** -> **Cambiar URL del Servidor**.
3. Pega la URL y guarda. ¡Listo!

---

## ☁️ Respaldo en Google Drive (Opcional)

Si quieres copias de seguridad extras de tu base de datos local, usa `RESPALDO_GOOGLE_DRIVE.bat`.
