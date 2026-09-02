// Calendario Escolar Oficial 2026-2027 - SEP / SEPyC Sinaloa (185 Días)

export interface SchoolPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

export interface OfficialCalendarEvent {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  type: 'INICIO_FIN' | 'SUSPENSION' | 'CTE' | 'EVALUACION' | 'VACACIONES' | 'INSCRIPCIONES' | 'CONCIENTIZACION' | 'CONMEMORATIVO';
  description: string;
}

// Periodos del ciclo escolar 2026-2027
export const SCHOOL_PERIODS: SchoolPeriod[] = [
  {
    id: 'P1',
    name: 'Primer Periodo (Trimestre 1)',
    startDate: '2026-08-31',
    endDate: '2026-11-27'
  },
  {
    id: 'P2',
    name: 'Segundo Periodo (Trimestre 2)',
    startDate: '2026-11-30',
    endDate: '2027-03-19'
  },
  {
    id: 'P3',
    name: 'Tercer Periodo (Trimestre 3)',
    startDate: '2027-04-05',
    endDate: '2027-07-07'
  }
];

// Días de suspensión y actividades sin clases (Días Inhábiles)
export const SUSPENSION_DAYS: Record<string, string> = {
  // Primer Periodo
  '2026-09-16': 'Aniversario de la Independencia de México (Suspensión Oficial)',
  '2026-09-25': 'Consejo Técnico Escolar - 1ª Sesión Ordinaria',
  '2026-10-30': 'Consejo Técnico Escolar - 2ª Sesión Ordinaria',
  '2026-11-02': 'Día de Muertos (Suspensión Oficial)',
  '2026-11-16': 'Conmemoración del 20 de noviembre (Suspensión Oficial)',
  '2026-11-27': 'Consejo Técnico Escolar - 3ª Sesión Ordinaria',

  // Vacaciones de Invierno (21 de diciembre 2026 al 8 de enero 2027)
  '2026-12-21': 'Vacaciones de Invierno',
  '2026-12-22': 'Vacaciones de Invierno',
  '2026-12-23': 'Vacaciones de Invierno',
  '2026-12-24': 'Vacaciones de Invierno',
  '2026-12-25': 'Navidad (Suspensión Oficial)',
  '2026-12-28': 'Vacaciones de Invierno',
  '2026-12-29': 'Vacaciones de Invierno',
  '2026-12-30': 'Vacaciones de Invierno',
  '2026-12-31': 'Vacaciones de Invierno',
  '2027-01-01': 'Año Nuevo (Suspensión Oficial)',
  '2027-01-04': 'Vacaciones de Invierno',
  '2027-01-05': 'Vacaciones de Invierno',
  '2027-01-06': 'Día de Reyes (Suspensión Oficial)',
  '2027-01-07': 'Taller Intensivo para Personal con Funciones de Dirección y Docentes',
  '2027-01-08': 'Taller Intensivo para Personal con Funciones de Dirección y Docentes',

  // Segundo Periodo
  '2027-01-29': 'Consejo Técnico Escolar - 4ª Sesión Ordinaria',
  '2027-02-01': 'Conmemoración del 5 de febrero (Suspensión Oficial)',
  '2027-02-26': 'Consejo Técnico Escolar - 5ª Sesión Ordinaria',
  '2027-03-15': 'Conmemoración del 21 de marzo (Suspensión Oficial)',

  // Vacaciones de Semana Santa (22 de marzo al 2 de abril 2027)
  '2027-03-22': 'Vacaciones de Semana Santa',
  '2027-03-23': 'Vacaciones de Semana Santa',
  '2027-03-24': 'Vacaciones de Semana Santa',
  '2027-03-25': 'Vacaciones de Semana Santa',
  '2027-03-26': 'Vacaciones de Semana Santa',
  '2027-03-29': 'Vacaciones de Semana Santa',
  '2027-03-30': 'Vacaciones de Semana Santa',
  '2027-03-31': 'Vacaciones de Semana Santa',
  '2027-04-01': 'Vacaciones de Semana Santa',
  '2027-04-02': 'Vacaciones de Semana Santa',

  // Tercer Periodo
  '2027-04-30': 'Consejo Técnico Escolar - 6ª Sesión Ordinaria',
  '2027-05-05': 'Batalla de Puebla (Suspensión Oficial)',
  '2027-05-28': 'Consejo Técnico Escolar - 7ª Sesión Ordinaria',
  '2027-06-25': 'Consejo Técnico Escolar - 8ª Sesión Ordinaria'
};

