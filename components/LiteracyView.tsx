import React, { useState } from 'react';
import { GraduationCap, Search, TrendingUp, BookOpen, Mic, CheckCircle2, AlertCircle, FileText, Clock, ArrowLeft, Award } from 'lucide-react';
import { Student } from '../types';

interface LiteracyProfile {
    studentId: string;
    readingSpeed: number; // WPM
    comprehensionScore: number; // 0-100
    level: 'REQ_APOYO' | 'EN_DESARROLLO' | 'ESPERADO';
    lastAssessmentDate: string;
    notes: string;
}

interface LiteracyViewProps {
    students: Student[];
    onBack: () => void;
}

export const LiteracyView: React.FC<LiteracyViewProps> = ({ students, onBack }) => {
    // --- STATE ---
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
    const [isGeneratorModalOpen, setIsGeneratorModalOpen] = useState(false);

    // Generator State
    const [generatedActivity, setGeneratedActivity] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatorPrompt, setGeneratorPrompt] = useState({
        topic: '',
        difficulty: 'INTERMEDIO',
        type: 'LECTURA_COMPRENSION'
    });

    // Mock data for literacy profiles
    const [profiles, setProfiles] = useState<LiteracyProfile[]>([
        { studentId: '1', readingSpeed: 45, comprehensionScore: 60, level: 'REQ_APOYO', lastAssessmentDate: '2024-01-15', notes: 'Dificultad con sílabas trabadas.' },
        { studentId: '2', readingSpeed: 80, comprehensionScore: 85, level: 'EN_DESARROLLO', lastAssessmentDate: '2024-01-20', notes: 'Mejora notable en fluidez.' },
    ]);

    // Filter students who have a profile or match search
    const trackedStudents = students.filter(s =>
        profiles.some(p => p.studentId === s.id) &&
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Students available to add (not yet tracked)
    const availableStudents = students.filter(s => !profiles.some(p => p.studentId === s.id));

    const getProfile = (id: string) => profiles.find(p => p.studentId === id);

    const getLevelColor = (level: string) => {
        switch (level) {
            case 'REQ_APOYO': return 'bg-red-100 text-red-700 border-red-200';
            case 'EN_DESARROLLO': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'ESPERADO': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    // --- HANDLERS ---
    const handleAddStudent = (studentId: string) => {
        const newProfile: LiteracyProfile = {
            studentId,
            readingSpeed: 0,
            comprehensionScore: 0,
            level: 'REQ_APOYO', // Default start
            lastAssessmentDate: new Date().toISOString().split('T')[0],
            notes: 'Inicia programa de regularización.'
        };
        setProfiles([...profiles, newProfile]);
        setIsAddStudentModalOpen(false);
    };

    const handleGenerateActivity = async () => {
        setIsGenerating(true);
        // Simulate API Call delay
        setTimeout(() => {
            setGeneratedActivity(`
### Actividad Generada: ${generatorPrompt.topic}
**Nivel:** ${generatorPrompt.difficulty}
**Tipo:** ${generatorPrompt.type}

**Instrucciones:**
Lee el siguiente texto y responde las preguntas.

*Había una vez un pequeño conejo que quería alcanzar la luna. Saltaba y saltaba, pero nunca llegaba...*

**Preguntas:**
1. ¿Qué quería hacer el conejo?
2. ¿Por qué no podía lograrlo?
            `);
            setIsGenerating(false);
        }, 2000);
    };

    return (
        <div className="p-6 md:p-8 space-y-8 min-h-screen bg-slate-50/50 pb-24 relative">

            <button
                onClick={onBack}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-bold mb-4"
            >
                <ArrowLeft size={20} /> Volver al Inicio
            </button>

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <span className="p-3 bg-purple-100 text-purple-600 rounded-2xl">
                            <GraduationCap size={32} />
                        </span>
                        Regularización Lectoescritura
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">Seguimiento especializado en lectura y escritura</p>
                </div>

                <div className="relative w-full md:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar estudiante..."
                        className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-400 w-full md:w-64 shadow-sm"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        aria-label="Buscar estudiante en programa de lectoescritura"
                    />
                </div>
            </div>

            {/* Main Grid: List & Details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Student List */}
                <div className="lg:col-span-2 space-y-4">
                    {trackedStudents.length === 0 ? (
                        <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center shadow-sm">
                            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800">No se encontraron estudiantes</h3>
                            <p className="text-slate-500 mt-2">Intenta buscar otro nombre o agrega estudiantes al programa.</p>
                        </div>
                    ) : (
                        trackedStudents.map(student => {
                            const profile = getProfile(student.id)!;
                            return (
                                <div key={student.id} className="bg-white p-6 rounded-3xl shadow-sm hover:shadow-xl transition-all border border-slate-100 group relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-2 h-full bg-purple-500" />

                                    <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                                        <div className="w-16 h-16 rounded-2xl bg-slate-200 overflow-hidden shadow-inner flex-shrink-0">
                                            <img
                                                src={student.avatar === "PENDING_LOAD" ? `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=random` : (student.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=random`)}
                                                alt={student.name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>

                                        <div className="flex-1">
                                            <h3 className="text-xl font-bold text-slate-800">{student.name}</h3>
                                            <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                                                <span className="flex items-center gap-1"><Clock size={14} /> Última evaluación: {profile.lastAssessmentDate}</span>
                                            </div>
                                        </div>

                                        <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border ${getLevelColor(profile.level)}`}>
                                            {profile.level.replace('_', ' ')}
                                        </div>
                                    </div>

                                    {/* Metrics */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
                                        <div className="p-3 bg-slate-50 rounded-xl">
                                            <div className="text-slate-400 text-xs font-bold uppercase mb-1 flex items-center gap-1"><Mic size={12} /> Palabras/Min</div>
                                            <div className="text-2xl font-black text-slate-700">{profile.readingSpeed}</div>
                                        </div>
                                        <div className="p-3 bg-slate-50 rounded-xl">
                                            <div className="text-slate-400 text-xs font-bold uppercase mb-1 flex items-center gap-1"><BookOpen size={12} /> Comprensión</div>
                                            <div className="text-2xl font-black text-slate-700">{profile.comprehensionScore}%</div>
                                        </div>
                                        <div className="col-span-2 p-3 bg-yellow-50/50 rounded-xl border border-yellow-100">
                                            <div className="text-yellow-600 text-xs font-bold uppercase mb-1 flex items-center gap-1"><AlertCircle size={12} /> Observaciones</div>
                                            <p className="text-sm font-medium text-slate-700 leading-snug">{profile.notes}</p>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex gap-2">
                                        <button className="flex-1 py-2 bg-purple-50 text-purple-600 rounded-lg font-bold text-sm hover:bg-purple-100 transition-colors">
                                            Nueva Evaluación
                                        </button>
                                        <button className="flex-1 py-2 bg-slate-50 text-slate-600 rounded-lg font-bold text-sm hover:bg-slate-100 transition-colors">
                                            Ver Historial
                                        </button>
                                    </div>

                                </div>
                            );
                        })
                    )}
                </div>

                {/* Sidebar / Tools */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                            <TrendingUp className="text-purple-500" size={20} />
                            Progreso Grupal
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="font-medium text-slate-600">Nivel Esperado</span>
                                    <span className="font-bold text-slate-800">45%</span>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 w-[45%]" />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="font-medium text-slate-600">En Desarrollo</span>
                                    <span className="font-bold text-slate-800">30%</span>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-amber-500 w-[30%]" />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="font-medium text-slate-600">Requiere Apoyo</span>
                                    <span className="font-bold text-slate-800">25%</span>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-red-500 w-[25%]" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div
                        onClick={() => setIsGeneratorModalOpen(true)}
                        className="bg-gradient-to-br from-purple-600 to-indigo-700 p-6 rounded-3xl shadow-lg shadow-purple-200 text-white relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-transform"
                    >
                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4">
                                <FileText size={24} className="text-white" />
                            </div>
                            <h3 className="text-lg font-bold">Generador de Actividades</h3>
                            <p className="text-purple-100 text-sm mt-1 opacity-90">Crear ejercicios de lectoescritura personalizados con IA.</p>
                        </div>
                        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-colors" />
                    </div>

                    <button
                        onClick={() => setIsAddStudentModalOpen(true)}
                        className="w-full py-4 bg-white border border-dashed border-slate-300 rounded-2xl text-slate-400 font-bold hover:bg-slate-50 hover:border-purple-300 hover:text-purple-500 transition-all flex items-center justify-center gap-2"
                    >
                        <CheckCircle2 size={20} />
                        Agregar Estudiante
                    </button>
                </div>

            </div>

            {/* --- ADD STUDENT MODAL --- */}
            {isAddStudentModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsAddStudentModalOpen(false)}></div>
                    <div className="relative bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-scaleIn">
                        <h3 className="text-2xl font-bold text-slate-800 mb-2">Agregar Estudiante</h3>
                        <p className="text-slate-500 mb-6">Selecciona un alumno para iniciar su seguimiento de lectoescritura.</p>

                        <div className="max-h-60 overflow-y-auto space-y-2 mb-6 custom-scrollbar pr-2">
                            {availableStudents.length > 0 ? (
                                availableStudents.map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => handleAddStudent(s.id)}
                                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all text-left group"
                                    >
                                        <img
                                            src={s.avatar === "PENDING_LOAD" ? `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=random` : (s.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=random`)}
                                            className="w-10 h-10 rounded-full object-cover bg-slate-200"
                                            alt={`Avatar de ${s.name}`}
                                        />
                                        <div>
                                            <p className="font-bold text-slate-700 group-hover:text-purple-600">{s.name}</p>
                                            <p className="text-xs text-slate-400">{s.group}</p>
                                        </div>
                                        <div className="ml-auto opacity-0 group-hover:opacity-100 text-purple-600 font-bold text-xs bg-purple-50 px-2 py-1 rounded">
                                            Agregar +
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <p className="text-center text-slate-400 py-8">Todos los estudiantes ya están registrados.</p>
                            )}
                        </div>

                        <button onClick={() => setIsAddStudentModalOpen(false)} className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors">
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* --- ACTIVITY GENERATOR MODAL --- */}
            {isGeneratorModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsGeneratorModalOpen(false)}></div>
                    <div className="relative bg-white rounded-3xl w-full max-w-2xl p-8 shadow-2xl animate-scaleIn h-[85vh] flex flex-col">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
                                <FileText size={20} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800">Generador de Actividades IA</h3>
                                <p className="text-slate-500 text-sm font-medium">Crea material didáctico personalizado al instante.</p>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
                            {/* Inputs */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tema o Interés</label>
                                    <input
                                        type="text"
                                        placeholder="Ej. Dinosaurios, El Espacio..."
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:ring-2 focus:ring-purple-400 outline-none"
                                        value={generatorPrompt.topic}
                                        onChange={e => setGeneratorPrompt({ ...generatorPrompt, topic: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nivel de Dificultad</label>
                                    <select
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:ring-2 focus:ring-purple-400 outline-none appearance-none"
                                        value={generatorPrompt.difficulty}
                                        onChange={e => setGeneratorPrompt({ ...generatorPrompt, difficulty: e.target.value as any })}
                                        aria-label="Nivel de dificultad"
                                    >
                                        <option value="BASICO">Básico (Sílabas simples)</option>
                                        <option value="INTERMEDIO">Intermedio (Frases cortas)</option>
                                        <option value="AVANZADO">Avanzado (Lectura de párrafos)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tipo de Actividad</label>
                                <div className="flex gap-2">
                                    {['LECTURA_COMPRENSION', 'COMPLETAR_PALABRAS', 'DICTADO'].map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setGeneratorPrompt({ ...generatorPrompt, type })}
                                            className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-all ${generatorPrompt.type === type
                                                ? 'border-purple-500 bg-purple-50 text-purple-700'
                                                : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
                                                }`}
                                        >
                                            {type.replace('_', ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Generated Content Area */}
                            {generatedActivity && (
                                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 relative">
                                    <div className="absolute top-4 right-4 flex gap-2">
                                        <button className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-purple-600 transition-colors" aria-label="Copiar actividad" title="Copiar">
                                            <FileText size={18} />
                                        </button>
                                        <button className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-emerald-600 transition-colors" aria-label="Guardar actividad" title="Guardar">
                                            <CheckCircle2 size={18} />
                                        </button>
                                    </div>
                                    <h4 className="font-bold text-slate-800 mb-4 border-b border-slate-200 pb-2">Vista Previa</h4>
                                    <pre className="whitespace-pre-wrap font-sans text-slate-600 text-sm leading-relaxed">
                                        {generatedActivity}
                                    </pre>
                                </div>
                            )}
                        </div>

                        <div className="pt-6 mt-4 border-t border-slate-100 flex gap-4">
                            <button
                                onClick={() => setIsGeneratorModalOpen(false)}
                                className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
                            >
                                Cerrar
                            </button>
                            <button
                                onClick={handleGenerateActivity}
                                disabled={isGenerating || !generatorPrompt.topic}
                                className={`flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2 transition-all ${(isGenerating || !generatorPrompt.topic) ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-1 hover:shadow-purple-500/40'
                                    }`}
                            >
                                {isGenerating ? (
                                    <>
                                        <TrendingUp className="animate-spin" size={20} /> Generando...
                                    </>
                                ) : (
                                    <>
                                        <Award size={20} /> Generar Actividad
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
