// Calendario Escolar 2025-2026 - SEP México

export interface SchoolPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

// Periodos del ciclo escolar
export const SCHOOL_PERIODS: SchoolPeriod[] = [
  {
    id: 'P1',
    name: 'Primer Periodo',
    startDate: '2025-09-01',
    endDate: '2025-11-28'
  },
  {
    id: 'P2',
    name: 'Segundo Periodo',
    startDate: '2026-01-12',
    endDate: '2026-03-27'
  },
  {
    id: 'P3',
    name: 'Tercer Periodo',
    startDate: '2026-04-13',
    endDate: '2026-07-15'
  }
];

// Días de suspensión y actividades sin clases
const SUSPENSION_DAYS: Record<string, string> = {
  // Primer Periodo
  '2025-09-16': 'Aniversario de la Independencia de México',
  '2025-09-26': 'Primera sesión CTE',
  '2025-10-31': 'Segunda sesión CTE',
  '2025-11-14': 'Descarga administrativa',
  '2025-11-17': 'Puente 20 de noviembre',
  '2025-11-28': 'Tercera sesión CTE',
  
  // Segundo Periodo
  '2026-01-30': 'Cuarta sesión CTE',
  '2026-02-02': 'Aniversario de la Constitución',
  '2026-02-27': 'Quinta sesión CTE',
  '2026-03-13': 'Descarga administrativa',
  '2026-03-16': 'Natalicio de Benito Juárez',
  '2026-03-27': 'Sexta sesión CTE',
  
  // Vacaciones Semana Santa (30 marzo - 10 abril 2026)
  '2026-03-30': 'Vacaciones Semana Santa',
  '2026-03-31': 'Vacaciones Semana Santa',
  '2026-04-01': 'Vacaciones Semana Santa',
  '2026-04-02': 'Vacaciones Semana Santa',
  '2026-04-03': 'Vacaciones Semana Santa',
  '2026-04-06': 'Vacaciones Semana Santa',
  '2026-04-07': 'Vacaciones Semana Santa',
  '2026-04-08': 'Vacaciones Semana Santa',
  '2026-04-09': 'Vacaciones Semana Santa',
  '2026-04-10': 'Vacaciones Semana Santa',
  
  // Tercer Periodo
  '2026-05-01': 'Día del Trabajo',
  '2026-05-05': 'Batalla de Puebla',
  '2026-05-15': 'Día del Maestro',
  '2026-05-29': 'Séptima sesión CTE',
  '2026-06-26': 'Octava sesión CTE',
  '2026-07-03': 'Descarga administrativa'
};

/**
 * Verifica si una fecha es un día escolar válido
 */
export function isSchoolDay(dateString: string): boolean {
  const date = new Date(dateString + 'T00:00:00');
  
  // Verificar si es fin de semana
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }
  
  // Verificar si está dentro del ciclo escolar
  const period = getSchoolPeriod(dateString);
  if (!period) {
    return false;
  }
  
  // Verificar si es día de suspensión
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
 * Obtiene la razón de suspensión de un día
 */
export function getSuspensionReason(dateString: string): string | null {
  return SUSPENSION_DAYS[dateString] || null;
}

/**
 * Obtiene los días escolares de un periodo
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
 * Retorna las fechas eliminadas
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
