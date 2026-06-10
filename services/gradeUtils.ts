import { Student, TrimesterGrade, SchoolConfig, AttendanceStatus } from '../types';
import { isSchoolDay } from './schoolCalendarUtils';

// Helper to get cached assignments
const getCachedAssignments = (): any[] => {
  try {
    const cached = localStorage.getItem('SIRILA_CACHE_ASSIGNMENTS');
    return cached ? JSON.parse(cached) : [];
  } catch (e) {
    return [];
  }
};

// Helper to get cached config
const getCachedConfig = (): SchoolConfig | undefined => {
  try {
    const cached = localStorage.getItem('SIRILA_CACHE_CONFIG');
    return cached ? JSON.parse(cached) : undefined;
  } catch (e) {
    return undefined;
  }
};

/**
 * Calcula el promedio de un trimestre individual.
 * Maneja diferentes formatos de calificación (número, objeto con campos NEM).
 * Siempre usa los 4 campos NEM (Lenguajes, Saberes, Ética, Humano) y divide entre 4.
 */
export const getTrimesterAvg = (g: any): number => {
  if (!g) return 0;
  if (typeof g === 'number') return g;
  if (typeof g === 'string') return parseFloat(g) || 0;
  if (typeof g === 'object') {
    // Siempre usar los 4 campos NEM y dividir entre 4
    const suma = Number(g.lenguajes || 0) + Number(g.saberes || 0) + Number(g.etica || 0) + Number(g.humano || 0);
    return suma / 4;
  }
  return 0;
};

/**
 * Calcula el promedio académico de un alumno (solo calificaciones NEM).
 * Retorna el promedio simple de los trimestres con calificación > 0.
 */
export const calculateAcademicAverage = (grades: any[]): number => {
  if (!grades || grades.length === 0) return 0;
  const trimAvgs = grades.map(getTrimesterAvg);
  const activeTrims = trimAvgs.filter(a => a > 0);
  return activeTrims.length > 0 ? activeTrims.reduce((a, b) => a + b, 0) / activeTrims.length : 0;
};

/**
 * Calcula métricas completas de un alumno de forma consistente.
 * Esta es la función CANÓNICA que debe usarse en TODOS los módulos.
 */
export const calculateStudentMetrics = (
  student: Student,
  assignments?: { targetGroup?: string; id: string }[],
  config?: SchoolConfig
) => {
  const finalAssignments = assignments || getCachedAssignments();
  const finalConfig = config || getCachedConfig();

  // Calcular promedios por trimestre
  const trimAvgs = (student.grades || []).map(getTrimesterAvg);

  // Promedio académico (solo calificaciones NEM > 0)
  const activeTrims = trimAvgs.filter(a => a > 0);
  const academicAvg = activeTrims.length > 0
    ? activeTrims.reduce((a, b) => a + b, 0) / activeTrims.length
    : 0;

  // Porcentaje de tareas completadas
  const studentAssignments = finalAssignments.filter(a =>
    !a.targetGroup || a.targetGroup === student.group
  );
  const completedCount = studentAssignments.filter(a =>
    (student.completedAssignmentIds || []).includes(a.id)
  ).length;
  const totalAssignments = studentAssignments.length;
  const hwPercentage = totalAssignments > 0
    ? Math.round((completedCount / totalAssignments) * 100)
    : 0;

  // Puntos de conducta
  const behaviorPoints = student.behaviorPoints || 0;

  // Porcentaje de asistencia
  const schoolDays = Object.entries(student.attendance || {}).filter(([date]) => isSchoolDay(date));
  const totalDays = schoolDays.length;
  const presentDays = schoolDays.filter(([_, status]) => 
    status === AttendanceStatus.PRESENT || status === AttendanceStatus.LATE
  ).length;
  const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 100;

  // Promedio final (con ponderación de tareas/conducta/asistencia si está activado)
  let finalAvgStr = '-';
  if (academicAvg > 0) {
    if (finalConfig?.includeHomeworkInAverage) {
      const academicW = (finalConfig.academicWeight ?? 70) / 100;
      const homeworkW = (finalConfig.homeworkWeight ?? 30) / 100;
      const conductW = (finalConfig.conductWeight ?? 0) / 100;
      const attendanceW = (finalConfig.attendanceWeight ?? 0) / 100;

      const hwScore = hwPercentage / 10;
      const conductScore = Math.max(5, Math.min(10, 8 + (behaviorPoints * 0.1)));
      const attendanceScore = attendanceRate / 10;

      let weightedAvg = (academicAvg * academicW) + 
                         (hwScore * homeworkW) + 
                         (conductScore * conductW) + 
                         (attendanceScore * attendanceW);
                         
      const totalW = academicW + homeworkW + conductW + attendanceW;
      
      // Ajustar si la suma de pesos es mayor a 0 y no es exactamente 1.0 (evita divisiones raras si está en edición)
      if (totalW > 0 && Math.abs(totalW - 1) > 0.01) {
        weightedAvg = weightedAvg / totalW;
      }
      finalAvgStr = Math.min(10, weightedAvg).toFixed(1);
    } else {
      finalAvgStr = academicAvg.toFixed(1);
    }
  }

  return {
    trimAvgs,
    academicAvg,
    hwPercentage,
    behaviorPoints,
    attendanceRate,
    finalAvg: finalAvgStr
  };
};

/**
 * Calcula el promedio global de un estudiante para reportes y análisis.
 * Retorna el promedio final ponderado o académico como número (sin formato).
 */
export const getStudentGlobalAverage = (
  student: Student,
  assignments?: any[],
  config?: SchoolConfig
): number => {
  const metrics = calculateStudentMetrics(student, assignments, config);
  return metrics.finalAvg === '-' ? 0 : parseFloat(metrics.finalAvg);
};
