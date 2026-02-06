import React, { useState } from 'react';
import { Student, BehaviorLog, SchoolConfig, SchoolEvent, Assignment } from '../types';
import {
    User, FileText, Plus, MessageSquare, ClipboardList, BookOpen,
    Clock, Calendar, Search, FileOutput, PenTool, UserPlus, X,
    Check, AlertCircle, LogOut, Users, Bell, Mail, ChevronRight,
    MapPin, AlignLeft, LayoutDashboard, Trash2, Edit2, Layers, Menu
} from 'lucide-react';
import { DocumentsView } from './DocumentsView';
import { ActivitiesView } from './ActivitiesView';

interface USAERViewProps {
    students: Student[];
    onLogIntervention: (studentId: string, type: 'USAER_OBSERVATION' | 'USAER_MEETING' | 'USAER_ACCOMMODATION' | 'USAER_SUGGESTION', description: string) => void;
    logs: BehaviorLog[];
    schoolConfig: SchoolConfig;
    onEditStudent: (id: string, data: Partial<Student>) => void;
    onLogout: () => void;
    events: SchoolEvent[];
    onAddEvent: (event: any) => void;
    onDeleteEvent: (id: string) => void;
    onUpdateConfig: (config: SchoolConfig) => void;
    onUpdateIntervention?: (id: string, data: Partial<BehaviorLog>) => void;
    onDeleteIntervention?: (id: string) => void;
    // Activities Props
    assignments: Assignment[];
    onToggleAssignment: (studentId: string, assignmentId: string) => void;
    onAddAssignment: (assignment: Partial<Assignment>) => void;
    onUpdateAssignment: (id: string, updatedData: Partial<Assignment>) => void;
    onDeleteAssignment: (id: string) => void;
}

type UsaerTab = 'DASHBOARD' | 'EXPEDIENTES' | 'DOCUMENTOS' | 'ACTIVIDADES' | 'PLANEACION' | 'AGENDA' | 'COMUNICACION' | 'PADRES';

