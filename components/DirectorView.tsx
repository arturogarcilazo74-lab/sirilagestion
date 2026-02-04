import React, { useState } from 'react';
import {
    Users, Wallet, Calendar, MessageSquare,
    Building2, LayoutDashboard, LogOut, Briefcase,
    Megaphone, Search, UserCheck, RotateCw,
    ChevronLeft, ChevronRight, Settings, CheckCircle2,
    Edit2, Trash2, AlertTriangle, X, User, TrendingUp, Phone, Printer, FileText, FilePlus, Menu, Plus, Shuffle, FileDown, AlertCircle
} from 'lucide-react';
import { StudentsView } from './StudentsView';
import { FinanceView } from './FinanceView';
import { SettingsView } from './SettingsView';
import { CommunicationsView } from './CommunicationsView';
import { SchoolConfig, Student, StaffMember } from '../types';
import { generateSchoolDocument, generateGroupList, generateReportCard, generateBehaviorReport } from '../services/pdfGenerator';
import { api } from '../services/api'; // Import API for saving events

interface DirectorViewProps {
    store: any; // Using 'any' for speed to accept the full store object, ideally typed
    onLogout: () => void;
    currentUser: StaffMember | null;
}

type DirectorTab = 'DASHBOARD' | 'STUDENTS' | 'PARENTS' | 'STAFF' | 'FINANCE' | 'CALENDAR' | 'NOTICES' | 'ROTATION' | 'MANAGEMENT' | 'SETTINGS' | 'DOCUMENTS';

