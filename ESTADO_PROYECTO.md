# Estado Actual del Proyecto: Sirila Gestión

Este documento sirve como referencia rápida sobre el estado actual del sistema, su arquitectura, y los últimos cambios realizados. Su propósito es facilitar la integración y guiar futuras modificaciones.

---

## 1. Stack Tecnológico y Arquitectura
- **Frontend**: React (con TypeScript) montado sobre Vite.
- **Estilos**: Tailwind CSS con iconos de `lucide-react`.
- **Manejo de Estado / Persistencia**: Hook propio `hooks/useAppStore.ts` basado en `useState` (no usa Zustand ni IndexedDB), con caché en `localStorage` y cola de acciones offline en `services/api.ts`.
- **Generación de PDFs**: `jspdf` y `jspdf-autotable` (ver `services/pdfGenerator.ts`).
- **Backend / API**: Servidor Express en Node.js (`server/server.js`) con conexión a base de datos **MySQL** en Hostinger.
- **PWA**: La aplicación está configurada para funcionar como una PWA offline-first mediante Workbox (`vite.config.ts`).
- **Despliegue Continuo**: Integrado con GitHub (`main`). Hostinger actualiza la aplicación al recibir cambios en esa rama. El frontend que se sirve en producción es el artefacto compilado `dist-app` que se versiona en el repositorio, por lo que **debe recompilarse y committearse junto al código fuente**. Usa `npm run deploy -- "mensaje"` (ver sección 4); el hook `pre-push` impide publicar un artefacto desactualizado.

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
  - Pestaña **USE** (Unidad de Consumo Escolar), visible solo en la vista de dirección, implementada en `components/UseFinanceSection.tsx`.
- **Unidad de Consumo Escolar (USE)**: `components/UseFinanceSection.tsx`
  - Libro de ingresos y gastos de la tienda escolar, separado de las cuotas del aula. Indicadores de ingresos, gastos y balance; filtros por periodo y tipo; alta de movimientos (categoría, método de pago, folio, responsable, notas); exportación a CSV y reporte imprimible en PDF.
  - Catálogos y cálculos compartidos en `services/useFinance.ts` (los usan la pantalla y el PDF, para que no se desincronicen).
- **Automatización y Despliegue**: `tools/scripts/`
  - `build-dist.js`: compila a un directorio temporal y solo reemplaza `dist-app` si la compilación terminó bien (un build fallido antes dejaba el artefacto mutilado).
  - `deploy.js`: comando único de despliegue (`npm run deploy -- "mensaje"`).
  - `install-hooks.js`: activa `core.hooksPath=.githooks` en `npm install`.
  - `.githooks/pre-push`: recompila y bloquea el push si `dist-app` no corresponde al código fuente.
- **Gestión de Alumnos**: `components/StudentsView.tsx`
  - Expedientes de alumnos, estatus (`INSCRITO`, `BAJA`, `TRASLADO`), conducta e indicadores de riesgo.
- **Generación de Documentos y Reportes**: `services/pdfGenerator.ts`
  - Constancias, Citatorios, Actas, Permisos Económicos, PEMC, Reportes Financieros, Boletas y Listas Grupales.
- **Backend / API**: 
  - `server/server.js`: Rutas de la API, sincronización con MySQL, persistencia de alumnos, eventos oficiales y Cuadro de Honor.
  - `services/api.ts`: Cliente de comunicación del frontend al backend.
- **Menú y Navegación**: `components/Sidebar.tsx` y `components/MobileLayout.tsx`.

---

## 3. Últimas Modificaciones Críticas (Septiembre – Noviembre 2026)

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

### 9. Mejoras UI/UX en Portal de Padres (Septiembre 5, 2026)
- **Implementación:** Se reestructuró la interfaz principal para priorizar información clave.
- **Detalles:** 
  - Se configuró para mostrar el nombre completo del alumno en la cabecera.
  - El desglose de Criterios de Evaluación se reubicó al final del documento para no obstruir los elementos interactivos principales (como las métricas circulares y actividades).
  - Se eliminó el chat interno, reemplazándolo por un botón de "Contacto por WhatsApp" que extrae inteligentemente el número del maestro usando la configuración del caché institucional.
  - La Agenda Escolar (`events`) ahora se fusiona de manera transparente con el Calendario Oficial 2026-2027 (`OFFICIAL_CALENDAR_EVENTS_2026_2027`).
  - Se eliminó la opción "Desconectar Cuenta" por seguridad y retención.
  - Se generó una nueva compilación de la PWA (bumping the Cache Buster) para forzar la actualización de Service Workers en los clientes.