// Eventos Oficiales SEP/SEPyC 2026-2027 para agendas, calendarios y reportes
export const OFFICIAL_CALENDAR_EVENTS_2026_2027: OfficialCalendarEvent[] = [
  // Inicio y Fin
  { id: 'sep26_inicio', title: 'Inicio de Clases Ciclo 2026-2027', date: '2026-08-31', type: 'INICIO_FIN', description: 'Primer día de clases oficial del ciclo escolar 2026-2027' },
  { id: 'sep27_fin', title: 'Fin de Clases Ciclo 2026-2027', date: '2027-07-07', type: 'INICIO_FIN', description: 'Último día de clases del ciclo escolar 2026-2027' },

  // CTE Fase Intensiva
  { id: 'sep26_cte_int_1', title: 'CTE Fase Intensiva (Día 1)', date: '2026-08-24', type: 'CTE', description: 'Consejo Técnico Escolar Fase Intensiva' },
  { id: 'sep26_cte_int_2', title: 'CTE Fase Intensiva (Día 2)', date: '2026-08-25', type: 'CTE', description: 'Consejo Técnico Escolar Fase Intensiva' },
  { id: 'sep26_cte_int_3', title: 'CTE Fase Intensiva (Día 3)', date: '2026-08-26', type: 'CTE', description: 'Consejo Técnico Escolar Fase Intensiva' },
  { id: 'sep26_cte_int_4', title: 'CTE Fase Intensiva (Día 4)', date: '2026-08-27', type: 'CTE', description: 'Consejo Técnico Escolar Fase Intensiva' },
  { id: 'sep26_cte_int_5', title: 'CTE Fase Intensiva (Día 5)', date: '2026-08-28', type: 'CTE', description: 'Consejo Técnico Escolar Fase Intensiva' },

  // Inscripciones y Concientización
  { id: 'sep26_concientizacion', title: 'Jornada contra el Abuso Sexual Infantil', date: '2026-09-07', type: 'CONCIENTIZACION', description: 'Jornada de concientización sobre la gravedad del abuso sexual y el maltrato infantil' },
  { id: 'sep26_inscripciones', title: 'Periodo de Inscripciones y Reinscripciones', date: '2026-09-01', endDate: '2026-09-11', type: 'INSCRIPCIONES', description: 'Periodo oficial de inscripciones y reinscripciones escolares' },

  // CTE Sesiones Ordinarias
  { id: 'sep26_cte1', title: 'CTE 1ª Sesión Ordinaria', date: '2026-09-25', type: 'CTE', description: 'Consejo Técnico Escolar - 1ª Sesión Ordinaria' },
  { id: 'sep26_cte2', title: 'CTE 2ª Sesión Ordinaria', date: '2026-10-30', type: 'CTE', description: 'Consejo Técnico Escolar - 2ª Sesión Ordinaria' },
  { id: 'sep26_cte3', title: 'CTE 3ª Sesión Ordinaria', date: '2026-11-27', type: 'CTE', description: 'Consejo Técnico Escolar - 3ª Sesión Ordinaria' },
  { id: 'sep27_cte4', title: 'CTE 4ª Sesión Ordinaria', date: '2027-01-29', type: 'CTE', description: 'Consejo Técnico Escolar - 4ª Sesión Ordinaria' },
  { id: 'sep27_cte5', title: 'CTE 5ª Sesión Ordinaria', date: '2027-02-26', type: 'CTE', description: 'Consejo Técnico Escolar - 5ª Sesión Ordinaria' },
  { id: 'sep27_cte6', title: 'CTE 6ª Sesión Ordinaria', date: '2027-04-30', type: 'CTE', description: 'Consejo Técnico Escolar - 6ª Sesión Ordinaria' },
  { id: 'sep27_cte7', title: 'CTE 7ª Sesión Ordinaria', date: '2027-05-28', type: 'CTE', description: 'Consejo Técnico Escolar - 7ª Sesión Ordinaria' },
  { id: 'sep27_cte8', title: 'CTE 8ª Sesión Ordinaria', date: '2027-06-25', type: 'CTE', description: 'Consejo Técnico Escolar - 8ª Sesión Ordinaria' },

  // Suspensiones Oficiales
  { id: 'sep26_indep', title: 'Suspensión: Independencia de México', date: '2026-09-16', type: 'SUSPENSION', description: 'Suspensión oficial de labores docentes' },
  { id: 'sep26_muertos', title: 'Suspensión: Día de Muertos', date: '2026-11-02', type: 'SUSPENSION', description: 'Suspensión oficial de labores docentes' },
  { id: 'sep26_revolucion', title: 'Suspensión: Revolución Mexicana', date: '2026-11-16', type: 'SUSPENSION', description: 'Conmemoración del 20 de noviembre' },
  { id: 'sep26_navidad', title: 'Suspensión: Navidad', date: '2026-12-25', type: 'SUSPENSION', description: 'Suspensión oficial de labores docentes' },
  { id: 'sep27_anio_nuevo', title: 'Suspensión: Año Nuevo', date: '2027-01-01', type: 'SUSPENSION', description: 'Suspensión oficial de labores docentes' },
  { id: 'sep27_reyes', title: 'Suspensión: Día de Reyes', date: '2027-01-06', type: 'SUSPENSION', description: 'Suspensión oficial de labores docentes' },
  { id: 'sep27_constitucion', title: 'Suspensión: Constitución Mexicana', date: '2027-02-01', type: 'SUSPENSION', description: 'Conmemoración del 5 de febrero' },
  { id: 'sep27_juarez', title: 'Suspensión: Natalicio Benito Juárez', date: '2027-03-15', type: 'SUSPENSION', description: 'Conmemoración del 21 de marzo' },
  { id: 'sep27_puebla', title: 'Suspensión: Batalla de Puebla', date: '2027-05-05', type: 'SUSPENSION', description: 'Suspensión oficial de labores docentes' },

  // Registro y Comunicación de Evaluaciones (Entrega de Boletas)
  { id: 'sep26_eval1', title: 'Entrega de Boletas - Trimestre 1', date: '2026-11-23', endDate: '2026-11-26', type: 'EVALUACION', description: 'Registro y comunicación de los resultados de la evaluación' },
  { id: 'sep27_eval2', title: 'Entrega de Boletas - Trimestre 2', date: '2027-03-16', endDate: '2027-03-19', type: 'EVALUACION', description: 'Registro y comunicación de los resultados de la evaluación' },
  { id: 'sep27_eval3', title: 'Entrega de Boletas - Trimestre 3', date: '2027-07-05', endDate: '2027-07-06', type: 'EVALUACION', description: 'Registro y comunicación de los resultados de la evaluación final' },

  // Preinscripciones 2027-2028
  { id: 'sep27_preinscripciones', title: 'Periodo de Preinscripciones 2027-2028', date: '2027-02-02', endDate: '2027-02-15', type: 'INSCRIPCIONES', description: 'Preinscripción a Preescolar, 1° de Primaria y 1° de Secundaria' },

  // Vacaciones
  { id: 'sep26_vac_inv', title: 'Vacaciones de Invierno', date: '2026-12-21', endDate: '2027-01-08', type: 'VACACIONES', description: 'Periodo vacacional de invierno' },
  { id: 'sep27_regreso_inv', title: 'Regreso a Clases (Invierno)', date: '2027-01-11', type: 'INICIO_FIN', description: 'Reanudación de actividades escolares' },
  { id: 'sep27_vac_sem', title: 'Vacaciones de Semana Santa', date: '2027-03-22', endDate: '2027-04-02', type: 'VACACIONES', description: 'Periodo vacacional de Semana Santa' },
  { id: 'sep27_regreso_sem', title: 'Regreso a Clases (Semana Santa)', date: '2027-04-05', type: 'INICIO_FIN', description: 'Reanudación de actividades escolares' },

  // Días Conmemorativos de Reflexión (Negrillas SEP)
  { id: 'sep26_grito', title: 'Grito de Independencia', date: '2026-09-15', type: 'CONMEMORATIVO', description: 'Día cívico conmemorativo de reflexión' },
  { id: 'sep26_raza', title: 'Día de la Raza', date: '2026-10-12', type: 'CONMEMORATIVO', description: 'Día cívico conmemorativo de reflexión' },
  { id: 'sep26_rev_civico', title: 'Aniversario de la Revolución Mexicana', date: '2026-11-20', type: 'CONMEMORATIVO', description: 'Día cívico conmemorativo de reflexión' },
  { id: 'sep27_const_civico', title: 'Aniversario de la Constitución de 1917', date: '2027-02-05', type: 'CONMEMORATIVO', description: 'Día cívico conmemorativo de reflexión' },
  { id: 'sep27_bandera', title: 'Día de la Bandera', date: '2027-02-24', type: 'CONMEMORATIVO', description: 'Día cívico conmemorativo de reflexión' },
  { id: 'sep27_mujer', title: 'Día Internacional de la Mujer', date: '2027-03-08', type: 'CONMEMORATIVO', description: 'Día conmemorativo y de reflexión' },
  { id: 'sep27_petroleo', title: 'Expropiación Petrolera', date: '2027-03-18', type: 'CONMEMORATIVO', description: 'Día cívico conmemorativo de reflexión' },
  { id: 'sep27_juarez_civico', title: 'Natalicio de Benito Juárez', date: '2027-03-21', type: 'CONMEMORATIVO', description: 'Día cívico conmemorativo de reflexión' },
  { id: 'sep27_nino', title: 'Día del Niño', date: '2027-04-30', type: 'CONMEMORATIVO', description: 'Celebración escolar del Día del Niño' },
  { id: 'sep27_trabajo', title: 'Día del Trabajo', date: '2027-05-01', type: 'CONMEMORATIVO', description: 'Día de descanso internacional' },
  { id: 'sep27_maestro', title: 'Día del Maestro', date: '2027-05-15', type: 'CONMEMORATIVO', description: 'Celebración del personal docente' },
  { id: 'sep27_receso', title: 'Receso de Clases', date: '2027-07-08', endDate: '2027-07-31', type: 'VACACIONES', description: 'Receso oficial de clases de fin de ciclo' }
];

