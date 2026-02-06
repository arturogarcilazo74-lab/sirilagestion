import React, { useState } from 'react';
import { Student, FinanceEvent } from '../types';
import { DollarSign, CreditCard, Plus, Trash2, Calendar, TrendingUp, CheckCircle, Circle, AlertCircle, Users, PieChart, Wallet } from 'lucide-react';

interface FinanceViewProps {
    students: Student[];
    financeEvents: FinanceEvent[];
    onUpdateStudentFee: (studentId: string, paid: boolean) => void;
    onAddEvent: (event: Omit<FinanceEvent, 'id' | 'contributions'>) => void;
    onDeleteEvent: (eventId: string) => void;
    onUpdateContribution: (eventId: string, studentId: string, amount: number) => void;
    readOnly?: boolean;
}

export const FinanceView: React.FC<FinanceViewProps> = ({
    students,
    financeEvents,
    onUpdateStudentFee,
    onAddEvent,
    onDeleteEvent,
    onUpdateContribution,
    readOnly
}) => {
    const [activeTab, setActiveTab] = useState<'ANNUAL' | 'EVENTS' | 'EXAMS'>('ANNUAL');
    const [isAddingEvent, setIsAddingEvent] = useState(false);

    // New Event Form State
    const [newEventTitle, setNewEventTitle] = useState('');
    const [newEventCost, setNewEventCost] = useState('');
    const [newEventDate, setNewEventDate] = useState(new Date().toISOString().split('T')[0]);

    // Annual Fee Stats
    const paidCount = students.filter(s => s.annualFeePaid).length;
    const totalStudents = students.length;
    const annualProgress = totalStudents > 0 ? Math.round((paidCount / totalStudents) * 100) : 0;
    const estimatedAnnualTotal = totalStudents * 350; // Assuming 350 is the fee, can be configurable later
    const collectedAnnualTotal = paidCount * 350;

    const handleCreateEvent = (e: React.FormEvent) => {
        e.preventDefault();
        if (newEventTitle && newEventCost) {
            const costValue = parseFloat(newEventCost);

            // If EXAMS tab, input is Cost Per Student. If EVENTS tab, input is Total Cost.
            const totalCost = activeTab === 'EXAMS' ? costValue * students.length : costValue;
            const costPerStudent = activeTab === 'EXAMS' ? costValue : costValue / (students.length || 1);

            onAddEvent({
                title: newEventTitle,
                totalCost: totalCost,
                date: newEventDate,
                costPerStudent: costPerStudent,
                category: activeTab === 'EXAMS' ? 'EXAM' : 'EVENT'
            });
            setNewEventTitle('');
            setNewEventCost('');
            setIsAddingEvent(false);
        }
    };

    const filteredEvents = financeEvents.filter(e => {
        if (activeTab === 'EXAMS') return e.category === 'EXAM';
        if (activeTab === 'EVENTS') return e.category === 'EVENT' || !e.category; // Default to EVENT for old data
        return false;
    });

    return (
        <div className="space-y-6 animate-fadeIn pb-10">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Finanzas del Aula</h2>
                    <p className="text-slate-500 font-medium">Gestión de cuotas anuales, eventos y exámenes</p>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('ANNUAL')}
                        className={`px-4 md:px-6 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${activeTab === 'ANNUAL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Cuota Anual
                    </button>
                    <button
                        onClick={() => setActiveTab('EVENTS')}
                        className={`px-4 md:px-6 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${activeTab === 'EVENTS' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Eventos
                    </button>
                    <button
                        onClick={() => setActiveTab('EXAMS')}
                        className={`px-4 md:px-6 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${activeTab === 'EXAMS' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Exámenes
                    </button>
                </div>
            </header>

            {/* ANNUAL FEE TAB */}
            {activeTab === 'ANNUAL' && (
                <div className="space-y-6 animate-fadeIn">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="glass-card p-6 rounded-2xl flex items-center gap-4">
                            <div className="p-4 bg-emerald-100 text-emerald-600 rounded-full">
                                <DollarSign size={32} />
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 font-bold uppercase">Recaudado (Estimado)</div>
                                <div className="text-3xl font-black text-slate-800">${collectedAnnualTotal.toLocaleString()}</div>
                                <div className="text-xs text-emerald-600 font-bold">de ${estimatedAnnualTotal.toLocaleString()}</div>
                            </div>
                        </div>

                        <div className="glass-card p-6 rounded-2xl flex items-center gap-4">
                            <div className="p-4 bg-blue-100 text-blue-600 rounded-full">
                                <Users size={32} />
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 font-bold uppercase">Alumnos al Corriente</div>
                                <div className="text-3xl font-black text-slate-800">{paidCount} <span className="text-lg text-slate-400 font-medium">/ {totalStudents}</span></div>
                                <div className="text-xs text-blue-600 font-bold">{annualProgress}% del grupo</div>
                            </div>
                        </div>

                        <div className="glass-card p-6 rounded-2xl flex flex-col justify-center">
                            <div className="flex justify-between text-sm font-bold text-slate-600 mb-2">
                                <span>Progreso de Recaudación</span>
                                <span>{annualProgress}%</span>
                            </div>
                            <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-1000"
                                    style={{ width: `${annualProgress}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>

                    {/* Student List */}
                    <div className="glass-card rounded-2xl overflow-hidden">
                        <div className="p-6 border-b border-slate-200/60 bg-white/50 backdrop-blur-sm flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 text-lg">Estado de Pagos - Cuota Anual</h3>
                            <div className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                                Cuota sugerida: $350.00
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/80 text-slate-500 text-xs uppercase font-bold">
                                    <tr>
                                        <th className="p-4">Estudiante</th>
                                        <th className="p-4 text-center">Estado</th>
                                        <th className="p-4 text-right">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {students.map(student => (
                                        <tr key={student.id} className="hover:bg-indigo-50/30 transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <img
                                                        src={student.avatar === "PENDING_LOAD" ? `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=random` : (student.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=random`)}
                                                        alt=""
                                                        className="w-10 h-10 rounded-full border border-slate-200 object-cover"
                                                    />
                                                    <div>
                                                        <div className="font-bold text-slate-800">{student.name}</div>
                                                        <div className="text-xs text-slate-500">ID: {student.id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                {student.annualFeePaid ? (
                                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200">
                                                        <CheckCircle size={14} /> PAGADO
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold border border-red-200">
                                                        <AlertCircle size={14} /> PENDIENTE
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                <button
                                                    onClick={() => onUpdateStudentFee(student.id, !student.annualFeePaid)}
                                                    disabled={readOnly}
                                                    className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${readOnly
                                                        ? 'opacity-50 cursor-not-allowed bg-slate-100 text-slate-400'
                                                        : student.annualFeePaid
                                                            ? 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200'
                                                        }`}
                                                >
                                                    {student.annualFeePaid ? 'Marcar como Pendiente' : 'Registrar Pago'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* EVENTS & EXAMS TABS */}
            {(activeTab === 'EVENTS' || activeTab === 'EXAMS') && (
                <div className="space-y-6 animate-fadeIn">
                    <div className="flex justify-end">
                        {!readOnly && (
                            <button
                                onClick={() => setIsAddingEvent(true)}
                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-200 active:scale-95"
                            >
                                <Plus size={20} />
                                {activeTab === 'EXAMS' ? 'Nuevo Examen' : 'Nuevo Evento'}
                            </button>
                        )}
                    </div>

                    {isAddingEvent && (
                        <div className="glass-card p-6 rounded-2xl animate-fadeIn border-2 border-indigo-100">
                            <h3 className="font-bold text-slate-800 mb-4">
                                {activeTab === 'EXAMS' ? 'Registrar Costo de Examen' : 'Crear Nuevo Evento Financiero'}
                            </h3>
                            <form onSubmit={handleCreateEvent} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                <div className="md:col-span-1">
                                    <label className="block text-sm font-bold text-slate-700 mb-1">
                                        {activeTab === 'EXAMS' ? 'Nombre del Examen' : 'Nombre del Evento'}
                                    </label>
                                    <input
                                        type="text"
                                        value={newEventTitle}
                                        onChange={e => setNewEventTitle(e.target.value)}
                                        placeholder={activeTab === 'EXAMS' ? "Ej. Examen Bloque 1" : "Ej. Posada Navideña"}
                                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">
                                        {activeTab === 'EXAMS' ? 'Costo por Alumno ($)' : 'Costo Total ($)'}
                                    </label>
                                    <input
                                        type="number"
                                        value={newEventCost}
                                        onChange={e => setNewEventCost(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button type="submit" className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors">
                                        Crear
                                    </button>
                                    <button type="button" onClick={() => setIsAddingEvent(false)} className="px-4 py-3 bg-slate-100 text-slate-600 rounded-lg font-bold hover:bg-slate-200 transition-colors">
                                        Cancelar
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-8">
                        {filteredEvents.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                                <Wallet size={48} className="mx-auto mb-4 opacity-20" />
                                <p className="font-medium">No hay {activeTab === 'EXAMS' ? 'exámenes' : 'eventos'} registrados.</p>
                                <p className="text-sm">Crea uno nuevo para gestionar los pagos.</p>
                            </div>
                        ) : (
                            filteredEvents.map(event => {
                                const collected = Object.values(event.contributions || {}).reduce((a, b) => a + b, 0);
                                const progress = Math.min(100, Math.round((collected / event.totalCost) * 100));
                                const costPerStudent = event.costPerStudent || (event.totalCost / students.length);

                                return (
                                    <div key={event.id} className="glass-card rounded-2xl overflow-hidden">
                                        <div className="p-6 border-b border-slate-200/60 bg-white/50 backdrop-blur-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <h3 className="font-bold text-slate-800 text-xl">{event.title}</h3>
                                                    <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded">{new Date(event.date).toLocaleDateString()}</span>
                                                    {event.category === 'EXAM' && <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded">EXAMEN</span>}
                                                </div>
                                                <p className="text-sm text-slate-500 mt-1">
                                                    {event.category === 'EXAM' ? (
                                                        <>Costo por Alumno: <span className="font-bold text-slate-700">${costPerStudent.toFixed(2)}</span></>
                                                    ) : (
                                                        <>Meta: <span className="font-bold text-slate-700">${event.totalCost.toLocaleString()}</span> <span className="mx-2">•</span> Por Alumno: <span className="font-bold text-slate-700">${costPerStudent.toFixed(2)}</span></>
                                                    )}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-4 w-full md:w-auto">
                                                <div className="flex-1 md:w-48">
                                                    <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                                                        <span>Recaudado: ${collected.toLocaleString()}</span>
                                                        <span>{progress}%</span>
                                                    </div>
                                                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full ${progress >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${progress}%` }}></div>
                                                    </div>
                                                </div>
                                                {!readOnly && (
                                                    <button
                                                        onClick={() => window.confirm('¿Eliminar este registro?') && onDeleteEvent(event.id)}
                                                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 size={20} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-4 bg-slate-50/30">
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {students.map(student => {
                                                    const paidAmount = event.contributions?.[student.id] || 0;
                                                    const isFullyPaid = paidAmount >= costPerStudent;

                                                    return (
                                                        <div key={student.id} className={`p-3 rounded-xl border flex items-center justify-between ${isFullyPaid ? 'bg-emerald-50/50 border-emerald-100' : 'bg-white border-slate-200'}`}>
                                                            <div className="flex items-center gap-2 overflow-hidden">
                                                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isFullyPaid ? 'bg-emerald-500' : 'bg-red-400'}`}></div>
                                                                <span className="text-sm font-bold text-slate-700 truncate">{student.name}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className={`text-xs font-bold ${isFullyPaid ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                                    ${paidAmount}
                                                                </span>
                                                                <button
                                                                    onClick={() => {
                                                                        const newAmount = isFullyPaid ? 0 : costPerStudent;
                                                                        onUpdateContribution(event.id, student.id, newAmount);
                                                                    }}
                                                                    disabled={readOnly}
                                                                    className={`p-1.5 rounded-lg transition-colors ${readOnly ? 'opacity-50 cursor-not-allowed bg-slate-100 text-slate-400' : isFullyPaid ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200' : 'bg-slate-100 text-slate-400 hover:bg-indigo-100 hover:text-indigo-600'}`}
                                                                >
                                                                    {isFullyPaid ? <CheckCircle size={14} /> : <Plus size={14} />}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
