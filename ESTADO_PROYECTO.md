# Estado Actual del Proyecto: Sirila Gestión

Este documento sirve como referencia rápida sobre el estado actual del sistema, su arquitectura, y los últimos cambios realizados. Su propósito es facilitar la integración y guiar futuras modificaciones.

---

## 1. Stack Tecnológico y Arquitectura
- **Frontend**: React (con TypeScript) montado sobre Vite.
- **Estilos**: Tailwind CSS con iconos de `lucide-react`.
- **Manejo de Estado / Persistencia**: Zustand (`useAppStore.ts`) con sincronización offline usando `idb` (IndexedDB).
- **Generación de PDFs**: `jspdf` y `jspdf-autotable` (ver `services/pdfGenerator.ts`).
- **Backend / API**: Servidor Express en Node.js (`server/server.js`) con conexión a una base de datos **MySQL** en Aiven.
- **PWA**: La aplicación está configurada para funcionar como una PWA offline-first mediante Workbox (`vite.config.ts`).

---

## 2. Módulos y Archivos Clave
Si necesitas hacer modificaciones, aquí es donde debes buscar:

- **Panel Administrativo (Dirección)**: `components/DirectorView.tsx`
  - Contiene las pestañas de resumen ejecutivo, estadísticas de matrícula, personal activo, finanzas generales, rotación de guardias y generación de documentos/listas.
- **Gestión Financiera**: `components/FinanceView.tsx`
  - Manejo del estatus de la Cuota Anual (`PAGADO`, `PARCIAL` o `PENDIENTE`) y aportaciones para eventos especiales.
- **Gestión de Alumnos**: `components/StudentsView.tsx`
  - Consulta de expedientes, registro de promedios, incidencias de conducta e indicadores de riesgo.
- **Generación de Documentos y Reportes**: `services/pdfGenerator.ts`
  - Lógica central para crear Constancias, Citatorios, Actas, Permisos Económicos, PEMC, Reportes Financieros y Listas Grupales.
- **Sincronización e Interfaz de Base de Datos**: 
  - `server/server.js`: Rutas de la API (ej. `/sirila-v1/sync`).
  - `services/api.ts`: Cliente de comunicación del frontend al backend.
- **Menú y Navegación**: `components/Sidebar.tsx` y `components/MobileLayout.tsx`.

---

## 3. Últimas Modificaciones Críticas (Agosto 2026)
Durante las últimas actualizaciones, se implementaron las siguientes mejoras importantes que debes tener en cuenta:

1. **Migración de Ciclo Seguro (2026-2027)**: 
   - Se crearon scripts (`tools/migrate_2026_2027.js`) para migrar la base de datos de ciclo de manera segura, con verificaciones de *idempotencia* para evitar dobles migraciones.
2. **Rotación de Guardias Equitativa**:
   - Se reescribió la lógica en `DirectorView.tsx` para combinar maestros regulares y de especialidad (Inglés/Educación Física) en una sola lista rotativa justa que asegura cobertura total sin desbalanceos.
3. **Finanzas - Abonos y Recaudación Total**:
   - **Listas y Reportes (`pdfGenerator.ts`)**: Se corrigió el error donde los pagos parciales se marcaban como "PENDIENTE"; ahora se muestran como **"ABONO $X"**.
   - **Resumen Ejecutivo (`DirectorView.tsx`)**: El cálculo de la recaudación total suma correctamente los abonos parciales y evita duplicar a familias con más de un hermano.
4. **Generador del PEMC**:
   - Se añadió la opción de generar el **Programa Escolar de Mejora Continua (PEMC)** dentro del portal directivo.
5. **Limpieza de Interfaz**:
   - Se eliminó de la barra lateral la sección de "Juegos CTE".

---

## 4. Guía Rápida para Nuevas Modificaciones

- **Al Modificar la UI**: Recuerda que la aplicación está hecha con Tailwind. Si modificas componentes visuales en `components/`, debes recompilar para producción corriendo `npm run build` antes de subir los cambios al repositorio, ya que el servidor lee los estáticos de la carpeta `dist-app/`.
- **Al Agregar Nuevos Datos al Estado**: Si añades un nuevo tipo de dato al alumno o al staff, debes asegurarte de registrarlo tanto en la interfaz de Typescript (`types.ts`) como en el almacenamiento de Zustand (`useAppStore.ts`).
- **Evitar Efecto Fantasma (Ghosting)**: El backend incluye un control de versiones de estado (`lastUpdate`) y una validación estricta de reinicio de ciclo en `server/server.js` (`/sirila-v1/sync`). Si modificas la forma en que los datos se guardan, asegúrate de no alterar el `storeVersion` a menos que sea estrictamente necesario.
- **Despliegue**: Para desplegar un cambio en el hosting en línea, basta con correr los siguientes comandos:
  ```bash
  npm run build
  git add .
  git commit -m "Descripción de los cambios"
  git push
  ```

---
*Documento generado de manera automatizada para preservar el contexto de desarrollo.*