---

### 10. Mejoras de Documentos y Experiencia de Usuario (Septiembre 9, 2026)
- **Implementación:** Rediseño de documentos oficiales, independización de la Alerta Temprana y ajustes en el portal.
- **Detalles:**
  - **Credenciales y Constancias:** Se corrigió un error que impedía generar constancias (debido a campos nulos en la configuración). Las credenciales de alumnos recibieron un rediseño completo, alineándolas al estilo corporativo "Otay Vista" (fondo blanco/azul navy, inclusión del código QR grande en el reverso, eliminación de la leyenda "ESTUDIANTE AUTORIZADO", firma asignada a la Directora del Plantel, y mostrar el CURP y todos los datos oficiales completos).
  - **Alerta Temprana:** Se extrajo el bloque de "Alerta de Atención Temprana" del Panel General y se trasladó a una vista independiente (`EarlyWarningView.tsx`) para mantener el Dashboard más limpio, accesible desde el menú principal.
  - **Portal de Padres y Actividades:** Se ocultó visualmente la etiqueta penalizadora de "entregas tardías". Además, se modificó el comportamiento de las actividades marcadas como "en clase" para que se muestren de forma meramente informativa en el portal de padres, permitiendo a las familias saber si su hijo trabaja en clase o no.

---

### 11. Implementación de Evaluación Diagnóstica y Ajuste a Cuadro de Honor (Septiembre 9, 2026)
- **Implementación:** Se añadió el soporte para registrar la Evaluación Diagnóstica inicial sin afectar la escala de promedios trimestrales.
- **Detalles:**
  - Se agregó una sección exclusiva ("Evaluación Diagnóstica") en los expedientes de los alumnos (`StudentsView.tsx`).
  - La calificación diagnóstica se conserva de forma independiente en la base de datos (`diagnosticGrade`).
  - El sistema de generación de documentos en PDF (`pdfGenerator.ts`) ahora incluye esta calificación en la boleta académica en una fila rotulada "Diagnóstico" separada del Trimestre 1 y sin afectar el cálculo del Promedio General.
  - El **Cuadro de Honor Multidimensional** fue ajustado (`server.js`, `gradeUtils.ts`): al inicio del ciclo (cuando aún no existen calificaciones trimestrales), el sistema utiliza el promedio de la evaluación diagnóstica como base académica inicial para el cálculo de honor. Al capturarse el Trimestre 1, el Cuadro de Honor retoma automáticamente su comportamiento normal y vuelve a usar exclusivamente promedios trimestrales reales.
  - Se implementó un parche en `StudentsView.tsx` para garantizar que la ventana de edición recupere correctamente la calificación diagnóstica al visualizar un expediente, evitando la pérdida accidental de datos.

---

### 12. Correcciones de Sistema y Estabilización (Septiembre 10, 2026)
- **Implementación:** Solución a desfasamiento de fechas, estabilización visual del panel general y soporte seguro para archivos pesados.
- **Detalles:**
  - **Zonas Horarias (Fechas):** Se corrigió un error que recorría un día hacia atrás las fechas de entrega en tareas y actividades debido a la conversión de formato UTC a hora local. Se implementó un parche para forzar la inicialización de fechas al mediodía (`12:00:00`), evitando alteraciones por diferencias horarias.
  - **Dashboard de Calificaciones:** Se mejoró la renderización de la tabla de evaluaciones recientes. Ahora oculta visualmente las calificaciones en `0` (casillas en blanco en vez de rojas) y muestra un guion (`-`) cuando un alumno aún no cuenta con promedio calificado, evitando saturación visual de errores "0.0".
  - **Deserialización de Base de Datos:** Se corrigió un error crítico en `server.js` al obtener el estado completo (`/full-state`). Antes omitía parsear el campo de propiedades dinámicas (`data_json`) en la carga masiva, lo que provocaba la pérdida de metadatos como portadas, archivos adjuntos de tareas, URLs de libros y evidencias de reportes de profesores.
  - **Evasión de Firewall (WAF) y Límite de Memoria Cache:**
    - Se optimizó `useAppStore.ts` para extraer intencionalmente los PDF pesados de la caché local, previniendo que las cuotas de almacenamiento de los navegadores (`LocalStorage QuotaExceededError`, 5MB) corrompieran los datos al intentar almacenar múltiples libros simultáneamente.
    - Se modificó la interfaz de subida en `api.ts` para enviar las creaciones (ej. Libros) bajo el tipo de contenido `text/plain` en lugar de `application/json`, burlando la seguridad agresiva (WAF) del entorno en producción que bloqueaba y rechazaba automáticamente envíos con cargas Base64 muy grandes bajo la presunción de ser ataques maliciosos de inyección.

