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
 * Puntos de apoyo que el docente otorga a mano ("punto sorpresa", participación,
 * etc.). Se acumulan por trimestre y tienen tope de 1.0 punto.
 */
export const MAX_SUPPORT_POINTS_PER_TRIMESTER = 1;

export const getSupportPoints = (student: any, trimesterIndex: number): number => {
  const raw = (student?.supportPoints || {})[String(trimesterIndex)];
  const lista = Array.isArray(raw) ? raw : [];
  const suma = lista.reduce((acc: number, e: any) => acc + (Number(e?.points) || 0), 0);
  return Math.min(MAX_SUPPORT_POINTS_PER_TRIMESTER, Number(suma.toFixed(2)));
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

  // Promedios por trimestre. `rawTrimAvgs` es la calificación capturada y
  // `trimAvgs` la que se muestra (con el apoyo sumado, sin pasar de 10).
  // El apoyo se suma AL FINAL del cálculo, después de ponderar.
  const rawTrimAvgs = (student.grades || []).map(getTrimesterAvg);
  const supportByTrimester = [0, 1, 2].map(i => getSupportPoints(student, i));
  const trimAvgs = rawTrimAvgs.map((base, i) =>
    base > 0 ? Math.min(10, Number((base + supportByTrimester[i]).toFixed(2))) : 0);

  // Promedio académico (solo calificaciones NEM > 0, sin apoyo)
  const activeTrims = rawTrimAvgs.filter(a => a > 0);
  const academicAvg = activeTrims.length > 0
    ? activeTrims.reduce((a, b) => a + b, 0) / activeTrims.length
    : 0;

  // Apoyo que se aplica al final: el promedio de los apoyos de los trimestres
  // que ya tienen calificación.
  const apoyosActivos = supportByTrimester.filter((_, i) => (rawTrimAvgs[i] || 0) > 0);
  const supportApplied = apoyosActivos.length > 0
    ? apoyosActivos.reduce((a, b) => a + b, 0) / apoyosActivos.length
    : 0;

  // Porcentaje de tareas completadas
  // Una actividad cuenta si es para todos (sin grupo, GLOBAL o TODOS) o si
  // corresponde al grupo del alumno. La comparación ignora espacios y mayúsculas
  // porque conviven valores como "6 A", "6A" y "6a".
  const normalizeGroup = (value?: string) => (value || '').trim().toUpperCase().replace(/\s+/g, '');
  const studentGroupName = normalizeGroup(student.group);
  const studentAssignments = finalAssignments.filter(a => {
    const tg = normalizeGroup(a.targetGroup);
    return !tg || tg === 'GLOBAL' || tg === 'TODOS' || tg === studentGroupName;
  });
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

  // Promedio de actividades interactivas / autocalificables
  const results = student.assignmentResults || {};
  const interactiveScores = Object.values(results).filter(v => typeof v === 'number' && v >= 0 && v <= 10) as number[];
  const interactiveAvg = interactiveScores.length > 0
    ? Number((interactiveScores.reduce((a, b) => a + b, 0) / interactiveScores.length).toFixed(1))
    : 0;

  // Puntaje ponderado para Cuadro de Honor (toma en cuenta académico, autocalificables y avance)
  const progressScore = hwPercentage / 10;
  let honorScore = 0;
  
  const diagnosticAvg = student.diagnosticGrade ? getTrimesterAvg(student.diagnosticGrade) : 0;

  if (academicAvg > 0) {
    if (interactiveAvg > 0) {
      honorScore = (academicAvg * 0.50) + (interactiveAvg * 0.30) + (progressScore * 0.20);
    } else {
      honorScore = (academicAvg * 0.70) + (progressScore * 0.30);
    }
  } else if (diagnosticAvg > 0) {
    // Use diagnostic as initial reference for honor roll if no trimester grades exist
    if (interactiveAvg > 0) {
      honorScore = (diagnosticAvg * 0.50) + (interactiveAvg * 0.30) + (progressScore * 0.20);
    } else {
      honorScore = (diagnosticAvg * 0.70) + (progressScore * 0.30);
    }
  } else {
    if (interactiveAvg > 0) {
      honorScore = (interactiveAvg * 0.60) + (progressScore * 0.40);
    } else {
      honorScore = progressScore;
    }
  }
  const finalHonorScore = Number(honorScore.toFixed(1));

  // ---------------------------------------------------------------------
  // Ponderación configurable (Configuración > Porcentajes de valoración).
  // Antes la boleta mostraba los pesos pero el promedio final NO los aplicaba.
  // Ahora el promedio final es la suma ponderada: académico + tareas +
  // conducta + asistencia, con los porcentajes que el docente configure.
  // ---------------------------------------------------------------------
  const weighted = !!finalConfig?.includeHomeworkInAverage;
  const wAcademic = Number(finalConfig?.academicWeight ?? 70);
  const wHomework = Number(finalConfig?.homeworkWeight ?? 30);
  const wConduct = Number(finalConfig?.conductWeight ?? 0);
  const wAttendance = Number(finalConfig?.attendanceWeight ?? 0);

  // Base académica: los trimestres capturados; si no hay, la evaluación diagnóstica.
  const academicBase = academicAvg > 0 ? academicAvg : diagnosticAvg;
  const academicSource: 'trimestres' | 'diagnostico' | 'sin-datos' =
    academicAvg > 0 ? 'trimestres' : (diagnosticAvg > 0 ? 'diagnostico' : 'sin-datos');

  const homeworkScore = hwPercentage / 10;
  const conductScore = Math.max(5, Math.min(10, 8 + behaviorPoints * 0.1));
  const attendanceScore = attendanceRate / 10;

  const weightedTotal = (academicBase * wAcademic + homeworkScore * wHomework +
    conductScore * wConduct + attendanceScore * wAttendance) / 100;

  const breakdown = {
    weighted,
    academic: Number(academicBase.toFixed(2)),
    homework: Number(homeworkScore.toFixed(2)),
    conduct: Number(conductScore.toFixed(2)),
    attendance: Number(attendanceScore.toFixed(2)),
    wAcademic, wHomework, wConduct, wAttendance,
    academicSource,
    support: Number(supportApplied.toFixed(2)),
    total: Number(Math.min(10, (weighted ? weightedTotal : academicBase) + supportApplied).toFixed(2))
  };

  // Promedio final: ponderado si está activado; si no, solo académico.
  // Los puntos de apoyo se suman al final (después de ponderar) y el total no pasa de 10.
  let finalAvgStr = '-';
  if (weighted) {
    if (academicSource !== 'sin-datos') finalAvgStr = Math.min(10, weightedTotal + supportApplied).toFixed(1);
  } else if (academicAvg > 0) {
    finalAvgStr = Math.min(10, academicAvg + supportApplied).toFixed(1);
  } else if (diagnosticAvg > 0) {
    finalAvgStr = diagnosticAvg.toFixed(1);
  }

  return {
    trimAvgs,
    academicAvg,
    interactiveAvg,
    honorScore: finalHonorScore,
    hwPercentage,
    behaviorPoints,
    attendanceRate,
    academicBase,
    breakdown,
    supportPoints: supportByTrimester,
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
