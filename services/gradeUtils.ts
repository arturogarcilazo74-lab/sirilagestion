import { Student, TrimesterGrade } from '../types';

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
  assignments: { targetGroup?: string; id: string }[] = []
) => {
  // Calcular promedios por trimestre
  const trimAvgs = (student.grades || []).map(getTrimesterAvg);

  // Promedio académico (solo calificaciones NEM > 0)
  const activeTrims = trimAvgs.filter(a => a > 0);
  const academicAvg = activeTrims.length > 0
    ? activeTrims.reduce((a, b) => a + b, 0) / activeTrims.length
    : 0;

  // Porcentaje de tareas completadas
  const studentAssignments = assignments.filter(a =>
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

  // Promedio final formateado (solo académico, como en StudentsView)
  const finalAvg = academicAvg > 0 ? academicAvg.toFixed(1) : '-';

  return {
    trimAvgs,
    academicAvg,
    hwPercentage,
    behaviorPoints,
    finalAvg
  };
};

/**
 * Calcula el promedio global de un estudiante para reportes y análisis.
 * Retorna el promedio académico como número (sin formato).
 */
export const getStudentGlobalAverage = (student: Student): number => {
  return calculateAcademicAverage(student.grades);
};
