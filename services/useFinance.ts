import type { UseMovement, UseMovementCategory, UseMovementType, UsePaymentMethod } from '../types';

/**
 * Catálogos y cálculos compartidos de la Unidad de Consumo Escolar (USE).
 *
 * Vive fuera de los componentes para que la pantalla y el reporte en PDF usen
 * exactamente las mismas etiquetas y el mismo cálculo de totales.
 */

export const USE_CATEGORY_LABELS: Record<UseMovementCategory, string> = {
    VENTA: 'Venta de productos',
    ALIMENTOS: 'Alimentos / Cooperativa',
    CUOTA: 'Cuota USE',
    DONATIVO: 'Donativo',
    INSUMOS: 'Insumos y mercancía',
    SERVICIOS: 'Servicios (agua, luz, gas)',
    MANTENIMIENTO: 'Mantenimiento y limpieza',
    EQUIPAMIENTO: 'Equipamiento',
    OTRO: 'Otro'
};

export const USE_INCOME_CATEGORIES: UseMovementCategory[] = ['VENTA', 'ALIMENTOS', 'CUOTA', 'DONATIVO', 'OTRO'];
export const USE_EXPENSE_CATEGORIES: UseMovementCategory[] = ['INSUMOS', 'SERVICIOS', 'MANTENIMIENTO', 'EQUIPAMIENTO', 'OTRO'];

export const USE_PAYMENT_LABELS: Record<UsePaymentMethod, string> = {
    EFECTIVO: 'Efectivo',
    TRANSFERENCIA: 'Transferencia',
    TARJETA: 'Tarjeta',
    OTRO: 'Otro'
};

export interface UseSummary {
    income: number;
    expense: number;
    balance: number;
    count: number;
}

/** Suma ingresos y gastos. El monto siempre es positivo; el tipo da el signo. */
export const summarizeUseMovements = (movements: UseMovement[]): UseSummary => {
    let income = 0;
    let expense = 0;

    (movements || []).forEach(m => {
        const amount = Number(m.amount) || 0;
        if (m.type === 'INCOME') income += amount;
        else expense += amount;
    });

    return { income, expense, balance: income - expense, count: (movements || []).length };
};

/** Formatea montos en pesos mexicanos. */
export const formatUseMoney = (value: number) =>
    (Number(value) || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });

/**
 * Formatea una fecha YYYY-MM-DD fijando el mediodía local, para evitar el
 * desfase de un día que produce interpretar la fecha como UTC.
 */
export const formatUseDate = (date?: string) => {
    if (!date) return '—';
    const parsed = new Date(`${date.slice(0, 10)}T12:00:00`);
    if (isNaN(parsed.getTime())) return date;
    return parsed.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};

/** Etiqueta legible de un periodo YYYY-MM ("septiembre de 2026"). */
export const formatUsePeriod = (period: string) => {
    if (period === 'ALL') return 'Todo el historial';
    const parsed = new Date(`${period}-01T12:00:00`);
    if (isNaN(parsed.getTime())) return period;
    return parsed.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
};

export type { UseMovementType };
