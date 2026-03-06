# Guía de Conexión Móvil y Sincronización

Esta guía te explica cómo usar Sirila Gestión Escolar desde tu teléfono móvil o tableta, tanto en la red local como a través de internet.

## Opcion 1: Conexión Local (Wi-Fi) - Recomendada para Velocidad

Esta opción es la más rápida pero requiere que tanto tu computadora (Servidor) como tu celular estén conectados a la **misma red Wi-Fi**.

1. **En tu Computadora (Servidor):**
   - Asegúrate de que el programa principal está abierto (la ventana negra que dice "Sirila Gestion").
   - Es recomendable usar el archivo **"VER_IP_Y_URL_MOVIL.bat"** que acabo de crear para ti para ver tu dirección exacta.
   - Si prefieres hacerlo manual: abre una terminal (CMD), escribe `ipconfig` y busca "Dirección IPv4".

2. **En tu Celular:**
   - Asegúrate de estar conectado al **mismo Wi-Fi** que la computadora.
   - Abre el navegador (Chrome o Safari).
   - Escribe la IP de tu PC seguida de `:3001`.
   - Ejemplo: `http://192.168.1.65:3001`
   - ¡Listo! Deberías ver la aplicación. (Nota: El puerto 5173 es solo para modo programador, usa el 3001 para el uso diario).

## Opción 2: Conexión por Internet - Para Acceso Remoto

Si necesitas salir de la escuela y seguir accediendo, o usar datos móviles (4G/5G).

1. **En tu Computadora (Servidor):**
   - Ejecuta el archivo `compartir_internet.bat` que está en el Escritorio.
   - Espera a que genere un enlace (Link). Puede tardar unos segundos.
   - El sistema intentará usar servicios como **Serveo** o **LocalTunnel**.
   - Copia el enlace que te dé el sistema (Ejemplo: `https://escuela-sirila.serveo.net`).

2. **En tu Celular:**
   - Abre ese enlace en tu navegador.
   - **Nota:** La computadora principal debe permanecer encendida y con el programa abierto para que esto funcione.

---

## Preguntas Frecuentes sobre Sincronización

**¿Puedo usar la App sin internet (Offline)?**
Actualmente, la aplicación requiere conexión constante con el servidor (tu computadora principal).

- Si usas la **Opción 1 (Local)**, funcionará mientras el Wi-Fi esté activo, aunque no haya internet externo.
- Si usas la **Opción 2 (Internet)**, necesitas datos móviles.

**¿Qué pasa si se va el internet?**

- **En Red Local (Wi-Fi):** Si se va el internet pero el módem sigue encendido, **puedes seguir trabajando** sin problemas, ya que la conexión es directa entre tu celular y la PC, sin salir a la nube.
- **En Acceso Remoto:** Perderás la conexión y no podrás guardar cambios hasta que regrese la señal.

**¿Se sincronizan los datos automáticamente?**
Sí. Como todos los dispositivos (celulares, tabletas) se conectan a la **Misma Computadora Central**, cualquier cambio que hagas en el celular (ej. pasar lista) se guarda inmediatamente en la base de datos de la computadora. No necesitas presionar ningún botón especial de "Sincronizar" a menos que uses la función de respaldo manual.
