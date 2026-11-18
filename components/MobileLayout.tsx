import React from 'react';
import {
    LayoutDashboard, Users, QrCode, ListTodo, BookCheck, ClipboardList, Wallet, FileText, MessageSquare, Wrench, Settings, Menu, X, Smartphone, LogOut, Library, GraduationCap, FileSearch, BookOpen, AlertCircle, MoreHorizontal
} from 'lucide-react';
import { ViewState } from '../types';

interface MobileLayoutProps {
    currentView: ViewState;
    setCurrentView: (view: ViewState) => void;
    mobileMenuOpen: boolean;
    setMobileMenuOpen: (open: boolean) => void;
    unreadCount: number;
    needsSync?: boolean;
    pendingActions?: number;
}

/** Destinos de la barra inferior (los de uso diario en el aula). */
const PRIMARY_NAV: { view: ViewState; icon: any; label: string }[] = [
    { view: 'DASHBOARD', icon: LayoutDashboard, label: 'Inicio' },
    { view: 'STUDENTS', icon: Users, label: 'Alumnos' },
    { view: 'ACTIVITIES', icon: ListTodo, label: 'Tareas' },
    { view: 'ATTENDANCE', icon: QrCode, label: 'Asistencia' }
];

/** Menú completo, agrupado para que no sea una lista larga. */
const MENU_GROUPS: { title: string; items: { view: ViewState; icon: any; label: string }[] }[] = [
    {
        title: 'Trabajo diario',
        items: [
            { view: 'DASHBOARD', icon: LayoutDashboard, label: 'Panel General' },
            { view: 'EARLY_WARNING', icon: AlertCircle, label: 'Alerta Temprana' },
            { view: 'STUDENTS', icon: Users, label: 'Estudiantes' },
            { view: 'ATTENDANCE', icon: QrCode, label: 'Asistencia QR' },
            { view: 'ACTIVITIES', icon: ListTodo, label: 'Actividades' },
            { view: 'HOMEWORK_QR', icon: BookCheck, label: 'Entrega de Tareas' },
            { view: 'BEHAVIOR', icon: ClipboardList, label: 'Conducta' }
        ]
    },
    {
        title: 'Materiales y apoyo',
        items: [
            { view: 'LIBRARY', icon: Library, label: 'Biblioteca' },
            { view: 'LITERACY', icon: GraduationCap, label: 'Regularización' },
            { view: 'EXAM_GENERATOR', icon: FileSearch, label: 'Generador de Exámenes' },
            { view: 'USAER', icon: BookOpen, label: 'Módulo USAER' },
            { view: 'DOCUMENTS', icon: FileText, label: 'Documentos IA' }
        ]
    },
    {
        title: 'Gestión y familias',
        items: [
            { view: 'COMMUNICATIONS', icon: MessageSquare, label: 'Comunicaciones' },
            { view: 'FINANCE', icon: Wallet, label: 'Finanzas' },
            { view: 'PARENTS_PORTAL', icon: Smartphone, label: 'Portal de Padres' }
        ]
    },
    {
        title: 'Sistema',
        items: [
            { view: 'TOOLS', icon: Wrench, label: 'Herramientas' },
            { view: 'SETTINGS', icon: Settings, label: 'Configuración' }
        ]
    }
];

const MenuRow = ({ view, icon: Icon, label, currentView, onClick, badge }: any) => (
    <button
        onClick={() => onClick(view)}
        className={`flex items-center gap-3 w-full min-h-[48px] px-3 rounded-xl transition-all ${currentView === view
            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
            : 'text-slate-200 hover:bg-white/10 active:bg-white/15'
            }`}
    >
        <Icon size={20} className="shrink-0" />
        <span className="font-medium text-[15px] truncate">{label}</span>
        {badge > 0 && (
            <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {badge === 1 && label.includes('Configuración') ? '!' : badge}
            </span>
        )}
    </button>
);