/**
 * Verifica si una fecha es un día escolar hábil para registro de asistencia y labores
 */
export function isSchoolDay(dateString: string): boolean {
  const date = new Date(dateString + 'T00:00:00');
  
  // Verificar si es fin de semana (Sábado o Domingo)
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }
  
  // Verificar si está dentro del ciclo escolar
  const period = getSchoolPeriod(dateString);
  if (!period) {
    return false;
  }
  
  // Verificar si es día de suspensión o receso/vacaciones
  if (SUSPENSION_DAYS[dateString]) {
    return false;
  }
  
  return true;
}

/**
 * Obtiene el periodo escolar al que pertenece una fecha
 */
export function getSchoolPeriod(dateString: string): SchoolPeriod | null {
  const date = new Date(dateString + 'T00:00:00');
  
  for (const period of SCHOOL_PERIODS) {
    const start = new Date(period.startDate + 'T00:00:00');
    const end = new Date(period.endDate + 'T00:00:00');
    
    if (date >= start && date <= end) {
      return period;
    }
  }
  
  return null;
}

/**
 * Obtiene la razón de suspensión de un día si existe
 */
export function getSuspensionReason(dateString: string): string | null {
  return SUSPENSION_DAYS[dateString] || null;
}

/**
 * Obtiene los días escolares hábiles de un periodo
 */
