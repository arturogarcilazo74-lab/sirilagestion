import React, { useState } from 'react';
import { Student, FinanceEvent } from '../types';
import { DollarSign, CreditCard, Plus, Trash2, Calendar, TrendingUp, CheckCircle, Circle, AlertCircle, Users, PieChart, Wallet, Printer } from 'lucide-react';
import { generateFinanceReportPDF } from '../services/pdfGenerator';
import { useAppStore } from '../hooks/useAppStore';

interface FinanceViewProps {
    students: Student[];
    allStudents?: Student[];
    financeEvents: FinanceEvent[];
    onUpdateStudentFee: (studentId: string, paid: boolean, extraData?: Partial<Student>) => void;
    onAddEvent: (event: Omit<FinanceEvent, 'id' | 'contributions'>) => void;
    onDeleteEvent: (eventId: string) => void;
    onUpdateContribution: (eventId: string, studentId: string, amount: number) => void;
    readOnly?: boolean;
}

export const FinanceView: React.FC<FinanceViewProps> = ({
    students,
    allStudents = [],
    financeEvents,
    onUpdateStudentFee,
    onAddEvent,
    onDeleteEvent,
    onUpdateContribution,
    readOnly
}) => {
    const store = useAppStore();
    const config = store.schoolConfig || { schoolName: 'Jaime Nunó', cct: '', zone: '', sector: '', location: '', teacherName: '' };
    const [activeTab, setActiveTab] = useState<'ANNUAL' | 'EVENTS' | 'EXAMS'>('ANNUAL');
    const [isAddingEvent, setIsAddingEvent] = useState(false);

    // New Event Form State
    const [newEventTitle, setNewEventTitle] = useState('');
    const [newEventCost, setNewEventCost] = useState('');
    const [newEventDate, setNewEventDate] = useState(new Date().toISOString().split('T')[0]);

    // Annual Fee Edit Modal State
    const [editingStudentFee, setEditingStudentFee] = useState<Student | null>(null);
    const [feeStatus, setFeeStatus] = useState<'PAGADO' | 'PENDIENTE' | 'PARCIAL'>('PENDIENTE');
    const [feeAbono, setFeeAbono] = useState<number>(0);
    const [feeTotal, setFeeTotal] = useState<number>(350);
    const [tieneHermanos, setTieneHermanos] = useState<boolean>(false);
    const [siblingGrade, setSiblingGrade] = useState<string>('');
    const [siblingSearchQuery, setSiblingSearchQuery] = useState('');
    const [selectedSiblings, setSelectedSiblings] = useState<Student[]>([]);

    // Annual Fee Stats
    const totalStudents = students.length;
    const collectedAnnualTotal = students.reduce((sum, s) => sum + (s.annualFeeAbono || 0), 0);
    const estimatedAnnualTotal = students.reduce((sum, s) => sum + (typeof s.annualFeeTotal === 'number' ? s.annualFeeTotal : 350), 0);
    const paidCount = students.filter(s => s.annualFeePaid || s.annualFeeStatus === 'PAGADO').length;
    const partialCount = students.filter(s => s.annualFeeStatus === 'PARCIAL').length;
    const unpaidCount = totalStudents - paidCount - partialCount;
    const annualProgress = estimatedAnnualTotal > 0 ? Math.round((collectedAnnualTotal / estimatedAnnualTotal) * 100) : 0;

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
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Finanzas del Aula</h2>
                    <p className="text-slate-500 font-medium">Gestión de cuotas anuales, eventos y exámenes</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {activeTab === 'ANNUAL' && (
                        <button
                            onClick={() => {
                                const groupName = students.length > 30 ? 'TODOS' : (students[0]?.group || store.schoolConfig?.gradeGroup || 'TODOS');
                                generateFinanceReportPDF(students, config, groupName);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-xl font-bold text-sm hover:bg-indigo-50 shadow-sm transition-all"
                        >
                            <Printer size={16} />
                            Imprimir Lista
                        </button>
                    )}

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
                                                <div className="flex flex-col items-center gap-1">
                                                    {(student.annualFeePaid || student.annualFeeStatus === 'PAGADO') ? (
                                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200">
                                                            <CheckCircle size={14} /> PAGADO
                                                        </span>
                                                    ) : student.annualFeeStatus === 'PARCIAL' ? (
                                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold border border-amber-200">
                                                            <AlertCircle size={14} /> PARCIAL
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold border border-red-200">
                                                            <AlertCircle size={14} /> PENDIENTE
                                                        </span>
                                                    )}
                                                    {(typeof student.annualFeeAbono === 'number' || typeof student.annualFeeTotal === 'number') && (
                                                        <span className="text-[10px] text-slate-500 font-semibold">
                                                            Abono: ${student.annualFeeAbono || 0} / Total: ${typeof student.annualFeeTotal === 'number' ? student.annualFeeTotal : 350}
                                                        </span>
                                                    )}
                                                    {student.tieneHermanos && (
                                                        <span className="text-[9px] bg-sky-50 text-sky-600 px-1.5 py-0.5 rounded font-bold border border-sky-100">
                                                            Tiene Hermanos {student.siblingGrade ? `(${student.siblingGrade}° Grado)` : ''}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <button
                                                    onClick={() => {
                                                        setEditingStudentFee(student);
                                                        setFeeStatus(student.annualFeeStatus || (student.annualFeePaid ? 'PAGADO' : 'PENDIENTE'));
                                                        setFeeAbono(student.annualFeeAbono || 0);
                                                        setFeeTotal(typeof student.annualFeeTotal === 'number' ? student.annualFeeTotal : 350);
                                                        setTieneHermanos(student.tieneHermanos || false);
                                                        setSiblingGrade(student.siblingGrade || '');
                                                        setSiblingSearchQuery('');
                                                        const linkedIds = student.siblingIds || (student.siblingId ? [student.siblingId] : []);
                                                        const sibs = allStudents.filter(s => linkedIds.includes(s.id));
                                                        setSelectedSiblings(sibs);
                                                    }}
                                                    disabled={readOnly}
                                                    className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${readOnly
                                                        ? 'opacity-50 cursor-not-allowed bg-slate-100 text-slate-400'
                                                        : (student.annualFeePaid || student.annualFeeStatus === 'PAGADO')
                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                                            : student.annualFeeStatus === 'PARCIAL'
                                                                ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                                                                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200'
                                                        }`}
                                                >
                                                    Registrar / Editar Pago
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* MODAL PARA GESTIONAR PAGO DE CUOTA ANUAL */}
                    {editingStudentFee && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slideUp border border-slate-100">
                                <div className="bg-slate-900 p-6 text-white text-left">
                                    <h3 className="text-xl font-bold">Gestionar Cuota Escolar</h3>
                                    <p className="text-slate-400 text-sm mt-1">{editingStudentFee.name}</p>
                                </div>
                                <div className="p-6 space-y-4 text-left">
                                    {/* Estado del Pago */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Estado del Pago</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {(['PENDIENTE', 'PARCIAL', 'PAGADO'] as const).map(status => (
                                                <button
                                                    key={status}
                                                    type="button"
                                                    onClick={() => {
                                                        setFeeStatus(status);
                                                        if (status === 'PAGADO') {
                                                            setFeeAbono(feeTotal);
                                                        }
                                                    }}
                                                    className={`py-2 px-3 rounded-lg font-bold text-xs border text-center transition-all ${
                                                        feeStatus === status
                                                            ? status === 'PAGADO'
                                                                ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                                                                : status === 'PARCIAL'
                                                                ? 'bg-amber-50 border-amber-500 text-amber-700 shadow-sm'
                                                                : 'bg-red-50 border-red-500 text-red-700 shadow-sm'
                                                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    {status === 'PAGADO' ? 'Pagado' : status === 'PARCIAL' ? 'Abono / Parcial' : 'Pendiente'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Cuota Total */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Costo de la Cuota ($)</label>
                                        <input
                                            type="number"
                                            value={feeTotal}
                                            onChange={e => setFeeTotal(parseFloat(e.target.value) || 0)}
                                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500 bg-white"
                                        />
                                    </div>

                                    {/* Monto Abonado (solo si es parcial) */}
                                    {feeStatus === 'PARCIAL' && (
                                        <div className="animate-slideDown">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Monto del Abono ($)</label>
                                            <input
                                                type="number"
                                                value={feeAbono}
                                                onChange={e => setFeeAbono(parseFloat(e.target.value) || 0)}
                                                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500 bg-white"
                                                placeholder="Ingresa el abono..."
                                            />
                                        </div>
                                    )}

                                    {/* Tiene hermanos checkbox */}
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={tieneHermanos}
                                                onChange={e => {
                                                    const checked = e.target.checked;
                                                    setTieneHermanos(checked);
                                                    if (!checked) {
                                                        setSelectedSiblings([]);
                                                        setSiblingGrade('');
                                                    }
                                                }}
                                                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                            />
                                            <span className="text-sm font-bold text-slate-700">Tiene hermanos inscritos en la institución</span>
                                        </label>

                                        {tieneHermanos && (
                                            <div className="space-y-3 animate-slideDown">
                                                {selectedSiblings.length > 0 && (
                                                    <div className="space-y-2">
                                                        <div className="text-xs font-bold text-indigo-500 uppercase">Hermanos Vinculados ({selectedSiblings.length})</div>
                                                        {selectedSiblings.map(sib => (
                                                            <div key={sib.id} className="flex items-center justify-between bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                                                                <div>
                                                                    <div className="text-sm font-black text-slate-800 text-left">{sib.name}</div>
                                                                    <div className="text-xs text-slate-500 text-left">{sib.group || 'Sin Grupo'}</div>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSelectedSiblings(prev => prev.filter(s => s.id !== sib.id));
                                                                    }}
                                                                    className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1 rounded"
                                                                >
                                                                    Desvincular
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                <div className="relative">
                                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Buscar y Agregar Hermano</label>
                                                    <input
                                                        type="text"
                                                        value={siblingSearchQuery}
                                                        onChange={e => setSiblingSearchQuery(e.target.value)}
                                                        placeholder="Escribe el nombre del hermano..."
                                                        className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500 bg-white"
                                                    />
                                                    {siblingSearchQuery.trim() !== '' && (
                                                        <div className="mt-1 bg-white border border-slate-200 rounded-lg max-h-40 overflow-y-auto shadow-lg z-10 absolute left-0 right-0">
                                                            {allStudents
                                                                .filter(s =>
                                                                    s.id !== editingStudentFee?.id &&
                                                                    !selectedSiblings.some(selected => selected.id === s.id) &&
                                                                    s.name.toLowerCase().includes(siblingSearchQuery.toLowerCase())
                                                                )
                                                                .map(candidate => (
                                                                    <button
                                                                        key={candidate.id}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setSelectedSiblings(prev => [...prev, candidate]);
                                                                            setSiblingGrade(candidate.group || '');
                                                                            setSiblingSearchQuery('');
                                                                        }}
                                                                        className="w-full text-left p-3 hover:bg-indigo-50/50 border-b border-slate-100 last:border-b-0 flex items-center justify-between"
                                                                    >
                                                                        <div>
                                                                            <div className="font-bold text-slate-800 text-sm">{candidate.name}</div>
                                                                            <div className="text-xs text-slate-500">{candidate.group}</div>
                                                                        </div>
                                                                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">Seleccionar</span>
                                                                    </button>
                                                                ))
                                                            }
                                                        </div>
                                                    )}
                                                </div>

                                                {selectedSiblings.length > 0 && (
                                                    <p className="text-[10px] text-indigo-600 font-semibold mt-1">
                                                        Al guardar, todos los alumnos quedarán vinculados. Cualquier pago registrado para uno se reflejará automáticamente en los demás.
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Footer del Modal */}
                                <div className="bg-slate-50 p-4 border-t border-slate-200/60 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditingStudentFee(null);
                                            setSelectedSiblings([]);
                                        }}
                                        className="flex-1 py-2.5 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300 text-sm transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (editingStudentFee) {
                                                const isPaid = feeStatus === 'PAGADO';
                                                const sibIds = selectedSiblings.map(s => s.id);
                                                
                                                onUpdateStudentFee(editingStudentFee.id, isPaid, {
                                                    annualFeeStatus: feeStatus,
                                                    annualFeeAbono: feeStatus === 'PAGADO' ? feeTotal : (feeStatus === 'PENDIENTE' ? 0 : feeAbono),
                                                    annualFeeTotal: feeTotal,
                                                    tieneHermanos: tieneHermanos && sibIds.length > 0,
                                                    siblingId: tieneHermanos && sibIds.length > 0 ? sibIds[0] : '',
                                                    siblingName: tieneHermanos && selectedSiblings.length > 0 ? selectedSiblings[0].name : '',
                                                    siblingGrade: tieneHermanos && selectedSiblings.length > 0 ? (selectedSiblings[0].group || '') : '',
                                                    siblingIds: tieneHermanos ? sibIds : []
                                                });

                                                setEditingStudentFee(null);
                                                setSelectedSiblings([]);
                                            }
                                        }}
                                        className="flex-1 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 text-sm transition-colors shadow-md shadow-indigo-200"
                                    >
                                        Guardar
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
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
