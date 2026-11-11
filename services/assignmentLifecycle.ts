import type { Assignment, Student } from '../types';

/**
 * Reglas de inicio y reapertura de actividades.
 *
 * Vive fuera de los componentes para poder probarse sin navegador: estas dos
 * funciones deciden si un alumno puede hacer una actividad y qué se borra
 * cuando el docente la reabre. Un error aquí afecta calificaciones reales.
 */

export type StartBlockReason = 'COMPLETED' | 'NO_ATTEMPTS';

export interface StartPermission {
    allowed: boolean;
    reason: StartBlockReason | null;
    maxAttempts: number;
    attemptsMade: number;
}

/**
 * ¿Puede el alumno iniciar la actividad?
 *
 * Una actividad entregada queda bloqueada hasta que el docente la reabra,
 * aunque le queden intentos: de lo contrario podría repetirla y reemplazar su
 * calificación sin autorización.
 */
export const canStartAssignment = (
    student: Student | null | undefined,
    assignment: Assignment
): StartPermission => {
    const attemptsMade = student?.assignmentAttempts?.[assignment.id] || 0;
    const maxAttempts = assignment.maxAttempts || 1;
    const isCompleted = !!student?.completedAssignmentIds?.includes(assignment.id);

    if (isCompleted) {
        return { allowed: false, reason: 'COMPLETED', maxAttempts, attemptsMade };
    }
    if (attemptsMade >= maxAttempts) {
        return { allowed: false, reason: 'NO_ATTEMPTS', maxAttempts, attemptsMade };
    }
    return { allowed: true, reason: null, maxAttempts, attemptsMade };
};

/**
 * Devuelve el alumno con la actividad reabierta: deja de estar entregada,
 * vuelve a 0 intentos y la calificación vigente se archiva en el historial
 * (no se pierde, pero deja de contar para el promedio).
 */
export const reopenAssignmentForStudent = (
    student: Student,
    assignmentId: string,
    reopenedAt: string
): Student => {
    const completedAssignmentIds = (student.completedAssignmentIds || []).filter(id => id !== assignmentId);
    const lateAssignmentIds = (student.lateAssignmentIds || []).filter(id => id !== assignmentId);

    const assignmentResults = { ...(student.assignmentResults || {}) };
    const assignmentHistory = { ...(student.assignmentHistory || {}) };
    const assignmentAreaResults = { ...(student.assignmentAreaResults || {}) };

    if (assignmentResults[assignmentId] !== undefined) {
        assignmentHistory[assignmentId] = [
            ...(assignmentHistory[assignmentId] || []),
            { score: assignmentResults[assignmentId], date: reopenedAt }
        ];
        delete assignmentResults[assignmentId];
    }

    // El desglose por campos corresponde a la entrega anterior: ya no aplica.
    delete assignmentAreaResults[assignmentId];

    return {
        ...student,
        completedAssignmentIds,
        lateAssignmentIds,
        assignmentResults,
        assignmentHistory,
        assignmentAreaResults,
        assignmentAttempts: { ...(student.assignmentAttempts || {}), [assignmentId]: 0 },
        assignmentsCompleted: new Set(completedAssignmentIds).size
    };
};