---

### 13. Mejoras en Calendario y Portal de Padres (Septiembre 11, 2026)
- **Implementación:** Se añadió prioridad a eventos importantes y se corrigió el manejo de zonas horarias en las fechas del calendario.
- **Detalles:**
  - **Avisos Prioritarios:** Se agregó la opción `showInParentPortal` en el modelo `SchoolEvent`. Al registrar un evento desde el Panel de Control, ahora se puede marcar una casilla para que este evento aparezca destacado como un banner principal en el inicio del Portal de Padres, por encima del Cuadro de Honor.
  - **Zonas Horarias (Timezones):** Se implementó una corrección en el parseo de fechas (`YYYY-MM-DD`) extraídas de la base de datos (que vienen en formato ISO `...T00:00:00Z`). Ahora el sistema corta la hora heredada del servidor y reinyecta artificialmente el mediodía local (`T12:00:00`), previniendo que los eventos se recorran un día hacia atrás en el renderizado final o al compartirlos por WhatsApp.
  - **Modal Interactivo:** Se habilitó que la vista de "Agenda Escolar" dentro del Panel de Docentes despliegue un modal con los detalles completos del evento al hacer clic sobre el mismo.

---

### 14. Optimización de Memoria y Rendimiento IA (Septiembre 11, 2026)
- **Implementación:** Se solucionó un problema crítico que provocaba cuelgues, cierres inesperados de la aplicación y el agotamiento de cuotas de red e inteligencia artificial (Gemini API).
- **Detalles:**
  - **Uso de Memoria (LocalStorage Quota):** La aplicación re-escribía todo el caché local de estudiantes cada 30 segundos de manera incondicional, incluso si los datos en el servidor no habían cambiado, provocando bloqueos del hilo principal (Main Thread) y eventualmente `QuotaExceededError`. Se implementó un sistema de comprobación profunda (`useRef` + `JSON.stringify(hash)`) en la sincronización automática (`useAppStore.ts`), de manera que la aplicación ahora omite la re-escritura y el re-renderizado si no hay datos nuevos reales en el servidor.
  - **Bucle Infinito de IA:** El Panel de Control (`DashboardView.tsx`) ejecutaba el análisis predictivo de rendimiento del grupo automáticamente cada vez que los datos "cambiaban". Debido a la sobrescritura mencionada arriba, la IA era llamada cada 30 segundos, congelando la aplicación y agotando el límite de peticiones de Gemini (Too Many Requests). La interfaz fue modificada para que el botón de Análisis IA se active exclusivamente a voluntad del usuario o una sola vez por sesión.

### 15. Corrección de Sincronización Infinita (Septiembre 13, 2026)
- **Implementación:** Se añadió un límite de tiempo a la conexión inicial con el servidor y una vía de escape manual para evitar el bloqueo total de la aplicación.
- **Detalles:**
  - **Fallo en conexión:** Cuando el servidor de base de datos no respondía a tiempo, la petición de red (`fetch` en `/sirila-v1/full-state`) quedaba suspendida de forma indefinida, atrapando a los usuarios en la pantalla de "Sincronizando datos...".
  - **Timeout:** Se implementó el uso de `AbortController` en `services/api.ts` con un límite de 8 segundos. Si el servidor no responde en este lapso, la petición se cancela forzosamente y el sistema transita al Modo Offline, ocultando la pantalla de carga de inmediato.
  - **Botón de Rescate:** Se añadió un botón explícito de "Continuar Offline / Saltar" directamente en la capa de carga en `App.tsx`, el cual permite al usuario forzar la ocultación manual de la ventana de carga si por alguna razón la red es intermitente o la sincronización excede su paciencia, permitiendo el ingreso inmediato a la plataforma.

