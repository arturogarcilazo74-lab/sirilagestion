# Estado Actual del Proyecto: Sirila Gestión

Este documento sirve como referencia rápida sobre el estado actual del sistema, su arquitectura, y los últimos cambios realizados. Su propósito es facilitar la integración y guiar futuras modificaciones.

---

## 1. Stack Tecnológico y Arquitectura
- **Frontend**: React (con TypeScript) montado sobre Vite.
- **Estilos**: Tailwind CSS con iconos de `lucide-react`.
- **Manejo de Estado / Persistencia**: Zustand (`useAppStore.ts`) con sincronización offline usando `idb` (IndexedDB).
- **Generación de PDFs**: `jspdf` y `jspdf-autotable` (ver `services/pdfGenerator.ts`).
- **Backend / API**: Servidor Express en Node.js (`server/server.js`) con conexión a base de datos **MySQL** en Hostinger.
- **PWA**: La aplicación está configurada para funcionar como una PWA offline-first mediante Workbox (`vite.config.ts`).
- **Despliegue Continuo**: Integrado con GitHub (`main`). Al hacer `git push origin main`, Hostinger actualiza automáticamente la aplicación en producción.

---

## 2. Módulos y Archivos Clave
Si necesitas hacer modificaciones, aquí es donde debes buscar:

- **Panel Administrativo (Dirección)**: `components/DirectorView.tsx`
  - Contiene las pestañas de resumen ejecutivo, estadísticas de matrícula, personal activo, finanzas generales, rotación de guardias, agenda/calendario institucional y generador de documentos oficiales.
- **Panel de Control (Dashboard)**: `components/DashboardView.tsx`
  - Métricas generales, avisos oficiales, calendario dinámico del ciclo y Cuadro de Honor multidimensional.
- **Gestión de Asistencia**: `components/AttendanceView.tsx`
  - Pase de lista por QR o manual. Valida días hábiles del ciclo contra `services/schoolCalendarUtils.ts`.
- **Gestión de Actividades y Tareas**: `components/ActivitiesView.tsx`
  - Seguimiento de tareas ordinarias y actividades interactivas (cuestionarios, fichas interactivas, juegos HTML). Visualización de calificaciones, control de intentos realizados y modal de desglose por campos formativos NEM.
- **Portal de Familias y Alumnos**: `components/ParentsPortal.tsx`
  - Vista para estudiantes y tutores: visualización y resolución de actividades interactivas con autocalificación, seguimiento de asistencia, avisos escolares y posición en el Cuadro de Honor.
- **Calendario Escolar Oficial**: `services/schoolCalendarUtils.ts`
  - Define los periodos escolares (`SCHOOL_PERIODS`), días inhábiles (`SUSPENSION_DAYS`) y eventos oficiales de la SEP/SEPyC Sinaloa.
- **Cálculo de Promedios y Métricas**: `services/gradeUtils.ts`
  - Función canónica `calculateStudentMetrics`: calcula promedios NEM, porcentaje de avance, calificaciones autocalificables y puntaje ponderado de honor roll.
- **Gestión Financiera**: `components/FinanceView.tsx`
  - Manejo del estatus de la Cuota Anual (`PAGADO`, `PARCIAL` o `PENDIENTE`) y aportaciones para eventos especiales.
- **Gestión de Alumnos**: `components/StudentsView.tsx`
  - Expedientes de alumnos, estatus (`INSCRITO`, `BAJA`, `TRASLADO`), conducta e indicadores de riesgo.
- **Generación de Documentos y Reportes**: `services/pdfGenerator.ts`
  - Constancias, Citatorios, Actas, Permisos Económicos, PEMC, Reportes Financieros, Boletas y Listas Grupales.
- **Backend / API**: 
  - `server/server.js`: Rutas de la API, sincronización con MySQL, persistencia de alumnos, eventos oficiales y Cuadro de Honor.
  - `services/api.ts`: Cliente de comunicación del frontend al backend.
- **Menú y Navegación**: `components/Sidebar.tsx` y `components/MobileLayout.tsx`.

---

## 3. Últimas Modificaciones Críticas (Septiembre 2026)

