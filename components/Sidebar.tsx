import React from 'react';
import {
    LayoutDashboard, Users, QrCode, ListTodo, BookCheck, ClipboardList, Wallet, FileText, MessageSquare, Wrench, Settings, LogOut, Smartphone, Building2, Library, GraduationCap
} from 'lucide-react';
import { ViewState, SchoolConfig } from '../types';

interface SidebarProps {
    currentView: ViewState;
    setCurrentView: (view: ViewState) => void;
    schoolConfig: SchoolConfig;
    unreadCount: number;
    needsSync?: boolean;
    pendingActions?: number;
    currentUser?: any; // StaffMember | null
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, schoolConfig, unreadCount, needsSync, pendingActions = 0, currentUser }) => {

    // Determine Display Info (Default to SchoolConfig if no specific user logged in)
    const displayAvatar = currentUser?.avatar || schoolConfig.teacherAvatar;
    const displayName = currentUser?.name || schoolConfig.teacherName;
    const displaySubtitle = (currentUser?.role === 'Director' || currentUser?.role === 'Dirección')
        ? 'Dirección General'
        : (currentUser?.group || schoolConfig.gradeGroup);

    return (
        <aside className="hidden md:flex flex-col w-72 glass-dark h-screen sticky top-0 print:hidden text-white border-r-0 z-50">
            <div className="p-6 border-b border-white/10">
                <div className="flex items-center gap-2 text-white">
                    <div className="bg-indigo-600 p-2 rounded-lg">
                        <LayoutDashboard size={24} />
                    </div>
                    <h1 className="text-xl font-extrabold tracking-tight">SirilaGestion</h1>
                </div>
                <div className="mt-2 flex items-center justify-between">
                    <div className="text-xs text-slate-400 truncate opacity-70 font-light tracking-wide max-w-[140px]" title={schoolConfig.schoolName}>
                        {schoolConfig.schoolName}
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                        <div className={`w-1.5 h-1.5 rounded-full ${navigator.onLine ? (pendingActions > 0 ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]') : 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)] animate-pulse'}`}></div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                            {navigator.onLine ? (pendingActions > 0 ? `Borrador (${pendingActions})` : 'Online') : 'Local/Offline'}
                        </span>
                    </div>
                </div>
            </div>

            <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
                {(currentView === 'USAER') ? (
                    <>
                        <button
                            onClick={() => setCurrentView('USAER')}
                            className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-300 group ${currentView === 'USAER' ? 'bg-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.5)] text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}
                        >
                            <BookCheck size={20} />
                            <span className="font-medium">Portal USAER</span>
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            onClick={() => setCurrentView('DASHBOARD')}
                            className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-300 group ${currentView === 'DASHBOARD' ? 'bg-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.5)] text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}
                        >
                            <LayoutDashboard size={20} />
                            <span className="font-medium">Panel General</span>
                        </button>

                        <button
                            onClick={() => setCurrentView('STUDENTS')}
                            className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-300 group ${currentView === 'STUDENTS' ? 'bg-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.5)] text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}
                        >
                            <Users size={20} />
                            <span className="font-medium">Estudiantes</span>
                        </button>

                        <button
                            onClick={() => setCurrentView('ATTENDANCE')}
                            className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-300 group ${currentView === 'ATTENDANCE' ? 'bg-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.5)] text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}
                        >
                            <QrCode size={20} />
                            <span className="font-medium">Asistencia QR</span>
                        </button>

                        <button
                            onClick={() => setCurrentView('ACTIVITIES')}
                            className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-300 group ${currentView === 'ACTIVITIES' ? 'bg-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.5)] text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}
                        >
                            <ListTodo size={20} />
                            <span className="font-medium">Actividades</span>
                        </button>

                        <button
                            onClick={() => setCurrentView('HOMEWORK_QR')}
                            className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-300 group ${currentView === 'HOMEWORK_QR' ? 'bg-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.5)] text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}
                        >
                            <BookCheck size={20} />
                            <span className="font-medium">Entrega Tareas QR</span>
                        </button>

                        <button
                            onClick={() => setCurrentView('BEHAVIOR')}
                            className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-300 group ${currentView === 'BEHAVIOR' ? 'bg-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.5)] text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}
                        >
                            <ClipboardList size={20} />
                            <span className="font-medium">Conducta</span>
                        </button>

                        <button
                            onClick={() => setCurrentView('FINANCE')}
                            className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-300 group ${currentView === 'FINANCE' ? 'bg-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.5)] text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}
                        >
                            <Wallet size={20} />
                            <span className="font-medium">Finanzas</span>
                        </button>

                        <button
                            onClick={() => setCurrentView('DOCUMENTS')}
                            className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-300 group ${currentView === 'DOCUMENTS' ? 'bg-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.5)] text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}
                        >
                            <FileText size={20} />

                            <span className="font-medium">Documentos IA</span>
                        </button>

                        <button
                            onClick={() => setCurrentView('LIBRARY')}
                            className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-300 group ${currentView === 'LIBRARY' ? 'bg-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.5)] text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}
                        >
                            <Library size={20} />
                            <span className="font-medium">Biblioteca</span>
                        </button>

                        <button
                            onClick={() => setCurrentView('LITERACY')}
                            className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-300 group ${currentView === 'LITERACY' ? 'bg-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.5)] text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}
                        >
                            <GraduationCap size={20} />
                            <span className="font-medium">Regularización</span>
                        </button>

                        <button
                            onClick={() => setCurrentView('USAER')}
                            className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-300 group ${currentView === 'USAER' ? 'bg-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.5)] text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}
                        >
                            <BookCheck size={20} />
                            <span className="font-medium">Módulo USAER</span>
                        </button>

                        <button
                            onClick={() => setCurrentView('COMMUNICATIONS')}
                            className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-300 group relative ${currentView === 'COMMUNICATIONS' ? 'bg-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.5)] text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}
                        >
                            <MessageSquare size={20} />
                            <span className="font-medium">Comunicaciones</span>
                            {unreadCount > 0 && (
                                <span className="absolute right-3 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse shadow-lg shadow-red-500/50">
                                    {unreadCount}
                                </span>
                            )}
                        </button>

                        <div className="pt-4 mt-4 border-t border-white/10">
                            <button
                                onClick={() => setCurrentView('PARENTS_PORTAL' as any)}
                                className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-300 group ${currentView === ('PARENTS_PORTAL' as any) ? 'bg-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.5)] text-white' : 'text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200'}`}
                            >
                                <Smartphone size={20} />
                                <span className="font-medium">Portal Padres</span>
                            </button>
                            <button
                                onClick={() => setCurrentView('TOOLS')}
                                className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-300 group ${currentView === 'TOOLS' ? 'bg-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.5)] text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}
                            >
                                <Wrench size={20} />
                                <span className="font-medium">Herramientas</span>
                            </button>
                            <button
                                onClick={() => setCurrentView('SETTINGS')}
                                className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-300 group ${currentView === 'SETTINGS' ? 'bg-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.5)] text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white'} relative`}
                            >
                                <Settings size={20} />
                                <span className="font-medium">Configuración</span>
                                {needsSync && (
                                    <>
                                        <span className="absolute right-3 w-3 h-3 bg-red-500 rounded-full animate-ping"></span>
                                        <span className="absolute right-3 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-900"></span>
                                    </>
                                )}
                            </button>
                            <button
                                onClick={() => setCurrentView('LANDING' as any)}
                                className="flex items-center gap-3 w-full p-3 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-300 group"
                            >
                                <LogOut size={20} />
                                <span className="font-medium">Cerrar Sesión</span>
                            </button>
                        </div>
                        {currentUser?.role === 'Director' && (
                            <div className="pt-2 mt-2 border-t border-white/10">
                                <button
                                    onClick={() => setCurrentView('DIRECTOR')}
                                    className="flex items-center gap-3 w-full p-3 rounded-xl bg-purple-600/20 text-purple-200 hover:bg-purple-600 hover:text-white transition-all duration-300 group border border-purple-500/30"
                                >
                                    <Building2 size={20} />
                                    <span className="font-bold">Panel Dirección</span>
                                </button>
                            </div>
                        )}
                    </>
                )}
            </nav>

            <div className="p-4 border-t border-white/10 bg-black/20">
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl backdrop-blur-sm border border-white/5">
                    <img src={displayAvatar} className="w-10 h-10 rounded-full border border-slate-600 object-cover" alt="Profesor" />
                    <div className="overflow-hidden">
                        <p className="text-sm font-bold text-white truncate">{displayName}</p>
                        <p className="text-xs text-slate-400 truncate">{displaySubtitle}</p>
                    </div>
                </div>
            </div>
        </aside>
    );
};