export function getSchoolDaysInPeriod(periodId: string): string[] {
  const period = SCHOOL_PERIODS.find(p => p.id === periodId);
  if (!period) return [];
  
  const days: string[] = [];
  const start = new Date(period.startDate + 'T00:00:00');
  const end = new Date(period.endDate + 'T00:00:00');
  
  const current = new Date(start);
  while (current <= end) {
    const dateString = current.toISOString().split('T')[0];
    if (isSchoolDay(dateString)) {
      days.push(dateString);
    }
    current.setDate(current.getDate() + 1);
  }
  
  return days;
}

/**
 * Obtiene todos los días de suspensión de un periodo
 */
export function getSuspensionDaysInPeriod(periodId: string): Array<{date: string, reason: string}> {
  const period = SCHOOL_PERIODS.find(p => p.id === periodId);
  if (!period) return [];
  
  const suspensions: Array<{date: string, reason: string}> = [];
  const start = new Date(period.startDate + 'T00:00:00');
  const end = new Date(period.endDate + 'T00:00:00');
  
  for (const [dateStr, reason] of Object.entries(SUSPENSION_DAYS)) {
    const date = new Date(dateStr + 'T00:00:00');
    if (date >= start && date <= end) {
      suspensions.push({ date: dateStr, reason });
    }
  }
  
  return suspensions.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Limpia asistencias marcadas en días que no son escolares
 */
export function cleanInvalidAttendance<T extends string>(attendance: Record<string, T>): Record<string, T> {
  const cleaned: Record<string, T> = {};
  
  for (const [dateStr, status] of Object.entries(attendance)) {
    if (isSchoolDay(dateStr)) {
      cleaned[dateStr] = status as T;
    }
  }
  
  return cleaned;
}

/**
 * Verifica si una fecha está dentro del ciclo escolar
 */
export function isWithinSchoolYear(dateString: string): boolean {
  return getSchoolPeriod(dateString) !== null;
}
