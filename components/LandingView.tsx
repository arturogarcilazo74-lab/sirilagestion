import React, { useState, useEffect } from 'react';
import { ViewState, SchoolConfig, StaffMember } from '../types';
import {
    Building2, GraduationCap, Users, User, ArrowRight, X,
    Menu, Phone, MapPin, Mail, Globe, Award, BookOpen, Clock, ChevronRight, Lock, MessageCircle, Book, PenTool
} from 'lucide-react';

interface LandingViewProps {
    onSelectRole: (view: ViewState) => void;
    onSelectUser: (user: StaffMember | null) => void;
    schoolConfig: SchoolConfig;
}

const DigitalClock = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="flex flex-col items-end text-white/90 font-light">
            <div className="text-4xl md:text-5xl font-mono tracking-widest tabular-nums font-bold">
                {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-sm md:text-base uppercase tracking-widest opacity-80 mt-1 flex items-center gap-2">
                <Clock size={14} className="mb-0.5" />
                {time.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
        </div>
    );
};

export const LandingView: React.FC<LandingViewProps> = ({ onSelectRole, onSelectUser, schoolConfig }) => {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [deferredPwaPrompt, setDeferredPwaPrompt] = useState<any>(null);
    const isElectron = window.location.protocol === 'file:';

    const handleInstallClick = async () => {
        if (!deferredPwaPrompt) return;
        try {
            deferredPwaPrompt.prompt();
            const { outcome } = await deferredPwaPrompt.userChoice;
            if (outcome === 'accepted') {
                setDeferredPwaPrompt(null);
            }
        } catch (err) {
            console.error('Install error:', err);
        }
    };

    // Modals State
    const [showTeacherSelect, setShowTeacherSelect] = useState(false);
    const [showPinModal, setShowPinModal] = useState(false);
    const [showContactModal, setShowContactModal] = useState(false);

    // Auth State
    const [pendingRole, setPendingRole] = useState<ViewState | null>(null);
    const [pendingUser, setPendingUser] = useState<StaffMember | null>(null);
    const [pinInput, setPinInput] = useState('');
    const [pinError, setPinError] = useState(false);
    const [loginMethod, setLoginMethod] = useState<'PIN' | 'PASSWORD'>('PIN');

    // Scroll Effect for Navbar
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);

        // PWA Install Prompt (Only in Browser)
        const handleInstallPrompt = (e: any) => {
            e.preventDefault();
            setDeferredPwaPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handleInstallPrompt);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
        };
    }, []);

    const scrollToAccess = () => {
        document.getElementById('access-section')?.scrollIntoView({ behavior: 'smooth' });
    };

    // --- ACTIONS ---

    const initiateDirectorLogin = () => {
        setPendingRole('DIRECTOR');
        setPendingUser(null);
        setPinInput('');
        setPinError(false);
        setLoginMethod('PIN');
        setShowPinModal(true);
    };

    const initiateTeacherLogin = () => {
        const staffList = schoolConfig.staff || [];
        if (staffList.length === 0) {
            // No staff configured, allow direct access as default teacher (or show error)
            onSelectUser(null);
            onSelectRole('DASHBOARD');
        } else {
            setShowTeacherSelect(true);
        }
    };

    const handleStaffSelect = (staff: StaffMember | null) => {
        setPendingUser(staff);

        // Smart Redirect: If role is Director, send to Director View
        if (staff?.role === 'Director') {
            setPendingRole('DIRECTOR');
        } else {
            setPendingRole('DASHBOARD');
        }

        // Check if staff has PIN
        const hasPin = staff?.pin && staff.pin.length > 0;

        if (hasPin) {
            setShowTeacherSelect(false);
            setPinInput('');
            setPinError(false);
            setLoginMethod('PIN');
            setShowPinModal(true);
        } else {
            // No PIN, direct access
            onSelectUser(staff);
            if (staff?.role === 'Director') {
                onSelectRole('DIRECTOR');
            } else {
                onSelectRole('DASHBOARD');
            }
        }
    };

    const handlePinSubmit = () => {
        // Verify PIN
        let isValid = false;
        let directorUser: StaffMember | null = null;

        if (pendingRole === 'DIRECTOR') {
            // Master PIN for Principal (Full Access/Owner)
            if (pinInput === 'admin' || pinInput === '12345') {
                isValid = true;
                // Create the Principal User
                directorUser = {
                    id: 'PRINCIPAL_ADMIN',
                    name: 'Principal / Dueño',
                    role: 'PRINCIPAL',
                    group: 'Dirección',
                    pin: pinInput
                };
            }

            // Also allow if any staff with role 'Director' matches PIN
            if (!isValid) {
                const directorStaff = schoolConfig.staff?.find(s => s.role === 'Director' || s.group === 'Dirección');
                if (directorStaff && directorStaff.pin === pinInput) {
                    isValid = true;
                    // Log in as standard Director (Restricted)
                    directorUser = directorStaff;
                }
            }
        }
        else if (pendingUser) {
            // Teacher PIN
            isValid = pendingUser.pin === pinInput;
        }

        if (isValid) {
            setShowPinModal(false);
            if (pendingRole === 'DIRECTOR' && directorUser) {
                onSelectUser(directorUser);
            } else if (pendingUser) {
                onSelectUser(pendingUser);
            }

            if (pendingRole) onSelectRole(pendingRole);
        } else {
            setPinError(true);
            setPinInput('');
        }
    };

    const handlePinDigit = (digit: string) => {
        if (pinInput.length < 6) {
            setPinInput(prev => prev + digit);
            setPinError(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 overflow-x-hidden selection:bg-indigo-500 selection:text-white">

            {/* --- NAVBAR --- */}
            <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 backdrop-blur-xl shadow-sm py-3 border-b border-white/20' : 'bg-transparent py-6'}`}>
                <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        {schoolConfig.schoolLogo ? (
                            <img src={schoolConfig.schoolLogo} className="w-10 h-10 rounded-xl object-contain bg-white shadow-lg shadow-indigo-600/10" alt="Logo" />
                        ) : (
                            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                                <Building2 size={20} />
                            </div>
                        )}
                        <span className={`text-xl font-bold tracking-tight ${scrolled ? 'text-slate-800' : 'text-slate-900'}`}>
                            {schoolConfig.schoolName}
                        </span>
                    </div>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center gap-8">
                        <a href="#" className={`text-sm font-semibold hover:text-indigo-600 transition-colors ${scrolled ? 'text-slate-600' : 'text-slate-700'}`}>Inicio</a>
                        <a href="#features" className={`text-sm font-semibold hover:text-indigo-600 transition-colors ${scrolled ? 'text-slate-600' : 'text-slate-700'}`}>Características</a>
                        <a href="#contact" className={`text-sm font-semibold hover:text-indigo-600 transition-colors ${scrolled ? 'text-slate-600' : 'text-slate-700'}`}>Contacto</a>
                        {!isElectron && deferredPwaPrompt && (
                            <button
                                onClick={handleInstallClick}
                                className="bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all"
                            >
                                Instalar App
                            </button>
                        )}
                        <button
                            onClick={scrollToAccess}
                            className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 hover:shadow-indigo-600/40 hover:-translate-y-0.5 transition-all"
                        >
                            Acceso Plataforma
                        </button>
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-slate-800 hover:bg-slate-100 rounded-lg transition-colors z-50 relative">
                        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>

                    {/* Mobile Menu Overlay */}
                    {mobileMenuOpen && (
                        <div className="absolute top-0 left-0 w-full h-screen bg-white flex flex-col items-center justify-center gap-8 z-40 animate-fadeIn md:hidden">
                            <a href="#" onClick={() => setMobileMenuOpen(false)} className="text-2xl font-bold text-slate-800 hover:text-indigo-600">Inicio</a>
                            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-2xl font-bold text-slate-800 hover:text-indigo-600">Características</a>
                            <a href="#contact" onClick={() => setMobileMenuOpen(false)} className="text-2xl font-bold text-slate-800 hover:text-indigo-600">Contacto</a>
                            <button
                                onClick={() => {
                                    setMobileMenuOpen(false);
                                    scrollToAccess();
                                }}
                                className="bg-indigo-600 text-white px-8 py-4 rounded-xl text-xl font-bold shadow-xl shadow-indigo-600/30 active:scale-95 transition-all"
                            >
                                Acceso Plataforma
                            </button>
                        </div>
                    )}
                </div>
            </nav>

            {/* --- HERO SECTION --- */}
            <header className="relative pt-32 pb-24 lg:pt-48 lg:pb-40 px-6 overflow-hidden">
                {/* Dynamic Background */}
                <div className="absolute top-0 right-0 -z-10 w-[70%] h-[90%] bg-gradient-to-bl from-indigo-100 to-purple-100 rounded-bl-[150px] blur-3xl opacity-80"></div>
                <div className="absolute bottom-0 left-0 -z-10 w-[40%] h-[50%] bg-gradient-to-tr from-blue-50 to-emerald-50 rounded-tr-[150px] blur-3xl opacity-60"></div>

                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div className="space-y-8 animate-fadeIn relative z-10">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wide shadow-sm">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                            </span>
                            Ciclo Escolar {schoolConfig.schoolYear || '2025-2026'}
                        </div>
                        <h1 className="text-5xl lg:text-7xl font-black text-slate-900 leading-[1.05] tracking-tight">
                            Gestión Escolar <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">Inteligente</span>
                        </h1>
                        <p className="text-xl text-slate-600 leading-relaxed max-w-lg font-medium">
                            Conectando directivos, docentes y familias en un ecosistema digital moderno, seguro y eficiente.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                            <button onClick={scrollToAccess} className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 hover:shadow-indigo-600/40 hover:-translate-y-1 transition-all">
                                Ingresar al Portal <ArrowRight size={20} />
                            </button>
                            {!isElectron && deferredPwaPrompt && (
                                <button
                                    onClick={handleInstallClick}
                                    className="flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 px-8 py-4 rounded-2xl font-bold text-lg border border-emerald-100 shadow-lg shadow-emerald-500/10 hover:bg-emerald-100 hover:-translate-y-1 transition-all"
                                >
                                    Instalar Aplicación
                                </button>
                            )}
                            <a href="#features" className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-slate-600 hover:bg-white hover:shadow-lg hover:text-indigo-600 transition-all border border-transparent hover:border-slate-100">
                                Explorar Funciones
                            </a>
                        </div>
                    </div>

                    <div className="relative hidden lg:block animate-slideUp">
                        {/* Use School Logo or a Generic Hero Image if logo is small/missing, 
                             But mostly we want a nice engaging image. */}
                        <div className="relative z-10 p-4 bg-white/50 backdrop-blur-sm rounded-[2.5rem] shadow-2xl rotate-2 border border-white">
                            <div className="aspect-[4/3] bg-gradient-to-br from-indigo-50 to-white rounded-3xl overflow-hidden relative shadow-inner p-8 flex items-center justify-center group perspective-1000">
                                {/* Decorative Background Elements */}
                                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-200 via-transparent to-transparent"></div>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100 rounded-bl-full opacity-50"></div>
                                <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-100 rounded-tr-full opacity-50"></div>

                                {/* Main Logo - Tilted and "Entering" */}
                                {schoolConfig.schoolLogo ? (
                                    <div className="relative z-10 w-full h-full flex items-center justify-center transform transition-all duration-700 group-hover:scale-105 group-hover:rotate-0 -rotate-6 translate-x-4">
                                        <img
                                            src={schoolConfig.schoolLogo}
                                            alt={schoolConfig.schoolName}
                                            className="w-full h-full object-contain drop-shadow-2xl filter"
                                        />
                                        {/* Reflection/Shadow effect */}
                                        <div className="absolute -bottom-10 left-0 right-0 h-4 bg-black/20 blur-xl rounded-[50%] transform scale-x-75"></div>
                                    </div>
                                ) : (
                                    <div className="relative z-10 flex flex-col items-center justify-center text-center transform -rotate-3 transition-transform group-hover:rotate-0">
                                        <Award size={120} className="text-indigo-600 drop-shadow-lg mb-4" />
                                        <h3 className="text-3xl font-bold text-slate-800">{schoolConfig.schoolName}</h3>
                                        <p className="text-slate-500 font-medium mt-2">Plataforma Educativa</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* --- SCHOOL PROMOTION & ADMISSIONS SECTION (NEW) --- */}
            <section className="py-24 bg-gradient-to-br from-indigo-600 to-purple-700 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>

                {/* Decorative Circles */}
                <div className="absolute top-0 left-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl"></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-pink-500 opacity-10 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl"></div>

                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

                        {/* Benefits & Invitation */}
                        <div className="space-y-8">
                            <div>
                                <h2 className="text-4xl lg:text-5xl font-black mb-4 tracking-tight">
                                    ¡Forma parte de nuestra <br />
                                    <span className="text-emerald-300">Gran Familia Escolar!</span>
                                </h2>
                                <p className="text-indigo-100 text-lg leading-relaxed font-medium max-w-xl">
                                    En la {schoolConfig.schoolName}, no solo educamos; inspiramos, cuidamos y potenciamos el talento de cada alumno para el futuro.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/10 hover:bg-white/20 transition-colors">
                                    <div className="w-10 h-10 bg-emerald-400/20 text-emerald-300 rounded-lg flex items-center justify-center mb-3">
                                        <Award size={24} />
                                    </div>
                                    <h4 className="font-bold text-lg mb-1">Excelencia Académica</h4>
                                    <p className="text-sm text-indigo-100 opacity-80">Programas educativos de vanguardia enfocados en el aprendizaje significativo.</p>
                                </div>
                                <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/10 hover:bg-white/20 transition-colors">
                                    <div className="w-10 h-10 bg-pink-400/20 text-pink-300 rounded-lg flex items-center justify-center mb-3">
                                        <User size={24} />
                                    </div>
                                    <h4 className="font-bold text-lg mb-1">Formación en Valores</h4>
                                    <p className="text-sm text-indigo-100 opacity-80">Fomentamos el respeto, la empatía y la responsabilidad ciudadana.</p>
                                </div>
                                <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/10 hover:bg-white/20 transition-colors">
                                    <div className="w-10 h-10 bg-sky-400/20 text-sky-300 rounded-lg flex items-center justify-center mb-3">
                                        <Globe size={24} />
                                    </div>
                                    <h4 className="font-bold text-lg mb-1">Tecnología e Innovación</h4>
                                    <p className="text-sm text-indigo-100 opacity-80">Aulas equipadas y herramientas digitales para el mundo moderno.</p>
                                </div>
                                <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/10 hover:bg-white/20 transition-colors">
                                    <div className="w-10 h-10 bg-amber-400/20 text-amber-300 rounded-lg flex items-center justify-center mb-3">
                                        <Users size={24} />
                                    </div>
                                    <h4 className="font-bold text-lg mb-1">Ambiente Seguro</h4>
                                    <p className="text-sm text-indigo-100 opacity-80">Un entorno de convivencia sana, inclusiva y libre de violencia.</p>
                                </div>
                            </div>
                        </div>

                        {/* School Info Card */}
                        <div className="relative">
                            <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl text-slate-800 relative z-20">
                                <div className="flex items-center gap-4 mb-8 border-b border-slate-100 pb-6">
                                    {schoolConfig.schoolLogo ? (
                                        <div className="w-16 h-16 rounded-2xl p-2 bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                                            <img src={schoolConfig.schoolLogo} className="w-full h-full object-contain" alt={schoolConfig.schoolName} />
                                        </div>
                                    ) : (
                                        <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white">
                                            <Building2 size={32} />
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="font-bold text-xl leading-tight text-slate-900">{schoolConfig.schoolName}</h3>
                                        <p className="text-emerald-600 font-bold text-sm uppercase tracking-wide">Inscripciones Abiertas</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-indigo-600 shrink-0">
                                            <MapPin size={20} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase">Ubicación</p>
                                            <p className="font-medium text-slate-700">{schoolConfig.location || 'Domicilio Conocido'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-indigo-600 shrink-0">
                                            <Clock size={20} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase">Horario de Atención</p>
                                            <p className="font-medium text-slate-700">{schoolConfig.schedule || '8:00 AM - 1:00 PM'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-indigo-600 shrink-0">
                                            <Award size={20} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase">Clave de Centro de Trabajo</p>
                                            <p className="font-medium text-slate-700 tracking-wider font-mono bg-slate-100 px-2 py-0.5 rounded inline-block mt-0.5">{schoolConfig.cct || 'NO REGISTRADO'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                                    <button
                                        onClick={() => setShowContactModal(true)}
                                        className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <Phone size={18} /> Contáctanos
                                    </button>
                                </div>
                            </div>

                            {/* Decorative Card Background */}
                            <div className="absolute top-4 -right-4 w-full h-full bg-indigo-400/30 rounded-[2.5rem] -z-10 blur-sm"></div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- ACCESS SECTION (PORTALS) --- */}
            <section id="access-section" className="py-24 bg-white relative">
                {/* Decorative Pattern */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '32px 32px' }} aria-hidden="true"></div>

                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="text-center max-w-3xl mx-auto mb-20 animate-on-scroll">
                        <span className="text-indigo-600 font-bold tracking-wider uppercase text-sm mb-2 block">Acceso Seguro</span>
                        <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">Elige tu Perfil</h2>
                        <p className="text-slate-500 text-xl font-medium">Ingresa a tu espacio personalizado para gestionar o consultar información académica.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Director Portal */}
                        <div
                            onClick={initiateDirectorLogin}
                            className="group bg-gradient-to-b from-slate-50 to-white rounded-[2rem] p-1 border border-slate-100 hover:border-indigo-100 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300 cursor-pointer hover:-translate-y-2"
                        >
                            <div className="h-full bg-white rounded-[1.8rem] p-8 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100/50 rounded-bl-full -mr-10 -mt-10 transition-all group-hover:scale-150 group-hover:bg-indigo-100 opacity-50"></div>

                                <div className="w-16 h-16 bg-white border border-slate-100 shadow-lg shadow-indigo-500/10 text-indigo-600 rounded-2xl flex items-center justify-center mb-8 relative z-10 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                    <Building2 size={32} />
                                </div>

                                <h3 className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-indigo-700 transition-colors">Administración</h3>
                                <p className="text-sm font-bold text-indigo-600 mb-4 uppercase tracking-wider opacity-80">Director / Principal</p>
                                <p className="text-slate-500 mb-8 leading-relaxed">
                                    Control total del plantel, gestión de personal, finanzas y reportes globales.
                                </p>

                                <div className="flex items-center justify-between border-t border-slate-100 pt-6">
                                    <span className="text-sm font-bold text-slate-400 group-hover:text-indigo-600 transition-colors">Iniciar Sesión</span>
                                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                        <ArrowRight size={14} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Teacher Portal */}
                        <div
                            onClick={initiateTeacherLogin}
                            className="group bg-gradient-to-b from-slate-50 to-white rounded-[2rem] p-1 border border-slate-100 hover:border-emerald-100 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300 cursor-pointer hover:-translate-y-2"
                        >
                            <div className="h-full bg-white rounded-[1.8rem] p-8 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100/50 rounded-bl-full -mr-10 -mt-10 transition-all group-hover:scale-150 group-hover:bg-emerald-100 opacity-50"></div>

                                <div className="w-16 h-16 bg-white border border-slate-100 shadow-lg shadow-emerald-500/10 text-emerald-600 rounded-2xl flex items-center justify-center mb-8 relative z-10 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                    <GraduationCap size={32} />
                                </div>

                                <h3 className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-emerald-700 transition-colors">Docentes</h3>
                                <p className="text-sm font-bold text-emerald-600 mb-4 uppercase tracking-wider opacity-80">Profesores de Grupo</p>
                                <p className="text-slate-500 mb-8 leading-relaxed">
                                    Pase de lista, captura de calificaciones, planeación y recursos didácticos.
                                </p>

                                <div className="flex items-center justify-between border-t border-slate-100 pt-6">
                                    <span className="text-sm font-bold text-slate-400 group-hover:text-emerald-600 transition-colors">Ingresar al Portal</span>
                                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                        <ArrowRight size={14} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Parents Portal */}
                        <div
                            onClick={() => onSelectRole('PARENTS_PORTAL')}
                            className="group bg-gradient-to-b from-slate-50 to-white rounded-[2rem] p-1 border border-slate-100 hover:border-pink-100 hover:shadow-2xl hover:shadow-pink-500/10 transition-all duration-300 cursor-pointer hover:-translate-y-2"
                        >
                            <div className="h-full bg-white rounded-[1.8rem] p-8 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-pink-100/50 rounded-bl-full -mr-10 -mt-10 transition-all group-hover:scale-150 group-hover:bg-pink-100 opacity-50"></div>

                                <div className="w-16 h-16 bg-white border border-slate-100 shadow-lg shadow-pink-500/10 text-pink-600 rounded-2xl flex items-center justify-center mb-8 relative z-10 group-hover:bg-pink-600 group-hover:text-white transition-colors">
                                    <Users size={32} />
                                </div>

                                <h3 className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-pink-700 transition-colors">Familia</h3>
                                <p className="text-sm font-bold text-pink-600 mb-4 uppercase tracking-wider opacity-80">Padres y Tutores</p>
                                <p className="text-slate-500 mb-8 leading-relaxed">
                                    Consulte boletas, avisos importantes y el progreso académico de sus hijos.
                                </p>

                                <div className="flex items-center justify-between border-t border-slate-100 pt-6">
                                    <span className="text-sm font-bold text-slate-400 group-hover:text-pink-600 transition-colors">Consultar Avance</span>
                                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-pink-600 group-hover:text-white transition-all">
                                        <ArrowRight size={14} />
                                    </div>
                                </div>
                            </div>
                        </div>


                        {/* USAER Portal */}
                        <div
                            onClick={() => onSelectRole('USAER')}
                            className="group bg-gradient-to-b from-slate-50 to-white rounded-[2rem] p-1 border border-slate-100 hover:border-blue-100 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 cursor-pointer hover:-translate-y-2"
                        >
                            <div className="h-full bg-white rounded-[1.8rem] p-8 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100/50 rounded-bl-full -mr-10 -mt-10 transition-all group-hover:scale-150 group-hover:bg-blue-100 opacity-50"></div>

                                <div className="w-16 h-16 bg-white border border-slate-100 shadow-lg shadow-blue-500/10 text-blue-600 rounded-2xl flex items-center justify-center mb-8 relative z-10 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    <Users size={32} />
                                </div>

                                <h3 className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-blue-700 transition-colors">USAER</h3>
                                <p className="text-sm font-bold text-blue-600 mb-4 uppercase tracking-wider opacity-80">Apoyo Educativo</p>
                                <p className="text-slate-500 mb-8 leading-relaxed">
                                    Gestión de alumnos, expedientes, planeaciones e intervenciones de apoyo.
                                </p>

                                <div className="flex items-center justify-between border-t border-slate-100 pt-6">
                                    <span className="text-sm font-bold text-slate-400 group-hover:text-blue-600 transition-colors">Acceder a Módulo</span>
                                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                                        <ArrowRight size={14} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Library Portal */}
                        <div
                            onClick={() => onSelectRole('LIBRARY')}
                            className="group bg-gradient-to-b from-slate-50 to-white rounded-[2rem] p-1 border border-slate-100 hover:border-amber-100 hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-300 cursor-pointer hover:-translate-y-2"
                        >
                            <div className="h-full bg-white rounded-[1.8rem] p-8 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-100/50 rounded-bl-full -mr-10 -mt-10 transition-all group-hover:scale-150 group-hover:bg-amber-100 opacity-50"></div>

                                <div className="w-16 h-16 bg-white border border-slate-100 shadow-lg shadow-amber-500/10 text-amber-600 rounded-2xl flex items-center justify-center mb-8 relative z-10 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                                    <Book size={32} />
                                </div>

                                <h3 className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-amber-700 transition-colors">Biblioteca</h3>
                                <p className="text-sm font-bold text-amber-600 mb-4 uppercase tracking-wider opacity-80">Recursos y Préstamos</p>
                                <p className="text-slate-500 mb-8 leading-relaxed">
                                    Catálogo de libros, gestión de préstamos y fomento a la lectura.
                                </p>

                                <div className="flex items-center justify-between border-t border-slate-100 pt-6">
                                    <span className="text-sm font-bold text-slate-400 group-hover:text-amber-600 transition-colors">Ir a Biblioteca</span>
                                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-all">
                                        <ArrowRight size={14} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Literacy Portal */}
                        <div
                            onClick={() => onSelectRole('LITERACY')}
                            className="group bg-gradient-to-b from-slate-50 to-white rounded-[2rem] p-1 border border-slate-100 hover:border-purple-100 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300 cursor-pointer hover:-translate-y-2"
                        >
                            <div className="h-full bg-white rounded-[1.8rem] p-8 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-100/50 rounded-bl-full -mr-10 -mt-10 transition-all group-hover:scale-150 group-hover:bg-purple-100 opacity-50"></div>

                                <div className="w-16 h-16 bg-white border border-slate-100 shadow-lg shadow-purple-500/10 text-purple-600 rounded-2xl flex items-center justify-center mb-8 relative z-10 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                    <PenTool size={32} />
                                </div>

                                <h3 className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-purple-700 transition-colors">Lectoescritura</h3>
                                <p className="text-sm font-bold text-purple-600 mb-4 uppercase tracking-wider opacity-80">Regularización</p>
                                <p className="text-slate-500 mb-8 leading-relaxed">
                                    Seguimiento de fluidez lectora, comprensión y ejercicios de escritura.
                                </p>

                                <div className="flex items-center justify-between border-t border-slate-100 pt-6">
                                    <span className="text-sm font-bold text-slate-400 group-hover:text-purple-600 transition-colors">Ver Avances</span>
                                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all">
                                        <ArrowRight size={14} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- GALLERY SECTION (NEW) --- */}
            <section className="py-20 bg-slate-50 overflow-hidden">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-6">
                        <div className="max-w-xl">
                            <span className="text-emerald-600 font-bold tracking-wider uppercase text-sm mb-2 block">Vida Escolar</span>
                            <h2 className="text-3xl md:text-5xl font-black text-slate-900 leading-tight">Nuestra Comunidad</h2>
                        </div>
                        <div className="flex gap-2">
                            <div className="w-12 h-1 bg-emerald-500 rounded-full"></div>
                            <div className="w-4 h-1 bg-emerald-200 rounded-full"></div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-96">
                        <div className="md:col-span-2 relative group overflow-hidden rounded-3xl">
                            <img src="https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=1000&auto=format&fit=crop" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="Students Library" />
                            <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/60 to-transparent">
                                <p className="text-white font-bold">Aprendizaje Colaborativo</p>
                            </div>
                        </div>
                        <div className="relative group overflow-hidden rounded-3xl">
                            <img src="https://images.unsplash.com/photo-1546410531-bb4caa6b424d?q=80&w=1000&auto=format&fit=crop" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="Classroom" />
                        </div>
                        <div className="relative group overflow-hidden rounded-3xl">
                            <img src="https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=1000&auto=format&fit=crop" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="School Activities" />
                        </div>
                    </div>
                </div>
            </section>

            {/* --- FEATURES SECTION --- */}
            <section id="features" className="py-24 bg-slate-900 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[100px] pointer-events-none"></div>

                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <div className="relative z-10">
                            <span className="text-indigo-400 font-bold tracking-wider uppercase text-sm mb-2 block">¿Por qué elegirnos?</span>
                            <h2 className="text-3xl md:text-5xl font-black mb-6 leading-tight">Innovación Educativa <br /> Sin Complicaciones</h2>
                            <p className="text-slate-400 text-xl leading-relaxed mb-8 font-light">
                                Facilitamos los procesos diarios para que la comunidad educativa se enfoque en lo esencial: el aprendizaje y el desarrollo integral.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-6 rounded-2xl hover:bg-white/10 transition-colors">
                                    <Globe size={32} className="text-indigo-400 mb-4" />
                                    <h4 className="text-lg font-bold mb-2">100% Digital</h4>
                                    <p className="text-sm text-slate-400">Acceso 24/7 desde cualquier dispositivo sin instalar nada.</p>
                                </div>
                                <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-6 rounded-2xl hover:bg-white/10 transition-colors">
                                    <BookOpen size={32} className="text-emerald-400 mb-4" />
                                    <h4 className="text-lg font-bold mb-2">Transparencia</h4>
                                    <p className="text-sm text-slate-400">Información de evaluaciones clara y al instante.</p>
                                </div>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-1 shadow-2xl">
                                <div className="bg-slate-900 rounded-[1.4rem] p-8 overflow-hidden relative h-96 flex flex-col justify-center text-center">
                                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                                    <h3 className="text-3xl font-bold text-white relative z-10 mb-4">La Educación del Futuro</h3>
                                    <p className="text-indigo-200 relative z-10 max-w-sm mx-auto">
                                        Una herramienta poderosa, intuitiva y diseñada pensando en las necesidades reales de la escuela moderna.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section >

            {/* --- FOOTER --- */}
            < footer id="contact" className="bg-slate-950 text-slate-400 py-12 border-t border-slate-800" >
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <p>&copy; {new Date().getFullYear()} {schoolConfig.schoolName}</p>
                    <p className="text-xs mt-2 opacity-50">Derechos y Creación por <span className="text-slate-300 font-bold">Miguel Ángel Román</span></p>
                </div>
            </footer >

            {/* --- TEACHER SELECTION MODAL --- */}
            {
                showTeacherSelect && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fadeIn">
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowTeacherSelect(false)}></div>
                        <div className="relative bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl animate-scaleIn">
                            <button onClick={() => setShowTeacherSelect(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600" aria-label="Cerrar">
                                <X size={24} />
                            </button>

                            <div className="text-center mb-8">
                                <h3 className="text-2xl font-bold text-slate-800">Seleccionar Cuenta</h3>
                                <p className="text-slate-500">¿Quién está ingresando?</p>
                            </div>

                            <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar p-1">
                                {/* Staff List (Only Teachers) */}
                                {(schoolConfig.staff || [])
                                    .filter(s => (s.role || '').includes('Docente') && !(s.role || '').includes('Director')) // Filter out Directors/Principals from Teacher list
                                    .map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => handleStaffSelect(s)}
                                            className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all group text-left"
                                        >
                                            <img src={s.avatar || `https://ui-avatars.com/api/?name=${s.name}`} className="w-12 h-12 rounded-full object-cover" alt={s.name} />
                                            <div>
                                                <p className="font-bold text-slate-800 group-hover:text-emerald-700">{s.name}</p>
                                                <p className="text-xs text-slate-500 font-bold uppercase">{s.group}</p>
                                            </div>
                                            {s.pin ? <Lock size={16} className="ml-auto text-slate-400" /> : <span className="ml-auto text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded">Sin PIN</span>}
                                        </button>
                                    ))}

                                {(schoolConfig.staff || []).filter(s => (s.role || '').includes('Docente') && !(s.role || '').includes('Director')).length === 0 && (
                                    <div className="text-center p-8 text-slate-400">
                                        <p>No hay docentes registrados.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* --- CONTACT MODAL --- */}
            {
                showContactModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fadeIn">
                        <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={() => setShowContactModal(false)}></div>
                        <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-scaleIn overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-indigo-600 to-purple-700"></div>

                            <button onClick={() => setShowContactModal(false)} className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors z-10 p-2 bg-white/10 rounded-full backdrop-blur-md" aria-label="Cerrar">
                                <X size={20} />
                            </button>

                            <div className="relative z-10 flex flex-col items-center mt-6">
                                <div className="w-20 h-20 bg-white p-2 rounded-full shadow-xl mb-4">
                                    <div className="w-full h-full bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
                                        <Phone size={32} />
                                    </div>
                                </div>
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-1">Contáctanos</h3>
                                <p className="text-slate-500 font-medium text-sm text-center px-4 mb-8">
                                    Estamos disponibles para atender cualquier duda o comentario sobre nuestra institución.
                                </p>

                                <div className="w-full space-y-4">
                                    {/* Directora */}
                                    <div className="text-center mb-6">
                                        <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">Directora del Plantel</p>
                                        <p className="font-bold text-slate-800 text-lg">Profa. Nancy Carolina Jasso Vergara</p>
                                    </div>

                                    {/* Buttons */}
                                    <a
                                        href="https://wa.me/526873663875"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-4 w-full p-4 bg-emerald-50 border border-emerald-100 rounded-xl hover:bg-emerald-100 transition-all group"
                                    >
                                        <div className="w-10 h-10 bg-emerald-500 text-white rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform">
                                            <MessageCircle size={24} />
                                        </div>
                                        <div className="text-left flex-1">
                                            <p className="font-bold text-emerald-900">WhatsApp</p>
                                            <p className="text-xs text-emerald-600 font-medium">Enviar mensaje directo</p>
                                        </div>
                                        <ChevronRight size={18} className="text-emerald-400 group-hover:translate-x-1 transition-transform" />
                                    </a>

                                    <a
                                        href="mailto:miguelroman02@gmail.com"
                                        className="flex items-center gap-4 w-full p-4 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100 transition-all group"
                                    >
                                        <div className="w-10 h-10 bg-blue-500 text-white rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
                                            <Mail size={24} />
                                        </div>
                                        <div className="text-left flex-1">
                                            <p className="font-bold text-blue-900">Correo Electrónico</p>
                                            <p className="text-xs text-blue-600 font-medium">miguelroman02@gmail.com</p>
                                        </div>
                                        <ChevronRight size={18} className="text-blue-400 group-hover:translate-x-1 transition-transform" />
                                    </a>

                                    {/* Phone Numbers List */}
                                    <div className="pt-4 mt-2 border-t border-slate-100">
                                        <p className="text-xs font-bold text-slate-400 uppercase text-center mb-3">Líneas Telefónicas</p>
                                        <div className="flex justify-center gap-4 flex-wrap">
                                            <a href="tel:6873663875" className="px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-600 font-bold text-sm border border-slate-200 transition-colors flex items-center gap-2">
                                                <Phone size={14} /> 687 366 3875
                                            </a>
                                            <a href="tel:6677552026" className="px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-600 font-bold text-sm border border-slate-200 transition-colors flex items-center gap-2">
                                                <Phone size={14} /> 667 755 2026
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* --- PIN PAD MODAL --- */}
            {
                showPinModal && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-fadeIn">
                        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"></div>
                        {/* Added max-h and overflow for small screens */}
                        <div className="relative bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl animate-scaleIn max-h-[90vh] overflow-y-auto custom-scrollbar">
                            <button onClick={() => setShowPinModal(false)} className="absolute top-4 right-4 text-slate-300 hover:text-slate-500 z-10" aria-label="Cerrar">
                                <X size={24} />
                            </button>

                            <div className="text-center mb-4">
                                <div className="w-14 h-14 bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center mx-auto mb-3 animate-bounce-slow">
                                    <Lock size={28} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800">
                                    {pendingRole === 'DIRECTOR' ? 'Acceso Administrativo' : `Hola, ${pendingUser?.name.split(' ')[0]}`}
                                </h3>
                                <p className="text-slate-500 text-sm mt-1">
                                    {loginMethod === 'PIN' ? 'Ingresa tu PIN de acceso' : 'Ingresa tu contraseña general'}
                                </p>
                            </div>

                            {loginMethod === 'PIN' ? (
                                <>
                                    {/* PIN Display */}
                                    <div className="flex justify-center gap-3 mb-6">
                                        {[0, 1, 2, 3, 4, 5].map(i => (
                                            <div key={i} className={`w-3 h-3 rounded-full border-2 transition-all ${pinInput.length > i ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-slate-50'} ${pinError ? 'border-red-500 bg-red-50 shake' : ''}`}></div>
                                        ))}
                                    </div>
                                    {pinError && <p className="text-red-500 text-center text-xs font-bold mb-4 -mt-4">Código incorrecto</p>}

                                    {/* Numpad */}
                                    <div className="grid grid-cols-3 gap-3 mb-4">
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                            <button
                                                key={num}
                                                onClick={() => handlePinDigit(num.toString())}
                                                className="h-14 rounded-xl bg-slate-50 text-xl font-bold text-slate-700 hover:bg-white hover:shadow-lg hover:scale-105 transition-all active:scale-95 border border-slate-100"
                                            >
                                                {num}
                                            </button>
                                        ))}
                                        <div className="h-14 flex items-center justify-center text-slate-300 pointer-events-none"></div>
                                        <button
                                            onClick={() => handlePinDigit('0')}
                                            className="h-14 rounded-xl bg-slate-50 text-xl font-bold text-slate-700 hover:bg-white hover:shadow-lg hover:scale-105 transition-all active:scale-95 border border-slate-100"
                                        >
                                            0
                                        </button>
                                        <button
                                            onClick={() => { setPinInput(prev => prev.slice(0, -1)); setPinError(false); }}
                                            className="h-14 rounded-xl bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-100 transition-all active:scale-95"
                                        >
                                            <span className="font-bold text-xs">Borrar</span>
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="mb-6">
                                    <input
                                        type="password"
                                        value={pinInput}
                                        onChange={(e) => { setPinInput(e.target.value); setPinError(false); }}
                                        className={`w-full p-4 text-center text-2xl font-bold tracking-widest border-2 rounded-xl outline-none focus:ring-4 focus:ring-indigo-100 transition-all ${pinError ? 'border-red-500 bg-red-50' : 'border-slate-200 focus:border-indigo-500'}`}
                                        placeholder="••••••"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handlePinSubmit();
                                        }}
                                    />
                                    {pinError && <p className="text-red-500 text-center text-sm font-bold mt-2">Contraseña incorrecta</p>}
                                </div>
                            )}

                            <button
                                onClick={handlePinSubmit}
                                disabled={pinInput.length === 0}
                                className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95 flex items-center justify-center gap-2 mb-3"
                            >
                                Ingresar <ArrowRight size={20} />
                            </button>

                            {pendingRole === 'DIRECTOR' && (
                                <button
                                    onClick={() => {
                                        setLoginMethod(prev => prev === 'PIN' ? 'PASSWORD' : 'PIN');
                                        setPinInput('');
                                        setPinError(false);
                                    }}
                                    className="w-full py-2 text-indigo-600 font-bold text-xs hover:underline block text-center"
                                >
                                    {loginMethod === 'PIN' ? '¿Eres Administrador? Usar Contraseña' : 'Usar PIN Numérico'}
                                </button>
                            )}
                        </div>
                    </div>
                )
            }
        </div >
    );
};
