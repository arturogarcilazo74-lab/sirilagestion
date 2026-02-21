import React from 'react';
import {
    LayoutDashboard, Users, QrCode, ListTodo, BookCheck, ClipboardList, Wallet, FileText, MessageSquare, Wrench, Settings, Menu, X, Smartphone, LogOut, Library, GraduationCap
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

const NavItem = ({ view, icon: Icon, label, currentView, onClick, badge }: any) => (
    <button
        onClick={() => onClick(view)}
        className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all ${currentView === view
            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
            } relative`}
    >
        <Icon size={20} />
        <span className="font-medium">{label}</span>
        {badge > 0 && (
            <span className="absolute right-3 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse shadow-lg shadow-red-500/50">
                {badge === 1 && typeof badge === 'number' && label === 'Configuración' ? '!' : badge}
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

    return (
        <>
            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 w-full glass-dark z-50 px-4 py-3 flex justify-between items-center print:hidden text-white shadow-md">
                <div className="flex items-center gap-2">
                    <h1 className="text-lg font-bold text-white">SirilaGestion</h1>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                        <div className={`w-1.5 h-1.5 rounded-full ${navigator.onLine ? (pendingActions > 0 ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500') : 'bg-red-500 animate-pulse'}`}></div>
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">
                            {navigator.onLine ? (pendingActions > 0 ? `(${pendingActions})` : 'ON') : 'OFF'}
                        </span>
                    </div>
                    <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                        {mobileMenuOpen ? <X /> : <Menu />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-40 pt-20 px-4 md:hidden overflow-y-auto print:hidden">
                    <nav className="space-y-4 pb-10">
                        <NavItem view="DASHBOARD" icon={LayoutDashboard} label="Panel General" currentView={currentView} onClick={handleNavClick} />
                        <NavItem view="STUDENTS" icon={Users} label="Estudiantes" currentView={currentView} onClick={handleNavClick} />
                        <NavItem view="ATTENDANCE" icon={QrCode} label="Asistencia QR" currentView={currentView} onClick={handleNavClick} />
                        <NavItem view="ACTIVITIES" icon={ListTodo} label="Actividades" currentView={currentView} onClick={handleNavClick} />
                        <NavItem view="HOMEWORK_QR" icon={BookCheck} label="Entrega Tareas QR" currentView={currentView} onClick={handleNavClick} />
                        <NavItem view="BEHAVIOR" icon={ClipboardList} label="Conducta" currentView={currentView} onClick={handleNavClick} />
                        <NavItem view="FINANCE" icon={Wallet} label="Finanzas" currentView={currentView} onClick={handleNavClick} />
                        <NavItem view="DOCUMENTS" icon={FileText} label="Documentos IA" currentView={currentView} onClick={handleNavClick} />
                        <NavItem view="LIBRARY" icon={Library} label="Biblioteca" currentView={currentView} onClick={handleNavClick} />
                        <NavItem view="LITERACY" icon={GraduationCap} label="Regularización" currentView={currentView} onClick={handleNavClick} />
                        <NavItem view="EXAM_GENERATOR" icon={FileText} label="Generador Exámenes" currentView={currentView} onClick={handleNavClick} />
                        <NavItem view="USAER" icon={BookCheck} label="Módulo USAER" currentView={currentView} onClick={handleNavClick} />
                        <NavItem view="COMMUNICATIONS" icon={MessageSquare} label="Comunicaciones" currentView={currentView} onClick={handleNavClick} badge={unreadCount} />

                        <div className="border-t border-slate-800 pt-4">
                            <NavItem view="PARENTS_PORTAL" icon={Smartphone} label="Portal Padres" currentView={currentView} onClick={handleNavClick} />
                            <NavItem view="TOOLS" icon={Wrench} label="Herramientas" currentView={currentView} onClick={handleNavClick} />
                            <NavItem view="SETTINGS" icon={Settings} label="Configuración" currentView={currentView} onClick={handleNavClick} badge={needsSync ? 1 : 0} />
                            <NavItem view="LANDING" icon={LogOut} label="Cerrar Sesión" currentView={currentView} onClick={handleNavClick} />
                        </div>
                    </nav>
                </div>
            )}
        </>
    );
};