export const MobileLayout: React.FC<MobileLayoutProps> = ({
    currentView, setCurrentView, mobileMenuOpen, setMobileMenuOpen, unreadCount, needsSync, pendingActions = 0
}) => {
    const handleNavClick = (view: ViewState) => {
        setCurrentView(view);
        setMobileMenuOpen(false);
    };

    const enMenuPrincipal = PRIMARY_NAV.some(item => item.view === currentView);

    return (
        <>
            {/* Encabezado móvil */}
            <div className="md:hidden fixed top-0 inset-x-0 z-50 glass-dark pl-4 pr-2 py-2 flex justify-between items-center print:hidden text-white shadow-md">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/90 flex items-center justify-center shrink-0">
                        <LayoutDashboard size={15} />
                    </div>
                    <h1 className="text-base font-bold text-white truncate">SirilaGestion</h1>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/5 border border-white/10">
                        <div className={`w-1.5 h-1.5 rounded-full ${navigator.onLine ? (pendingActions > 0 ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500') : 'bg-red-500 animate-pulse'}`}></div>
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">
                            {navigator.onLine ? (pendingActions > 0 ? `(${pendingActions})` : 'ON') : 'OFF'}
                        </span>
                    </div>
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="w-11 h-11 flex items-center justify-center rounded-xl active:bg-white/10"
                        aria-label="Menú"
                    >
                        {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>
            </div>

            {/* Menú completo agrupado */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-40 pt-16 px-3 md:hidden overflow-y-auto print:hidden">
                    <nav className="space-y-5 pb-10">
                        {MENU_GROUPS.map(group => (
                            <div key={group.title}>
                                <p className="px-3 mb-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500">{group.title}</p>
                                <div className="space-y-1">
                                    {group.items.map(item => (
                                        <MenuRow
                                            key={item.view}
                                            {...item}
                                            currentView={currentView}
                                            onClick={handleNavClick}
                                            badge={item.view === 'COMMUNICATIONS' ? unreadCount : (item.view === 'SETTINGS' && needsSync ? 1 : 0)}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}

                        <div className="pt-2 border-t border-white/10">
                            <button
                                onClick={() => handleNavClick('LANDING')}
                                className="flex items-center gap-3 w-full min-h-[48px] px-3 rounded-xl text-red-300 active:bg-red-500/10"
                            >
                                <LogOut size={20} />
                                <span className="font-medium text-[15px]">Cerrar sesión</span>
                            </button>
                        </div>
                    </nav>
                </div>
            )}

            {/* Barra inferior de navegación */}
            {!mobileMenuOpen && (
                <div className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-lg border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] print:hidden pb-[env(safe-area-inset-bottom)]">
                    <div className="grid grid-cols-5">
                        {PRIMARY_NAV.map(item => {
                            const active = currentView === item.view;
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.view}
                                    onClick={() => handleNavClick(item.view)}
                                    className={`flex flex-col items-center justify-center gap-0.5 min-h-[56px] py-1.5 active:bg-slate-100 ${active ? 'text-indigo-600' : 'text-slate-400'}`}
                                >
                                    <Icon size={21} strokeWidth={active ? 2.6 : 2} />
                                    <span className={`text-[10px] leading-none ${active ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
                                </button>
                            );
                        })}
                        <button
                            onClick={() => setMobileMenuOpen(true)}
                            className={`flex flex-col items-center justify-center gap-0.5 min-h-[56px] py-1.5 active:bg-slate-100 relative ${!enMenuPrincipal ? 'text-indigo-600' : 'text-slate-400'}`}
                        >
                            <MoreHorizontal size={21} strokeWidth={!enMenuPrincipal ? 2.6 : 2} />
                            <span className={`text-[10px] leading-none ${!enMenuPrincipal ? 'font-bold' : 'font-medium'}`}>Más</span>
                            {unreadCount > 0 && (
                                <span className="absolute top-1 right-1/4 w-2 h-2 rounded-full bg-red-500" />
                            )}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};