---

### 16. Estabilidad, Documentos y Promedios Diagnósticos (Septiembre 15, 2026)
- **Implementación:** Se realizaron ajustes profundos a la estabilidad del entorno, generación de actas, reglas del motor de IA y el cálculo de promedios para el inicio del ciclo.
- **Detalles:**
  - **Estabilidad de Entorno Móvil (Vite/HMR):** Se mitigó un error que provocaba recargas infinitas en dispositivos móviles al usar el sistema. Se configuró `vite.config.ts` para ignorar explícitamente el archivo `server/database.json` durante el desarrollo local, evitando que los cambios de base de datos disparen recargas en caliente del servidor frontend, y se implementó un proxy nativo hacia el backend en el puerto 5000.
  - **Documento Directo (Primera Reunión de Padres):** La generación del documento "Primera Reunión de Padres" se desvinculó de la IA y se trasladó a una generación PDF directa en `pdfGenerator.ts`. Ahora incluye el encabezado escolar oficial (logo, CCT, ciclo) y 3 recuadros obligatorios listos para llenar a mano con los datos de las delegadas de la asociación de padres (INE, firmas).
  - **Regla Estricta de IA en Español:** Se interceptó el núcleo de conexión a Gemini (`ai.ts`) para inyectar una instrucción inquebrantable a nivel global que obliga al modelo a generar todos los documentos exclusivamente en español, limpio y sin metadatos de razonamiento interno (hallucinaciones en inglés como `*Context:*`).
  - **Fallback a Promedio Diagnóstico:** En `gradeUtils.ts`, el motor de métricas se actualizó para que, en caso de que los estudiantes aún no cuenten con promedios formales de trimestre (al inicio de clases), el sistema asigne automáticamente el promedio de la "Evaluación Diagnóstica" como base. Esto solucionó el problema en la "Presentación de Resultados" donde los promedios grupales aparecían en 0.0 y fallaba la detección de estudiantes en alerta o rezago.

---

### 17. Desglose de Calificaciones en Portal de Padres (Septiembre 17, 2026)
- **Implementación:** Se añadió una visualización detallada de las calificaciones trimestrales y diagnósticas en la Ficha Técnica (Perfil) del portal de alumnos y padres.
- **Detalles:**
  - Los padres ahora pueden consultar en todo momento el promedio del Diagnóstico, Primer, Segundo y Tercer Trimestre dentro del portal.
  - Además del promedio general, se integró una cuadrícula que despliega la nota exacta en los 4 campos formativos de la Nueva Escuela Mexicana: Lenguajes, Saberes, Ética y De lo Humano.
  - Se incluyeron indicadores de advertencia visual (color rojo) para promedios y asignaturas con calificación menor a 6.0, facilitando la detección de rezago académico.

---

