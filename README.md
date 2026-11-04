# 🎓 Sistema de Gestión Escolar SIRILA

Plataforma integral de gestión escolar (React + Vite + Express + MySQL) para dirección, docentes, familias y alumnos. Funciona como PWA offline-first y también como aplicación de escritorio (Electron).

## 🚀 Despliegue en producción

> **Regla del proyecto:** Hostinger sirve el frontend desde `dist-app`, el artefacto ya compilado que vive en el repositorio (`server/server.js` → `express.static`). Por eso **el código fuente y `dist-app` deben viajar en el mismo push**. Si se publica sin recompilar, producción sigue mostrando el código anterior.

Para desplegar de forma segura, un solo comando:

```bash
npm run deploy -- "descripción del cambio"
```

Ese comando:

1. Verifica que estés en `main` y sin merges a medias.
2. Comprueba los tipos con `tsc`.
3. Compila el frontend de forma **atómica** hacia `dist-app` (si la compilación falla, `dist-app` queda intacto).
4. Commitea el código fuente y, por separado, el artefacto regenerado.
5. Empuja a `origin/main`, que dispara el despliegue de Hostinger.

Además, el hook `pre-push` (versionado en `.githooks/`) recompila antes de cada push y **bloquea** el envío si `dist-app` no corresponde al código fuente, indicando qué ejecutar.

### Comandos de despliegue

| Comando | Para qué sirve |
|---|---|
| `npm run deploy -- "mensaje"` | Compila, commitea y publica en un paso |
| `npm run deploy -- "mensaje" --no-push` | Prepara los commits sin publicar |
| `npm run deploy:check` | Solo verifica si `dist-app` está al día |
| `npm run deploy -- "mensaje" --dry-run` | Muestra lo que haría, sin tocar git |

## 💻 Desarrollo local

Requisitos: **Node.js 22.12+** y acceso a MySQL (o dejar que el servidor caiga al almacenamiento JSON local).

```bash
npm install          # también activa los hooks de git
npm run dev          # frontend en http://localhost:5173
npm start            # backend en http://localhost:3001
```

`npm run dev` hace proxy de `/api` y `/sirila-v1` hacia el backend en el puerto 3001.

Configuración del backend mediante `server/.env` (no versionado; usa `server/.env.production.template` como base). Sin ese archivo, el servidor intenta MySQL en `localhost` y, si no está disponible, arranca con `server/database.json` vacío.

## 🧱 Stack

- **Frontend:** React 18, TypeScript, Vite 5, Tailwind CSS, `lucide-react`, Recharts.
- **Estado y persistencia:** Zustand con IndexedDB para trabajo offline.
- **Documentos:** `jspdf` + `jspdf-autotable`.
- **Backend:** Express 5 (`server/server.js`) con MySQL (`mysql2`) y respaldo automático a JSON.
- **PWA:** Workbox con estrategia `NetworkFirst` para la API.
- **Escritorio:** Electron (`npm run electron:dev`).

## 📁 Estructura

```
components/        Vistas de la interfaz (dirección, docentes, familias, USAER, CTE…)
services/          API, IA, generación de PDF, calendario escolar, métricas
hooks/             Estado global (Zustand)
server/            API Express, esquema MySQL y utilidades de datos
tools/scripts/     Automatización: build atómico, despliegue, hooks
dist-app/          Artefacto compilado que se publica (generado, no editar)
docs/              Guías operativas
```

## 📚 Documentación

- **[ESTADO_PROYECTO.md](ESTADO_PROYECTO.md)** — Arquitectura, módulos clave y bitácora de cambios.
- **[docs/GUIA_NUBE_Y_RESPALDOS.md](docs/GUIA_NUBE_Y_RESPALDOS.md)** — Despliegue en la nube y respaldos.
- **[docs/GUIA_CONEXION_MOVIL.md](docs/GUIA_CONEXION_MOVIL.md)** — Acceso desde celulares en la red local.
- **[docs/RECUPERAR_DATOS.md](docs/RECUPERAR_DATOS.md)** — Recuperación de datos.

## 📞 Soporte

**Email**: <miguelroman02@gmail.com>
**Directora**: Nancy Carolina Jasso Vergara
**Teléfonos**: 6873663875 / 6677552026

---

**Desarrollado por Sistemas Sirila** © 2026
