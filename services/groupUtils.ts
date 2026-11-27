/** Normaliza los grupos para que "4 A", "4a" y "4A" sean el mismo valor. */
const ESPECIALES = [
    'DIRECCION', 'GENERAL', 'USAER', 'SERVICIOS', 'SUBIRECTOR', 'SUBDIRECCION',
    'AUX INTENDENCIA', 'ED FISICA', 'ED ARTISTICA', 'GLOBAL', 'ADMINISTRATIVO'
];

export const normalizarGrupo = (grupo?: string | null): string => {
    const original = (grupo || '').trim();
    if (!original) return '';

    const limpio = original
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[.,]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    // 1 A -> 1A  |  6 B -> 6B
    const grado = limpio.match(/^([1-6])\s*°?\s*([A-Z])$/);
    if (grado) return `${grado[1]}${grado[2]}`;

    const sinEspacios = limpio.replace(/\s+/g, '');
    if (ESPECIALES.includes(sinEspacios)) {
        return sinEspacios === 'DIRECCION' ? 'Dirección' : limpio;
    }

    return limpio;
};

/** Aplica la normalización a un alumno, una actividad o un docente. */
export const normalizarAlumno = <T extends { group?: string }>(alumno: T): T =>
    ({ ...alumno, group: normalizarGrupo(alumno.group) });

export const normalizarActividad = <T extends { targetGroup?: string }>(actividad: T): T =>
    ({ ...actividad, targetGroup: normalizarGrupo(actividad.targetGroup) });

export const normalizarConfig = <T extends { gradeGroup?: string; staff?: any[] }>(config: T): T => ({
    ...config,
    gradeGroup: normalizarGrupo(config.gradeGroup),
    staff: (config.staff || []).map((s: any) => ({ ...s, group: normalizarGrupo(s.group) }))
});