export const DirectorView: React.FC<DirectorViewProps> = ({ store, onLogout, currentUser }) => {
    const [activeTab, setActiveTab] = useState<DirectorTab>('DASHBOARD');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { students, schoolConfig, financeEvents, events, behaviorLogs, staffTasks, handleAddStaffTask, handleDeleteStaffTask, handleEditStaffTask, handleDeleteBehaviorLog } = store;

    // Permissions: Only PRINCIPAL can edit content (Global Admin)
    const canEditContent = currentUser?.role === 'PRINCIPAL';

    // Local state for Fee Cost (Persisted in LocalStorage for simplicity)
    const [feeCost, setFeeCost] = useState(() => Number(localStorage.getItem('sys_fee_cost')) || 0);

    // Group Detail Modal State
    const [selectedGroupStats, setSelectedGroupStats] = useState<string | null>(null);
    // Student Detail Modal State
    const [viewStudent, setViewStudent] = useState<any | null>(null);

    // State for Task Editing in Dashboard
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showIncidentsModal, setShowIncidentsModal] = useState(false);
    const [selectedStudentIdForIncidents, setSelectedStudentIdForIncidents] = useState<string | null>(null);
    const [viewingIncident, setViewingIncident] = useState<any | null>(null);
    const [rotationSeed, setRotationSeed] = useState(0);
    const [newTask, setNewTask] = useState({ title: '', description: '', assignedTo: 'ALL', priority: 'NORMAL', type: 'COMMISSION' as any, dueDate: '' });
    const [reportStudent, setReportStudent] = useState<Student | null>(null);
    const [activeAnalysisSection, setActiveAnalysisSection] = useState<'ENROLLMENT' | 'ACADEMIC' | 'RISK' | 'BEHAVIOR' | null>(null);

    const handleSaveTask = () => {
        if (!newTask.title) return;

        if (editingId) {
            handleEditStaffTask(editingId, newTask);
        } else {
            handleAddStaffTask({ ...newTask, status: 'PENDING' });
        }

        setShowAddModal(false);
        setNewTask({ title: '', description: '', assignedTo: 'ALL', priority: 'NORMAL', type: 'COMMISSION', dueDate: '' });
        setEditingId(null);
    };

    const handleUpdateFee = () => {
        const val = window.prompt("Introduce el valor de la Cuota Escolar Anual por alumno:", feeCost.toString());
        if (val !== null && !isNaN(Number(val))) {
            const num = Number(val);
            setFeeCost(num);
            localStorage.setItem('sys_fee_cost', num.toString());
        }
    };

    // --- SUB-COMPONENTS (Internal for now) ---

    const StaffPanel = () => {
        const [isAdding, setIsAdding] = useState(false);
        const [editingId, setEditingId] = useState<string | null>(null);
        const [newStaff, setNewStaff] = useState({ name: '', role: 'Docente', group: 'General', phone: '', pin: '' });
        const [viewingStaff, setViewingStaff] = useState<any>(null);

        const handleAddStaff = () => {
            if (!newStaff.name) return;

            let updatedStaff;
            if (editingId) {
                // Update existing
                updatedStaff = (schoolConfig.staff || []).map((s: any) =>
                    s.id === editingId
                        ? { ...s, name: newStaff.name, role: newStaff.role, group: newStaff.group, pin: newStaff.pin, avatar: `https://ui-avatars.com/api/?name=${newStaff.name}&background=random` }
                        : s
                );
            } else {
                // Create new
                updatedStaff = [
                    ...(schoolConfig.staff || []),
                    {
                        id: Date.now().toString(),
                        name: newStaff.name,
                        role: newStaff.role,
                        group: newStaff.group,
                        pin: newStaff.pin,
                        avatar: `https://ui-avatars.com/api/?name=${newStaff.name}&background=random`
                    }
                ];
            }

            store.setSchoolConfig({ ...schoolConfig, staff: updatedStaff });
            resetForm();
        };

        const resetForm = () => {
            setIsAdding(false);
            setEditingId(null);
            setNewStaff({ name: '', role: 'Docente', group: 'General', phone: '', pin: '' });
        };

        const handleDeleteStaff = (id: string) => {
            if (!confirm('¿Eliminar a este miembro del personal?')) return;
            const updatedStaff = (schoolConfig.staff || []).filter((s: any) => s.id !== id);
            store.setSchoolConfig({ ...schoolConfig, staff: updatedStaff });
        };

        const startEdit = (s: any) => {
            setNewStaff({
                name: s.name,
                role: s.role,
                group: s.group || '',
                phone: s.phone || '',
                pin: s.pin || ''
            });
            setEditingId(s.id);
            setIsAdding(true);
        };

        const handleUpdatePin = (id: string, currentPin: string) => {
            const newPin = window.prompt("Asignar nuevo PIN de acceso (Dejar vacío para quitar):", currentPin || '');
            if (newPin !== null) {
                const updatedStaff = (schoolConfig.staff || []).map((s: any) =>
                    s.id === id ? { ...s, pin: newPin } : s
                );
                store.setSchoolConfig({ ...schoolConfig, staff: updatedStaff });
            }
        };

        return (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-fadeIn">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Directorio de Personal</h3>
                        <p className="text-slate-400 text-sm">Gestión de docentes, PINs de acceso y roles</p>
                    </div>
                    <button
                        onClick={() => { resetForm(); setIsAdding(true); }}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700"
                    >
                        + Nuevo Empleado
                    </button>
                </div>

                {isAdding && (
                    <div className="p-4 bg-indigo-50 border-b border-indigo-100 grid grid-cols-1 md:grid-cols-5 gap-3 animate-fadeIn items-end">
                        <div className="md:col-span-1">
                            <label className="text-xs font-bold text-indigo-800 mb-1 block">Nombre</label>
                            <input
                                placeholder="Nombre Completo"
                                className="w-full p-2 rounded border border-indigo-200 text-sm"
                                value={newStaff.name} onChange={e => setNewStaff({ ...newStaff, name: e.target.value })}
                            />
                        </div>
                        <div className="md:col-span-1">
                            <label className="text-xs font-bold text-indigo-800 mb-1 block">Rol</label>
                            <select
                                className="w-full p-2 rounded border border-indigo-200 text-sm"
                                value={newStaff.role} onChange={e => setNewStaff({ ...newStaff, role: e.target.value })}
                            >
                                <option value="Docente">Docente</option>
                                <option value="Docente Titular">Docente Titular</option>
                                <option value="Administrativo">Administrativo</option>
                                <option value="Director">Director</option>
                                <option value="Servicios">Servicios</option>
                            </select>
                        </div>
                        <div className="md:col-span-1">
                            <label className="text-xs font-bold text-indigo-800 mb-1 block">Grupo</label>
                            <input
                                placeholder="Grupo / Área"
                                className="w-full p-2 rounded border border-indigo-200 text-sm"
                                value={newStaff.group} onChange={e => setNewStaff({ ...newStaff, group: e.target.value })}
                            />
                        </div>
                        <div className="md:col-span-1">
                            <label className="text-xs font-bold text-indigo-800 mb-1 block">PIN Acceso</label>
                            <input
                                placeholder="Ej. 1234"
                                className="w-full p-2 rounded border border-indigo-200 text-sm font-mono"
                                value={newStaff.pin} onChange={e => setNewStaff({ ...newStaff, pin: e.target.value })}
                            />
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleAddStaff} className="flex-1 bg-indigo-600 text-white rounded font-bold py-2 text-sm">
                                {editingId ? 'Actualizar' : 'Guardar'}
                            </button>
                            <button onClick={resetForm} className="px-3 bg-white text-slate-500 rounded border border-slate-300 py-2 text-sm">X</button>
                        </div>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[600px]">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
                            <tr>
                                <th className="p-4">Nombre</th>
                                <th className="p-4">Cargo</th>
                                <th className="p-4">Grupo/Área</th>
                                <th className="p-4">PIN Kiosko</th>
                                <th className="p-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {/* Main teacher hidden as per request */}

                            {(schoolConfig.staff || []).filter((s: any) => {
                                const role = (s.role || '').toLowerCase();
                                return !role.includes('director') &&
                                    !role.includes('dirección') &&
                                    s.name !== schoolConfig.teacherName;
                            }).map((s: any) => (
                                <tr key={s.id} onClick={() => setViewingStaff(s)} className="hover:bg-slate-50 cursor-pointer transition-colors group">
                                    <td className="p-4 font-bold text-slate-800 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
                                            <img src={s.avatar} className="w-full h-full object-cover" />
                                        </div>
                                        {s.name}
                                    </td>
                                    <td className="p-4 text-sm">{s.role}</td>
                                    <td className="p-4"><span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-bold">{s.group}</span></td>
                                    <td className="p-4">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleUpdatePin(s.id, s.pin); }}
                                            className={`px-2 py-1 rounded text-xs font-bold font-mono border ${s.pin ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200 dashed'}`}
                                        >
                                            {s.pin ? '••••' : '+ Asignar'}
                                        </button>
                                    </td>
                                    <td className="p-4 text-right flex justify-end gap-2">
                                        <button onClick={(e) => { e.stopPropagation(); startEdit(s); }} className="text-indigo-500 hover:text-indigo-700 text-xs font-bold">Editar</button>
                                        <span className="text-slate-300">|</span>
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteStaff(s.id); }} className="text-red-400 hover:text-red-600 text-xs font-bold">Eliminar</button>
                                    </td>
                                </tr>
                            ))}

                            {(schoolConfig.staff || []).length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-400 text-sm">
                                        No hay personal adicional registrado. Agrega docentes para que puedan acceder a su portal.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {viewingStaff && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn" onClick={() => setViewingStaff(null)}>
                        <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scaleIn" onClick={e => e.stopPropagation()}>
                            <div className="h-24 bg-gradient-to-r from-indigo-500 to-purple-500 relative">
                                <button onClick={() => setViewingStaff(null)} className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/20 hover:bg-black/30 rounded-full p-1 transition-all"><X size={20} /></button>
                            </div>
                            <div className="px-8 pb-8">
                                <div className="relative -mt-12 mb-4 flex justify-between items-end">
                                    <div className="w-24 h-24 rounded-2xl border-4 border-white shadow-lg overflow-hidden bg-white">
                                        <img src={viewingStaff.avatar || `https://ui-avatars.com/api/?name=${viewingStaff.name}&background=random`} alt={viewingStaff.name} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="mb-1 text-right">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${viewingStaff.pin ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {viewingStaff.pin ? 'PIN Activo' : 'Sin PIN'}
                                        </span>
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <h2 className="text-2xl font-bold text-slate-800">{viewingStaff.name}</h2>
                                    <div className="flex items-center gap-2 text-slate-500 font-medium">
                                        <span>{viewingStaff.role}</span>
                                        <span>•</span>
                                        <span>{viewingStaff.group}</span>
                                    </div>
                                    {viewingStaff.phone && (
                                        <div className="mt-2 text-sm text-slate-600 flex items-center gap-2">
                                            <Phone size={14} className="text-indigo-500" /> {viewingStaff.phone}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
                                        <div className="text-2xl font-bold text-indigo-600">--</div>
                                        <div className="text-xs font-bold text-slate-400 uppercase">Comisiones</div>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
                                        <div className="text-2xl font-bold text-emerald-600">--</div>
                                        <div className="text-xs font-bold text-slate-400 uppercase">Asistencia</div>
                                    </div>
                                </div>

                                <div className="mt-6 flex gap-3">
                                    <button onClick={() => { startEdit(viewingStaff); setViewingStaff(null); }} className="flex-1 py-2.5 bg-indigo-50 text-indigo-700 font-bold rounded-xl hover:bg-indigo-100 transition-colors">
                                        Editar Perfil
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const ParentsDirectory = () => (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-fadeIn">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Directorio de Familias</h3>
                        <p className="text-slate-400 text-sm">{students.length} Familias registradas</p>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                        <input type="text" placeholder="Buscar familia..." className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-64" />
                    </div>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[700px]">
                    <thead className="bg-white text-slate-500 text-xs uppercase font-bold border-b border-slate-100">
                        <tr>
                            <th className="p-4">Tutor Principal</th>
                            <th className="p-4">Alumno(s)</th>
                            <th className="p-4">Teléfono</th>
                            <th className="p-4">Pagos (Anual)</th>
                            <th className="p-4">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {students.map((s: Student) => (
                            <tr key={s.id} className="hover:bg-slate-50">
                                <td className="p-4 font-bold text-slate-800">{s.guardianName}</td>
                                <td className="p-4 text-sm text-indigo-600 font-medium">{s.name}</td>
                                <td className="p-4 text-sm text-slate-500">{s.guardianPhone}</td>
                                <td className="p-4">
                                    {s.annualFeePaid
                                        ? <span className="text-emerald-500 font-bold text-xs flex items-center gap-1"><UserCheck size={14} /> Al corriente</span>
                                        : <span className="text-red-400 font-bold text-xs flex items-center gap-1">⚠ Pendiente</span>
                                    }
                                </td>
                                <td className="p-4">
                                    <button className="text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg text-xs font-bold">Contactar</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const DirectorCalendar = () => {
        const [currentDate, setCurrentDate] = useState(new Date());

        const getDaysInMonth = (date: Date) => {
            return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        };

        const getFirstDayOfMonth = (date: Date) => {
            return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
        };

        const [showEventModal, setShowEventModal] = useState(false);
        const [newEventData, setNewEventData] = useState<{ title: string, date: string, description: string, type: string, assignedTo: string[] | 'ALL' }>({ title: '', date: '', description: '', type: 'ACTIVITY', assignedTo: 'ALL' });

        const daysInMonth = getDaysInMonth(currentDate);
        const firstDay = getFirstDayOfMonth(currentDate);

        const handleDayClick = (day: number) => {
            const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            setNewEventData({ title: '', date: dateStr, description: '', type: 'ACTIVITY', assignedTo: 'ALL' });
            setShowEventModal(true);
        };

        const saveNewEvent = async () => {
            if (!newEventData.title || !newEventData.date) return;
            try {
                const evt = {
                    id: Date.now().toString(),
                    title: newEventData.title,
                    date: newEventData.date,
                    description: newEventData.description,
                    type: newEventData.type as 'ACTIVITY' | 'HOLIDAY' | 'MEETING',
                    assignedTo: newEventData.assignedTo
                };
                // Optimistic UI update using store if available, or direct setter
                const newEvents = [...(store.events || []), evt];
                if (store.setEvents) store.setEvents(newEvents);

                // API Call
                await api.saveEvent(evt);
                setShowEventModal(false);
            } catch (e) {
                console.error("Failed to save event", e);
                alert("Error al guardar el evento");
            }
        };

        const handlePrevMonth = () => {
            setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
        };

        const handleNextMonth = () => {
            setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
        };

        const monthNames = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ];

        // Helper for safe date parsing from YYYY-MM-DD
        const parseDate = (dateStr: string) => {
            if (!dateStr) return new Date();
            const parts = dateStr.split('-');
            return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        };

        // Events for this month
        const currentMonthEvents = [
            ...(events || []),
            ...(store.financeEvents || []).map((fe: any) => ({
                id: fe.id,
                title: fe.title,
                date: fe.date,
                type: 'FINANCE',
                description: `Evento Financiero${fe.costPerStudent ? ` ($${fe.costPerStudent})` : ''}`
            }))
        ].filter((e: any) => {
            const d = parseDate(e.date);
            return d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
        }).sort((a: any, b: any) => parseDate(a.date).getTime() - parseDate(b.date).getTime());

        const renderCalendarDays = () => {
            const days = [];
            // Empty cells for offset
            for (let i = 0; i < firstDay; i++) {
                days.push(<div key={`empty-${i}`} className="h-24 bg-slate-50/50 border border-slate-100/50"></div>);
            }

            // Days
            // Days
            for (let day = 1; day <= daysInMonth; day++) {
                const currentDayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);

                const dayEvents = currentMonthEvents.filter((e: any) => {
                    const eDate = parseDate(e.date);
                    return eDate.getDate() === day;
                });

                const isToday = new Date().toDateString() === currentDayDate.toDateString();
                const hasEvents = dayEvents.length > 0;

                let dayBgClass = isToday
                    ? 'bg-indigo-50 border-indigo-200 shadow-sm'
                    : 'bg-white hover:bg-slate-50 border-slate-100';

                // Apply color based on event type if present
                if (!isToday && hasEvents) {
                    const evtType = dayEvents[0].type || 'ACTIVITY';
                    if (evtType === 'HOLIDAY') dayBgClass = 'bg-red-50 hover:bg-red-100 border-red-200';
                    else if (evtType === 'FINANCE') dayBgClass = 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200';
                    else if (evtType === 'MEETING') dayBgClass = 'bg-purple-50 hover:bg-purple-100 border-purple-200';
                    else dayBgClass = 'bg-blue-50 hover:bg-blue-100 border-blue-200';
                }

                days.push(
                    <div
                        key={day}
                        onClick={() => handleDayClick(day)}
                        className={`h-24 border p-2 overflow-y-auto custom-scrollbar transition-colors cursor-pointer group relative ${dayBgClass}`}
                    >
                        <div className="flex justify-between items-start mb-1">
                            <span className={`text-sm font-bold ${isToday ? 'text-indigo-600 bg-white w-6 h-6 flex items-center justify-center rounded-full shadow-sm' : 'text-slate-700'}`}>{day}</span>
                            <Plus className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity transform scale-75" size={16} />
                        </div>
                        <div className="space-y-1 pointer-events-none">
                            {dayEvents.map((e: any) => (
                                <div key={e.id} className={`text-[9px] font-bold px-1.5 py-0.5 rounded border truncate cursor-help
                                     ${e.type === 'HOLIDAY' ? 'bg-red-100 text-red-700 border-red-200' :
                                        e.type === 'FINANCE' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                            e.type === 'MEETING' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                                'bg-indigo-100 text-indigo-700 border-indigo-200'
                                    }`} title={e.title}>
                                    {e.title}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            }
            return days;
        };

        return (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 animate-fadeIn">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Calendar className="text-indigo-600" />
                            Agenda Institucional
                        </h3>
                        <p className="text-slate-400 text-sm">Visualización de eventos y actividades escolares</p>
                    </div>
                    <div className="flex items-center gap-4 bg-slate-100 rounded-lg p-1">
                        <button onClick={handlePrevMonth} className="p-1 hover:bg-white rounded shadow-sm text-slate-500 hover:text-indigo-600 transition-all"><ChevronLeft size={20} /></button>
                        <span className="font-bold text-slate-700 min-w-[140px] text-center capitalize">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
                        <button onClick={handleNextMonth} className="p-1 hover:bg-white rounded shadow-sm text-slate-500 hover:text-indigo-600 transition-all"><ChevronRight size={20} /></button>
                    </div>
                </div>

                <div className="overflow-x-auto pb-2">
                    <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden mb-6 min-w-[800px]">
                        {/* Headers */}
                        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
                            <div key={d} className="bg-slate-50 p-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                                {d}
                            </div>
                        ))}
                        {/* Days */}
                        {renderCalendarDays()}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    <div>
                        <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">Próximos Eventos - {monthNames[currentDate.getMonth()]}</h4>
                        <div className="space-y-3">
                            {currentMonthEvents.length === 0 && <p className="text-slate-400 text-sm italic py-4 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">No hay eventos programados para este mes.</p>}
                            {currentMonthEvents.map((e: any) => {
                                const d = parseDate(e.date);
                                return (
                                    <div key={e.id} className="flex gap-4 items-center p-3 rounded-lg border border-slate-100 bg-white hover:border-indigo-100 transition-all shadow-sm">
                                        <div className="bg-slate-50 border border-slate-200 w-12 h-12 flex flex-col items-center justify-center rounded-lg shadow-sm text-slate-700 shrink-0">
                                            <span className="text-[9px] font-bold uppercase text-slate-400">{monthNames[d.getMonth()].substring(0, 3)}</span>
                                            <span className="text-xl font-bold leading-none text-indigo-600">{d.getDate()}</span>
                                        </div>
                                        <div className="flex-1">
                                            <h5 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                                {e.title}
                                                <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 uppercase font-bold tracking-wider">{e.type}</span>
                                            </h5>
                                            <p className="text-xs text-slate-500 mt-0.5">{e.description || 'Sin descripción adicional.'}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Add Event Modal */}
                {showEventModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
                        <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 animate-slideUp">
                            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Calendar className="text-indigo-600" size={24} />
                                Nuevo Evento
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Título</label>
                                    <input
                                        autoFocus
                                        type="text"
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                                        placeholder="Ej. Junta de Consejo"
                                        value={newEventData.title}
                                        onChange={e => setNewEventData({ ...newEventData, title: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Fecha</label>
                                        <input
                                            type="date"
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium"
                                            value={newEventData.date}
                                            onChange={e => setNewEventData({ ...newEventData, date: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Tipo</label>
                                        <select
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium outline-none"
                                            value={newEventData.type}
                                            onChange={e => setNewEventData({ ...newEventData, type: e.target.value })}
                                        >
                                            <option value="ACTIVITY">Evento General</option>
                                            <option value="MEETING">Reunión</option>
                                            <option value="HOLIDAY">Suspensión</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Descripción (Opcional)</label>
                                    <textarea
                                        rows={3}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-sm resize-none focus:bg-white focus:border-indigo-500 outline-none transition-all"
                                        placeholder="Detalles adicionales..."
                                        value={newEventData.description}
                                        onChange={e => setNewEventData({ ...newEventData, description: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Asignar a</label>
                                    <div className="flex gap-2 mb-2">
                                        <button
                                            onClick={() => setNewEventData({ ...newEventData, assignedTo: 'ALL' })}
                                            className={`px-3 py-1.5 rounded text-xs font-bold border ${newEventData.assignedTo === 'ALL' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200'}`}
                                        >
                                            Todos
                                        </button>
                                        <button
                                            onClick={() => setNewEventData({ ...newEventData, assignedTo: [] })}
                                            className={`px-3 py-1.5 rounded text-xs font-bold border ${Array.isArray(newEventData.assignedTo) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200'}`}
                                        >
                                            Seleccionar Alumnos
                                        </button>
                                    </div>

                                    {Array.isArray(newEventData.assignedTo) && (
                                        <div className="border border-slate-200 rounded-xl max-h-40 overflow-y-auto p-2 bg-slate-50 grid grid-cols-2 gap-2">
                                            {students.map((s: any) => (
                                                <label key={s.id} className="flex items-center gap-2 text-xs p-1 hover:bg-white rounded cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={(newEventData.assignedTo as string[]).includes(s.id)}
                                                        onChange={e => {
                                                            const current = newEventData.assignedTo as string[];
                                                            if (e.target.checked) setNewEventData({ ...newEventData, assignedTo: [...current, s.id] });
                                                            else setNewEventData({ ...newEventData, assignedTo: current.filter(id => id !== s.id) });
                                                        }}
                                                        className="rounded text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                    <span className="truncate">{s.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => setShowEventModal(false)}
                                        className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={saveNewEvent}
                                        disabled={!newEventData.title}
                                        className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Guardar Evento
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };


    const RotationManager = () => {
        // 1. Get all potential staff
        const allStaff = [
            { name: schoolConfig.teacherName || "Docente Principal", role: 'Docente Titular' },
            ...(schoolConfig.staff || []).map((s: any) => ({ name: s.name, role: s.role }))
        ];

        // 2. Identify Groups
        const FIXED_NAME = "Carlos Rafael Pacheco";
        const FIXED_SPACE = "Campos de futbol";

        const isSpecialist = (role: string, group: string, name: string) => {
            const lowerRoleGroup = (role + " " + group).toLowerCase();
            const lowerName = name.toLowerCase();

            // Explicit names provided by user
            if (lowerName.includes('vicky candelaria') || lowerName.includes('jose abrham') || lowerName.includes('josé abrham')) return true;

            return lowerRoleGroup.includes('fisica') || lowerRoleGroup.includes('física') ||
                lowerRoleGroup.includes('artes') || lowerRoleGroup.includes('ingles') || lowerRoleGroup.includes('inglés') ||
                lowerRoleGroup.includes('usaer');
        };

        const excludedFilter = (s: any) => {
            const n = s.name.toLowerCase();
            const r = s.role.toLowerCase();
            return !n.includes(FIXED_NAME.toLowerCase()) &&
                !(n.includes('nancy') && n.includes('jasso')) && // Filter Director by name
                !r.includes('director') &&
                !r.includes('directivo') &&
                !r.includes('subdirector') &&
                !r.includes('sub-director');
        };

        // RE-MAPPING to include Group for better detection
        const allStaffEnhanced = [
            { name: schoolConfig.teacherName || "Docente Principal", role: 'Docente Titular', group: schoolConfig.gradeGroup },
            ...(schoolConfig.staff || []).map((s: any) => ({ name: s.name, role: s.role, group: s.group || '' }))
        ];

        const seededShuffle = (list: any[], seed: number) => {
            if (seed === 0) return list;
            const array = [...list];
            let m = array.length, t, i;
            let localSeed = seed;
            const random = () => { const x = Math.sin(localSeed++) * 10000; return x - Math.floor(x); };
            while (m) {
                i = Math.floor(random() * m--);
                t = array[m];
                array[m] = array[i];
                array[i] = t;
            }
            return array;
        };

        const rawSpecialists = allStaffEnhanced.filter(s => excludedFilter(s) && isSpecialist(s.role, s.group || '', s.name));
        const rawRegulars = allStaffEnhanced.filter(s => excludedFilter(s) && !isSpecialist(s.role, s.group || '', s.name));

        const specialistsList = seededShuffle(rawSpecialists, rotationSeed);
        const regularList = seededShuffle(rawRegulars, rotationSeed);

        const spaces = [
            "Pasillo de computación",
            "Estacionamiento",
            "Techumbre grande",
            "Techumbre chica y baños",
            "Desayunadores"
        ];

        // 3. Distribution Logic
        const generateRotation = (weekOffset: number) => {
            // Logic: 
            // 1. Distribute Regulars evenly.
            // 2. Distribute Specialists evenly ON TOP of Regulars.

            const assignments = spaces.map(space => ({ space, assigned: [] as any[] }));

            // Helper to distribute a list
            const distribute = (list: any[], offset: number) => {
                if (list.length === 0) return;
                const shift = offset % list.length;
                const shiftedList = [...list.slice(shift), ...list.slice(0, shift)];

                shiftedList.forEach((staff, index) => {
                    // Modulo to wrap around spaces
                    const spaceIndex = index % spaces.length;
                    assignments[spaceIndex].assigned.push({
                        name: staff.name,
                        color: 'text-indigo-700'
                    });
                });
            };

            // Helper for specialists (ensure they don't land alone if possible)
            const distributeSpecialists = (list: any[], offset: number) => {
                if (list.length === 0) return;
                const shift = offset % list.length;
                const shiftedList = [...list.slice(shift), ...list.slice(0, shift)];

                shiftedList.forEach((staff, index) => {
                    // We want to add them to spaces. 
                    // Ideally spaces that already have a Regular.
                    // Simple modulo does this naturally if buckets > 0.
                    // But if regularList < spaces, some buckets are empty.
                    // If bucket is empty, skip it? No, then specialst does nothing?
                    // User said: "no queden solos".

                    // Strategy: Find the next space that has people.
                    let spaceIndex = index % spaces.length;

                    // Safety check: Don't put specialist alone?
                    // If assignments[spaceIndex].assigned.length === 0 ... try next
                    let attempts = 0;
                    while (assignments[spaceIndex].assigned.length === 0 && attempts < spaces.length) {
                        spaceIndex = (spaceIndex + 1) % spaces.length;
                        attempts++;
                    }

                    assignments[spaceIndex].assigned.push({
                        name: staff.name,
                        color: 'text-pink-600' // Different color for specialists
                    });
                });
            };

            distribute(regularList, weekOffset);
            distributeSpecialists(specialistsList, weekOffset);

            return assignments;
        };

        // Generate weeks with REAL dates for the current month/period
        const getWeeksInMonth = () => {
            const weeks = [];
            const today = new Date();
            const dayOfWeek = today.getDay(); // 0 (Sun) - 6 (Sat)
            const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            const mondayOfThisWeek = new Date(today);
            mondayOfThisWeek.setDate(today.getDate() + diffToMonday);

            for (let i = 0; i < 4; i++) {
                const start = new Date(mondayOfThisWeek);
                start.setDate(mondayOfThisWeek.getDate() + (i * 7));
                const end = new Date(start);
                end.setDate(start.getDate() + 4); // Friday
                const formatDate = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`;

                weeks.push({
                    id: i + 1,
                    label: `Semana ${i + 1}`,
                    dateRange: `${formatDate(start)} al ${formatDate(end)}`
                });
            }
            return weeks;
        };

        const weeks = getWeeksInMonth();

        // Data Prep for Table
        const weeklyRotations = weeks.map((w, idx) => ({
            week: w,
            assignments: generateRotation(idx)
        }));

        const spaceRows = [
            { name: FIXED_SPACE, isFixed: true },
            ...spaces.map(s => ({ name: s, isFixed: false }))
        ];

        return (
            <div id="print-container" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 animate-fadeIn">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                        {schoolConfig.schoolLogo && (
                            <img src={schoolConfig.schoolLogo} alt="Logo" className="w-16 h-16 object-contain" />
                        )}
                        <div>
                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <span className="bg-indigo-100 p-2 rounded-lg text-indigo-600 print:hidden"><RotateCw size={24} /></span>
                                <span className="flex flex-col">
                                    <span>Rol de Guardias</span>
                                    <span className="text-xs font-normal text-slate-400 uppercase hidden print:block">{schoolConfig.schoolName}</span>
                                </span>
                            </h3>
                            <p className="text-slate-400 text-sm">Distribución de responsabilidades de vigilancia por áreas</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setRotationSeed(s => s + 1)} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold hover:bg-indigo-100 transition-colors shadow-sm print:hidden">
                            <Shuffle size={18} /> Reordenar
                        </button>
                        <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-colors shadow-lg shadow-slate-200 print:hidden">
                            <Printer size={18} /> Imprimir Rol
                        </button>
                    </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm bg-white">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="p-4 font-bold text-slate-600 uppercase text-xs tracking-wider min-w-[220px] sticky left-0 bg-slate-50 z-10 border-r border-slate-200">
                                        Área / Semana
                                    </th>
                                    {weeks.map(w => (
                                        <th key={w.id} className="p-4 min-w-[180px] text-center">
                                            <div className="font-black text-indigo-900 text-base">{w.label}</div>
                                            <div className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full inline-block mt-1">{w.dateRange}</div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {spaceRows.map((space, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="p-4 border-r border-slate-100 bg-white group-hover:bg-slate-50 sticky left-0 z-10">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-1.5 h-12 rounded-full ${space.isFixed ? 'bg-amber-400' : 'bg-indigo-400'}`}></div>
                                                <span className={`font-bold ${space.isFixed ? 'text-amber-700' : 'text-slate-700'}`}>{space.name}</span>
                                            </div>
                                        </td>
                                        {weeklyRotations.map((wr, wIdx) => {
                                            const assignment = !space.isFixed
                                                ? wr.assignments.find(a => a.space === space.name)
                                                : { assigned: [{ name: FIXED_NAME, color: 'text-amber-800', isFixed: true }] };

                                            const teachers = assignment?.assigned || [];

                                            return (
                                                <td key={wIdx} className="p-2 border-l border-slate-50 align-middle">
                                                    <div className="flex flex-col gap-1.5">
                                                        {teachers.length > 0 ? (
                                                            teachers.map((t: any, tIdx: number) => (
                                                                <div key={tIdx} className={`px-3 py-2 rounded-lg text-xs font-bold border flex items-center gap-2 shadow-sm
                                                                    ${space.isFixed ? 'bg-amber-50 text-amber-900 border-amber-100' :
                                                                        t.color?.includes('pink') ? 'bg-pink-50 text-pink-700 border-pink-100' :
                                                                            'bg-indigo-50 text-indigo-700 border-indigo-100'}
                                                                `}>
                                                                    <div className={`w-1.5 h-1.5 rounded-full ${space.isFixed ? 'bg-amber-400' : t.color?.includes('pink') ? 'bg-pink-400' : 'bg-indigo-400'}`}></div>
                                                                    {t.name}
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="text-center py-2 opacity-30 font-bold text-slate-300 uppercase text-[10px] tracking-widest border-2 border-dashed border-slate-100 rounded-lg">
                                                                Sin Asignar
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="mt-6 flex gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-xl">ℹ️</span>
                    <div className="text-xs text-slate-500">
                        <p className="font-bold text-slate-700 mb-1">Criterio de Rotación Automática</p>
                        El sistema rota al personal docente ({regularList.length}) y especialistas ({specialistsList.length}) de manera equitativa por las áreas disponibles, asegurando cobertura completa.
                        Las áreas fijas como "{FIXED_SPACE}" mantienen su asignación permanente.
                    </div>
                </div>
            </div>
        );
    };

    const TaskManager = () => {
        const [filterType, setFilterType] = useState<'ALL' | 'COMMISSION' | 'DOCUMENTATION'>('ALL');
        const [showAddModal, setShowAddModal] = useState(false);
        const [newTask, setNewTask] = useState({ title: '', description: '', assignedTo: 'ALL', priority: 'NORMAL', type: 'COMMISSION' as any, dueDate: '' });

        // New State for Detail View
        const [viewingDetailsId, setViewingDetailsId] = useState<string | null>(null);

        const getStaffName = (id: string) => {
            if (id === 'ALL') return 'Todo el Personal';
            if (id === 'DOCENTES') return 'Todos los Docentes';
            const s = (schoolConfig.staff || []).find((st: any) => st.id === id);
            return s ? s.name : (id === 'DIRECTOR' ? 'Dirección' : 'Desconocido');
        };

        const getAllRelevantStaff = (groupTarget: string) => {
            const all = [
                { id: 'MAIN', name: schoolConfig.teacherName || "Docente Principal", role: 'Docente Titular' },
                ...(schoolConfig.staff || []).filter((s: any) => s.role !== 'Director' && s.name !== schoolConfig.teacherName)
            ];

            if (groupTarget === 'ALL') return all;
            if (groupTarget === 'DOCENTES') return all.filter(s => s.id !== 'MAIN' && s.role.toLowerCase().includes('docente'));
            return [];
        };

        const toggleDetails = (taskId: string) => {
            setViewingDetailsId(taskId);
        };

        const toggleStaffCompletion = (taskId: string, staffId: string) => {
            const task = staffTasks.find((t: any) => t.id === taskId);
            if (!task) return;

            const currentCompleted = task.completedBy || [];
            const isCompleted = currentCompleted.includes(staffId);

            let newCompleted;
            if (isCompleted) {
                newCompleted = currentCompleted.filter((id: string) => id !== staffId);
            } else {
                newCompleted = [...currentCompleted, staffId];
            }

            handleEditStaffTask(taskId, { completedBy: newCompleted });
        };

        const filteredTasks = (staffTasks || []).filter((t: any) => {
            if (filterType !== 'ALL' && t.type !== filterType) return false;
            return true;
        });

        const handleSaveTask = () => {
            if (!newTask.title) return;
            handleAddStaffTask({ ...newTask, status: 'PENDING' });
            setShowAddModal(false);
            setNewTask({ title: '', description: '', assignedTo: 'ALL', priority: 'NORMAL', type: 'COMMISSION', dueDate: '' });
        };

        return (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 animate-fadeIn min-h-[500px]">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <Briefcase className="text-indigo-600" />
                            Gestión de Tareas y Comisiones
                        </h3>
                        <p className="text-slate-400 text-sm">Asigna responsabilidades, planeaciones y comisiones al personal.</p>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2"
                    >
                        + Nueva Asignación
                    </button>
                </div>

                {/* Filters */}
                <div className="flex gap-2 mb-6 p-1 bg-slate-50 rounded-lg w-fit">
                    <button onClick={() => setFilterType('ALL')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${filterType === 'ALL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Todas</button>
                    <button onClick={() => setFilterType('COMMISSION')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${filterType === 'COMMISSION' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Comisiones</button>
                    <button onClick={() => setFilterType('DOCUMENTATION')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${filterType === 'DOCUMENTATION' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Entregas / Planeaciones</button>
                </div>

                {/* Kanban-ish List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTasks.map((task: any) => (
                        <div key={task.id} className={`relative p-5 rounded-xl border-l-4 shadow-sm hover:shadow-md transition-all bg-white ${task.status === 'COMPLETED' ? 'border-l-emerald-500 opacity-75' : task.type === 'DOCUMENTATION' ? 'border-l-amber-500' : 'border-l-blue-500'} border-slate-100`}>
                            <div className="flex justify-between items-start mb-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${task.type === 'DOCUMENTATION' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                                    {task.type === 'DOCUMENTATION' ? 'Entrega' : 'Comisión'}
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            setEditingId(task.id);
                                            setNewTask({
                                                title: task.title,
                                                description: task.description || '',
                                                assignedTo: task.assignedTo,
                                                type: task.type,
                                                dueDate: task.dueDate || ''
                                            });
                                            setShowAddModal(true);
                                        }}
                                        className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded transition-colors"
                                        title="Editar tarea"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (window.confirm('¿Eliminar esta tarea? Esta acción no se puede deshacer.')) {
                                                handleDeleteStaffTask(task.id);
                                            }
                                        }}
                                        className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded transition-colors"
                                        title="Eliminar tarea"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>

                            <h4 className={`font-bold text-slate-800 mb-1 ${task.status === 'COMPLETED' ? 'line-through decoration-slate-400 text-slate-400' : ''}`}>{task.title}</h4>
                            <p className="text-sm text-slate-500 mb-4 line-clamp-2">{task.description || 'Sin descripción'}</p>

                            <div className="flex items-center gap-2 mb-3 text-xs text-slate-500">
                                <Users size={12} className="text-indigo-400" />
                                <span className="font-bold text-indigo-900 bg-indigo-50 px-1.5 rounded">{getStaffName(task.assignedTo)}</span>
                            </div>

                            <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                                <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                                    <Calendar size={12} /> {task.dueDate}
                                </span>
                                {(task.assignedTo === 'ALL' || task.assignedTo === 'DOCENTES') ? (
                                    <button
                                        onClick={() => toggleDetails(task.id)}
                                        className="text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                                    >
                                        Ver Entregas ({(task.completedBy || []).length}/{getAllRelevantStaff(task.assignedTo).length})
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleEditStaffTask(task.id, { status: task.status === 'PENDING' ? 'COMPLETED' : 'PENDING' })}
                                        className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${task.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                    >
                                        {task.status === 'COMPLETED' ? 'Completado' : 'Marcar Listo'}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Add Card */}
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/30 transition-all text-slate-400 hover:text-indigo-500 min-h-[200px]"
                    >
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-2">
                            <span className="text-2xl font-bold">+</span>
                        </div>
                        <span className="font-bold text-sm">Crear Tarea</span>
                    </button>
                </div>

                {/* Add Modal */}
                {showAddModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
                        <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-scaleIn">
                            <h3 className="text-lg font-bold text-slate-800 mb-4">Nueva Asignación</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Título</label>
                                    <input autoFocus value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} className="w-full p-2 border border-slate-200 rounded-lg text-sm" placeholder="Ej. Entrega Planeación Enero" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Tipo</label>
                                        <select value={newTask.type} onChange={e => setNewTask({ ...newTask, type: e.target.value as any })} className="w-full p-2 border border-slate-200 rounded-lg text-sm">
                                            <option value="COMMISSION">Comisión / Guardia</option>
                                            <option value="DOCUMENTATION">Entrega Documentos</option>
                                            <option value="ACTIVITY">Actividad General</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Fecha Límite</label>
                                        <input type="date" value={newTask.dueDate} onChange={e => setNewTask({ ...newTask, dueDate: e.target.value })} className="w-full p-2 border border-slate-200 rounded-lg text-sm" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Asignar A</label>
                                    <select value={newTask.assignedTo} onChange={e => setNewTask({ ...newTask, assignedTo: e.target.value })} className="w-full p-2 border border-slate-200 rounded-lg text-sm">
                                        <option value="ALL">-- Todo el Personal --</option>
                                        <option value="DOCENTES">-- Todos los Docentes --</option>
                                        {(schoolConfig.staff || []).filter((s: any) => {
                                            const role = (s.role || '').toLowerCase();
                                            return !role.includes('director') && !role.includes('dirección');
                                        }).map((s: any) => (
                                            <option key={s.id} value={s.id}>{s.name} ({s.group})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Descripción</label>
                                    <textarea value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} className="w-full p-2 border border-slate-200 rounded-lg text-sm h-24" placeholder="Detalles de la tarea..." />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-lg hover:bg-slate-200">Cancelar</button>
                                <button onClick={handleSaveTask} className="flex-1 px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700">Guardar Asignación</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Details/Progress Modal */}
                {viewingDetailsId && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
                        <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-scaleIn max-h-[80vh] flex flex-col">
                            <h3 className="text-lg font-bold text-slate-800 mb-2">Control de Entregas</h3>
                            <p className="text-sm text-slate-500 mb-4">Marca al personal que ya ha cumplido con esta asignación.</p>

                            <div className="flex-1 overflow-y-auto custom-scrollbar border border-slate-100 rounded-xl">
                                {(() => {
                                    const task = staffTasks.find((t: any) => t.id === viewingDetailsId);
                                    if (!task) return null;
                                    const staffList = getAllRelevantStaff(task.assignedTo);
                                    const completedList = task.completedBy || [];

                                    return (
                                        <div className="divide-y divide-slate-50">
                                            {staffList.map((s: any) => {
                                                const isDone = completedList.includes(s.id);
                                                return (
                                                    <div key={s.id} onClick={() => toggleStaffCompletion(task.id, s.id)} className="flex items-center justify-between p-3 hover:bg-slate-50 cursor-pointer group">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isDone ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-300 group-hover:border-indigo-300'}`}>
                                                                {isDone && <CheckCircle2 size={14} className="text-white" />}
                                                            </div>
                                                            <div>
                                                                <p className={`text-sm font-bold ${isDone ? 'text-slate-800' : 'text-slate-500'}`}>{s.name}</p>
                                                                <p className="text-[10px] text-slate-400">{s.role}</p>
                                                            </div>
                                                        </div>
                                                        {isDone && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">ENTREGADO</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
                            </div>

                            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                                <button onClick={() => setViewingDetailsId(null)} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700">Cerrar</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const DocumentsPanel = () => {
        const [docType, setDocType] = useState<any>('CONSTANCIA');
        const [selectedStudentForDoc, setSelectedStudentForDoc] = useState<Student | null>(null);
        const [docFormData, setDocFormData] = useState<any>({});
        const [docSearch, setDocSearch] = useState('');

        const [listGroup, setListGroup] = useState(schoolConfig.gradeGroup || 'General');
        const [listOptions, setListOptions] = useState({ includeRisk: false, includeFee: false, includeEvents: false, includeExams: false });

        // Filter students for search
        const filteredStudents = students.filter((s: Student) => s.name.toLowerCase().includes(docSearch.toLowerCase())).slice(0, 5);

        const handleGenerateDoc = () => {
            const data = {
                ...docFormData,
                studentName: selectedStudentForDoc ? selectedStudentForDoc.name : docFormData.staffName,
                curp: selectedStudentForDoc?.curp,
                studentId: selectedStudentForDoc?.id,
                grade: selectedStudentForDoc?.group
            };
            generateSchoolDocument(docType, data, schoolConfig);
        };

        const handleGenerateList = () => {
            generateGroupList(students, schoolConfig, listOptions, listGroup);
        };

        return (
            <div className="p-8 h-full overflow-y-auto custom-scrollbar pb-32 animate-fadeIn">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left: Single Docs */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-800"><FileText className="text-indigo-600" /> Generador de Documentos</h3>
                        {/* Search Student */}
                        <div className="mb-6">
                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Buscar Alumno / Personal</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-3 text-slate-400" size={16} />
                                <input type="text" placeholder="Escribe el nombre..." className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={docSearch} onChange={e => setDocSearch(e.target.value)} />
                                {docSearch && (
                                    <div className="absolute top-12 left-0 w-full bg-white border rounded-lg shadow-xl z-20 max-h-40 overflow-y-auto">
                                        {filteredStudents.map((s: Student) => (
                                            <div key={s.id} onClick={() => { setSelectedStudentForDoc(s); setDocSearch(''); }} className="p-2 hover:bg-slate-50 cursor-pointer text-sm font-bold text-slate-700 border-b border-slate-50 last:border-0">
                                                {s.name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {selectedStudentForDoc && (
                                <div className="mt-2 text-sm font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 p-2 rounded flex justify-between items-center animate-slideDown">
                                    <span className="flex items-center gap-2"><User size={14} /> {selectedStudentForDoc.name}</span>
                                    <button onClick={() => setSelectedStudentForDoc(null)} className="hover:text-red-500"><X size={14} /></button>
                                </div>
                            )}
                        </div>

                        {/* Doc Type Selection */}
                        <div className="flex flex-wrap gap-2 mb-6">
                            {['CONSTANCIA', 'CITATORIO', 'ACTA_HECHOS', 'ACTA_ADMINISTRATIVA', 'PERMISO_ECONOMICO'].map(t => (
                                <button key={t} onClick={() => { setDocType(t); setDocFormData({}); }} className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${docType === t ? 'bg-indigo-600 text-white border-indigo-600 shadow-md transform scale-105' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'}`}>
                                    {t.replace(/_/g, ' ')}
                                </button>
                            ))}
                        </div>

                        {/* Dynamic Form */}
                        <div className="space-y-4 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                            {docType === 'CONSTANCIA' && <p className="text-sm text-slate-500 italic">No se requieren datos adicionales. Se generará constancia estándar.</p>}

                            {docType === 'CITATORIO' && (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-500">Fecha Cita</label>
                                            <input type="date" className="w-full p-2 border rounded" onChange={e => setDocFormData({ ...docFormData, appointmentDate: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500">Hora</label>
                                            <input type="time" className="w-full p-2 border rounded" onChange={e => setDocFormData({ ...docFormData, appointmentTime: e.target.value })} />
                                        </div>
                                    </div>
                                    <textarea placeholder="Motivo del citatorio..." className="w-full p-2 border rounded h-24 text-sm" onChange={e => setDocFormData({ ...docFormData, reason: e.target.value })} />
                                </>
                            )}
                            {(docType === 'ACTA_HECHOS' || docType === 'ACTA_ADMINISTRATIVA') && (
                                <>
                                    <input type="text" placeholder="Nombre del Involucrado (Si no es el alumno seleccionado)" className="w-full p-2 border rounded text-sm" value={docFormData.involved || (selectedStudentForDoc ? selectedStudentForDoc.name : '')} onChange={e => setDocFormData({ ...docFormData, involved: e.target.value })} />
                                    <textarea placeholder="Descripción detallada de los hechos..." className="w-full p-2 border rounded h-32 text-sm" onChange={e => setDocFormData({ ...docFormData, description: e.target.value })} />
                                </>
                            )}
                            {docType === 'PERMISO_ECONOMICO' && (
                                <>
                                    <input type="text" placeholder="Nombre del Personal que Solcita" className="w-full p-2 border rounded text-sm" onChange={e => setDocFormData({ ...docFormData, staffName: e.target.value })} />
                                    <div className="grid grid-cols-2 gap-4">
                                        <input type="number" placeholder="Días" className="w-full p-2 border rounded" onChange={e => setDocFormData({ ...docFormData, days: e.target.value })} />
                                        <input type="date" placeholder="Fecha Inicio" className="w-full p-2 border rounded" onChange={e => setDocFormData({ ...docFormData, startDate: e.target.value })} />
                                    </div>
                                </>
                            )}
                        </div>

                        <button onClick={handleGenerateDoc} disabled={(!selectedStudentForDoc && docType !== 'PERMISO_ECONOMICO' && docType !== 'ACTA_HECHOS' && docType !== 'ACTA_ADMINISTRATIVA')} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200 transition-all active:scale-95 flex justify-center items-center gap-2">
                            <Printer size={18} /> Generar e Imprimir
                        </button>
                    </div>

                    {/* Right: Lists */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-800"><FilePlus className="text-emerald-600" /> Generador de Listas Grupales</h3>

                        <div className="mb-6">
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-3">Seleccionar Grupo</label>
                            <div className="flex gap-2 flex-wrap">
                                {Array.from(new Set(students.map((s: Student) => s.group || schoolConfig.gradeGroup))).sort().map((g: any) => (
                                    <button key={g} onClick={() => setListGroup(g)} className={`px-4 py-2 rounded-lg font-bold border transition-colors ${listGroup === g ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                                        {g}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4 mb-8 bg-slate-50 p-5 rounded-xl border border-slate-200">
                            <p className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Settings size={14} /> Configurar Columnas</p>
                            <label className="flex items-center gap-3 text-slate-700 cursor-pointer p-2 hover:bg-white rounded transition-colors">
                                <input type="checkbox" checked={listOptions.includeRisk} onChange={e => setListOptions({ ...listOptions, includeRisk: e.target.checked })} className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" />
                                <span className="font-medium">Alerta de Riesgo</span> <span className="text-xs text-slate-400 ml-1">(BAP, Calif, Conducta)</span>
                            </label>
                            <label className="flex items-center gap-3 text-slate-700 cursor-pointer p-2 hover:bg-white rounded transition-colors">
                                <input type="checkbox" checked={listOptions.includeFee} onChange={e => setListOptions({ ...listOptions, includeFee: e.target.checked })} className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" />
                                <span className="font-medium">Estatus Cuota Anual</span>
                            </label>
                            <label className="flex items-center gap-3 text-slate-700 cursor-pointer p-2 hover:bg-white rounded transition-colors">
                                <input type="checkbox" checked={listOptions.includeEvents} onChange={e => setListOptions({ ...listOptions, includeEvents: e.target.checked })} className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" />
                                <span className="font-medium">Estatus Cooperación Eventos</span>
                            </label>
                            <label className="flex items-center gap-3 text-slate-700 cursor-pointer p-2 hover:bg-white rounded transition-colors">
                                <input type="checkbox" checked={listOptions.includeExams} onChange={e => setListOptions({ ...listOptions, includeExams: e.target.checked })} className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" />
                                <span className="font-medium">Estatus Pago Exámenes</span>
                            </label>
                        </div>

                        <button onClick={handleGenerateList} className="w-full py-3 bg-white border-2 border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all flex justify-center items-center gap-2">
                            <Printer size={18} /> Generar Lista
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans flex-col md:flex-row">

            {/* MOBILE HEADER */}
            <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center shrink-0 z-50 shadow-md relative">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-600 p-1.5 rounded-lg">
                        <Building2 size={20} />
                    </div>
                    <div>
                        <h1 className="text-sm font-extrabold tracking-tight">Dirección</h1>
                    </div>
                </div>
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors">
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* MOBILE OVERLAY */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity" onClick={() => setIsMobileMenuOpen(false)}></div>
            )}

            {/* DIRECTOR SIDEBAR */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col transition-all duration-300 transform shadow-2xl
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
                md:translate-x-0 md:static md:flex md:flex-shrink-0
            `}>
                <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-3 text-white">
                        <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-500/30">
                            <Building2 size={24} />
                        </div>
                        <div>
                            <h1 className="text-lg font-extrabold tracking-tight">Dirección</h1>
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Panel Administrativo</p>
                        </div>
                    </div>
                    {/* Close button for mobile inside sidebar too */}
                    <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-slate-500 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
                    <DirectorNavBtn active={activeTab === 'DASHBOARD'} onClick={() => { setActiveTab('DASHBOARD'); setIsMobileMenuOpen(false); }} icon={LayoutDashboard} label="Resumen General" />
                    <div className="pt-4 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3">Gestión</div>
                    <DirectorNavBtn
                        active={activeTab === 'MANAGEMENT'}
                        onClick={() => { setActiveTab('MANAGEMENT'); setIsMobileMenuOpen(false); }}
                        icon={Briefcase}
                        label={
                            <span className="flex items-center justify-between w-full">
                                Gestión Tareas
                                <span className="text-[9px] bg-emerald-400 text-emerald-950 px-1 rounded font-bold ml-1">NUEVO</span>
                            </span>
                        }
                    />
                    <DirectorNavBtn active={activeTab === 'STAFF'} onClick={() => { setActiveTab('STAFF'); setIsMobileMenuOpen(false); }} icon={Users} label="Directorio Personal" />
                    <DirectorNavBtn active={activeTab === 'ROTATION'} onClick={() => { setActiveTab('ROTATION'); setIsMobileMenuOpen(false); }} icon={RotateCw} label="Guardias Recreo" />
                    <DirectorNavBtn active={activeTab === 'FINANCE'} onClick={() => { setActiveTab('FINANCE'); setIsMobileMenuOpen(false); }} icon={Wallet} label="Finanzas" />
                    <DirectorNavBtn active={activeTab === 'STUDENTS'} onClick={() => { setActiveTab('STUDENTS'); setIsMobileMenuOpen(false); }} icon={Users} label="Alumnos" />
                    <DirectorNavBtn active={activeTab === 'PARENTS'} onClick={() => { setActiveTab('PARENTS'); setIsMobileMenuOpen(false); }} icon={UserCheck} label="Padres de Familia" />
                    <DirectorNavBtn active={activeTab === 'DOCUMENTS'} onClick={() => { setActiveTab('DOCUMENTS'); setIsMobileMenuOpen(false); }} icon={FileText} label="Documentos" />

                    <div className="pt-4 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3">Comunicación</div>
                    <DirectorNavBtn active={activeTab === 'CALENDAR'} onClick={() => { setActiveTab('CALENDAR'); setIsMobileMenuOpen(false); }} icon={Calendar} label="Agenda / Calendario" />
                    <DirectorNavBtn active={activeTab === 'NOTICES'} onClick={() => { setActiveTab('NOTICES'); setIsMobileMenuOpen(false); }} icon={Megaphone} label="Portal de Avisos" />

                    <div className="pt-4 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3">Sistema</div>
                    <DirectorNavBtn active={activeTab === 'SETTINGS'} onClick={() => { setActiveTab('SETTINGS'); setIsMobileMenuOpen(false); }} icon={Settings} label="Configuración" />
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <button
                        onClick={onLogout}
                        className="flex items-center gap-3 w-full p-3 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all font-bold text-sm"
                    >
                        <LogOut size={18} />
                        Salir del Sistema
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 overflow-y-auto bg-slate-50/50 p-4 md:p-8 h-full w-full">
                <div className="max-w-7xl mx-auto">
                    {/* Header for View */}
                    <div className="mb-8 flex justify-between items-end">
                        <div>
                            <h2 className="text-3xl font-bold text-slate-800 tracking-tight">
                                {activeTab === 'DASHBOARD' && 'Resumen Ejecutivo'}
                                {activeTab === 'STAFF' && 'Administración de Personal'}
                                {activeTab === 'MANAGEMENT' && 'Gestión de Tareas Docentes'}
                                {activeTab === 'ROTATION' && 'Rotación de Guardias'}
                                {activeTab === 'FINANCE' && 'Control Financiero'}
                                {activeTab === 'STUDENTS' && 'Matrícula Escolar'}
                                {activeTab === 'PARENTS' && 'Familias y Tutores'}
                                {activeTab === 'CALENDAR' && 'Agenda Institucional'}
                                {activeTab === 'NOTICES' && 'Comunicación Oficial'}
                                {activeTab === 'SETTINGS' && 'Configuración del Sistema'}
                                {activeTab === 'DOCUMENTS' && 'Generador de Documentos'}
                            </h2>
                            <p className="text-slate-400 font-medium mt-1">
                                {schoolConfig.schoolName} • Ciclo Escolar {schoolConfig.schoolYear || '2024-2025'}
                            </p>
                        </div>
                        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-xs font-bold text-slate-600">Sistema en Línea</span>
                        </div>
                    </div>

                    {/* Content Switcher */}
                    {activeTab === 'DASHBOARD' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-slideUp">
                            <StatCard
                                icon={Users} color="bg-indigo-500"
                                title="Matrícula Total" value={students.length}
                                subtitle={`${students.filter((s: Student) => s.annualFeePaid).length} al corriente de pago`}
                                onClick={() => setActiveTab('STUDENTS')}
                            />
                            <StatCard
                                icon={Briefcase} color="bg-emerald-500"
                                title="Personal Activo" value={(schoolConfig.staff?.length || 0) + 1}
                                subtitle="Ver Tareas y Entregas"
                                onClick={() => setActiveTab('MANAGEMENT')}
                            />
                            {(() => {
                                const paidCount = students.filter((s: Student) => s.annualFeePaid).length;
                                const feesTotal = paidCount * feeCost;
                                const eventsTotal = (store.financeEvents || []).reduce((acc: any, e: any) => acc + (Object.values(e.contributions || {}).reduce((s: number, v: any) => s + Number(v), 0)), 0);
                                const totalRevenue = feesTotal + eventsTotal;

                                return (
                                    <StatCard
                                        icon={Wallet} color="bg-amber-500"
                                        title="Recaudación Total"
                                        value={`$${totalRevenue.toLocaleString()}`}
                                        subtitle={
                                            <div className="flex flex-col gap-0.5 mt-0.5">
                                                <span className="flex items-center gap-1">
                                                    Cuotas: ${feesTotal.toLocaleString()}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleUpdateFee(); }}
                                                        className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 text-[10px] font-mono text-slate-600 transition-colors"
                                                        title="Click para cambiar el costo de la cuota"
                                                    >
                                                        (@ ${feeCost})
                                                    </button>
                                                </span>
                                                <span>+ Eventos: ${eventsTotal.toLocaleString()}</span>
                                            </div>
                                        }
                                        onClick={() => setActiveTab('FINANCE')}
                                    />
                                );
                            })()}
                            {(() => {
                                const sevenDaysAgo = new Date();
                                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

                                const recentIncidents = behaviorLogs.filter((log: any) => {
                                    const logDate = new Date(log.date);
                                    return log.type === 'NEGATIVE' && logDate >= sevenDaysAgo;
                                });

                                return (
                                    <StatCard
                                        icon={MessageSquare}
                                        color={recentIncidents.length > 0 ? "bg-red-500" : "bg-slate-400"}
                                        title="Incidencias Recientes"
                                        value={recentIncidents.length}
                                        subtitle={recentIncidents.length > 0 ? "Click para revisar" : "Sin reportes"}
                                        onClick={() => setShowIncidentsModal(true)}
                                        badge={recentIncidents.length > 0 ? "¡ATENCIÓN!" : undefined}
                                    />
                                );
                            })()}

                            {/* Incidents Modal */}
                            {showIncidentsModal && (
                                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={() => { setShowIncidentsModal(false); setSelectedStudentIdForIncidents(null); }}>
                                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl animate-scaleIn" onClick={e => e.stopPropagation()}>
                                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-red-50 rounded-t-2xl">
                                            <div>
                                                <h3 className="text-xl font-black text-red-900 flex items-center gap-2">
                                                    <AlertTriangle className="text-red-600" />
                                                    {selectedStudentIdForIncidents ? 'Historial de Conducta del Alumno' : 'Reporte de Riesgos y Conducta'}
                                                </h3>
                                                <p className="text-red-700/70 text-sm font-medium">
                                                    {selectedStudentIdForIncidents
                                                        ? `Mostrando todos los reportes de: ${students.find((s: any) => s.id === selectedStudentIdForIncidents)?.name || 'Alumno'}`
                                                        : 'Incidencias registradas en los últimos 7 días'}
                                                </p>
                                            </div>
                                            <button onClick={() => { setShowIncidentsModal(false); setSelectedStudentIdForIncidents(null); }} className="p-2 bg-white/50 hover:bg-white rounded-full text-red-800 transition-colors">
                                                <X size={20} />
                                            </button>
                                        </div>

                                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50">
                                            {(() => {
                                                let recent;
                                                if (selectedStudentIdForIncidents) {
                                                    // Show ALL history for this student
                                                    recent = behaviorLogs
                                                        .filter((log: any) => log.studentId === selectedStudentIdForIncidents || log.student_id === selectedStudentIdForIncidents)
                                                        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
                                                } else {
                                                    // Show Recent 7 days for Everyone
                                                    const sevenDaysAgo = new Date();
                                                    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                                                    recent = behaviorLogs
                                                        .filter((log: any) => log.type === 'NEGATIVE' && new Date(log.date) >= sevenDaysAgo)
                                                        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
                                                }

                                                if (recent.length === 0) return (
                                                    <div className="text-center py-12 text-slate-400">
                                                        <CheckCircle2 size={48} className="mx-auto mb-4 text-emerald-200" />
                                                        <p className="font-bold text-slate-500">Sin incidencias registradas</p>
                                                        <p className="text-xs">{selectedStudentIdForIncidents ? 'Este alumno no tiene reportes de conducta.' : 'No hay reportes de conducta negativa en la última semana.'}</p>
                                                    </div>
                                                );

                                                return (
                                                    <div className="space-y-4">
                                                        {recent.map((log: any) => (
                                                            <div key={log.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                                                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${log.severity === 'HIGH' || log.type === 'NEGATIVE' ? 'bg-red-500' : 'bg-orange-400'}`}></div>
                                                                <div className="flex justify-between items-start mb-3">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-sm border border-slate-200">
                                                                            {log.studentName?.substring(0, 2) || "??"}
                                                                        </div>
                                                                        <div>
                                                                            <h4 className="font-bold text-slate-800 text-base">{log.studentName}</h4>
                                                                            <p className="text-xs text-slate-400 font-medium">
                                                                                {new Date(log.date).toLocaleDateString()} • {new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <button
                                                                            onClick={() => setViewingIncident(log)}
                                                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                                                                            title="Ver Reporte Completo"
                                                                        >
                                                                            <FileText size={18} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => {
                                                                                if (confirm('¿Eliminar permanente este reporte de conducta?')) {
                                                                                    handleDeleteBehaviorLog(log.id);
                                                                                }
                                                                            }}
                                                                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                                            title="Eliminar Reporte"
                                                                        >
                                                                            <Trash2 size={18} />
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                <div className="ml-13 pl-3 border-l-2 border-slate-100">
                                                                    <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{log.description}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* View Full Incident Modal */}
                            {viewingIncident && (
                                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={() => setViewingIncident(null)}>
                                    <div className="bg-white rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl animate-scaleIn overflow-hidden" onClick={e => e.stopPropagation()}>
                                        <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center shrink-0">
                                            <div>
                                                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                                    <FileText className="text-indigo-600" size={20} />
                                                    Reporte Impreso
                                                </h3>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => window.print()} className="p-2 hover:bg-white rounded-lg text-slate-500 hover:text-indigo-600 transition-colors" title="Imprimir">
                                                    <Printer size={20} />
                                                </button>
                                                <button onClick={() => setViewingIncident(null)} className="p-2 hover:bg-white rounded-lg text-slate-500 hover:text-red-500 transition-colors">
                                                    <X size={20} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex-1 overflow-y-auto bg-slate-100/50 p-4 md:p-8 custom-scrollbar">
                                            <div className="border border-slate-200 rounded-xl p-8 md:p-12 bg-white shadow-sm print:border-0 print:shadow-none w-full max-w-4xl mx-auto relative flex flex-col justify-between">
                                                {/* Header Documento */}
                                                <div>
                                                    <div className="text-center mb-6 pb-4 border-b-2 border-slate-800">
                                                        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-widest mb-2 font-serif">{schoolConfig.schoolName}</h2>
                                                        <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.3em] flex items-center justify-center gap-4">
                                                            <span className="h-px w-8 bg-slate-300"></span>
                                                            Reporte de Incidencia Escolar
                                                            <span className="h-px w-8 bg-slate-300"></span>
                                                        </p>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-8 mb-6">
                                                        <div>
                                                            <div className="mb-4">
                                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Alumno</label>
                                                                <p className="font-bold text-slate-900 text-lg border-b border-slate-200 pb-1">{viewingIncident.studentName}</p>
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Grado y Grupo</label>
                                                                <p className="font-bold text-slate-700 text-sm italic">
                                                                    {students.find((s: any) => s.name === viewingIncident.studentName)?.group || schoolConfig.gradeGroup || "General"}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="mb-4">
                                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Fecha del Suceso</label>
                                                                <p className="font-bold text-slate-900 text-lg border-b border-slate-200 pb-1 inline-block">
                                                                    {new Date(viewingIncident.date).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Hora Registrada</label>
                                                                <p className="font-mono text-slate-600 font-bold text-lg">
                                                                    {new Date(viewingIncident.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="mb-6">
                                                        <div className="flex items-center gap-4 mb-2">
                                                            <label className="text-xs font-black text-slate-700 uppercase tracking-wider bg-slate-100 px-3 py-1 rounded">Descripción de los Hechos</label>
                                                            <div className="h-px flex-1 bg-slate-200"></div>
                                                        </div>
                                                        <div className="p-4 text-slate-800 leading-7 text-justify whitespace-pre-wrap font-serif text-base bg-[linear-gradient(transparent_27px,#e2e8f0_28px)] bg-[length:100%_28px] border-l-4 border-slate-300 pl-6 min-h-[150px]">
                                                            {viewingIncident.description}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Footer Documento */}
                                                <div>
                                                    <div className="grid grid-cols-2 gap-8 pt-6 border-t-2 border-slate-800 align-bottom">
                                                        <div>
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Gravedad de la Falta</label>
                                                            <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border ${viewingIncident.severity === 'HIGH' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                                                                <div className={`w-3 h-3 rounded-full ${viewingIncident.severity === 'HIGH' ? 'bg-red-500' : 'bg-orange-500'}`}></div>
                                                                {viewingIncident.severity === 'HIGH' ? 'ALTA / GRAVE' : 'MEDIA / LEVE'}
                                                            </span>
                                                        </div>
                                                        <div className="text-right flex flex-col items-end justify-end">
                                                            <div className="border-b border-slate-900 w-64 h-8 mb-2"></div>
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Firma de Enterado / Tutor</label>
                                                        </div>
                                                    </div>
                                                    <div className="mt-6 text-center">
                                                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">Documento Interno de Control Escolar • {schoolConfig.schoolName}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
                                            <button onClick={() => setViewingIncident(null)} className="px-6 py-2 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-900 transition-colors">
                                                Cerrar Reporte
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}


                            {/* Behavior Incidents Section */}
                            <div className="col-span-full mt-8">
                                <h3 className="text-lg font-bold text-slate-500 mb-4 uppercase tracking-wider flex items-center gap-2">
                                    <AlertTriangle size={18} />
                                    Incidencias de Conducta Recientes
                                </h3>

                                {(() => {
                                    // Get incidents from last 7 days
                                    const sevenDaysAgo = new Date();
                                    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

                                    const recentIncidents = behaviorLogs
                                        .filter((log: any) => {
                                            const logDate = new Date(log.date);
                                            return log.type === 'NEGATIVE' && logDate >= sevenDaysAgo;
                                        })
                                        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                        .slice(0, 10); // Solo últimas 10

                                    if (recentIncidents.length === 0) {
                                        return (
                                            <div className="text-center py-12 bg-green-50 rounded-xl border-2 border-green-200">
                                                <CheckCircle2 size={48} className="mx-auto mb-4 text-green-500" />
                                                <p className="text-green-700 font-bold">Sin incidencias reportadas en los últimos 7 días</p>
                                                <p className="text-green-600 text-sm mt-2">¡Excelente comportamiento general!</p>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {recentIncidents.map((incident: any) => {
                                                const student = students.find((s: any) => s.id === incident.studentId || s.id === incident.student_id);
                                                const teacher = (schoolConfig.staff || []).find((s: any) => s.id === incident.reportedBy) ||
                                                    { name: schoolConfig.teacherName };

                                                return (
                                                    <div
                                                        key={incident.id}
                                                        className="bg-white border-l-4 border-red-500 rounded-lg p-4 shadow-sm hover:shadow-md transition-all"
                                                    >
                                                        <div className="flex items-start justify-between mb-3">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                                                                    <AlertTriangle size={20} className="text-red-600" />
                                                                </div>
                                                                <div>
                                                                    <h4 className="font-bold text-slate-800">{student?.name || incident.studentName || 'Alumno Desconocido'}</h4>
                                                                    <p className="text-xs text-slate-500">
                                                                        {student?.group || 'Sin grupo'} • {new Date(incident.date).toLocaleDateString()}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">
                                                                -{incident.points || 1} pts
                                                            </span>
                                                        </div>

                                                        <p className="text-sm text-slate-700 mb-3 line-clamp-2">{incident.description}</p>

                                                        <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
                                                            <span className="flex items-center gap-1">
                                                                <User size={12} />
                                                                Reportado por: {incident.reportedByName || teacher.name}
                                                            </span>
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedStudentIdForIncidents(incident.studentId || incident.student_id);
                                                                    setShowIncidentsModal(true);
                                                                }}
                                                                className="text-indigo-600 hover:text-indigo-800 font-medium"
                                                            >
                                                                Ver detalles →
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
                            </div>

                            <div className="col-span-full mt-2">
                                <h3 className="text-lg font-bold text-slate-500 mb-4 uppercase tracking-wider flex items-center gap-2">
                                    <LayoutDashboard size={18} />
                                    Matrícula por Grupos
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {Object.entries(students.reduce((acc: any, s: any) => {
                                        // Normalizar nombre de grupo
                                        const g = s.group || schoolConfig.gradeGroup || 'General';
                                        if (!acc[g]) acc[g] = { total: 0, m: 0, f: 0, bap: 0 };

                                        acc[g].total++;
                                        if (s.sex === 'HOMBRE') acc[g].m++; else acc[g].f++;
                                        // Detectar BAP o USAER
                                        if ((s.bap && s.bap !== 'NINGUNA') || s.usaer) acc[g].bap++;

                                        return acc;
                                    }, {})).sort().map(([groupName, stats]: any) => (
                                        <div
                                            key={groupName}
                                            onClick={() => setSelectedGroupStats(groupName)}
                                            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg transition-all cursor-pointer group hover:border-indigo-300 relative overflow-hidden"
                                        >
                                            <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="bg-indigo-50 text-indigo-600 p-1.5 rounded-lg">
                                                    <Search size={16} />
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-50">
                                                <div>
                                                    <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                                        <div className="w-2 h-6 bg-indigo-500 rounded-full"></div>
                                                        {groupName}
                                                    </h4>
                                                    <p className="text-xs text-slate-500 ml-4 mt-0.5 font-medium flex items-center gap-1">
                                                        <span className="opacity-50">Docente:</span>
                                                        <span className="text-indigo-600 font-bold truncate max-w-[120px]">
                                                            {(schoolConfig.staff || []).find((s: any) => (s.role || '').includes('Docente') && s.group?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === groupName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase())?.name || 'Sin asignar'}
                                                        </span>
                                                    </p>
                                                </div>
                                                <span className="text-2xl font-black text-slate-700">{stats.total}</span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 mb-3">
                                                <div className="bg-blue-50 rounded-lg p-2.5 text-center border border-blue-100">
                                                    <span className="block text-xl mb-1">👦</span>
                                                    <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Niños</p>
                                                    <p className="font-bold text-blue-700 text-lg leading-none">{stats.m}</p>
                                                </div>
                                                <div className="bg-pink-50 rounded-lg p-2.5 text-center border border-pink-100">
                                                    <span className="block text-xl mb-1">👧</span>
                                                    <p className="text-[10px] text-pink-400 font-bold uppercase tracking-wider">Niñas</p>
                                                    <p className="font-bold text-pink-700 text-lg leading-none">{stats.f}</p>
                                                </div>
                                            </div>

                                            {stats.bap > 0 && (
                                                <div className="bg-amber-50 rounded-lg p-2 flex items-center justify-between border border-amber-100 px-3">
                                                    <div className="flex items-center gap-2">
                                                        <UserCheck size={14} className="text-amber-600" />
                                                        <span className="text-xs font-bold text-amber-700">Barreras / USAER</span>
                                                    </div>
                                                    <span className="font-bold text-amber-700 bg-white px-2 py-0.5 rounded-md shadow-sm text-xs border border-amber-100">
                                                        {stats.bap}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* GROUP DETAIL MODAL */}
                            {selectedGroupStats && (
                                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={() => { setSelectedGroupStats(null); setActiveAnalysisSection(null); }}>
                                    <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl animate-scaleIn flex flex-col" onClick={e => e.stopPropagation()}>
                                        {/* HEADER */}
                                        <div className="bg-slate-50 p-6 border-b border-slate-200 flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Análisis: {selectedGroupStats}</h3>
                                                    <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold border border-indigo-200">
                                                        {(schoolConfig.staff || []).find((s: any) => (s.role || '').includes('Docente') && s.group?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === selectedGroupStats.replace(/[^a-zA-Z0-9]/g, '').toLowerCase())?.name || 'Docente: Sin asignar'}
                                                    </span>
                                                </div>
                                                <p className="text-slate-500 text-sm">Resumen detallado del rendimiento y alertas del grupo.</p>
                                            </div>
                                            <button onClick={() => { setSelectedGroupStats(null); setActiveAnalysisSection(null); }} className="p-2 bg-white rounded-full hover:bg-slate-200 transition-colors text-slate-500">
                                                <X size={24} />
                                            </button>
                                        </div>

                                        {/* CONTENT */}
                                        <div className="p-8 overflow-y-auto custom-scrollbar">
                                            {(() => {
                                                const groupStudents = students.filter((s: Student) => {
                                                    const g = s.group || schoolConfig.gradeGroup || 'General';
                                                    return g === selectedGroupStats;
                                                });

                                                // METRICS
                                                const total = groupStudents.length;
                                                const males = groupStudents.filter((s: Student) => s.sex === 'HOMBRE').length;
                                                const females = groupStudents.filter((s: Student) => s.sex !== 'HOMBRE').length;

                                                // Grade Avg
                                                let sumAvgs = 0;
                                                let studentsWithGrades = 0;
                                                groupStudents.forEach((s: Student) => {
                                                    if (s.grades && s.grades.length > 0) {
                                                        let studentSum = 0;
                                                        s.grades.forEach((g: any) => {
                                                            const val = (Number(g.lenguajes || 0) + Number(g.saberes || 0) + Number(g.etica || 0) + Number(g.humano || 0)) / 4;
                                                            studentSum += val;
                                                        });
                                                        const studentGlobalAvg = studentSum / s.grades.length;
                                                        sumAvgs += studentGlobalAvg;
                                                        studentsWithGrades++;
                                                    }
                                                });
                                                const groupAvg = studentsWithGrades > 0 ? (sumAvgs / studentsWithGrades).toFixed(1) : 'S/D';

                                                // RISK ANALYSIS
                                                const riskStudents = groupStudents.filter((s: Student) => {
                                                    let stAvg = 10;
                                                    if (s.grades && s.grades.length > 0) {
                                                        let sSum = 0;
                                                        s.grades.forEach((g: any) => {
                                                            let val = 0;
                                                            if (typeof g === 'number') val = g;
                                                            else val = ((Number(g.lenguajes || 0) + Number(g.saberes || 0) + Number(g.etica || 0) + Number(g.humano || 0)) / 4);
                                                            sSum += val;
                                                        });
                                                        stAvg = sSum / s.grades.length;
                                                    }

                                                    const absences = s.attendance ? Object.values(s.attendance).filter(x => x === 'Ausente').length : 0;
                                                    const taskCompletion = s.totalAssignments > 0 ? (s.assignmentsCompleted / s.totalAssignments) : 1;

                                                    return stAvg < 7 || s.behaviorPoints < 0 || s.repeater || absences >= 3 || taskCompletion < 0.6;
                                                });

                                                // BEHAVIOR METRICS
                                                const groupLogs = behaviorLogs.filter((l: any) => groupStudents.some((s: Student) => s.id === l.studentId));
                                                const totalIncidents = groupLogs.length;
                                                const negativeCount = groupLogs.filter((l: any) => l.type === 'NEGATIVE').length;
                                                const positiveCount = groupLogs.filter((l: any) => l.type === 'POSITIVE').length;

                                                return (
                                                    <div className="space-y-6">
                                                        {/* Alertas Tempranas (New from Guide) */}
                                                        <div className="bg-red-50 border-l-4 border-red-500 rounded-r-xl p-6 shadow-sm">
                                                            <h3 className="font-bold text-red-800 mb-4 flex items-center gap-2">
                                                                <AlertTriangle size={20} />
                                                                🚨 Alertas Tempranas del Grupo
                                                            </h3>
                                                            {(() => {
                                                                const alerts = [];

                                                                // Group-level alerts
                                                                if (groupAvg !== 'S/D' && Number(groupAvg) < 7) {
                                                                    alerts.push({
                                                                        type: 'RENDIMIENTO',
                                                                        message: `Promedio grupal bajo (${groupAvg})`,
                                                                        severity: 'high'
                                                                    });
                                                                }

                                                                // Student-level alerts
                                                                riskStudents.forEach((student: Student) => {
                                                                    if (student.behaviorPoints < -10) {
                                                                        alerts.push({
                                                                            type: 'CONDUCTA',
                                                                            message: `${student.name}: Conducta crítica (${student.behaviorPoints} pts)`,
                                                                            severity: 'high'
                                                                        });
                                                                    }

                                                                    const completionRate = student.totalAssignments > 0
                                                                        ? (student.assignmentsCompleted / student.totalAssignments)
                                                                        : 1;
                                                                    if (completionRate < 0.5) {
                                                                        alerts.push({
                                                                            type: 'TAREAS',
                                                                            message: `${student.name}: Muy bajo cumplimiento de tareas (${(completionRate * 100).toFixed(0)}%)`,
                                                                            severity: 'medium'
                                                                        });
                                                                    }
                                                                });

                                                                if (alerts.length === 0) {
                                                                    return <p className="text-green-700 font-medium flex items-center gap-2"><CheckCircle2 size={16} /> ✓ No hay alertas críticas prioritarias para este grupo</p>;
                                                                }

                                                                return (
                                                                    <div className="space-y-2">
                                                                        {alerts.slice(0, 5).map((alert, idx) => (
                                                                            <div key={idx} className={`p-3 rounded-lg flex items-center justify-between ${alert.severity === 'high' ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                                                                                }`}>
                                                                                <span><span className="font-black">[{alert.type}]</span> {alert.message}</span>
                                                                                <button onClick={() => setViewStudent(riskStudents.find(s => s.name.includes(alert.message.split(':')[0])))} className="text-[10px] font-bold underline">Ver Alumno</button>
                                                                            </div>
                                                                        ))}
                                                                        {alerts.length > 5 && (
                                                                            <p className="text-xs text-slate-500 italic mt-2">+ {alerts.length - 5} alertas adicionales detectadas</p>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>

                                                        {/* Resumen de Situación (New from Guide) */}
                                                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-inner">
                                                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                                                <FileText size={20} className="text-slate-500" />
                                                                Diagnóstico Situacional
                                                            </h3>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                                                                <div className="space-y-3">
                                                                    <p className="flex items-center justify-between">
                                                                        <span className="text-slate-500">Estado Académico:</span>
                                                                        <span className={`font-bold ${Number(groupAvg) >= 8 ? 'text-green-600' : Number(groupAvg) >= 7 ? 'text-amber-600' : 'text-red-600'}`}>
                                                                            {Number(groupAvg) >= 8 ? '🟢 Excelente' : Number(groupAvg) >= 7 ? '🟡 En proceso' : '🔴 Crítico'}
                                                                        </span>
                                                                    </p>
                                                                    <p className="flex items-center justify-between">
                                                                        <span className="text-slate-500">Clima de Aula:</span>
                                                                        <span className={`font-bold ${negativeCount === 0 ? 'text-green-600' : negativeCount < 3 ? 'text-amber-600' : 'text-red-600'}`}>
                                                                            {negativeCount === 0 ? '🟢 Positivo' : negativeCount < 3 ? '🟡 Estable' : '🔴 Tenso / Conflictivo'}
                                                                        </span>
                                                                    </p>
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <p className="font-bold text-slate-700 text-xs uppercase mb-2">Recomendaciones de Dirección:</p>
                                                                    <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
                                                                        {Number(groupAvg) < 7 && <li>Refuerzo pedagógico urgente</li>}
                                                                        {riskStudents.length > 0 && <li>Entrevista con tutores de alumnos en riesgo</li>}
                                                                        {negativeCount > 5 && <li>Taller de convivencia escolar</li>}
                                                                        <li>Seguimiento en bitácora semanal</li>
                                                                    </ul>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* SUMMARY CARDS - CLICKABLE */}
                                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

                                                            {/* 1. ENROLLMENT CARD */}
                                                            <div
                                                                onClick={() => setActiveAnalysisSection(activeAnalysisSection === 'ENROLLMENT' ? null : 'ENROLLMENT')}
                                                                className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${activeAnalysisSection === 'ENROLLMENT' ? 'bg-emerald-100 border-emerald-300 ring-2 ring-emerald-400' : 'bg-emerald-50 border-emerald-100 hover:bg-emerald-100'}`}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className="p-3 bg-white rounded-lg shadow-sm text-emerald-600"><Users size={24} /></div>
                                                                    <div>
                                                                        <p className="text-xs font-bold text-emerald-800 uppercase">Matrícula</p>
                                                                        <p className="text-2xl font-black text-emerald-900">{total}</p>
                                                                        <span className="text-[10px] text-emerald-700 font-bold">{males} H  • {females} M</span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* 2. ACADEMIC CARD */}
                                                            <div
                                                                onClick={() => setActiveAnalysisSection(activeAnalysisSection === 'ACADEMIC' ? null : 'ACADEMIC')}
                                                                className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${activeAnalysisSection === 'ACADEMIC' ? 'bg-blue-100 border-blue-300 ring-2 ring-blue-400' : 'bg-blue-50 border-blue-100 hover:bg-blue-100'}`}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className="p-3 bg-white rounded-lg shadow-sm text-blue-600"><TrendingUp size={24} /></div>
                                                                    <div>
                                                                        <p className="text-xs font-bold text-blue-800 uppercase">Promedio Gral.</p>
                                                                        <p className="text-2xl font-black text-blue-900">{groupAvg}</p>
                                                                        <span className="text-[10px] text-blue-700 font-bold">Ver desglose</span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* 3. RISK CARD */}
                                                            <div
                                                                onClick={() => setActiveAnalysisSection(activeAnalysisSection === 'RISK' ? null : 'RISK')}
                                                                className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${activeAnalysisSection === 'RISK' ? 'bg-amber-100 border-amber-300 ring-2 ring-amber-400' : 'bg-amber-50 border-amber-100 hover:bg-amber-100'}`}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className="p-3 bg-white rounded-lg shadow-sm text-amber-600"><AlertTriangle size={24} /></div>
                                                                    <div>
                                                                        <p className="text-xs font-bold text-amber-800 uppercase">Alerta Riesgo</p>
                                                                        <p className="text-2xl font-black text-amber-900">{riskStudents.length}</p>
                                                                        <span className="text-[10px] text-amber-700 font-bold">Ver alumnos</span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* 4. BEHAVIOR CARD (NEW) */}
                                                            <div
                                                                onClick={() => setActiveAnalysisSection(activeAnalysisSection === 'BEHAVIOR' ? null : 'BEHAVIOR')}
                                                                className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${activeAnalysisSection === 'BEHAVIOR' ? 'bg-purple-100 border-purple-300 ring-2 ring-purple-400' : 'bg-purple-50 border-purple-100 hover:bg-purple-100'}`}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className="p-3 bg-white rounded-lg shadow-sm text-purple-600"><MessageSquare size={24} /></div>
                                                                    <div>
                                                                        <p className="text-xs font-bold text-purple-800 uppercase">Conducta</p>
                                                                        <p className="text-2xl font-black text-purple-900">{groupLogs.length}</p>
                                                                        <span className="text-[10px] text-purple-700 font-bold">{negativeCount} (-) • {positiveCount} (+)</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* DETAIL SECTIONS CONTAINER */}
                                                        <div className="animate-fadeIn">

                                                            {/* RISK DETAIL SECTION */}
                                                            {activeAnalysisSection === 'RISK' && (
                                                                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                                                                    <div className="bg-red-50 p-4 border-b border-red-100 flex justify-between items-center">
                                                                        <h4 className="font-bold text-red-800 flex items-center gap-2">
                                                                            <AlertTriangle size={18} />
                                                                            Alumnos en Riesgo Detectado
                                                                        </h4>
                                                                    </div>
                                                                    <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                                                                        {riskStudents.length === 0 ? (
                                                                            <div className="p-8 text-center text-slate-400 text-sm flex flex-col items-center">
                                                                                <CheckCircle2 size={40} className="mb-2 text-emerald-400" />
                                                                                ¡Excelente! No hay alertas de riesgo activas en este grupo.
                                                                            </div>
                                                                        ) : (
                                                                            riskStudents.map((s: Student) => (
                                                                                <div key={s.id} onClick={() => setViewStudent(s)} className="p-4 hover:bg-slate-50 flex justify-between items-center cursor-pointer group/item transition-colors">
                                                                                    <div className="flex items-center gap-4">
                                                                                        <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden border border-slate-100">
                                                                                            <img src={s.avatar || `https://ui-avatars.com/api/?name=${s.name}`} className="w-full h-full object-cover" />
                                                                                        </div>
                                                                                        <div>
                                                                                            <p className="text-sm font-bold text-slate-800 group-hover/item:text-indigo-600 transition-colors">{s.name}</p>
                                                                                            <div className="flex gap-2 mt-1">
                                                                                                {/* Reasons chips */}
                                                                                                {s.behaviorPoints < 0 && <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full border border-red-200 font-bold">Conducta ({s.behaviorPoints})</span>}
                                                                                                {s.repeater && <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200 font-bold">Repetidor</span>}
                                                                                                {(s.attendance && Object.values(s.attendance || {}).filter(x => x === 'Ausente').length >= 3) && <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full border border-rose-200 font-bold">Faltas ({Object.values(s.attendance).filter(x => x === 'Ausente').length})</span>}
                                                                                                {(s.totalAssignments > 0 && (s.assignmentsCompleted / s.totalAssignments) < 0.6) && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200 font-bold">Tareas ({Math.round((s.assignmentsCompleted / s.totalAssignments) * 100)}%)</span>}
                                                                                                {(() => {
                                                                                                    if (!s.grades || s.grades.length === 0) return null;
                                                                                                    const avg = s.grades.reduce((acc: number, g: any) => acc + (typeof g === 'number' ? g : (Number(g.lenguajes || 0) + Number(g.saberes || 0) + Number(g.etica || 0) + Number(g.humano || 0)) / 4), 0) / s.grades.length;
                                                                                                    return avg < 7 ? <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full border border-yellow-200 font-bold">Promedio ({avg.toFixed(1)})</span> : null;
                                                                                                })()}
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-2">
                                                                                        <button
                                                                                            onClick={(e) => { e.stopPropagation(); setReportStudent(s); }}
                                                                                            className="text-xs px-4 py-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-600 hover:text-indigo-600 hover:border-indigo-400 shadow-sm transition-all hover:shadow">
                                                                                            Ver Reporte
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            ))
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* BEHAVIOR DETAIL SECTION */}
                                                            {activeAnalysisSection === 'BEHAVIOR' && (
                                                                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                                                                    <div className="bg-purple-50 p-4 border-b border-purple-100 flex justify-between items-center">
                                                                        <h4 className="font-bold text-purple-800 flex items-center gap-2">
                                                                            <MessageSquare size={18} />
                                                                            Historial de Conducta Reciente
                                                                        </h4>
                                                                    </div>
                                                                    <div className="max-h-[400px] overflow-y-auto">
                                                                        {groupLogs.length === 0 ? (
                                                                            <div className="p-8 text-center text-slate-400 text-sm">No hay registros de comportamiento para este grupo.</div>
                                                                        ) : (
                                                                            <table className="w-full text-sm">
                                                                                <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0">
                                                                                    <tr>
                                                                                        <th className="p-3 text-left">Fecha</th>
                                                                                        <th className="p-3 text-left">Alumno</th>
                                                                                        <th className="p-3 text-center">Tipo</th>
                                                                                        <th className="p-3 text-left">Descripción</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody className="divide-y divide-slate-100">
                                                                                    {groupLogs
                                                                                        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                                                                        .map((log: any) => (
                                                                                            <tr
                                                                                                key={log.id}
                                                                                                className="hover:bg-slate-50 cursor-pointer group/row transition-colors"
                                                                                                onClick={() => { setSelectedStudentIdForIncidents(log.studentId || log.student_id); setShowIncidentsModal(true); }}
                                                                                            >
                                                                                                <td className="p-3 text-xs text-slate-500">{new Date(log.date).toLocaleDateString()}</td>
                                                                                                <td className="p-3 font-bold text-slate-700 group-hover/row:text-purple-600 transition-colors">{log.studentName}</td>
                                                                                                <td className="p-3 text-center">
                                                                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${log.type === 'POSITIVE' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                                                                                                        {log.type === 'POSITIVE' ? '+ POSITIVO' : '- NEGATIVO'}
                                                                                                    </span>
                                                                                                </td>
                                                                                                <td className="p-3 text-slate-600">{log.description}</td>
                                                                                            </tr>
                                                                                        ))}
                                                                                </tbody>
                                                                            </table>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* ENROLLMENT DETAIL SECTION */}
                                                            {activeAnalysisSection === 'ENROLLMENT' && (
                                                                <div className="space-y-4">
                                                                    {/* BAP / USAER SUB-SECTION */}
                                                                    <div className="border border-indigo-100 rounded-xl overflow-hidden bg-indigo-50/50">
                                                                        <div className="bg-indigo-50 p-3 border-b border-indigo-100 flex justify-between items-center">
                                                                            <h4 className="font-bold text-indigo-800 flex items-center gap-2 text-sm">
                                                                                <Users size={16} />
                                                                                Necesidades Educativas (BAP/USAER)
                                                                            </h4>
                                                                        </div>
                                                                        <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                                                                            {(groupStudents.filter((s: Student) => (s.bap && s.bap !== 'NINGUNA') || s.usaer)).length === 0 ? (
                                                                                <p className="col-span-2 text-center text-xs text-slate-400 py-4">No hay alumnos con BAP/USAER registrados.</p>
                                                                            ) : (
                                                                                groupStudents.filter((s: Student) => (s.bap && s.bap !== 'NINGUNA') || s.usaer).map((s: Student) => (
                                                                                    <div key={s.id} onClick={() => setReportStudent(s)} className="bg-white p-2 rounded border border-indigo-100 flex items-center gap-2 cursor-pointer hover:border-indigo-300">
                                                                                        <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden shrink-0">
                                                                                            <img src={s.avatar || `https://ui-avatars.com/api/?name=${s.name}`} className="w-full h-full object-cover" />
                                                                                        </div>
                                                                                        <div className="overflow-hidden">
                                                                                            <p className="text-xs font-bold text-slate-800 truncate">{s.name}</p>
                                                                                            <p className="text-[10px] text-indigo-600 font-medium truncate">
                                                                                                {s.usaer ? 'USAER ' : ''} {s.bap !== 'NINGUNA' ? s.bap : ''}
                                                                                            </p>
                                                                                        </div>
                                                                                    </div>
                                                                                ))
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {/* FULL LIST */}
                                                                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                                                                        <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                                                                            <h4 className="font-bold text-slate-700 flex items-center gap-2">
                                                                                <Users size={18} />
                                                                                Listado Completo del Grupo
                                                                            </h4>
                                                                        </div>
                                                                        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto">
                                                                            {groupStudents.map((s: Student) => (
                                                                                <div key={s.id} onClick={() => setReportStudent(s)} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-indigo-400 hover:shadow-md cursor-pointer transition-all bg-white group">
                                                                                    <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden border border-slate-100 group-hover:border-indigo-200">
                                                                                        <img src={s.avatar || `https://ui-avatars.com/api/?name=${s.name}`} className="w-full h-full object-cover" />
                                                                                    </div>
                                                                                    <div className="overflow-hidden">
                                                                                        <p className="text-sm font-bold text-slate-800 truncate group-hover:text-indigo-700">{s.name}</p>
                                                                                        <p className="text-[10px] text-slate-500 font-mono">{s.id}</p>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* ACADEMIC DETAIL SECTION */}
                                                            {activeAnalysisSection === 'ACADEMIC' && (
                                                                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                                                                    <div className="bg-blue-50 p-4 border-b border-blue-100 flex justify-between items-center">
                                                                        <h4 className="font-bold text-blue-800 flex items-center gap-2">
                                                                            <TrendingUp size={18} />
                                                                            Rendimiento Académico
                                                                        </h4>
                                                                    </div>
                                                                    <div className="max-h-[400px] overflow-y-auto">
                                                                        <table className="w-full text-sm">
                                                                            <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0">
                                                                                <tr>
                                                                                    <th className="p-3 text-left">Alumno</th>
                                                                                    <th className="p-3 text-center">Promedio Actual</th>
                                                                                    <th className="p-3 text-center">Estatus</th>
                                                                                    <th className="p-3 text-right">Acción</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="divide-y divide-slate-100">
                                                                                {groupStudents.map((s: Student) => {
                                                                                    let avg = 0;
                                                                                    if (s.grades && s.grades.length > 0) {
                                                                                        const sum = s.grades.reduce((acc: number, g: any) => acc + (typeof g === 'number' ? g : (Number(g.lenguajes || 0) + Number(g.saberes || 0) + Number(g.etica || 0) + Number(g.humano || 0)) / 4), 0);
                                                                                        avg = sum / s.grades.length;
                                                                                    }
                                                                                    return (
                                                                                        <tr key={s.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setReportStudent(s)}>
                                                                                            <td className="p-3 font-bold text-slate-700">{s.name}</td>
                                                                                            <td className="p-3 text-center font-mono font-bold text-base">
                                                                                                <span className={avg < 6 ? 'text-red-600' : avg < 8 ? 'text-amber-600' : 'text-green-600'}>
                                                                                                    {avg > 0 ? avg.toFixed(1) : '-'}
                                                                                                </span>
                                                                                            </td>
                                                                                            <td className="p-3 text-center">
                                                                                                {avg > 0 ? (
                                                                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${avg >= 9 ? 'bg-green-100 text-green-700' : avg >= 6 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                                                                                                        {avg >= 9 ? 'DESTACADO' : avg >= 6 ? 'REGULAR' : 'REQUIERE APOYO'}
                                                                                                    </span>
                                                                                                ) : <span className="text-slate-400 text-xs">Sin evaluaciones</span>}
                                                                                            </td>
                                                                                            <td className="p-3 text-right">
                                                                                                <button className="text-indigo-600 hover:text-indigo-800 text-xs font-bold">Ver Boleta</button>
                                                                                            </td>
                                                                                        </tr>
                                                                                    );
                                                                                })}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* EMPTY STATE - NO SELECTION */}
                                                            {!activeAnalysisSection && (
                                                                <div className="text-center py-10 opacity-50">
                                                                    <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                                                                        <Search size={24} className="text-slate-400" />
                                                                    </div>
                                                                    <p className="text-slate-500 font-medium">Selecciona una tarjeta arriba para ver el detalle</p>
                                                                </div>
                                                            )}

                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            )}
                            {/* INCIDENTS HISTORY MODAL */}
                            {showIncidentsModal && selectedStudentIdForIncidents && (
                                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn" onClick={() => setShowIncidentsModal(false)}>
                                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-scaleIn flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                                        <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center shrink-0">
                                            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                                <MessageSquare size={20} className="text-purple-600" />
                                                Historial de Conducta
                                            </h3>
                                            <button onClick={() => setShowIncidentsModal(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
                                        </div>
                                        <div className="p-6 overflow-y-auto">
                                            {/* Student Header */}
                                            <div className="flex items-center gap-4 mb-6">
                                                {(() => {
                                                    const stud = students.find((s: any) => s.id === selectedStudentIdForIncidents);
                                                    if (!stud) return null;
                                                    return (
                                                        <>
                                                            <div className="w-16 h-16 rounded-full bg-slate-200 overflow-hidden border-2 border-slate-100 shrink-0">
                                                                <img src={stud.avatar || `https://ui-avatars.com/api/?name=${stud.name}`} className="w-full h-full object-cover" />
                                                            </div>
                                                            <div>
                                                                <h2 className="text-xl font-bold text-slate-800">{stud.name}</h2>
                                                                <p className="text-slate-500 text-sm">Puntos Actuales: <span className={`font-bold ${stud.behaviorPoints < 0 ? 'text-red-600' : 'text-green-600'}`}>{stud.behaviorPoints > 0 ? '+' : ''}{stud.behaviorPoints}</span></p>
                                                            </div>
                                                        </>
                                                    )
                                                })()}
                                            </div>

                                            {/* Logs List */}
                                            {behaviorLogs.filter((l: any) => l.studentId === selectedStudentIdForIncidents).length === 0 ? (
                                                <div className="text-center py-8 text-slate-400 border border-dashed border-slate-200 rounded-xl">
                                                    <span className="text-4xl block mb-2">🤷‍♂️</span>
                                                    No hay incidencias registradas.
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {behaviorLogs.filter((l: any) => l.studentId === selectedStudentIdForIncidents)
                                                        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                                        .map((log: any) => (
                                                            <div key={log.id} className="flex gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-sm transition-all">
                                                                <div className={`shrink-0 w-1 p-0.5 rounded-full ${log.type === 'POSITIVE' ? 'bg-green-400' : 'bg-red-400'}`}></div>
                                                                <div className="flex-1">
                                                                    <div className="flex justify-between items-start mb-1">
                                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${log.type === 'POSITIVE' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                                                                            {log.type === 'POSITIVE' ? 'POSITIVO' : 'NEGATIVO'}
                                                                        </span>
                                                                        <span className="text-xs text-slate-400">{new Date(log.date).toLocaleDateString()}</span>
                                                                    </div>
                                                                    <p className="text-slate-700 text-sm font-medium">{log.description}</p>
                                                                    {log.points && <p className="text-xs text-slate-400 mt-1">Puntos: {log.points > 0 ? '+' : ''}{log.points}</p>}
                                                                </div>
                                                            </div>
                                                        ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Staff Tasks Tracking Section */}
                            <div className="col-span-full mt-8">
                                <h3 className="text-lg font-bold text-slate-500 mb-4 uppercase tracking-wider flex items-center gap-2">
                                    <Briefcase size={18} />
                                    Seguimiento de Tareas del Personal
                                </h3>
                                <div className="grid grid-cols-1 gap-4">
                                    {staffTasks && staffTasks.length > 0 ? (
                                        staffTasks.map((task: any) => {
                                            const totalStaff = task.assignedTo === 'ALL' || task.assignedTo === 'DOCENTES'
                                                ? (schoolConfig.staff?.length || 0)
                                                : 1;
                                            const completedCount = task.completedBy?.length || 0;
                                            const progress = totalStaff > 0 ? (completedCount / totalStaff) * 100 : 0;
                                            const isLate = new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED';

                                            return (
                                                <div
                                                    key={task.id}
                                                    className={`glass-card p-4 rounded-xl border-l-4 ${task.status === 'COMPLETED' ? 'border-green-500 bg-green-50/30' :
                                                        isLate ? 'border-red-500 bg-red-50/30' :
                                                            'border-blue-500'
                                                        }`}
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <h4 className="font-bold text-slate-800 text-lg">{task.title}</h4>
                                                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${task.type === 'COMMISSION' ? 'bg-purple-100 text-purple-700' :
                                                                    task.type === 'DOCUMENTATION' ? 'bg-blue-100 text-blue-700' :
                                                                        'bg-green-100 text-green-700'
                                                                    }`}>
                                                                    {task.type}
                                                                </span>
                                                                {/* Action Buttons */}
                                                                <div className="flex items-center gap-2 ml-auto">
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditingId(task.id);
                                                                            setNewTask({
                                                                                title: task.title,
                                                                                description: task.description || '',
                                                                                assignedTo: task.assignedTo,
                                                                                type: task.type,
                                                                                dueDate: task.dueDate,
                                                                                priority: task.priority || 'NORMAL'
                                                                            });
                                                                            setShowAddModal(true);
                                                                        }}
                                                                        className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded transition-colors"
                                                                        title="Editar tarea"
                                                                    >
                                                                        <Edit2 size={14} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            if (window.confirm('¿Eliminar esta tarea? Esta acción no se puede deshacer.')) {
                                                                                handleDeleteStaffTask(task.id);
                                                                            }
                                                                        }}
                                                                        className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded transition-colors"
                                                                        title="Eliminar tarea"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            {task.description && (
                                                                <p className="text-sm text-slate-600 mb-2">{task.description}</p>
                                                            )}
                                                            <div className="flex items-center gap-4 text-xs text-slate-500">
                                                                <span>📅 Vence: {task.dueDate}</span>
                                                                <span>👥 Asignado a: {task.assignedTo === 'ALL' ? 'Todo el Personal' : task.assignedTo === 'DOCENTES' ? 'Docentes' : 'Individual'}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-end gap-2">
                                                            <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${task.status === 'COMPLETED' ? 'bg-green-500 text-white' :
                                                                isLate ? 'bg-red-500 text-white' :
                                                                    'bg-blue-500 text-white'
                                                                }`}>
                                                                {task.status === 'COMPLETED' ? '✓ Completada' : isLate ? '⚠ Tarde' : '⏳ Pendiente'}
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-2xl font-bold text-slate-700">
                                                                    {completedCount}/{totalStaff}
                                                                </div>
                                                                <div className="text-xs text-slate-500">Entregadas</div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Progress Bar */}
                                                    <div className="mt-3">
                                                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                                            <div
                                                                className={`h-full transition-all ${task.status === 'COMPLETED' ? 'bg-green-500' :
                                                                    isLate ? 'bg-red-500' :
                                                                        'bg-blue-500'
                                                                    }`}
                                                                style={{ width: `${progress}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>

                                                    {/* List of Staff who completed */}
                                                    {task.completedBy && task.completedBy.length > 0 && (
                                                        <div className="mt-3 pt-3 border-t border-slate-200">
                                                            <p className="text-xs font-bold text-slate-500 uppercase mb-2">✓ Han entregado:</p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {task.completedBy.map((staffId: string) => {
                                                                    const staff = schoolConfig.staff?.find((s: any) => s.id === staffId);
                                                                    return staff ? (
                                                                        <div
                                                                            key={staffId}
                                                                            className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5"
                                                                        >
                                                                            <img
                                                                                src={staff.avatar || `https://ui-avatars.com/api/?name=${staff.name}&background=random`}
                                                                                alt={staff.name}
                                                                                className="w-6 h-6 rounded-full"
                                                                            />
                                                                            <span className="text-xs font-medium text-green-800">{staff.name}</span>
                                                                            <CheckCircle2 size={14} className="text-green-600" />
                                                                        </div>
                                                                    ) : null;
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* List of Staff who are MISSING */}
                                                    {(() => {
                                                        const allRelevantStaff = task.assignedTo === 'ALL' || task.assignedTo === 'DOCENTES'
                                                            ? (schoolConfig.staff || [])
                                                            : [];

                                                        const missingStaff = allRelevantStaff.filter((staff: any) =>
                                                            !task.completedBy?.includes(staff.id)
                                                        );

                                                        const dueDate = new Date(task.dueDate);
                                                        const today = new Date();
                                                        const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                                                        const showReminder = daysDiff <= 1 && daysDiff >= 0 && task.status !== 'COMPLETED';

                                                        return (
                                                            <>
                                                                {showReminder && (
                                                                    <div className="mt-3 p-3 bg-amber-50 border-l-4 border-amber-500 rounded">
                                                                        <p className="text-xs font-bold text-amber-800 flex items-center gap-2">
                                                                            <span className="text-xl">⏰</span>
                                                                            {daysDiff === 0 ? '¡VENCE HOY!' : '¡VENCE MAÑANA!'} - Recordatorio activo
                                                                        </p>
                                                                    </div>
                                                                )}

                                                                {missingStaff.length > 0 && (
                                                                    <div className="mt-3 pt-3 border-t border-slate-200">
                                                                        <p className="text-xs font-bold text-red-500 uppercase mb-2">❌ Faltantes ({missingStaff.length}):</p>
                                                                        <div className="flex flex-wrap gap-2">
                                                                            {missingStaff.map((staff: any) => (
                                                                                <div
                                                                                    key={staff.id}
                                                                                    className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5"
                                                                                >
                                                                                    <img
                                                                                        src={staff.avatar || `https://ui-avatars.com/api/?name=${staff.name}&background=random`}
                                                                                        alt={staff.name}
                                                                                        className="w-6 h-6 rounded-full"
                                                                                    />
                                                                                    <span className="text-xs font-medium text-red-800">{staff.name}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-center py-12 text-slate-400">
                                            <Briefcase size={48} className="mx-auto mb-4 opacity-30" />
                                            <p>No hay tareas asignadas al personal.</p>
                                            <button
                                                onClick={() => setActiveTab('MANAGEMENT')}
                                                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                                            >
                                                Crear Primera Tarea
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Shortcut Grid */}
                            <div className="col-span-full mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                                <ShortcutBtn
                                    icon={Megaphone} title="Crear Aviso Oficial" desc="Publicar boletín para padres"
                                    onClick={() => setActiveTab('NOTICES')}
                                />
                                <ShortcutBtn
                                    icon={Briefcase} title="Asignar Entregas" desc="Pedir planeaciones a docentes"
                                    onClick={() => setActiveTab('MANAGEMENT')}
                                />
                                <ShortcutBtn
                                    icon={Calendar} title="Agendar Evento" desc="Nuevo evento institucional"
                                    onClick={() => setActiveTab('CALENDAR')}
                                />
                                <ShortcutBtn
                                    icon={RotateCw} title="Ver Roles de Guardia" desc="Consultar asignaciones de recreo"
                                    onClick={() => setActiveTab('ROTATION')}
                                />
                            </div>

                            {/* Add Modal for Dashboard */}
                            {showAddModal && (
                                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
                                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-scaleIn">
                                        <h3 className="text-lg font-bold text-slate-800 mb-4">{editingId ? 'Editar Asignación' : 'Nueva Asignación'}</h3>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-1">Título</label>
                                                <input autoFocus value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} className="w-full p-2 border border-slate-200 rounded-lg text-sm" placeholder="Ej. Entrega Planeación Enero" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 mb-1">Tipo</label>
                                                    <select value={newTask.type} onChange={e => setNewTask({ ...newTask, type: e.target.value as any })} className="w-full p-2 border border-slate-200 rounded-lg text-sm">
                                                        <option value="COMMISSION">Comisión / Guardia</option>
                                                        <option value="DOCUMENTATION">Entrega Documentos</option>
                                                        <option value="ACTIVITY">Actividad General</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 mb-1">Fecha Límite</label>
                                                    <input type="date" value={newTask.dueDate} onChange={e => setNewTask({ ...newTask, dueDate: e.target.value })} className="w-full p-2 border border-slate-200 rounded-lg text-sm" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-1">Asignar A</label>
                                                <select value={newTask.assignedTo} onChange={e => setNewTask({ ...newTask, assignedTo: e.target.value })} className="w-full p-2 border border-slate-200 rounded-lg text-sm">
                                                    <option value="ALL">-- Todo el Personal --</option>
                                                    <option value="DOCENTES">-- Todos los Docentes --</option>
                                                    {(schoolConfig.staff || []).filter((s: any) => {
                                                        const role = (s.role || '').toLowerCase();
                                                        return !role.includes('director') && !role.includes('dirección');
                                                    }).map((s: any) => (
                                                        <option key={s.id} value={s.id}>{s.name} ({s.group})</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-1">Descripción</label>
                                                <textarea value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} className="w-full p-2 border border-slate-200 rounded-lg text-sm h-24" placeholder="Detalles de la tarea..." />
                                            </div>
                                        </div>

                                        <div className="flex gap-3 mt-6">
                                            <button onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-lg hover:bg-slate-200">Cancelar</button>
                                            <button onClick={handleSaveTask} className="flex-1 px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700">Guardar Asignación</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'STAFF' && <StaffPanel />}

                    {activeTab === 'FINANCE' && (
                        // Reusing FinanceView but passing props from store
                        <div className="animate-fadeIn">
                            <FinanceView
                                students={store.students}
                                financeEvents={store.financeEvents}
                                onUpdateStudentFee={store.handleUpdateStudentFee}
                                onAddEvent={store.handleAddFinanceEvent}
                                onDeleteEvent={store.handleDeleteFinanceEvent}
                                onUpdateContribution={store.handleUpdateContribution}
                                readOnly={!canEditContent}
                            />
                        </div>
                    )}

                    {activeTab === 'STUDENTS' && (
                        // Reusing StudentsView in a container
                        <div className="animate-fadeIn">
                            <StudentsView
                                students={store.students}
                                onAdd={store.handleAddStudent}
                                onEdit={store.handleEditStudent}
                                onDelete={store.handleDeleteStudent}
                                onImport={store.handleImportStudents}
                                config={store.schoolConfig}
                                logs={store.behaviorLogs}
                                readOnly={!canEditContent}
                            />
                        </div>
                    )}

                    {activeTab === 'PARENTS' && <ParentsDirectory />}

                    {activeTab === 'CALENDAR' && <DirectorCalendar />}

                    {activeTab === 'ROTATION' && <RotationManager />}

                    {activeTab === 'MANAGEMENT' && <TaskManager />}

                    {activeTab === 'NOTICES' && (
                        <div className="animate-fadeIn">
                            <CommunicationsView students={store.students} directorMode={true} staffList={store.schoolConfig.staff || []} />
                        </div>
                    )}

                    {activeTab === 'SETTINGS' && (
                        <div className="animate-fadeIn">
                            <SettingsView
                                config={store.schoolConfig}
                                onSave={store.setSchoolConfig}
                                onExport={store.exportState}
                                onImport={store.importState}
                                onSyncToDB={() => store.syncState(true)}
                                onRecover={store.recoverFromLocalStorage}
                                directorMode={true}
                            />
                        </div>
                    )}

                    {activeTab === 'DOCUMENTS' && <DocumentsPanel />}
                </div>

                {/* STUDENT DETAIL MODAL (Read Only) */}
                {viewStudent && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn" onClick={() => setViewStudent(null)}>
                        <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                            <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center shrink-0">
                                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                    <div className="bg-indigo-100 p-1.5 rounded text-indigo-700"><User size={20} /></div>
                                    Ficha del Alumno
                                </h3>
                                <button onClick={() => setViewStudent(null)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200 rounded-full transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-8 overflow-y-auto custom-scrollbar">
                                <div className="flex flex-col md:flex-row gap-8 items-start mb-8">
                                    <div className="flex-shrink-0 text-center">
                                        <img src={viewStudent.avatar || `https://ui-avatars.com/api/?name=${viewStudent.name}`} className="w-32 h-32 rounded-full border-4 border-indigo-50 shadow-lg object-cover mx-auto" alt="Avatar" />
                                        <div className={`mt-3 px-3 py-1 rounded-full text-xs font-bold inline-block border ${viewStudent.status === 'INSCRITO' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                            {viewStudent.status}
                                        </div>
                                    </div>
                                    <div className="flex-1 w-full">
                                        <h2 className="text-2xl font-black text-slate-800 mb-2">{viewStudent.name}</h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                                            <div><label className="text-[10px] font-bold text-slate-400 uppercase block">CURP</label><p className="font-bold text-slate-700">{viewStudent.curp || 'S/D'}</p></div>
                                            <div><label className="text-[10px] font-bold text-slate-400 uppercase block">Fecha Nacimiento</label><p className="font-mono text-slate-600">{viewStudent.birthDate || '-'}</p></div>
                                            <div><label className="text-[10px] font-bold text-slate-400 uppercase block">Grado y Grupo</label><p className="font-bold text-slate-700">{viewStudent.group || schoolConfig.gradeGroup}</p></div>
                                            <div><label className="text-[10px] font-bold text-slate-400 uppercase block">Sexo</label><p className="text-slate-600">{viewStudent.sex}</p></div>
                                            <div className="col-span-1 md:col-span-2 bg-slate-50 p-3 rounded border border-slate-100 mt-2">
                                                <div className="flex gap-4">
                                                    <div><label className="text-[10px] font-bold text-slate-400 uppercase block">Tutor Legal</label><p className="font-bold text-slate-800">{viewStudent.guardianName || 'No Registrado'}</p></div>
                                                    <div><label className="text-[10px] font-bold text-slate-400 uppercase block">Teléfono</label><p className="font-bold text-slate-800 flex items-center gap-1"><Phone size={12} />{viewStudent.guardianPhone || 'S/D'}</p></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ALERTS SECTION */}
                                {(() => {
                                    // Calculate Risk Factors
                                    const risks: string[] = [];

                                    // Grade Risk
                                    let globalAvg = 0;
                                    if (viewStudent.grades && viewStudent.grades.length > 0) {
                                        let sum = 0;
                                        viewStudent.grades.forEach((g: any) => {
                                            if (typeof g === 'object') sum += (Number(g.lenguajes || 0) + Number(g.saberes || 0) + Number(g.etica || 0) + Number(g.humano || 0)) / 4;
                                            else sum += Number(g);
                                        });
                                        globalAvg = sum / viewStudent.grades.length;
                                    }
                                    if (globalAvg > 0 && globalAvg < 7) risks.push(`Promedio Bajo (${globalAvg.toFixed(1)})`);

                                    // Behavior Risk
                                    if (viewStudent.behaviorPoints < 0) risks.push(`Conducta Negativa (${viewStudent.behaviorPoints} pts)`);

                                    // Repeater Risk
                                    if (viewStudent.repeater) risks.push('Repetidor del Grado');

                                    // Assignment Risk
                                    if (viewStudent.totalAssignments > 0) {
                                        const assignmentRate = (viewStudent.assignmentsCompleted / viewStudent.totalAssignments) * 100;
                                        if (assignmentRate < 60) risks.push(`Bajo Cumplimiento de Tareas (${Math.round(assignmentRate)}%)`);
                                    }

                                    // Attendance Risk
                                    if (viewStudent.attendance) {
                                        const absences = Object.values(viewStudent.attendance).filter(x => x === 'Ausente').length;
                                        if (absences >= 3) risks.push(`Baja Asistencia (${absences} faltas registradas)`);
                                    }

                                    // USAER/BAP
                                    const hasRisk = risks.length > 0;
                                    const hasSpecialNeeds = viewStudent.usaer || (viewStudent.bap && viewStudent.bap !== 'NINGUNA');

                                    if (hasRisk || hasSpecialNeeds) {
                                        return (
                                            <div className="mb-8 p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-lg">
                                                <h4 className="font-bold text-amber-800 mb-2 flex items-center gap-2"><AlertTriangle size={18} /> Alertas Detectadas</h4>

                                                {/* Risk Factors List */}
                                                {hasRisk && (
                                                    <div className="mb-3">
                                                        <p className="text-xs font-bold text-amber-900 uppercase mb-1">Motivos de Riesgo:</p>
                                                        <ul className="list-disc list-inside text-sm text-amber-800 font-medium ml-2">
                                                            {risks.map((r, i) => <li key={i}>{r}</li>)}
                                                        </ul>
                                                    </div>
                                                )}

                                                {/* Special Needs Tags */}
                                                {hasSpecialNeeds && (
                                                    <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-amber-200">
                                                        {viewStudent.usaer && <span className="bg-white px-3 py-1 rounded shadow-sm text-xs font-bold text-amber-700 border border-amber-200">USAER</span>}
                                                        {viewStudent.bap && viewStudent.bap !== 'NINGUNA' && <span className="bg-white px-3 py-1 rounded shadow-sm text-xs font-bold text-amber-700 border border-amber-200">BAP: {viewStudent.bap}</span>}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    }
                                    return null;
                                })()}

                                {/* GRADES TABLE */}
                                <div>
                                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Briefcase size={18} /> Rendimiento Académico</h3>
                                    <table className="w-full text-sm border-collapse border border-slate-200 mb-4">
                                        <thead>
                                            <tr className="bg-slate-100 text-slate-600">
                                                <th className="border p-2 text-left">Periodo</th>
                                                <th className="border p-2 text-center w-24">Promedio</th>
                                                <th className="border p-2 text-center">Nivel</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {/* Simplified logic for grades display in this quick view */}
                                            {[1, 2, 3].map((tri) => {
                                                const grade = viewStudent.grades && viewStudent.grades[tri - 1];
                                                let avg = 0;
                                                if (grade) {
                                                    if (typeof grade === 'object') {
                                                        avg = (Number(grade.lenguajes || 0) + Number(grade.saberes || 0) + Number(grade.etica || 0) + Number(grade.humano || 0)) / 4;
                                                    } else {
                                                        avg = Number(grade);
                                                    }
                                                }

                                                if (!grade) return <tr key={tri}><td className="border p-2">Trimestre {tri}</td><td colSpan={2} className="border p-2 text-center text-slate-300">-</td></tr>;

                                                return (
                                                    <tr key={tri}>
                                                        <td className="border p-2 font-medium">Trimestre {tri}</td>
                                                        <td className={`border p-2 text-center font-bold ${avg < 6 ? 'text-red-600' : avg < 8 ? 'text-amber-600' : 'text-emerald-600'}`}>{avg.toFixed(1)}</td>
                                                        <td className="border p-2 text-center text-xs text-slate-500">{avg >= 9 ? 'DESTACADO' : avg >= 8 ? 'SATISFACTORIO' : avg >= 6 ? 'SUFICIENTE' : 'INSUFICIENTE'}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* FULL REPORT PRINT VIEW OVERLAY */}
                {reportStudent && (
                    <div className="fixed inset-0 z-[120] bg-white overflow-y-auto animate-fadeIn">
                        {/* Header Actions - Hidden on Print */}
                        <div className="sticky top-0 bg-slate-800 text-white p-4 flex justify-between items-center print:hidden shadow-lg z-50">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setReportStudent(null)}
                                    className="flex items-center gap-2 hover:text-slate-300 transition-colors"
                                >
                                    <X size={24} />
                                    <span className="font-bold">Cerrar</span>
                                </button>
                                <div className="h-6 w-px bg-slate-600"></div>
                                <h2 className="font-bold">Vista Preliminar del Reporte</h2>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => window.print()}
                                    className="bg-white text-slate-900 px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-100 transition-colors"
                                >
                                    <Printer size={20} />
                                    Imprimir / Guardar PDF
                                </button>
                                <button
                                    onClick={() => generateReportCard(reportStudent, schoolConfig)}
                                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                                >
                                    <FileDown size={20} />
                                    Boleta
                                </button>
                                <button
                                    onClick={() => generateBehaviorReport(reportStudent, behaviorLogs, schoolConfig)}
                                    className="bg-rose-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200"
                                >
                                    <AlertCircle size={20} />
                                    Conducta
                                </button>
                            </div>
                        </div>

                        {/* Report Content - A4 sized container */}
                        <div id="print-container" className="max-w-[210mm] mx-auto bg-white p-[10mm] min-h-[297mm] shadow-xl my-8 print:shadow-none print:m-0 print:w-full print:h-auto text-slate-900 text-sm">

                            {/* School Header */}
                            <div className="flex border-b-2 border-slate-800 pb-6 mb-8 gap-6 items-center">
                                <div className="w-24 h-24 flex-shrink-0 flex items-center justify-center">
                                    {schoolConfig.schoolLogo ? (
                                        <img src={schoolConfig.schoolLogo} alt="Logo" className="max-w-full max-h-full object-contain" />
                                    ) : (
                                        <Building2 size={64} className="text-slate-200" />
                                    )}
                                </div>
                                <div className="flex-1 text-center">
                                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Secretaría de Educación Pública y Cultura</h3>
                                    <h1 className="text-2xl font-bold uppercase tracking-wider mb-1 text-slate-900">{schoolConfig.schoolName}</h1>
                                    <div className="flex justify-center gap-4 text-xs font-bold mt-2 text-slate-500 mb-2">
                                        <span>C.C.T: {schoolConfig.cct}</span>
                                        <span>•</span>
                                        <span>{schoolConfig.zone}</span>
                                        <span>•</span>
                                        <span>{schoolConfig.sector}</span>
                                    </div>
                                    <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">{schoolConfig.location}</p>
                                </div>
                                <div className="w-24 text-right flex flex-col items-center gap-2">
                                    <div className="border border-slate-300 w-24 h-32 bg-slate-50 flex items-center justify-center overflow-hidden">
                                        <img src={reportStudent.avatar} alt="Alumno" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="border border-slate-200 p-1 bg-white">
                                        <img
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${reportStudent.id}`}
                                            alt="QR"
                                            className="w-20 h-20 mix-blend-multiply"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Personal Extended Info */}
                            <div className="mb-8">
                                <h2 className="text-lg font-bold bg-slate-800 text-white px-4 py-2 mb-4 uppercase tracking-wider rounded-sm">Ficha de Identificación</h2>

                                <div className="grid grid-cols-4 gap-4 mb-4">
                                    <div className="col-span-2">
                                        <label className="block text-[10px] text-slate-500 font-bold uppercase">Nombre Completo</label>
                                        <div className="font-bold text-lg border-b border-slate-300">{reportStudent.name}</div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-slate-500 font-bold uppercase">Clave Alumno</label>
                                        <div className="font-mono text-base border-b border-slate-300">{reportStudent.id}</div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-slate-500 font-bold uppercase">Estatus</label>
                                        <div className="font-bold text-base border-b border-slate-300">{reportStudent.status || 'INSCRITO'}</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-4 gap-4 mb-4">
                                    <div>
                                        <label className="block text-[10px] text-slate-500 font-bold uppercase">CURP</label>
                                        <div className="font-mono text-sm border-b border-slate-300">{reportStudent.curp || '-'}</div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-slate-500 font-bold uppercase">Fecha Nacimiento</label>
                                        <div className="text-sm border-b border-slate-300">{reportStudent.birthDate || '-'}</div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-slate-500 font-bold uppercase">Lugar Nacimiento</label>
                                        <div className="text-sm border-b border-slate-300">{reportStudent.birthPlace || '-'}</div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-slate-500 font-bold uppercase">Sexo</label>
                                        <div className="text-sm border-b border-slate-300">{reportStudent.sex || '-'}</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-[10px] text-slate-500 font-bold uppercase">Grado y Grupo</label>
                                        <div className="text-sm border-b border-slate-300">{reportStudent.group || schoolConfig.gradeGroup}</div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-slate-500 font-bold uppercase">Fecha Alta</label>
                                        <div className="text-sm border-b border-slate-300">{reportStudent.enrollmentDate || '-'}</div>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-[10px] text-slate-500 font-bold uppercase">Necesidades Educativas</label>
                                        <div className="text-sm border-b border-slate-300 flex gap-2">
                                            {reportStudent.usaer && <span className="font-bold text-blue-800">[USAER]</span>}
                                            {reportStudent.repeater && <span className="font-bold text-red-800">[REPETIDOR]</span>}
                                            {reportStudent.bap !== 'NINGUNA' && <span>BAP: {reportStudent.bap}</span>}
                                            {!reportStudent.usaer && !reportStudent.repeater && reportStudent.bap === 'NINGUNA' && <span>SIN OBSERVACIONES</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Contact Info */}
                            <div className="mb-8 p-4 bg-slate-50 rounded border border-slate-200">
                                <div className="grid grid-cols-3 gap-6">
                                    <div>
                                        <label className="block text-[10px] text-slate-500 font-bold uppercase">Tutor Legal</label>
                                        <div className="font-bold text-slate-800">{reportStudent.guardianName}</div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-slate-500 font-bold uppercase">Teléfono de Contacto</label>
                                        <div className="font-bold text-slate-800">{reportStudent.guardianPhone}</div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-slate-500 font-bold uppercase">Docente Responsable</label>
                                        <div className="text-slate-800">
                                            {(() => {
                                                const studentGroupStr = (reportStudent.group || schoolConfig.gradeGroup || '').toUpperCase();
                                                const studentGrade = studentGroupStr.match(/(\d+)/)?.[0];
                                                const studentLetter = studentGroupStr.match(/[A-F]/)?.[0];

                                                if (!studentGrade || !studentLetter) return schoolConfig.teacherName;

                                                const foundTeacher = schoolConfig.staff?.find((s: any) => {
                                                    const staffGroupStr = (s.group || '').toUpperCase();
                                                    const staffGrade = staffGroupStr.match(/(\d+)/)?.[0];
                                                    const staffLetter = staffGroupStr.match(/[A-F]/)?.[0];
                                                    return staffGrade === studentGrade && staffLetter === studentLetter;
                                                });

                                                return foundTeacher?.name || schoolConfig.teacherName;
                                            })()}
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-6 mt-4 pt-4 border-t border-slate-200">
                                    <div>
                                        <label className="block text-[10px] text-slate-500 font-bold uppercase">Domicilio</label>
                                        <div className="font-bold text-slate-800 text-sm whitespace-normal">{reportStudent.address || 'NO REGISTRADO'}</div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-slate-500 font-bold uppercase">Ocupación del Tutor</label>
                                        <div className="font-bold text-slate-800 text-sm">{reportStudent.guardianOccupation || 'NO REGISTRADO'}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Stats Row */}
                            <div className="grid grid-cols-2 gap-8 mb-8">
                                <div>
                                    <h3 className="text-sm font-bold uppercase text-slate-600 border-b border-slate-200 pb-1 mb-3">Estadística de Asistencia</h3>
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div className="bg-green-50 p-2 rounded border border-green-100">
                                            <div className="text-xl font-bold text-green-700">{reportStudent.attendance ? Object.values(reportStudent.attendance).filter((x: any) => x === 'Presente').length : 0}</div>
                                            <div className="text-[10px] uppercase font-bold text-green-600">Asistencias</div>
                                        </div>
                                        <div className="bg-red-50 p-2 rounded border border-red-100">
                                            <div className="text-xl font-bold text-red-700">{reportStudent.attendance ? Object.values(reportStudent.attendance).filter((x: any) => x === 'Ausente').length : 0}</div>
                                            <div className="text-[10px] uppercase font-bold text-red-600">Faltas</div>
                                        </div>
                                        <div className="bg-yellow-50 p-2 rounded border border-yellow-100">
                                            <div className="text-xl font-bold text-yellow-700">{reportStudent.attendance ? Object.values(reportStudent.attendance).filter((x: any) => x === 'Retardo').length : 0}</div>
                                            <div className="text-[10px] uppercase font-bold text-yellow-600">Retardos</div>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold uppercase text-slate-600 border-b border-slate-200 pb-1 mb-3">Cumplimiento Académico</h3>
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div className="bg-slate-50 p-2 rounded border border-slate-200">
                                            <div className="text-xl font-bold text-indigo-700">
                                                {reportStudent.grades && reportStudent.grades.length > 0
                                                    ? (() => {
                                                        const sumAvgs = reportStudent.grades.reduce((acc: number, g: any) => {
                                                            if (typeof g === 'number') return acc + g;
                                                            const tAvg = (Number(g.lenguajes || 0) + Number(g.saberes || 0) + Number(g.etica || 0) + Number(g.humano || 0)) / 4;
                                                            return acc + tAvg;
                                                        }, 0);
                                                        return (sumAvgs / reportStudent.grades.length).toFixed(1);
                                                    })()
                                                    : '-'}
                                            </div>
                                            <div className="text-[10px] uppercase font-bold text-slate-500">Promedio</div>
                                        </div>
                                        <div className="bg-slate-50 p-2 rounded border border-slate-200">
                                            <div className="text-xl font-bold text-slate-700">
                                                {reportStudent.behaviorPoints > 0 ? '+' : ''}{reportStudent.behaviorPoints}
                                            </div>
                                            <div className="text-[10px] uppercase font-bold text-slate-500">Conducta</div>
                                        </div>
                                        <div className="bg-slate-50 p-2 rounded border border-slate-200">
                                            <div className="text-xl font-bold text-blue-700">
                                                {reportStudent.totalAssignments > 0
                                                    ? Math.round((reportStudent.assignmentsCompleted / reportStudent.totalAssignments) * 100)
                                                    : 0}%
                                            </div>
                                            <div className="text-[10px] uppercase font-bold text-slate-500">Tareas</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Grades Table */}
                            <div className="mb-8">
                                <h3 className="text-sm font-bold uppercase text-slate-600 border-b border-slate-200 pb-1 mb-4">Historial de Evaluaciones</h3>
                                <table className="w-full text-sm border-collapse border border-slate-200">
                                    <thead className="bg-slate-100">
                                        <tr>
                                            <th className="border border-slate-200 p-2 text-left">Concepto / Periodo</th>
                                            <th className="border border-slate-200 p-2 text-center w-32">Calificación</th>
                                            <th className="border border-slate-200 p-2 text-center w-48">Nivel de Desempeño</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(!reportStudent.grades || reportStudent.grades.length === 0) ? (
                                            <tr><td colSpan={3} className="p-4 text-center text-slate-400">Sin calificaciones registradas</td></tr>
                                        ) : (
                                            reportStudent.grades.map((grade: any, idx: number) => {
                                                let score = 0;
                                                if (typeof grade === 'number') {
                                                    score = grade;
                                                } else if (typeof grade === 'string') {
                                                    score = parseFloat(grade) || 0;
                                                } else if (typeof grade === 'object' && grade !== null) {
                                                    const g = grade as any;
                                                    score = (Number(g.lenguajes || 0) + Number(g.saberes || 0) + Number(g.etica || 0) + Number(g.humano || 0)) / 4;
                                                } else {
                                                    score = Number(grade) || 0;
                                                }

                                                return (
                                                    <tr key={idx}>
                                                        <td className="border border-slate-200 p-2">Evaluación Parcial {idx + 1}</td>
                                                        <td className="border border-slate-200 p-2 text-center font-bold">{score.toFixed(1)}</td>
                                                        <td className="border border-slate-200 p-2 text-center text-xs">
                                                            {(() => {
                                                                const val = Number(score);
                                                                if (val >= 9) return 'DESTACADO';
                                                                if (val >= 8) return 'SATISFACTORIO';
                                                                if (val >= 6) return 'SUFICIENTE';
                                                                return 'INSUFICIENTE';
                                                            })()}
                                                        </td>
                                                    </tr>
                                                )
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Behavior History */}
                            <div className="mb-8">
                                <h3 className="text-sm font-bold uppercase text-slate-600 border-b border-slate-200 pb-1 mb-4">Historial de Conducta e Incidencias</h3>
                                <table className="w-full text-sm border-collapse border border-slate-200">
                                    <thead className="bg-slate-100">
                                        <tr>
                                            <th className="border border-slate-200 p-2 text-left w-32">Fecha</th>
                                            <th className="border border-slate-200 p-2 text-left w-32">Tipo</th>
                                            <th className="border border-slate-200 p-2 text-left">Descripción / Observación</th>
                                            <th className="border border-slate-200 p-2 text-center w-24">Puntos</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(() => {
                                            const studentLogs = behaviorLogs.filter((l: any) => l.studentId === reportStudent.id || l.student_id === reportStudent.id).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

                                            if (studentLogs.length === 0) {
                                                return (
                                                    <tr><td colSpan={4} className="p-4 text-center text-slate-400">Sin registro de incidencias o conductas.</td></tr>
                                                );
                                            }

                                            return studentLogs.map((log: any, idx: number) => (
                                                <tr key={log.id || idx}>
                                                    <td className="border border-slate-200 p-2 text-xs">{new Date(log.date).toLocaleDateString()}</td>
                                                    <td className="border border-slate-200 p-2 text-xs font-semibold">
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] border ${log.type === 'POSITIVE' ? 'bg-green-50 text-green-700 border-green-200' :
                                                            log.type === 'NEGATIVE' ? 'bg-red-50 text-red-700 border-red-200' :
                                                                'bg-slate-50 text-slate-600 border-slate-200'
                                                            }`}>
                                                            {log.type === 'POSITIVE' ? 'POSITIVO' : log.type === 'NEGATIVE' ? 'NEGATIVO' : 'NEUTRO'}
                                                        </span>
                                                    </td>
                                                    <td className="border border-slate-200 p-2 text-xs text-slate-600">{log.description}</td>
                                                    <td className={`border border-slate-200 p-2 text-center font-bold ${log.points > 0 ? 'text-green-600' : log.points < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                                                        {log.points > 0 ? '+' : ''}{log.points}
                                                    </td>
                                                </tr>
                                            ));
                                        })()}
                                    </tbody>
                                </table>
                            </div>

                            {/* Footer Signatures */}
                            <div className="mt-auto pt-24 flex justify-between items-end">
                                <div className="text-center w-1/3">
                                    <div className="border-t border-slate-400 pt-2 mb-1"></div>
                                    <p className="text-sm font-bold">
                                        {(() => {
                                            const studentGroupStr = (reportStudent.group || schoolConfig.gradeGroup || '').toUpperCase();
                                            if (!schoolConfig.staff || schoolConfig.staff.length === 0) return schoolConfig.teacherName;

                                            const studentGrade = studentGroupStr.match(/(\d+)/)?.[0];
                                            const studentLetter = studentGroupStr.match(/[A-F]/)?.[0];

                                            if (!studentGrade || !studentLetter) return schoolConfig.teacherName;

                                            const foundTeacher = schoolConfig.staff.find((s: any) => {
                                                const staffGroupStr = (s.group || '').toUpperCase();
                                                if (staffGroupStr.includes('DIREC') || staffGroupStr.includes('ADMIN')) return false;

                                                const staffGrade = staffGroupStr.match(/(\d+)/)?.[0];
                                                const staffLetter = staffGroupStr.match(/[A-F]/)?.[0];
                                                return staffGrade === studentGrade && staffLetter === studentLetter;
                                            });

                                            return foundTeacher ? foundTeacher.name : schoolConfig.teacherName;
                                        })()}
                                    </p>
                                    <p className="text-xs text-slate-500">Docente de Grupo</p>
                                </div>
                                <div className="text-center w-1/3">
                                    <div className="border-t border-slate-400 pt-2 mb-1"></div>
                                    <p className="text-sm font-bold">{schoolConfig.directorName || 'Director(a) Escolar'}</p>
                                    <p className="text-xs text-slate-500">Director(a) de la Escuela</p>
                                </div>
                            </div>

                            <div className="mt-8 text-center text-[10px] text-slate-400">
                                <p>Documento generado el {new Date().toLocaleDateString()} a las {new Date().toLocaleTimeString()} | ID Sistema: {reportStudent.id}</p>
                            </div>

                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

// --- Helper Components ---

const DirectorNavBtn = ({ active, onClick, icon: Icon, label }: any) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-200 group ${active
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20 font-bold'
            : 'text-slate-400 hover:bg-white/5 hover:text-white font-medium'
            }`}
    >
        <Icon size={20} className={active ? 'text-white' : 'text-slate-500 group-hover:text-white'} />
        {label}
    </button>
);

const StatCard = ({ icon: Icon, color, title, value, subtitle, onClick, badge }: any) => (
    <div
        onClick={onClick}
        className={`bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-all relative ${onClick ? 'cursor-pointer hover:shadow-lg hover:-translate-y-1' : 'hover:shadow-md'}`}
    >
        {badge && (
            <div className="absolute top-2 right-2 px-2 py-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full animate-pulse">
                {badge}
            </div>
        )}
        <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center text-white shadow-lg mb-4`}>
            <Icon size={24} />
        </div>
        <h3 className="text-3xl font-bold text-slate-800 mb-1">{value}</h3>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</p>
        <p className="text-xs text-slate-400">{subtitle}</p>
    </div>
);

const ShortcutBtn = ({ icon: Icon, title, desc, onClick }: any) => (
    <button
        onClick={onClick}
        className="text-left bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all group"
    >
        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 mb-4 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
            <Icon size={20} />
        </div>
        <h4 className="font-bold text-slate-800">{title}</h4>
        <p className="text-sm text-slate-400 mt-1">{desc}</p>
    </button>
);