### 1. Corrección Definitiva del Estatus de Alumnos (Reversión a BAJA)
- **Diagnóstico:** Al cambiar el estatus de un alumno a `INSCRITO`, al recargar la página o volver a entrar al sistema, el alumno volvía a aparecer como `BAJA`.
- **Causa:** En `server/server.js`, la sentencia `ON DUPLICATE KEY UPDATE` del endpoint `POST /sirila-v1/students` actualizaba `name`, `group_name`, `curp`, `data_json`, pero omitía actualizar las columnas `status` y `enrollment_date`. Además, existían discrepancias heredadas en la base de datos entre la columna `status` y el atributo interno `data_json.status`.
- **Solución implementada:**
  - Se agregó `status=VALUES(status)` y `enrollment_date=VALUES(enrollment_date)` en `ON DUPLICATE KEY UPDATE` en `server/server.js`.
  - Se agregó reconciliación automática de discrepancias de estatus en `initStorage()` al inicializar el servidor.
  - Se ejecutó el script `tools/repair_bajas_2026.js` restaurando de forma permanente a todos los alumnos activos en estatus `INSCRITO`.

### 2. Calendario Escolar Oficial 2026-2027 y Desbloqueo de Asistencia
- **Diagnóstico:** No se podía registrar la asistencia en el sistema; aparecía el mensaje *"Fecha seleccionada no es un día hábil según el calendario escolar"*.
- **Causa:** `schoolCalendarUtils.ts` y `server.js` estaban configurados con el ciclo 2025-2026 (concluido en julio 2026). Cualquier fecha de septiembre 2026 devolvía `isSchoolDay = false`.
- **Solución implementada:**
  - Se configuró el **Calendario Escolar Oficial 2026-2027 de SEP / SEPyC Sinaloa (185 Días)** con base en el documento oficial `public/CALENDARIO-ESCOLAR-BASICA-26-27.pdf`:
    - **Inicio de clases:** 31 de Agosto de 2026.
    - **Fin de clases:** 7 de Julio de 2027.
    - **Periodos:** Trimestre 1 (31 Ago - 27 Nov 2026), Trimestre 2 (30 Nov 2026 - 19 Mar 2027), Trimestre 3 (5 Abr - 7 Jul 2027).
    - **Suspensiones y CTE:** 16 Sep, 25 Sep (CTE 1), 30 Oct (CTE 2), 2 Nov, 16 Nov, 27 Nov (CTE 3), Vacaciones de Invierno (21 Dic 2026 - 8 Ene 2027, regreso 11 Ene), 29 Ene (CTE 4), 1 Feb, 26 Feb (CTE 5), 15 Mar, Vacaciones Semana Santa (22 Mar - 2 Abr 2027, regreso 5 Abr), 30 Abr (CTE 6), 5 May, 28 May (CTE 7), 25 Jun (CTE 8).
    - **Eventos Oficiales:** Jornada contra el abuso sexual infantil (7 Sep 2026), Entrega de boletas (Nov 2026, Mar 2027, Jul 2027), Periodo de Preinscripciones (2-15 Feb 2027) y Periodos de Inscripciones.
  - **Asistencia habilitada:** Todas las fechas escolares hábiles del ciclo 2026-2027 ahora son validadas positivamente en `AttendanceView.tsx`.
  - **Visualización:** En `DirectorView.tsx` y `DashboardView.tsx`, los eventos oficiales se muestran categorizados y resaltados por color (CTE en rosa, suspensiones en oscuro, evaluaciones en ámbar, vacaciones en gris, inscripciones en cian).

### 3. Tareas Interactivas: Marcado Automático y Persistencia de Calificaciones
- **Diagnóstico:** En el portal de padres, las tareas simples de clase las marcaba el maestro, pero las actividades interactivas realizadas por los alumnos no se estaban marcando automáticamente como hechas, y las autocalificables con límite de intentos no mostraban los resultados al docente.
- **Causa:** En `ParentsPortal.tsx`, si el alumno no alcanzaba la nota mínima aprobatoria (`minScoreToPass`), la actividad no se añadía a `completedAssignmentIds`. En juegos HTML, faltaba actualizar el estado local React del estudiante tras enviarse a la API.
- **Solución implementada:**
  - En `QUIZ`, `WORKSHEET` y `HTML_GAME`, cada entrega se registra inmediatamente como realizada en `completedAssignmentIds`, se almacena la nota en `assignmentResults` y se incrementa el contador de intentos en `assignmentAttempts`.
  - La tarea se mueve automáticamente a la sección **Completadas** en el portal de padres, mostrando la calificación (`Nota: X/10`) y permitiendo reintentos si restan intentos (`intentos < maxAttempts`).
  - En `ActivitiesView.tsx` (vista docente):
    - Cada celda muestra la calificación obtenida y el contador de intentos (`Intentos: X/Max`).
    - Se agregó el botón con icono de ojo `👁️` que abre el **Modal de Resultados de Actividad Interactiva**, permitiendo al maestro revisar el estado, el desglose por campos formativos NEM, reiniciar intentos si desea darle una nueva oportunidad al alumno, o ajustar la nota manualmente.