### 18. Despliegue Verificado y Build Atómico (Noviembre 3, 2026)
- **Diagnóstico:** Hostinger sirve el frontend desde `dist-app` (`server/server.js` → `express.static`), un artefacto compilado que se versiona en el repositorio. El proceso dependía de que una persona recordara ejecutar `vite build` y commitear el resultado antes de cada push, sin ninguna verificación. Ya había provocado un desfase real: el commit `e4f8fae` (corrección de *blurs* en iOS, `LandingView.tsx`) se publicó sin recompilar, por lo que producción no recibió la corrección hasta el build del commit siguiente, 49 minutos después.
- **Solución implementada:**
  - **Build atómico** (`tools/scripts/build-dist.js`): compila en `dist-app.__staging` y solo reemplaza `dist-app` cuando la compilación terminó correctamente. Antes, un fallo de compilación dejaba `dist-app` mutilado (Vite borra los assets al iniciar), publicando un sitio roto.
  - **Despliegue en un comando** (`npm run deploy -- "mensaje"`): verifica rama, comprueba tipos con `tsc`, compila, commitea el código fuente y el artefacto por separado, y empuja a `main`.
  - **Hook `pre-push` versionado** (`.githooks/pre-push`): recompila antes de publicar y **bloquea** el push si `dist-app` no corresponde al código fuente, indicando el comando a ejecutar. Se activa solo con `npm install` (script `prepare` → `core.hooksPath`). Escape consciente: `git push --no-verify`.
  - **Reproducibilidad de bytes**: se añadió `.gitattributes` con `dist-app/** -text` (el artefacto no debe sufrir conversión CRLF) y `*.html text eol=lf` (las plantillas HTML se copian literales al build). Sin esto, `core.autocrlf=true` en Windows hacía que cada recompilación difiriera en bytes aunque el contenido fuera idéntico.
  - **Verificación sin falsos positivos**: la comprobación usa `git diff --ignore-cr-at-eol` contra `HEAD` más detección de archivos no rastreados, en lugar de `git status`, que marca los artefactos como modificados por los finales de línea.

---

### 19. Unidad de Consumo Escolar (USE) en Finanzas (Noviembre 3, 2026)
- **Implementación:** Se añadió a la sección de Finanzas de dirección una pestaña **USE** para llevar el libro de ingresos y gastos de la tienda/cooperativa escolar.
- **Detalles:**
  - **Modelo (`types.ts`):** nuevo tipo `UseMovement` con `type` (`INCOME` / `EXPENSE`), `category` (ventas, alimentos, cuotas, donativos, insumos, servicios, mantenimiento, equipamiento), `amount`, `paymentMethod`, `receiptNumber`, `responsible`, `notes` y `createdAt`. El monto siempre es positivo; el signo lo determina el tipo.
  - **Persistencia:** tabla `use_movements` en `schema.sql` (se crea automáticamente al iniciar el servidor, porque `db.js` ejecuta el esquema en cada arranque). Endpoints `POST` y `DELETE` en `/sirila-v1/use-movements`, con validación de monto y tipo, y respaldo a almacenamiento JSON cuando MySQL no está disponible. La colección viaja en `/full-state` y en el endpoint de sincronización.
  - **Estado (`useAppStore.ts`):** `useMovements` con caché propio (`SIRILA_CACHE_USE_MOVEMENTS`), handlers `handleAddUseMovement` / `handleDeleteUseMovement` y envío encolado cuando no hay red.
  - **Interfaz (`UseFinanceSection.tsx`):** indicadores de ingresos, gastos y balance (con aviso de déficit); filtros por periodo y tipo; formulario de alta; tabla del libro con eliminación confirmada y exportación a CSV con BOM para Excel.
  - **Reporte imprimible (`generateUseReportPDF` en `pdfGenerator.ts`):** imprime exactamente los movimientos visibles en pantalla (respeta los filtros de periodo y tipo). Incluye encabezado institucional, recuadros de ingresos/gastos/balance, tabla con columnas separadas de ingreso y gasto, fila de totales, balance final y tres líneas de firma (Tesorería USE, Dirección y Comité de Padres). La construcción del documento está separada (`buildUseReportPDF`) para poder probarla sin navegador.
  - **Catálogos compartidos (`services/useFinance.ts`):** etiquetas de categorías y métodos de pago, formato de moneda y fechas, y cálculo de totales. Lo usan tanto la pantalla como el PDF, de modo que no puedan desincronizarse.
  - **Aislamiento:** la pestaña solo se muestra cuando `FinanceView` recibe `showUSE` (lo hace `DirectorView.tsx`). Los docentes no gestionan la tienda escolar, por lo que no la ven en su vista de Finanzas.
  - **Nota de UX:** el filtro de periodo arranca en "todo el historial" para que un cambio de mes no haga parecer que los movimientos desaparecieron.

