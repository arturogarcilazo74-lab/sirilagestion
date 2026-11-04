import React, { useMemo, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Download, Plus, ShoppingBasket, Trash2, Wallet } from 'lucide-react';
import type { UseMovement, UseMovementType, UseMovementCategory, UsePaymentMethod } from '../types';

const USE_CATEGORY_LABELS: Record<UseMovementCategory, string> = {
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

const USE_INCOME_CATEGORIES: UseMovementCategory[] = ['VENTA', 'ALIMENTOS', 'CUOTA', 'DONATIVO', 'OTRO'];
const USE_EXPENSE_CATEGORIES: UseMovementCategory[] = ['INSUMOS', 'SERVICIOS', 'MANTENIMIENTO', 'EQUIPAMIENTO', 'OTRO'];

const USE_PAYMENT_LABELS: Record<UsePaymentMethod, string> = {
    EFECTIVO: 'Efectivo',
    TRANSFERENCIA: 'Transferencia',
    TARJETA: 'Tarjeta',
    OTRO: 'Otro'
};

/** Formatea montos en pesos mexicanos. */
const money = (value: number) =>
    value.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });

/**
 * Formatea una fecha YYYY-MM-DD fijando el mediodía local.
 * Evita el desfase de un día que produce interpretar la fecha como UTC.
 */
const formatDate = (date?: string) => {
    if (!date) return '—';
    const parsed = new Date(`${date.slice(0, 10)}T12:00:00`);
    if (isNaN(parsed.getTime())) return date;
    return parsed.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};

const currentMonth = () => new Date().toISOString().slice(0, 7);

interface UseFinanceSectionProps {
    movements: UseMovement[];
    onAddMovement?: (movement: Omit<UseMovement, 'id' | 'createdAt'>) => void;
    onDeleteMovement?: (id: string) => void;
    readOnly?: boolean;
}

/**
 * Unidad de Consumo Escolar (USE): libro de ingresos y gastos de la tienda
 * escolar. Se mantiene aparte de las cuotas y eventos del aula para que el
 * balance de la cooperativa no se mezcle con el dinero de las cuotas.
 */