### 4. Cuadro de Honor Multidimensional Ponderado
- **Diagnóstico:** El Cuadro de Honor solo tomaba en cuenta las calificaciones de boletas académicas trimestrales. Al comenzar el ciclo escolar en septiembre (sin boletas trimestrales capturadas aún), el cuadro de honor permanecía vacío o en cero.
- **Solución implementada:**
  - Se rediseñó el algoritmo en `/sirila-v1/honor-roll` (`server.js`) y `gradeUtils.ts` para ponderar:
    1. **Porcentaje de Avance del Alumno:** Cumplimiento de tareas asignadas.
    2. **Calificaciones de Actividades Autocalificables:** Promedio de notas en cuestionarios, fichas y juegos interactivos (0-10).
    3. **Promedio Académico Trimestral:** Calificaciones NEM capturadas.
    4. **Puntos de Conducta:** Criterio positivo de desempate.
  - Al inicio del ciclo, el puntaje de honor se calcula:
    $$\text{Puntaje} = (\text{Promedio Autocalificables} \times 0.60) + \left(\frac{\text{Avance \%}}{10} \times 0.40\right)$$
  - Al capturarse evaluaciones trimestrales, se integran fluidamente con 50% de ponderación académica.
  - Se visualiza con insignias de avance y notas autocalificables en el Portal de Padres (`ParentsPortal.tsx`) y en el Panel de Control (`DashboardView.tsx`).

### 5. Corrección de Condición de Carrera en Actividades y Notificaciones WhatsApp
- **Diagnóstico:** Las actividades y juegos HTML realizados por los estudiantes, así como sus asistencias, presentaban intermitencia en el guardado. A veces una asistencia marcada por el docente se borraba si el alumno terminaba una actividad simultáneamente. Además, se solicitó notificación automática al docente.
- **Causa:** En `ParentsPortal.tsx`, la aplicación reemplazaba de forma completa e indiscriminada todo el objeto del alumno (`api.saveStudent()`) con su estado local obsoleto, generando una condición de carrera sobre-escribiendo datos más recientes de la base de datos.
- **Solución implementada:**
  - Se eliminaron las llamadas destructivas a `saveStudent` tras resolver un juego, y se migró al uso exclusivo de la llamada segura y transaccional `api.submitAssignment()`.
  - Se integró el envío automático de notificaciones de WhatsApp (vía la herramienta nativa web o de escritorio) al docente cuando un estudiante completa una actividad interactiva, extrayendo el número de contacto directamente del caché de configuración institucional.

### 6. Filtro Dinámico en la Agenda Escolar
- **Diagnóstico:** El panel de control mostraba eventos pasados en la sección de Agenda Escolar, restando visibilidad a las próximas actividades relevantes.
- **Solución implementada:** Se actualizó `DashboardView.tsx` para filtrar dinámicamente los eventos, ocultando todos aquellos cuya fecha sea anterior al día actual, y mostrando exclusivamente eventos de hoy y del futuro ordenados cronológicamente.

### 7. Gestión de Entregas Tardías (Late Assignments)
- **Implementación:** Se añadió soporte para identificar y penalizar las entregas de tareas y actividades interactivas enviadas después de la fecha límite (`dueDate`).
- **Detalles:** Las entregas tardías sufren una penalización en su calificación final (el estudiante recibe un 70% del valor original). Se introdujo el campo `lateAssignmentIds` en el modelo del estudiante (`types.ts`) para persistir esto, y se añadió una etiqueta visual de "Tarde" en el Portal de Padres (`ParentsPortal.tsx`).

### 8. Estabilidad de Dashboard y Persistencia de Avatares
- **Implementación:** Se forzó el *background polling* en el panel de control para mantener la información siempre actualizada.
- **Detalles:** Se corrigió un problema de sincronización que provocaba el borrado accidental del avatar de los alumnos al actualizar su información (`useAppStore.ts`).

---

## 4. Guía para Nuevas Modificaciones y Despliegue

- **Base de Datos**: La base de datos de producción opera en MySQL en Hostinger. Las credenciales se gestionan a través de variables de entorno en el servidor (`server/.env`).
- **Despliegue Automático**:
  El repositorio cuenta con integración continua configurada hacia Hostinger. Cualquier cambio que se confirme y envíe a la rama principal (`main`) se despliega de inmediato:
  ```bash
  git add .
  git commit -m "Descripción clara de las mejoras"
  git push origin main
  ```

---
*Documento actualizado al 4 de Septiembre de 2026.*