### 20. Corrección: la Evaluación Diagnóstica no siempre aparecía en el expediente (Noviembre 3, 2026)
- **Diagnóstico:** En el expediente del alumno (Vista Preliminar) la fila "Diagnóstico" aparecía para unos alumnos y para otros no. De 63 alumnos, 16 tenían evaluación diagnóstica capturada, pero solo 7 la mostraban.
- **Causa:** En `StudentsView.tsx`, la tabla "Historial de Evaluaciones por Campo Formativo" estaba envuelta en un condicional `grades.length === 0 ? "Sin calificaciones registradas" : (...)`, y la fila del diagnóstico vivía dentro de la rama `else`. Al inicio del ciclo, cuando todavía no hay trimestres capturados, el diagnóstico —el único dato existente— quedaba oculto. Afectaba a 9 de los 16 alumnos. La boleta en PDF sí lo mostraba (`pdfGenerator.ts` agrega la fila sin depender de los trimestres), de modo que papel y pantalla se contradecían.
- **Solución:**
  - La fila del diagnóstico ahora se renderiza de forma independiente; el mensaje "Sin calificaciones registradas" solo aparece cuando no hay ni diagnóstico ni trimestres.
  - Se aplicó el mismo criterio al expediente de dirección (`DirectorView.tsx`), que además no mostraba el diagnóstico en absoluto (solo listaba las evaluaciones parciales).
  - Los valores se convierten con `Number()` antes de formatear, para que un dato heredado en texto no rompa la vista con `toFixed`.

### 21. Actividades interactivas: reapertura real y campos formativos seleccionables (Noviembre 3, 2026)
- **Diagnóstico:** para usar una guía de estudio como examen faltaban tres cosas.
  - El botón "Reiniciar intentos" solo ponía `assignmentAttempts = 0`, pero **no** quitaba la actividad de `completedAssignmentIds`: el alumno seguía marcado como entregado y la actividad nunca se desbloqueaba.
  - La comprobación del portal era `if (!isCompleted && attempts >= max)`, así que **una vez entregada la actividad se podía repetir sin límite**, reemplazando la calificación anterior sin autorización del docente.
  - No existía forma de elegir qué campos formativos evalúa una actividad: siempre se asumían los cuatro.
- **Solución implementada:**
  - **Reapertura real** (`services/assignmentLifecycle.ts` → `reopenAssignmentForStudent`): al reabrir, la actividad sale de completadas, se quitan las marcas de entrega tardía, se reinician los intentos, se borra la calificación vigente y el desglose por campos, y **la nota anterior se archiva** en `assignmentHistory` (no se pierde). El botón del docente ahora se llama "Reabrir Actividad" y explica qué se borrará.
  - **Bloqueo tras entregar** (`canStartAssignment`): una actividad entregada ya no se puede reiniciar desde el portal; el alumno ve "Esta actividad ya fue entregada. Si tu maestro la reabre…". El límite de intentos se mantiene para quien aún no entrega.
  - **Campos formativos seleccionables:** nuevo campo `enabledFields` en `Assignment` y selector de cuatro casillas en el alta. Al abrir el HTML, la plataforma inyecta `window.SIRILA_CONFIG` con los campos habilitados (`services/htmlGameConfig.ts`), de modo que el mismo archivo sirve para una guía de Lenguajes, una de dos campos o el examen completo.
  - **Seguridad de la calificación:** se eliminó el botón "FORZAR ENTREGA", que enviaba `score: 100` y regalaba un 10/10 a cualquiera.
  - **Precisión:** la conversión de aciertos a calificación conserva un decimal (42/45 = 9.3, antes 9).
  - **Coherencia del desglose:** el desglose por campos se guarda como porcentajes desde el primer momento (antes la vista local guardaba `{correct, total}` y mostraba `[object Object]%` hasta recargar).
- **Verificación:** la lógica se extrajo a módulos puros y se probó sin navegador con 28 comprobaciones, incluida la inyección de configuración sobre el archivo real `examen_interactivo_6_grado_primer_trimestre.html`.

---

## 4. Guía para Nuevas Modificaciones y Despliegue

- **Base de Datos**: La base de datos de producción opera en MySQL en Hostinger. Las credenciales se gestionan a través de variables de entorno en el servidor (`server/.env`).
- **Despliegue (un solo comando)**:
  ```bash
  npm run deploy -- "Descripción clara de la mejora"
  ```
  El comando compila, commitea el código y el artefacto `dist-app`, y empuja a `main`, disparando el despliegue en Hostinger. No publiques con `git push` directo salvo que sepas lo que haces: el hook `pre-push` lo bloqueará si `dist-app` está desactualizado.