export const USAERView: React.FC<USAERViewProps> = ({
    students, onLogIntervention, logs, schoolConfig, onEditStudent,
    onLogout, events, onAddEvent, onDeleteEvent, onUpdateConfig,
    onUpdateIntervention, onDeleteIntervention,
    assignments, onToggleAssignment, onAddAssignment, onUpdateAssignment, onDeleteAssignment
}) => {
    const [activeTab, setActiveTab] = useState<UsaerTab>('DASHBOARD');
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [interventionType, setInterventionType] = useState<'USAER_OBSERVATION' | 'USAER_MEETING' | 'USAER_ACCOMMODATION' | 'USAER_SUGGESTION'>('USAER_OBSERVATION');
    const [interventionNote, setInterventionNote] = useState('');
    const [editingLogId, setEditingLogId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    // Use specific USAER staff name if available, otherwise generic default
    const usaerStaffMember = schoolConfig.staff?.find(s => s.role === 'USAER');
    const [usaerTeacherName, setUsaerTeacherName] = useState(usaerStaffMember?.name || 'Docente de Apoyo USAER');
    const [isEditingTeacher, setIsEditingTeacher] = useState(false);

    // Event State
    const [showEventModal, setShowEventModal] = useState(false);
    const [newEvent, setNewEvent] = useState({ title: '', date: new Date().toISOString().split('T')[0], type: 'ACTIVITY' as const, description: '' });

    // Suggestion State
    const [suggestion, setSuggestion] = useState('');

    // Canalizar Modal State
    const [showReferralModal, setShowReferralModal] = useState(false);
    const [referralSearch, setReferralSearch] = useState('');
    const [selectedReferralId, setSelectedReferralId] = useState<string | null>(null);
    const [referralBap, setReferralBap] = useState('NINGUNA');
    const [showInterventionModal, setShowInterventionModal] = useState(false);

    // Override config for USAER context
    const usaerConfig = {
        ...schoolConfig,
        teacherName: usaerTeacherName,
        gradeGroup: 'USAER'
    };

    // Filter for USAER/BAP students (Main List)
    const usaerStudents = students.filter(s =>
        (s.usaer || (s.bap && s.bap !== 'NINGUNA')) &&
        (s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.curp?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Candidates for referral (NOT currently in USAER)
    const referralCandidates = students
        .filter(s => !s.usaer && (!s.bap || s.bap === 'NINGUNA'))
        .filter(s => s.name.toLowerCase().includes(referralSearch.toLowerCase()) || s.curp?.toLowerCase().includes(referralSearch.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name));

    const selectedStudent = students.find(s => s.id === selectedStudentId);

    // Filter logs for selected student and USAER types
    const selectedLogs = logs.filter(l =>
        l.studentId === selectedStudentId &&
        (l.type === 'USAER_OBSERVATION' || l.type === 'USAER_MEETING' || l.type === 'USAER_ACCOMMODATION')
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const handleAddLog = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedStudentId && interventionNote.trim()) {
            if (editingLogId && onUpdateIntervention) {
                onUpdateIntervention(editingLogId, { type: interventionType, description: interventionNote });
                setEditingLogId(null);
            } else {
                onLogIntervention(selectedStudentId, interventionType, interventionNote);
            }
            setInterventionNote('');
            setShowInterventionModal(false);
        }
    };

    const handleEditLog = (log: BehaviorLog) => {
        setInterventionType(log.type as any);
        setInterventionNote(log.description);
        setEditingLogId(log.id);
        setShowInterventionModal(true);
    };

    const handleDeleteLogWrapped = (id: string) => {
        if (confirm('¿Estás seguro de eliminar esta intervención?') && onDeleteIntervention) {
            onDeleteIntervention(id);
            if (editingLogId === id) {
                setEditingLogId(null);
                setInterventionNote('');
            }
        }
    };

    const handleReferral = () => {
        if (selectedReferralId) {
            onEditStudent(selectedReferralId, {
                usaer: true,
                bap: referralBap
            });
            setShowReferralModal(false);
            setSelectedReferralId(null);
            setReferralBap('NINGUNA');
            setReferralSearch('');
        }
    };

    return (
        <div className="flex flex-col h-full animate-fadeIn relative">

            {/* REFERRAL MODAL */}
            {showReferralModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <UserPlus size={20} className="text-blue-600" />
                                Canalizar Alumno a USAER
                            </h3>
                            <button onClick={() => setShowReferralModal(false)} className="text-slate-400 hover:text-slate-600" aria-label="Cerrar modal">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-4 flex-1 overflow-hidden flex flex-col">
                            {/* Search */}
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Buscar alumno en padrón general..."
                                    value={referralSearch}
                                    onChange={(e) => setReferralSearch(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-medium"
                                    autoFocus
                                    aria-label="Buscar alumno para canalizar"
                                />
                            </div>

                            {/* Candidates List */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar border border-slate-100 rounded-xl mb-4">
                                {referralCandidates.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-40 text-slate-400 text-sm">
                                        <p>No se encontraron alumnos.</p>
                                    </div>
                                ) : (
                                    referralCandidates.map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => setSelectedReferralId(s.id)}
                                            className={`w-full text-left p-3 border-b border-slate-50 flex items-center gap-3 hover:bg-slate-50 transition-colors ${selectedReferralId === s.id ? 'bg-blue-50 hover:bg-blue-50' : ''}`}
                                        >
                                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedReferralId === s.id ? 'border-blue-500 bg-blue-500' : 'border-slate-300'}`}>
                                                {selectedReferralId === s.id && <Check size={10} className="text-white" />}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-700 text-sm">{s.name}</p>
                                                <p className="text-xs text-slate-400">{s.group || 'Sin Grupo'} • CURP: {s.curp}</p>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>

                            {/* Settings for Selected */}
                            {selectedReferralId && (
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 animate-slideUp">
                                    <label className="text-xs font-bold text-slate-500 mb-2 block uppercase">Asignar BAP (Opcional)</label>
                                    <select
                                        value={referralBap}
                                        onChange={(e) => setReferralBap(e.target.value)}
                                        className="w-full p-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:border-blue-500"
                                        aria-label="Asignar BAP"
                                    >
                                        <option value="NINGUNA">NINGUNA (Solo Seguimiento)</option>
                                        <option value="INTELECTUAL">DISC. INTELECTUAL</option>
                                        <option value="MOTRIZ">DISC. MOTRIZ</option>
                                        <option value="AUDITIVA">DISC. AUDITIVA</option>
                                        <option value="VISUAL">DISC. VISUAL</option>
                                        <option value="TEA">TRASTORNO ESPECTRO AUTISTA (TEA)</option>
                                        <option value="TDAH">TDAH</option>
                                        <option value="LENGUAJE-COMUNICACION">DIF. LENGUAJE Y COMUNICACIÓN</option>
                                        <option value="CONDUCTUAL">DIF. CONDUCTUAL</option>
                                    </select>

                                    <div className="flex items-start gap-2 mt-3 text-xs text-blue-600 bg-blue-100/50 p-2 rounded-lg">
                                        <AlertCircle size={14} className="mt-0.5 shrink-0" />
                                        <p>Al confirmar, el alumno aparecerá en tu lista de seguimiento USAER. No se moverá de su grupo original.</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                            <button onClick={() => setShowReferralModal(false)} className="px-4 py-2 text-slate-500 font-bold text-sm hover:text-slate-700">Cancelar</button>
                            <button
                                onClick={handleReferral}
                                disabled={!selectedReferralId}
                                className="px-6 py-2 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
                            >
                                Confirmar Canalización
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* INTERVENTION MODAL */}
            {showInterventionModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                {editingLogId ? <Edit2 size={20} className="text-amber-500" /> : <Plus size={20} className="text-blue-600" />}
                                {editingLogId ? 'Editar Intervención' : 'Nueva Intervención'}
                            </h3>
                            <button onClick={() => setShowInterventionModal(false)} className="text-slate-400 hover:text-slate-600" aria-label="Cerrar modal">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <form onSubmit={handleAddLog} className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">Tipo de Registro</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setInterventionType('USAER_OBSERVATION')}
                                            aria-label="Registrar observación"
                                            className={`p-3 rounded-lg text-left text-xs font-bold transition-all border ${interventionType === 'USAER_OBSERVATION' ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <ClipboardList size={16} />
                                                OBSERVACIÓN
                                            </div>
                                            <span className="font-normal opacity-80">Registro de comportamiento o avance en aula.</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setInterventionType('USAER_ACCOMMODATION')}
                                            aria-label="Registrar ajuste razonable"
                                            className={`p-3 rounded-lg text-left text-xs font-bold transition-all border ${interventionType === 'USAER_ACCOMMODATION' ? 'bg-purple-50 border-purple-300 text-purple-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <BookOpen size={16} />
                                                AJUSTE RAZONABLE
                                            </div>
                                            <span className="font-normal opacity-80">Modificaciones a actividades o evaluaciones.</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setInterventionType('USAER_MEETING')}
                                            aria-label="Registrar entrevista o reunión"
                                            className={`p-3 rounded-lg text-left text-xs font-bold transition-all border ${interventionType === 'USAER_MEETING' ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <MessageSquare size={16} />
                                                ENTREVISTA / REUNIÓN
                                            </div>
                                            <span className="font-normal opacity-80">Con padres, docentes o especialistas.</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setInterventionType('USAER_SUGGESTION')}
                                            aria-label="Registrar sugerencia al docente"
                                            className={`p-3 rounded-lg text-left text-xs font-bold transition-all border ${interventionType === 'USAER_SUGGESTION' ? 'bg-orange-50 border-orange-300 text-orange-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <Bell size={16} />
                                                SUGERENCIA AL DOCENTE
                                            </div>
                                            <span className="font-normal opacity-80">Recomendaciones para el aula regular.</span>
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">Descripción / Reporte</label>
                                    <textarea
                                        value={interventionNote}
                                        onChange={(e) => setInterventionNote(e.target.value)}
                                        placeholder="Describe la intervención, acuerdos o avances..."
                                        className="w-full p-3 border border-slate-200 rounded-lg h-32 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                    />
                                </div>

                                <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowInterventionModal(false)}
                                        className="px-4 py-2 text-slate-500 font-bold text-sm hover:text-slate-700"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        disabled={!interventionNote.trim()}
                                        className={`px-6 py-2 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg ${editingLogId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                                    >
                                        {editingLogId ? 'Actualizar Registro' : 'Guardar Registro'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}


            {/* USAER MOBILE HEADER */}
            <div className="md:hidden bg-slate-900 p-4 flex items-center justify-between shrink-0 sticky top-0 z-40 shadow-md">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-blue-900/50">
                        <span className="font-bold text-white text-xs">US</span>
                    </div>
                    <div>
                        <h2 className="text-white font-bold text-sm leading-tight">Portal USAER</h2>
                        <p className="text-slate-400 text-[10px] uppercase font-bold">{activeTab}</p>
                    </div>
                </div>
                <button onClick={() => setIsEditingTeacher(!isEditingTeacher)} className="p-2 text-slate-300" aria-label="Menú móvil">
                    {isEditingTeacher ? <X /> : <Menu />}
                </button>
            </div>

            {/* USAER MOBILE MENU OVERLAY */}
            {isEditingTeacher && (
                <div className="fixed inset-0 top-[64px] bg-slate-900/95 backdrop-blur-xl z-50 md:hidden overflow-y-auto pb-10 animate-fadeIn">
                    <div className="p-4 space-y-2">
                        {[
                            { id: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard, color: 'text-blue-400' },
                            { id: 'EXPEDIENTES', label: 'Expedientes', icon: User, color: 'text-blue-400' },
                            { id: 'ACTIVIDADES', label: 'Actividades', icon: Layers, color: 'text-green-400' },
                            { id: 'AGENDA', label: 'Agenda', icon: Calendar, color: 'text-orange-400' },
                            { id: 'COMUNICACION', label: 'Comunicación', icon: MessageSquare, color: 'text-purple-400' },
                            { id: 'DOCUMENTOS', label: 'Documentos IA', icon: FileOutput, color: 'text-indigo-400' },
                            { id: 'PLANEACION', label: 'Planeación', icon: PenTool, color: 'text-emerald-400' },
                        ].map((item) => (
                            <button
                                key={item.id}
                                onClick={() => { setActiveTab(item.id as UsaerTab); setIsEditingTeacher(false); }}
                                className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all ${activeTab === item.id ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:bg-slate-800/50'}`}
                            >
                                <item.icon className={item.color} size={24} />
                                <span className="font-bold text-lg">{item.label}</span>
                            </button>
                        ))}

                        <div className="h-px bg-slate-800 my-4" />

                        <button
                            onClick={onLogout}
                            className="w-full flex items-center gap-4 p-4 rounded-xl text-red-400 hover:bg-red-900/20"
                        >
                            <LogOut size={24} />
                            <span className="font-bold text-lg">Salir del Módulo</span>
                        </button>
                    </div>
                </div>
            )}


            {/* Main Layout: Sidebar + Content */}
            <div className="flex h-full gap-0 bg-slate-50 flex-1 overflow-hidden">

                {/* USAER SIDEBAR (Desktop Only) */}
                <div className="hidden md:flex w-64 bg-slate-900 flex-col shrink-0 transition-all duration-300">
                    {/* Logo Area */}
                    <div className="p-6 flex items-center gap-3 border-b border-slate-800">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-900/50">
                            <span className="font-bold text-white text-sm">US</span>
                        </div>
                        <div className="overflow-hidden">
                            <h2 className="text-white font-bold text-base leading-tight truncate">Portal USAER</h2>
                            <p className="text-slate-400 text-[10px] uppercase tracking-wider truncate">Gestión Escolar</p>
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="flex-1 overflow-y-auto py-4 space-y-1 custom-scrollbar">
                        <button
                            onClick={() => setActiveTab('DASHBOARD')}
                            className={`w-full flex items-center gap-3 px-6 py-3 transition-colors relative group ${activeTab === 'DASHBOARD' ? 'text-white bg-slate-800' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
                        >
                            {activeTab === 'DASHBOARD' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-full" />}
                            <LayoutDashboard size={20} className={activeTab === 'DASHBOARD' ? 'text-blue-400' : ''} />
                            <span className="font-medium text-sm">Dashboard</span>
                        </button>

                        <div className="my-2 border-t border-slate-800 mx-6" />

                        <button
                            onClick={() => setActiveTab('EXPEDIENTES')}
                            className={`w-full flex items-center gap-3 px-6 py-3 transition-colors relative group ${activeTab === 'EXPEDIENTES' ? 'text-white bg-slate-800' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
                        >
                            {activeTab === 'EXPEDIENTES' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-full" />}
                            <User size={20} className={activeTab === 'EXPEDIENTES' ? 'text-blue-400' : ''} />
                            <span className="font-medium text-sm">Expedientes</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('ACTIVIDADES')}
                            className={`w-full flex items-center gap-3 px-6 py-3 transition-colors relative group ${activeTab === 'ACTIVIDADES' ? 'text-white bg-slate-800' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
                        >
                            {activeTab === 'ACTIVIDADES' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500 rounded-r-full" />}
                            <Layers size={20} className={activeTab === 'ACTIVIDADES' ? 'text-green-400' : ''} />
                            <span className="font-medium text-sm">Actividades</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('AGENDA')}
                            className={`w-full flex items-center gap-3 px-6 py-3 transition-colors relative group ${activeTab === 'AGENDA' ? 'text-white bg-slate-800' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
                        >
                            {activeTab === 'AGENDA' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500 rounded-r-full" />}
                            <Calendar size={20} className={activeTab === 'AGENDA' ? 'text-orange-400' : ''} />
                            <span className="font-medium text-sm">Agenda</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('COMUNICACION')}
                            className={`w-full flex items-center gap-3 px-6 py-3 transition-colors relative group ${activeTab === 'COMUNICACION' ? 'text-white bg-slate-800' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
                        >
                            {activeTab === 'COMUNICACION' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500 rounded-r-full" />}
                            <MessageSquare size={20} className={activeTab === 'COMUNICACION' ? 'text-purple-400' : ''} />
                            <span className="font-medium text-sm">Comunicación</span>
                        </button>

                        <div className="my-2 border-t border-slate-800 mx-6" />

                        <button
                            onClick={() => setActiveTab('DOCUMENTOS')}
                            className={`w-full flex items-center gap-3 px-6 py-3 transition-colors relative group ${activeTab === 'DOCUMENTOS' ? 'text-white bg-slate-800' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
                        >
                            {activeTab === 'DOCUMENTOS' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-r-full" />}
                            <FileOutput size={20} className={activeTab === 'DOCUMENTOS' ? 'text-indigo-400' : ''} />
                            <span className="font-medium text-sm">Documentos IA</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('PLANEACION')}
                            className={`w-full flex items-center gap-3 px-6 py-3 transition-colors relative group ${activeTab === 'PLANEACION' ? 'text-white bg-slate-800' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
                        >
                            {activeTab === 'PLANEACION' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-r-full" />}
                            <PenTool size={20} className={activeTab === 'PLANEACION' ? 'text-emerald-400' : ''} />
                            <span className="font-medium text-sm">Planeación</span>
                        </button>
                    </div>

                    {/* Profile Footer */}
                    <div className="p-4 bg-slate-950 border-t border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                                <User size={14} />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-xs font-bold text-white truncate">{usaerTeacherName}</p>
                                <p className="text-[10px] text-slate-500 truncate">Docente Responsable</p>
                            </div>
                        </div>
                        <button
                            onClick={onLogout}
                            className="mt-3 w-full flex items-center justify-center gap-2 py-2 bg-red-900/20 text-red-400 hover:bg-red-900/40 rounded-lg transition-colors text-xs font-bold"
                        >
                            <LogOut size={14} />
                            <span>Cerrar Sesión</span>
                        </button>
                    </div>
                </div>


                {/* CONTENT AREA */}
                <div className="flex-1 overflow-hidden relative flex flex-col bg-slate-50">

                    {/* DASHBOARD VIEW */}
                    {activeTab === 'DASHBOARD' && (
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                            <header className="mb-8">
                                <h1 className="text-2xl font-bold text-slate-800">Hola, {usaerTeacherName.split(' ')[0]}</h1>
                                <p className="text-slate-500">Bienvenido al panel de control de USAER.</p>
                            </header>

                            {/* Stats Cards */}
                            {/* Stats Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                <div
                                    onClick={() => setActiveTab('EXPEDIENTES')}
                                    className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all group"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                        <Users size={24} />
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500 font-bold group-hover:text-blue-600 transition-colors">Total Alumnos</p>
                                        <p className="text-2xl font-black text-slate-800">{usaerStudents.length}</p>
                                    </div>
                                </div>
                                <div
                                    onClick={() => setActiveTab('AGENDA')}
                                    className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all group"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center group-hover:bg-orange-600 group-hover:text-white transition-colors">
                                        <Calendar size={24} />
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500 font-bold group-hover:text-orange-600 transition-colors">Eventos Próximos</p>
                                        <p className="text-2xl font-black text-slate-800">{events.filter(e => e.targetGroup === 'USAER' || e.targetGroup === 'GLOBAL').length}</p>
                                    </div>
                                </div>
                                <div
                                    onClick={() => setActiveTab('EXPEDIENTES')}
                                    className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all group"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                        <ClipboardList size={24} />
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500 font-bold group-hover:text-purple-600 transition-colors">Intervenciones</p>
                                        <p className="text-2xl font-black text-slate-800">
                                            {logs.filter(l => l.type.startsWith('USAER') || usaerStudents.some(s => s.id === l.studentId)).length}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Recent Activity */}
                                <div>
                                    <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                                        <Clock size={18} className="text-slate-400" />
                                        Actividad Reciente
                                    </h3>
                                    <div className="space-y-3">
                                        {logs.filter(l => l.type.startsWith('USAER') || usaerStudents.some(s => s.id === l.studentId))
                                            .slice(0, 5).map(log => (
                                                <div key={log.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex gap-3">
                                                    <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${log.type === 'USAER_OBSERVATION' ? 'bg-blue-500' :
                                                        log.type === 'USAER_SUGGESTION' ? 'bg-orange-500' :
                                                            log.type === 'USAER_ACCOMMODATION' ? 'bg-purple-500' : 'bg-emerald-500'
                                                        }`} />
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-400 mb-0.5">{new Date(log.date).toLocaleDateString()} • {log.studentName}</p>
                                                        <p className="text-sm text-slate-700 line-clamp-2">{log.description}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        {logs.length === 0 && (
                                            <div className="text-center py-8 text-slate-400 bg-slate-100/50 rounded-xl border border-slate-100 border-dashed">
                                                <p className="text-sm">No hay actividad reciente.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Quick Actions / Next Events */}
                                <div>
                                    <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                                        <Calendar size={18} className="text-slate-400" />
                                        Próximos Eventos
                                    </h3>
                                    <div className="space-y-3">
                                        {events.filter(e => e.targetGroup === 'USAER' || e.targetGroup === 'GLOBAL').slice(0, 3).map(event => (
                                            <div key={event.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm border-l-4 border-l-orange-500">
                                                <div className="flex justify-between items-start">
                                                    <h4 className="font-bold text-slate-800">{event.title}</h4>
                                                    <span className="text-xs font-bold bg-orange-50 text-orange-600 px-2 py-1 rounded">{new Date(event.date + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</span>
                                                </div>
                                                <p className="text-sm text-slate-500 mt-1 line-clamp-1">{event.description || 'Sin descripción'}</p>
                                            </div>
                                        ))}
                                        {events.filter(e => e.targetGroup === 'USAER' || e.targetGroup === 'GLOBAL').length === 0 && (
                                            <div className="text-center py-8 text-slate-400 bg-slate-100/50 rounded-xl border border-slate-100 border-dashed">
                                                <p className="text-sm">No hay eventos próximos.</p>
                                                <button onClick={() => { setActiveTab('AGENDA'); setShowEventModal(true); }} className="text-blue-600 font-bold text-xs mt-2 hover:underline">
                                                    + Agendar Evento
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB: EXPEDIENTES */}
                    {activeTab === 'EXPEDIENTES' && (
                        <div className="flex h-full gap-6 md:p-6 p-0 bg-slate-50 relative">
                            {/* Left Sidebar: Student List */}
                            <div className={`w-full md:w-1/3 bg-white md:rounded-2xl rounded-none shadow-sm border border-slate-200 flex-col overflow-hidden ${selectedStudentId ? 'hidden md:flex' : 'flex'} h-full`}>
                                <div className="p-4 border-b border-slate-100 bg-slate-50">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                                <BookOpen className="text-blue-600" />
                                                Alumnos Canalizados
                                            </h2>
                                            <p className="text-xs text-slate-500 mt-1">Listado de alumnos con BAP</p>
                                        </div>
                                        <button
                                            onClick={() => setShowReferralModal(true)}
                                            className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all"
                                            title="Canalizar nuevo alumno"
                                            aria-label="Canalizar nuevo alumno"
                                        >
                                            <UserPlus size={20} />
                                        </button>
                                    </div>

                                    <div className="relative mt-3">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            type="text"
                                            placeholder="Buscar alumno..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                                            aria-label="Buscar alumno en USAER"
                                        />
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                                    {usaerStudents.length === 0 ? (
                                        <div className="p-8 text-center text-slate-400">
                                            <User size={32} className="mx-auto mb-2 opacity-30" />
                                            <p className="text-sm">No hay alumnos asignados a USAER o con BAP registrado.</p>
                                            <button onClick={() => setShowReferralModal(true)} className="mt-4 text-blue-600 font-bold text-xs hover:underline">
                                                + Canalizar Alumno
                                            </button>
                                        </div>
                                    ) : (
                                        usaerStudents.map(student => (
                                            <div
                                                key={student.id}
                                                onClick={() => setSelectedStudentId(student.id)}
                                                className={`p-3 rounded-xl cursor-pointer transition-all border ${selectedStudentId === student.id ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200' : 'bg-white border-transparent hover:bg-slate-50 border-slate-100'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <img
                                                        src={student.avatar === "PENDING_LOAD" ? `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=random` : (student.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=random`)}
                                                        alt={`Avatar de ${student.name}`}
                                                        className="w-10 h-10 rounded-full bg-slate-200 object-cover"
                                                    />
                                                    <div className="overflow-hidden">
                                                        <h4 className="font-bold text-slate-800 text-sm truncate">{student.name}</h4>
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {student.usaer && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 rounded font-bold">USAER</span>}
                                                            {student.bap !== 'NINGUNA' && <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 rounded font-bold truncate max-w-[150px]">{student.bap}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Right Content: Details & Logs */}
                            <div className={`flex-1 flex-col bg-white md:rounded-2xl rounded-none shadow-sm border border-slate-200 overflow-hidden ${selectedStudentId ? 'flex' : 'hidden md:flex'} h-full fixed inset-0 z-50 md:relative md:inset-auto md:z-auto`}>
                                {selectedStudent ? (
                                    <>
                                        {/* Student Header */}
                                        <div className="p-4 md:p-6 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start gap-4 shrink-0">
                                            <div className="flex gap-3 md:gap-4 items-center w-full md:w-auto">
                                                {/* Back Button (Mobile Only) */}
                                                <button
                                                    onClick={() => setSelectedStudentId(null)}
                                                    className="md:hidden p-2 -ml-2 text-slate-500 hover:text-slate-800"
                                                    aria-label="Volver a la lista"
                                                >
                                                    <ChevronRight className="rotate-180" size={24} />
                                                </button>

                                                <img
                                                    src={selectedStudent.avatar === "PENDING_LOAD" ? `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedStudent.name)}&background=random` : (selectedStudent.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedStudent.name)}&background=random`)}
                                                    className="w-12 h-12 md:w-16 md:h-16 rounded-full border-4 border-white shadow-sm object-cover shrink-0"
                                                    title={selectedStudent.name}
                                                    alt={selectedStudent.name}
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <h2 className="text-lg md:text-2xl font-bold text-slate-800 break-words leading-tight">{selectedStudent.name}</h2>
                                                    <div className="text-xs md:text-sm text-slate-500 flex flex-wrap gap-x-4 gap-y-1 mt-1">
                                                        <div className="flex items-center gap-1">
                                                            <span className="font-semibold">CURP:</span> <span className="truncate max-w-[120px] md:max-w-none">{selectedStudent.curp || 'N/A'}</span>
                                                        </div>
                                                        {selectedStudent.bap !== 'NINGUNA' && (
                                                            <div className="flex items-center gap-1">
                                                                <span className="font-semibold">BAP:</span>
                                                                <span className="bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded text-[10px] md:text-xs border border-orange-100 font-bold">{selectedStudent.bap}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="w-full md:w-auto flex justify-end">
                                                <div className="inline-flex items-center gap-3 bg-white p-2 md:p-3 rounded-xl border border-slate-200 shadow-sm">
                                                    <div className="text-right">
                                                        <span className="block text-xl md:text-2xl font-bold text-slate-700 leading-none">{selectedLogs.length}</span>
                                                        <span className="text-[10px] text-slate-400 uppercase font-bold">Intervenciones</span>
                                                    </div>
                                                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                                        <ClipboardList size={16} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Main Content: History Only (Form in Modal) */}
                                        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 p-6 relative">
                                            <div className="flex justify-between items-center mb-6">
                                                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                                    <Clock size={18} className="text-slate-400" />
                                                    Historial de Intervenciones
                                                </h3>
                                                <button
                                                    onClick={() => {
                                                        setEditingLogId(null);
                                                        setInterventionNote('');
                                                        setInterventionType('USAER_OBSERVATION');
                                                        setShowInterventionModal(true);
                                                    }}
                                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg shadow-blue-600/20 hover:bg-blue-700 flex items-center gap-2 transition-all"
                                                >
                                                    <Plus size={16} />
                                                    Nueva Intervención
                                                </button>
                                            </div>

                                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
                                                {selectedLogs.length === 0 ? (
                                                    <div className="text-center py-10 text-slate-400">
                                                        <FileText size={48} className="mx-auto mb-3 opacity-20" />
                                                        <p>No hay registros aún para este alumno.</p>
                                                    </div>
                                                ) : (
                                                    selectedLogs.map(log => (
                                                        <div key={log.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm relative group">
                                                            <div className="flex justify-between items-start mb-2 pl-7 relative">
                                                                {/* Action Buttons */}
                                                                <div className="absolute left-0 top-0 flex flex-col gap-1">
                                                                    <button
                                                                        onClick={() => handleEditLog(log)}
                                                                        className="p-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                                                                        title="Editar"
                                                                    >
                                                                        <Edit2 size={12} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteLogWrapped(log.id)}
                                                                        className="p-1 rounded-full text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                                                                        title="Eliminar"
                                                                    >
                                                                        <Trash2 size={12} />
                                                                    </button>
                                                                </div>

                                                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${log.type === 'USAER_OBSERVATION' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                                    log.type === 'USAER_ACCOMMODATION' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                                                        log.type === 'USAER_SUGGESTION' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                                                            'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                                    }`}>
                                                                    {log.type === 'USAER_OBSERVATION' ? 'OBSERVACIÓN' :
                                                                        log.type === 'USAER_ACCOMMODATION' ? 'AJUSTE RAZONABLE' :
                                                                            log.type === 'USAER_SUGGESTION' ? 'SUGERENCIA' : 'ENTREVISTA/REUNIÓN'}
                                                                </span>
                                                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                                                    <Calendar size={12} />
                                                                    {new Date(log.date).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{log.description}</p>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
                                        <div className="bg-white p-6 rounded-full shadow-sm mb-4">
                                            <BookOpen size={48} className="text-blue-200" />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-600">Selecciona un Alumno</h3>
                                        <p className="max-w-xs text-center mt-2 text-sm">Selecciona un alumno de la lista izquierda para ver su historial y registrar nuevas intervenciones.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB: DOCUMENTOS */}
                    {activeTab === 'DOCUMENTOS' && (
                        <div className="h-full overflow-y-auto custom-scrollbar p-0">
                            <DocumentsView students={usaerStudents} config={usaerConfig} />
                        </div>
                    )}

                    {/* TAB: ACTIVIDADES */}
                    {activeTab === 'ACTIVIDADES' && (
                        <div className="h-full overflow-y-auto custom-scrollbar p-6">
                            <ActivitiesView
                                students={usaerStudents}
                                assignments={assignments.filter(a => a.targetGroup === 'USAER')}
                                onToggleAssignment={onToggleAssignment}
                                onAddAssignment={onAddAssignment}
                                onUpdateAssignment={onUpdateAssignment}
                                onDeleteAssignment={onDeleteAssignment}
                                defaultTargetGroup="USAER"
                            />
                        </div>
                    )}

                    {/* TAB: PLANEACION */}
                    {activeTab === 'PLANEACION' && (
                        <div className="h-full overflow-hidden flex flex-col">
                            {/* Header / Tip */}
                            <div className="bg-emerald-50 border-b border-emerald-100 p-4 flex justify-between items-center shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                                        <PenTool size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-emerald-900 text-sm">Planeación Didáctica</h3>
                                        <p className="text-xs text-emerald-700">Genera formatos de planeación. Para crear actividades interactivas (Agente NEM), ve a la pestaña <b>Actividades</b>.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setActiveTab('ACTIVIDADES')}
                                    className="text-xs font-bold text-emerald-600 hover:text-emerald-800 hover:underline"
                                >
                                    Ir a Actividades &rarr;
                                </button>
                            </div>

                            {/* Reuse Documents View but focused on Planning */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                <DocumentsView students={usaerStudents} config={usaerConfig} initialType="PLANEACION" />
                            </div>
                        </div>
                    )}

                    {/* TAB: AGENDA */}
                    {activeTab === 'AGENDA' && (
                        <div className="h-full bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col overflow-hidden">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                                        <Calendar className="text-orange-500" />
                                        Agenda USAER
                                    </h2>
                                    <p className="text-sm text-slate-500">Eventos, visitas y reuniones programadas.</p>
                                </div>
                                <button
                                    onClick={() => setShowEventModal(true)}
                                    className="bg-orange-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-orange-700 shadow-lg shadow-orange-600/20 flex items-center gap-2"
                                >
                                    <Plus size={18} />
                                    Nuevo Evento
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {events.filter(e => e.targetGroup === 'USAER' || e.targetGroup === 'GLOBAL').length === 0 ? (
                                        <div className="col-span-full py-12 text-center text-slate-400">
                                            <Calendar size={48} className="mx-auto mb-4 opacity-20" />
                                            <p>No hay eventos programados en la agenda.</p>
                                        </div>
                                    ) : (
                                        events.filter(e => e.targetGroup === 'USAER' || e.targetGroup === 'GLOBAL').map(event => (
                                            <div key={event.id} className="bg-slate-50 border border-slate-200 p-4 rounded-xl hover:border-orange-200 transition-colors group relative">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded">
                                                            {new Date(event.date + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                                                        </span>
                                                        {event.targetGroup === 'GLOBAL' && <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 rounded">ESCUELA</span>}
                                                    </div>
                                                    <button
                                                        onClick={() => onDeleteEvent(event.id)}
                                                        className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        aria-label="Eliminar evento"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                                <h4 className="font-bold text-slate-800 mb-1">{event.title}</h4>
                                                {event.description && <p className="text-sm text-slate-500 line-clamp-2">{event.description}</p>}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Simple Event Modal */}
                            {showEventModal && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                                    <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-scaleIn">
                                        <h3 className="text-lg font-bold text-slate-800 mb-4">Agregar Evento a Agenda</h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 block mb-1">Título</label>
                                                <input
                                                    type="text"
                                                    value={newEvent.title}
                                                    onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                                                    className="w-full border border-slate-300 rounded-lg p-2 text-sm outline-none focus:border-orange-500"
                                                    autoFocus
                                                    placeholder="Ej: Visita de Supervisión"
                                                    aria-label="Título del evento"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 block mb-1">Fecha</label>
                                                <input
                                                    type="date"
                                                    value={newEvent.date}
                                                    onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
                                                    className="w-full border border-slate-300 rounded-lg p-2 text-sm outline-none focus:border-orange-500"
                                                    aria-label="Fecha del evento"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 block mb-1">Descripción</label>
                                                <textarea
                                                    value={newEvent.description}
                                                    onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                                                    className="w-full border border-slate-300 rounded-lg p-2 text-sm outline-none focus:border-orange-500 h-20 resize-none"
                                                    placeholder="Detalles opcionales..."
                                                    aria-label="Descripción del evento"
                                                />
                                            </div>
                                            <div className="flex gap-2 pt-2">
                                                <button
                                                    onClick={() => setShowEventModal(false)}
                                                    className="flex-1 py-2 text-slate-500 font-bold text-sm hover:bg-slate-50 rounded-lg"
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (newEvent.title) {
                                                            onAddEvent({
                                                                ...newEvent,
                                                                targetGroup: 'USAER'
                                                            });
                                                            setShowEventModal(false);
                                                            setNewEvent({ title: '', date: new Date().toISOString().split('T')[0], type: 'ACTIVITY', description: '' });
                                                        }
                                                    }}
                                                    className="flex-1 py-2 bg-orange-600 text-white font-bold text-sm rounded-lg hover:bg-orange-700 shadow-lg shadow-orange-600/20"
                                                >
                                                    Guardar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB: COMUNICACION */}
                    {activeTab === 'COMUNICACION' && (
                        <div className="h-full bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                                        <MessageSquare className="text-purple-600" />
                                        Centro de Comunicación
                                    </h2>
                                    <p className="text-sm text-slate-500">Mensajes y avisos para docentes y dirección.</p>
                                </div>
                                <button className="bg-purple-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-purple-700 shadow-lg shadow-purple-600/20 flex items-center gap-2">
                                    <PenTool size={16} />
                                    Redactar Mensaje
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                                <div className="space-y-4">
                                    <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center text-purple-700 font-bold text-xs">DI</div>
                                                <span className="font-bold text-slate-700 text-sm">Dirección Escolar</span>
                                            </div>
                                            <span className="text-xs text-slate-400">Hoy, 10:30 AM</span>
                                        </div>
                                        <p className="text-sm text-slate-700 font-medium">Reunión de Consejo Técnico</p>
                                        <p className="text-sm text-slate-600 mt-1">Se cita a todo el personal de USAER para la reunión previa al consejo técnico este viernes.</p>
                                    </div>

                                    <div className="bg-white p-4 rounded-xl border border-slate-100 hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">4A</div>
                                                <span className="font-bold text-slate-700 text-sm">Docente 4to A</span>
                                            </div>
                                            <span className="text-xs text-slate-400">Ayer</span>
                                        </div>
                                        <p className="text-sm text-slate-700 font-medium">Solicitud de valoración</p>
                                        <p className="text-sm text-slate-600 mt-1">Buen día compañero, solicito su apoyo para valorar al alumno Juan Pérez, he notado dificultades...</p>
                                    </div>
                                </div>
                                <div className="mt-8 text-center">
                                    <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Fin de los mensajes</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB: PADRES */}
                    {activeTab === 'PADRES' && (
                        <div className="h-full bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col p-8">
                            <div className="max-w-4xl mx-auto w-full">
                                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2 mb-6">
                                    <Users className="text-pink-600" />
                                    Portal de Padres de Familia
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-pink-50 p-6 rounded-2xl border border-pink-100">
                                        <h3 className="font-bold text-pink-800 mb-2 flex items-center gap-2">
                                            <div className="bg-pink-200 p-1.5 rounded-lg"><MapPin size={16} /></div>
                                            Acceso Remoto
                                        </h3>
                                        <p className="text-sm text-pink-900/70 mb-4">
                                            Los padres pueden acceder al portal web para ver tareas, calendario y reportes de avance USAER.
                                        </p>
                                        <div className="bg-white p-3 rounded-xl border border-pink-100 text-center">
                                            <span className="text-xs font-bold text-slate-400 block mb-1">ENLACE DEL PORTAL</span>
                                            <a href="/padres" target="_blank" className="text-pink-600 font-bold hover:underline text-sm truncate block">
                                                sirilagestion2.app/padres
                                            </a>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                                        <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                                            <div className="bg-slate-200 p-1.5 rounded-lg"><Mail size={16} /></div>
                                            Comunicados Generales
                                        </h3>
                                        <p className="text-sm text-slate-500 mb-4">
                                            Envía notificaciones masivas a los padres de familia del grupo USAER.
                                        </p>
                                        <button className="w-full py-2 bg-white border border-slate-300 rounded-lg text-slate-600 text-sm font-bold hover:bg-slate-50">
                                            Crear Nuevo Comunicado
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-8">
                                    <h3 className="font-bold text-slate-700 mb-4">Accesos Recientes</h3>
                                    <div className="overflow-hidden bg-white border border-slate-100 rounded-xl">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                                                <tr>
                                                    <th className="p-3">Alumno</th>
                                                    <th className="p-3">Tutor Principal</th>
                                                    <th className="p-3">Último Acceso</th>
                                                    <th className="p-3 text-right">Acción</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {usaerStudents.slice(0, 5).map(s => (
                                                    <tr key={s.id} className="hover:bg-slate-50/50">
                                                        <td className="p-3 font-medium text-slate-700">{s.name}</td>
                                                        <td className="p-3 text-slate-500">{s.guardianName || 'No registrado'}</td>
                                                        <td className="p-3 text-slate-400">Hace 2 días</td>
                                                        <td className="p-3 text-right">
                                                            <button className="text-blue-600 font-bold text-xs hover:underline">Reenviar Acceso</button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {usaerStudents.length === 0 && (
                                                    <tr>
                                                        <td colSpan={4} className="p-6 text-center text-slate-400">No hay alumnos asignados.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div >
        </div >
    );
};
