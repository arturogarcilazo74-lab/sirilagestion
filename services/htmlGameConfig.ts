import type { Assignment, CampoFormativo } from '../types';

/**
 * Configuración que se inyecta en el HTML de una actividad interactiva antes
 * de montarla en el iframe.
 *
 * El archivo HTML debe leer `window.SIRILA_CONFIG` y usar los cuatro campos
 * cuando no exista, para que el mismo documento siga funcionando abierto por
 * separado (por ejemplo, para imprimirlo o revisarlo sin la plataforma).
 */

export const DEFAULT_GAME_FIELDS: CampoFormativo[] = ['Lenguajes', 'Saberes', 'Etica', 'Humano'];

export interface GameConfig {
    assignmentId: string;
    title: string;
    fields: CampoFormativo[];
    maxAttempts: number;
    /**
     * Marca de la última reapertura. Cambia cuando el docente reabre la
     * actividad, y permite que el HTML empiece con el estado limpio en lugar
     * de recuperar las respuestas ya bloqueadas del intento anterior.
     */
    reopenedAt: string | null;
}

/** Construye el objeto de configuración de una actividad. */
export const buildGameConfig = (assignment: Assignment, reopenedAt?: string | null): GameConfig => {
    const enabled = assignment.enabledFields;

    return {
        assignmentId: assignment.id,
        title: assignment.title,
        fields: enabled && enabled.length > 0 ? enabled : DEFAULT_GAME_FIELDS,
        maxAttempts: assignment.maxAttempts ?? 1,
        reopenedAt: reopenedAt || null
    };
};

/**
 * Inserta el bloque de configuración dentro del HTML.
 *
 * Se coloca justo después de `<head>` para que exista antes de que el propio
 * documento ejecute sus scripts. El `<` del JSON se escapa para que nunca
 * pueda cerrar la etiqueta `script`.
 */
export const injectGameConfig = (htmlContent: string, assignment: Assignment, reopenedAt?: string | null): string => {
    const html = htmlContent || '';
    const config = buildGameConfig(assignment, reopenedAt);
    const script = `<script>window.SIRILA_CONFIG=${JSON.stringify(config).replace(/</g, '\\u003c')};<\/script>`;

    if (/<head[^>]*>/i.test(html)) {
        return html.replace(/<head[^>]*>/i, (match: string) => match + script);
    }
    if (/<html[^>]*>/i.test(html)) {
        return html.replace(/<html[^>]*>/i, (match: string) => match + script);
    }
    return script + html;
};

/** Devuelve el HTML listo para el iframe de una actividad HTML_GAME. */
export const buildGameSrcDoc = (assignment: Assignment, reopenedAt?: string | null): string => {
    const data = assignment.interactiveData;
    const html = data && data.type === 'HTML_GAME' ? (data.htmlContent || '') : '';
    return injectGameConfig(html, assignment, reopenedAt);
};