export const UseFinanceSection: React.FC<UseFinanceSectionProps> = ({
    movements = [],
    onAddMovement,
    onDeleteMovement,
    readOnly
}) => {
    // Por defecto se muestra todo el historial: si el periodo arrancara en el
    // mes en curso, un cambio de mes haría parecer que se perdieron los datos.
    const [period, setPeriod] = useState<string>('ALL');
    const [typeFilter, setTypeFilter] = useState<'ALL' | UseMovementType>('ALL');
    const [isAdding, setIsAdding] = useState(false);

    // Formulario
    const [movType, setMovType] = useState<UseMovementType>('INCOME');
    const [movDate, setMovDate] = useState(new Date().toISOString().split('T')[0]);
    const [movConcept, setMovConcept] = useState('');
    const [movCategory, setMovCategory] = useState<UseMovementCategory>('VENTA');
    const [movAmount, setMovAmount] = useState('');
    const [movMethod, setMovMethod] = useState<UsePaymentMethod>('EFECTIVO');
    const [movReceipt, setMovReceipt] = useState('');
    const [movResponsible, setMovResponsible] = useState('');
    const [movNotes, setMovNotes] = useState('');

    const periods = useMemo(() => {
        const found = movements.map(m => (m.date || '').slice(0, 7)).filter(Boolean);
        return Array.from(new Set([currentMonth(), ...found])).sort().reverse();
    }, [movements]);

    const filtered = useMemo(() => {
        return movements
            .filter(m => (period === 'ALL' || (m.date || '').startsWith(period)) && (typeFilter === 'ALL' || m.type === typeFilter))
            .sort((a, b) => {
                const byDate = (b.date || '').localeCompare(a.date || '');
                if (byDate !== 0) return byDate;
                return (b.createdAt || '').localeCompare(a.createdAt || '');
            });
    }, [movements, period, typeFilter]);

    const { income, expense } = useMemo(() => {
        let income = 0;
        let expense = 0;
        filtered.forEach(m => {
            const amount = Number(m.amount) || 0;
            if (m.type === 'INCOME') income += amount;
            else expense += amount;
        });
        return { income, expense };
    }, [filtered]);

    const balance = income - expense;

    const changeType = (nextType: UseMovementType) => {
        setMovType(nextType);
        const allowed = nextType === 'INCOME' ? USE_INCOME_CATEGORIES : USE_EXPENSE_CATEGORIES;
        if (!allowed.includes(movCategory)) setMovCategory(allowed[0]);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(movAmount);
        if (!movConcept.trim()) {
            alert('Escribe el concepto del movimiento.');
            return;
        }
        if (!isFinite(amount) || amount <= 0) {
            alert('El monto debe ser un número mayor a 0.');
            return;
        }
        onAddMovement?.({
            date: movDate || new Date().toISOString().split('T')[0],
            type: movType,
            concept: movConcept.trim(),
            category: movCategory,
            amount,
            paymentMethod: movMethod,
            receiptNumber: movReceipt.trim() || undefined,
            responsible: movResponsible.trim() || undefined,
            notes: movNotes.trim() || undefined
        });
        setMovConcept('');
        setMovAmount('');
        setMovReceipt('');
        setMovNotes('');
        setIsAdding(false);
    };

    const handleExportCSV = () => {
        const header = ['Fecha', 'Tipo', 'Concepto', 'Categoria', 'Metodo', 'Folio', 'Responsable', 'Monto', 'Notas'];
        const rows = filtered.map(m => [
            m.date,
            m.type === 'INCOME' ? 'Ingreso' : 'Gasto',
            m.concept,
            USE_CATEGORY_LABELS[m.category] || m.category,
            m.paymentMethod ? USE_PAYMENT_LABELS[m.paymentMethod] : '',
            m.receiptNumber || '',
            m.responsible || '',
            (Number(m.amount) || 0).toFixed(2),
            m.notes || ''
        ]);
        const csv = [header, ...rows]
            .map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
            .join('\r\n');
        // BOM para que Excel respete los acentos.
        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `USE_${period === 'ALL' ? 'historico' : period}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const categoryOptions = movType === 'INCOME' ? USE_INCOME_CATEGORIES : USE_EXPENSE_CATEGORIES;

    return (
        <div className="space-y-6 animate-fadeIn">
            <div>
                <h3 className="text-xl font-bold text-slate-800">Unidad de Consumo Escolar (USE)</h3>
                <p className="text-sm text-slate-500">Ingresos y gastos de la tienda escolar, independientes de las cuotas del aula.</p>
            </div>

            {/* Indicadores del periodo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card p-6 rounded-2xl flex items-center gap-4">
                    <div className="p-4 bg-emerald-100 text-emerald-600 rounded-full">
                        <ArrowUpCircle size={30} />
                    </div>
                    <div>
                        <div className="text-xs text-slate-500 font-bold uppercase">Ingresos</div>
                        <div className="text-2xl font-black text-emerald-600">{money(income)}</div>
                    </div>
                </div>

                <div className="glass-card p-6 rounded-2xl flex items-center gap-4">
                    <div className="p-4 bg-rose-100 text-rose-600 rounded-full">
                        <ArrowDownCircle size={30} />
                    </div>
                    <div>
                        <div className="text-xs text-slate-500 font-bold uppercase">Gastos</div>
                        <div className="text-2xl font-black text-rose-600">{money(expense)}</div>
                    </div>
                </div>

                <div className={`glass-card p-6 rounded-2xl flex items-center gap-4 border-2 ${balance < 0 ? 'border-rose-200' : 'border-emerald-200'}`}>
                    <div className={`p-4 rounded-full ${balance < 0 ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'}`}>
                        <Wallet size={30} />
                    </div>
                    <div>
                        <div className="text-xs text-slate-500 font-bold uppercase">Balance</div>
                        <div className={`text-2xl font-black ${balance < 0 ? 'text-rose-600' : 'text-slate-800'}`}>{money(balance)}</div>
                        <div className={`text-xs font-bold ${balance < 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                            {balance < 0 ? 'Déficit en el periodo' : 'Superávit en el periodo'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Filtros y acciones */}
            <div className="glass-card p-4 rounded-2xl flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex flex-wrap items-end gap-3">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Periodo</label>
                        <select
                            value={period}
                            onChange={e => setPeriod(e.target.value)}
                            className="p-2.5 border border-slate-300 rounded-lg bg-white text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option value="ALL">Todo el historial</option>
                            {periods.map(p => (
                                <option key={p} value={p}>
                                    {new Date(`${p}-01T12:00:00`).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
                        <select
                            value={typeFilter}
                            onChange={e => setTypeFilter(e.target.value as 'ALL' | UseMovementType)}
                            className="p-2.5 border border-slate-300 rounded-lg bg-white text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option value="ALL">Todos</option>
                            <option value="INCOME">Solo ingresos</option>
                            <option value="EXPENSE">Solo gastos</option>
                        </select>
                    </div>

                    <div className="text-xs text-slate-400 font-medium pb-3">
                        {filtered.length} movimiento(s)
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={handleExportCSV}
                        disabled={filtered.length === 0}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border transition-all ${filtered.length === 0
                            ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 shadow-sm'
                            }`}
                    >
                        <Download size={16} />
                        Exportar CSV
                    </button>

                    {!readOnly && (
                        <button
                            onClick={() => setIsAdding(v => !v)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-200 active:scale-95"
                        >
                            <Plus size={16} />
                            {isAdding ? 'Cerrar' : 'Nuevo movimiento'}
                        </button>
                    )}
                </div>
            </div>

            {/* Formulario de alta */}
            {isAdding && !readOnly && (
                <form onSubmit={handleSubmit} className="glass-card p-6 rounded-2xl border-2 border-indigo-100 space-y-4 animate-fadeIn">
                    <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-full md:w-80">
                        <button
                            type="button"
                            onClick={() => changeType('INCOME')}
                            className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${movType === 'INCOME' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Ingreso
                        </button>
                        <button
                            type="button"
                            onClick={() => changeType('EXPENSE')}
                            className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${movType === 'EXPENSE' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Gasto
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Fecha</label>
                            <input
                                type="date"
                                value={movDate}
                                onChange={e => setMovDate(e.target.value)}
                                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-1">Concepto</label>
                            <input
                                type="text"
                                value={movConcept}
                                onChange={e => setMovConcept(e.target.value)}
                                placeholder={movType === 'INCOME' ? 'Ej. Venta de sándwiches del recreo' : 'Ej. Compra de refrescos para la tienda'}
                                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80"
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Categoría</label>
                            <select
                                value={movCategory}
                                onChange={e => setMovCategory(e.target.value as UseMovementCategory)}
                                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80"
                            >
                                {categoryOptions.map(cat => (
                                    <option key={cat} value={cat}>{USE_CATEGORY_LABELS[cat]}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Monto ($)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={movAmount}
                                onChange={e => setMovAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Método de pago</label>
                            <select
                                value={movMethod}
                                onChange={e => setMovMethod(e.target.value as UsePaymentMethod)}
                                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80"
                            >
                                {(Object.keys(USE_PAYMENT_LABELS) as UsePaymentMethod[]).map(method => (
                                    <option key={method} value={method}>{USE_PAYMENT_LABELS[method]}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Folio / comprobante</label>
                            <input
                                type="text"
                                value={movReceipt}
                                onChange={e => setMovReceipt(e.target.value)}
                                placeholder="Opcional"
                                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Responsable</label>
                            <input
                                type="text"
                                value={movResponsible}
                                onChange={e => setMovResponsible(e.target.value)}
                                placeholder="Quién registra o autoriza"
                                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Notas</label>
                            <input
                                type="text"
                                value={movNotes}
                                onChange={e => setMovNotes(e.target.value)}
                                placeholder="Opcional"
                                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setIsAdding(false)}
                            className="px-4 py-3 bg-slate-100 text-slate-600 rounded-lg font-bold hover:bg-slate-200 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className={`px-6 py-3 text-white rounded-lg font-bold transition-colors ${movType === 'INCOME' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
                        >
                            Registrar {movType === 'INCOME' ? 'ingreso' : 'gasto'}
                        </button>
                    </div>
                </form>
            )}

            {/* Libro de movimientos */}
            <div className="glass-card rounded-2xl overflow-hidden">
                {filtered.length === 0 ? (
                    <div className="text-center py-16 text-slate-400 bg-slate-50/50">
                        <ShoppingBasket size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="font-medium">
                            {movements.length === 0 ? 'Aún no hay movimientos registrados en la USE.' : 'No hay movimientos en el periodo seleccionado.'}
                        </p>
                        <p className="text-sm">
                            {movements.length === 0 && !readOnly ? 'Registra el primer ingreso o gasto de la tienda escolar.' : 'Cambia el periodo o el tipo de movimiento.'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left">
                            <thead>
                                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                                    <th className="py-3 px-4 font-bold">Fecha</th>
                                    <th className="py-3 px-4 font-bold">Concepto</th>
                                    <th className="py-3 px-4 font-bold">Categoría</th>
                                    <th className="py-3 px-4 font-bold">Método</th>
                                    <th className="py-3 px-4 font-bold">Folio</th>
                                    <th className="py-3 px-4 font-bold text-right">Monto</th>
                                    {!readOnly && <th className="py-3 px-4 font-bold text-center">Acción</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(m => {
                                    const isIncome = m.type === 'INCOME';
                                    return (
                                        <tr key={m.id} className="border-t border-slate-100 hover:bg-slate-50/70 transition-colors">
                                            <td className="py-3 px-4 text-sm text-slate-600 whitespace-nowrap">{formatDate(m.date)}</td>
                                            <td className="py-3 px-4">
                                                <div className="font-semibold text-slate-800">{m.concept}</div>
                                                {(m.notes || m.responsible) && (
                                                    <div className="text-xs text-slate-400">
                                                        {m.notes}{m.notes && m.responsible ? ' • ' : ''}{m.responsible ? `Registró: ${m.responsible}` : ''}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-slate-600 whitespace-nowrap">{USE_CATEGORY_LABELS[m.category] || m.category}</td>
                                            <td className="py-3 px-4 text-sm text-slate-600 whitespace-nowrap">{m.paymentMethod ? USE_PAYMENT_LABELS[m.paymentMethod] : '—'}</td>
                                            <td className="py-3 px-4 text-sm text-slate-500 whitespace-nowrap">{m.receiptNumber || '—'}</td>
                                            <td className={`py-3 px-4 text-right font-bold whitespace-nowrap ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {isIncome ? '+' : '−'}{money(Number(m.amount) || 0)}
                                            </td>
                                            {!readOnly && (
                                                <td className="py-3 px-4 text-center">
                                                    <button
                                                        onClick={() => {
                                                            if (window.confirm(`¿Eliminar el ${isIncome ? 'ingreso' : 'gasto'} "${m.concept}"? Esta acción no se puede deshacer.`)) {
                                                                onDeleteMovement?.(m.id);
                                                            }
                                                        }}
                                                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Eliminar movimiento"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