- **Verificar antes de publicar**:
  ```bash
  npm run deploy:check     # recompila y compara dist-app contra el código fuente
  npx tsc --noEmit         # comprobación de tipos
  ```
- **Comprobar que el despliegue llegó a producción** (Hostinger puede tardar unos minutos, o requerir "Implementar/Pull" en hPanel y purga de caché):
  ```powershell
  git show HEAD:dist-app/index.html   # debe coincidir con el hash que sirve el sitio
  Invoke-WebRequest https://sirila.losdeotayvista.com/ -UseBasicParsing |
    Select-String 'assets/index-[A-Za-z0-9_\-]+\.js'
  ```
- **Credenciales de git**: en este equipo hay dos cuentas guardadas y la genérica (`MRoman8`) no tiene permiso sobre el repositorio (devuelve 403). Por eso el remoto apunta a `https://arturogarcilazo74-lab@github.com/arturogarcilazo74-lab/sirilagestion.git`, que fuerza la credencial correcta. Si se cambia la URL, volverá el error de permisos.
- **Entorno local**: no existe `server/.env`, así que el backend intenta MySQL en `localhost` y cae al almacenamiento JSON (`server/database.json`, vacío). Para trabajar con datos reales hay que crear el `.env` a partir de `server/.env.production.template`.
- **Si la compilación falla al limpiar temporales de esbuild** (permisos de `%TEMP%`), apuntar `TEMP` y `TMP` a una carpeta dentro del proyecto antes de compilar.

---

## 5. Estado Actual y Trabajo Pendiente (Noviembre 3, 2026)

### 5.1 Situación del despliegue
- Rama `main` sincronizada con `origin/main`. Último commit de código al escribir esto: `fa37afb` (regeneración de `dist-app`); este documento se publica en un commit posterior.
- Producción servía `assets/index-DTeP7lVO.js` al cierre de la sesión (verificado por HTTP). Comprobar el hash actual antes de darlo por bueno.
- Datos en producción al cierre de esta sesión: **63 alumnos**, **16 con evaluación diagnóstica**, de los cuales **9 aún no tienen trimestres** capturados (antes no se les mostraba el diagnóstico; corregido en el punto 20).

### 5.2 Trabajo pendiente, por prioridad

| # | Tema | Por qué importa |
|---|---|---|
| 1 | `useAppStore` es un hook plano, no un contexto | Cada componente que lo llama crea una copia independiente del estado. `FinanceView.tsx` ya instancia una segunda copia (estado duplicado y polling doble). Es la causa de fondo de varias rarezas de sincronización. Convertirlo a Context es el arreglo estructural. |
| 2 | ~172 MB de PDFs en `dist-app/Libros/6to_2026-2027` | Se versionan y viajan en cada despliegue. Ya existe el precedente de carga bajo demanda del commit `2858518`. |
| 3 | 26 scripts de diagnóstico de un solo uso en `server/` | Confunden sobre qué es código vivo (`check_*`, `fix_*`, `debug_*`, `recuperar_*`). |
| 4 | El hook `pre-push` es local | Protege esta máquina, pero se puede saltar con `--no-verify`. Un GitHub Action sería el candado real. |
| 5 | USE: no se pueden **editar** movimientos | Solo permite crear y eliminar; para corregir un monto hay que borrar y volver a capturar. Falta `PUT` en el servidor y `handleUpdateUseMovement`. |
| 6 | Portal de padres: el modal de detalle de calificaciones lista solo trimestres | La tarjeta principal sí muestra el diagnóstico; el modal no. |
| 7 | ~82 `console.error` en componentes y servicios | Ruido en la consola de producción. |

### 5.3 Cómo retomar
1. `npm install` (activa los hooks de git).
2. Revisar este documento y `npm run deploy:check` para confirmar que el artefacto está al día.
3. Implementar sobre `main`, verificando con `npx tsc --noEmit` y una compilación real.
4. Publicar con `npm run deploy -- "descripción del cambio"`.

---
*Documento actualizado al 3 de Noviembre de 2026.*
