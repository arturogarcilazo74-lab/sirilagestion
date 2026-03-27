import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Gamepad2, Plus, Trash2, Play, Square, Trophy,
    Shuffle, CheckCircle2, XCircle, Users, Zap,
    RotateCcw, Star, ChevronRight, MessageSquare, X,
    Sparkles, Loader2, FileUp, Brain, FileText, Image
} from 'lucide-react';
import { CTEGame, CTEQuestion, CTEGameResult, StaffMember, SchoolConfig } from '../types';
import { generateCTEGameQuestions } from '../services/ai';

interface CTEGamesViewProps {
    schoolConfig: SchoolConfig;
    games: CTEGame[];
    gameResults: CTEGameResult[];
    onSaveGame: (game: CTEGame) => void;
    onDeleteGame: (id: string) => void;
    onDeleteGameResults: (gameId: string) => void;
}

const PRESET_TOPICS = [
    {
        title: 'Nueva Escuela Mexicana',
        questions: [
            { text: '¿Cuántos principios pedagógicos tiene la NEM?', options: ['4', '6', '8', '10'], correctIndex: 2 },
            { text: '¿Qué campo formativo abarca las matemáticas?', options: ['Lenguajes', 'Saberes y Pensamiento Científico', 'Ética y Naturaleza', 'De lo Humano y lo Comunitario'], correctIndex: 1 },
            { text: 'La NEM prioriza el aprendizaje de:', options: ['Memorización', 'Competencias', 'Contenidos teóricos', 'Exámenes estandarizados'], correctIndex: 1 },
            { text: '¿Cuántos campos formativos tiene la NEM?', options: ['3', '4', '5', '6'], correctIndex: 1 },
            { text: 'El eje articulador "Vida saludable" promueve:', options: ['Solo deporte', 'Bienestar integral', 'Dietas estrictas', 'Competencias deportivas'], correctIndex: 1 },
        ]
    },
    {
        title: 'Plan de Mejora Escolar',
        questions: [
            { text: '¿Qué componente del PME evalúa los resultados?', options: ['Diagnóstico', 'Seguimiento', 'Organización', 'Planeación'], correctIndex: 1 },
            { text: 'El PME debe revisarse:', options: ['Cada sexenio', 'Anualmente', 'Solo al inicio', 'Nunca'], correctIndex: 1 },
            { text: '¿Quién participa en la elaboración del PME?', options: ['Solo director', 'Solo docentes', 'Todo el colectivo', 'Solo supervisión'], correctIndex: 2 },
            { text: 'Las metas del PME deben ser:', options: ['Ambiciosas e imposibles', 'SMART', 'Generales', 'Solo numéricas'], correctIndex: 1 },
        ]
    },
    {
        title: 'Convivencia Escolar',
        questions: [
            { text: 'La mediación de conflictos busca:', options: ['Castigar al agresor', 'Restaurar relaciones', 'Ignorar el problema', 'Suspender alumnos'], correctIndex: 1 },
            { text: '¿Qué es la empatía en el aula?', options: ['Ser estricto', 'Comprender al otro', 'Ignorar emociones', 'Dar órdenes'], correctIndex: 1 },
            { text: 'El protocolo de actuación ante bullying debe:', options: ['Ocultarse', 'Documentarse y actuarse', 'Solo llamar a padres', 'Suspender inmediato'], correctIndex: 1 },
        ]
    },
    {
        title: 'Evaluación Formativa',
        questions: [
            { text: 'La evaluación formativa se centra en:', options: ['Calificar exámenes', 'Mejorar el aprendizaje', 'Poner notas', 'Clasificar alumnos'], correctIndex: 1 },
            { text: '¿Qué instrumento es útil para evaluar procesos?', options: ['Examen final', 'Rúbrica', 'Lista de cotejo únicamente', 'Boleta'], correctIndex: 1 },
            { text: 'La retroalimentación debe ser:', options: ['Solo negativa', 'Oportuna y constructiva', 'Al final del ciclo', 'Solo positiva'], correctIndex: 1 },
        ]
    }
];

export const CTEGamesView: React.FC<CTEGamesViewProps> = ({
    schoolConfig,
    games,
    gameResults,
    onSaveGame,
    onDeleteGame,
    onDeleteGameResults
}) => {
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [activeGame, setActiveGame] = useState<CTEGame | null>(null);
    const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [scores, setScores] = useState<Record<string, number>>({});
    const [currentPlayer, setCurrentPlayer] = useState('');
    const [gamePhase, setGamePhase] = useState<'lobby' | 'playing' | 'results'>('lobby');

    const [newGameTitle, setNewGameTitle] = useState('');
    const [newGameType, setNewGameType] = useState<CTEGame['type']>('TRIVIA');
    const [newQuestions, setNewQuestions] = useState<CTEQuestion[]>([]);
    const [newQText, setNewQText] = useState('');
    const [newQOptions, setNewQOptions] = useState(['', '', '', '']);
    const [newQCorrect, setNewQCorrect] = useState(0);

    // AI Generation state
    const [aiTopic, setAiTopic] = useState('');
    const [aiFiles, setAiFiles] = useState<File[]>([]);
    const [aiQuestionCount, setAiQuestionCount] = useState(5);
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiError, setAiError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Assignment state
    const [assignTo, setAssignTo] = useState<'ALL' | 'SPECIFIC'>('ALL');
    const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
    const [viewingResultsGameId, setViewingResultsGameId] = useState<string | null>(null);

    const staff: StaffMember[] = (schoolConfig.staff || []).filter(s =>
        s.role?.includes('Docente') || s.role?.includes('Docente Titular') || s.role?.includes('Administrativo')
    );

    const resetForm = () => {
        setNewGameTitle('');
        setNewGameType('TRIVIA');
        setNewQuestions([]);
        setNewQText('');
        setNewQOptions(['', '', '', '']);
        setNewQCorrect(0);
        setShowCreateForm(false);
        setAiTopic('');
        setAiFiles([]);
        setAiQuestionCount(5);
        setIsGenerating(false);
        setAiError('');
        setAssignTo('ALL');
        setSelectedStaffIds([]);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        setAiFiles(prev => [...prev, ...files]);
    };

    const removeFile = (idx: number) => {
        setAiFiles(prev => prev.filter((_, i) => i !== idx));
    };

    const generateWithAI = async () => {
        if (!aiTopic.trim() && aiFiles.length === 0) {
            setAiError('Escribe un tema o sube al menos un documento');
            return;
        }
        setIsGenerating(true);
        setAiError('');
        try {
            const result = await generateCTEGameQuestions(aiTopic, aiFiles, aiQuestionCount, newGameType);
            if (result.questions && result.questions.length > 0) {
                const questions: CTEQuestion[] = result.questions.map((q, i) => ({
                    id: `ai-${Date.now()}-${i}`,
                    text: q.text,
                    options: q.options || [],
                    correctIndex: q.correctIndex ?? 0,
                }));
                setNewQuestions(questions);
                if (!newGameTitle.trim() && aiTopic.trim()) {
                    const shortTopic = aiTopic.trim().substring(0, 50);
                    setNewGameTitle(shortTopic + (aiTopic.length > 50 ? '...' : ''));
                }
            } else {
                setAiError('La IA no generó preguntas. Intenta con una descripción más detallada.');
            }
        } catch (e: any) {
            setAiError(e.message || 'Error al generar con IA');
        } finally {
            setIsGenerating(false);
        }
    };

    const addQuestion = () => {
        if (!newQText.trim()) return;
        const q: CTEQuestion = {
            id: Date.now().toString(),
            text: newQText.trim(),
            options: newQOptions.filter(o => o.trim()),
            correctIndex: newQCorrect,
        };
        setNewQuestions(prev => [...prev, q]);
        setNewQText('');
        setNewQOptions(['', '', '', '']);
        setNewQCorrect(0);
    };

    const loadPreset = (topicIdx: number) => {
        const topic = PRESET_TOPICS[topicIdx];
        setNewGameTitle(topic.title);
        setNewQuestions(topic.questions.map((q, i) => ({
            id: `preset-${i}`,
            text: q.text,
            options: q.options,
            correctIndex: q.correctIndex,
        })));
    };

    const handleSaveGame = () => {
        if (!newGameTitle.trim() || newQuestions.length === 0) {
            alert('Agrega un título y al menos una pregunta');
            return;
        }
        const assignedTo = assignTo === 'ALL' ? 'ALL' : selectedStaffIds;
        const game: CTEGame = {
            id: Date.now().toString(),
            title: newGameTitle.trim(),
            type: newGameType,
            questions: newQuestions,
            createdAt: new Date().toISOString(),
            isActive: false,
            assignedTo: assignedTo as any,
        };
        onSaveGame(game);
        resetForm();
    };

    const startGame = (game: CTEGame) => {
        setActiveGame(game);
        setActiveQuestionIndex(0);
        setSelectedAnswer(null);
        setShowResult(false);
        setScores({});
        setCurrentPlayer('');
        setGamePhase('lobby');
    };

    const submitAnswer = () => {
        if (selectedAnswer === null || !activeGame) return;
        setShowResult(true);
        const isCorrect = selectedAnswer === activeGame.questions[activeQuestionIndex].correctIndex;
        if (isCorrect && currentPlayer) {
            setScores(prev => ({ ...prev, [currentPlayer]: (prev[currentPlayer] || 0) + 1 }));
        }
    };

    const nextQuestion = () => {
        if (!activeGame) return;
        if (activeQuestionIndex < activeGame.questions.length - 1) {
            setActiveQuestionIndex(prev => prev + 1);
            setSelectedAnswer(null);
            setShowResult(false);
            setCurrentPlayer('');
        } else {
            setGamePhase('results');
        }
    };

    const closeGame = () => {
        setActiveGame(null);
        setGamePhase('lobby');
    };

    const getGameTypeIcon = (type: CTEGame['type']) => {
        switch (type) {
            case 'TRIVIA': return <Zap size={16} />;
            case 'MATCHING': return <Shuffle size={16} />;
            case 'SURVEY': return <MessageSquare size={16} />;
            case 'OPEN_QUESTION': return <Star size={16} />;
            default: return <Gamepad2 size={16} />;
        }
    };

    const getGameTypeLabel = (type: CTEGame['type']) => {
        switch (type) {
            case 'TRIVIA': return 'Trivia';
            case 'MATCHING': return 'Emparejar';
            case 'SURVEY': return 'Encuesta';
            case 'OPEN_QUESTION': return 'Pregunta Abierta';
            default: return 'Juego';
        }
    };

    return (
        <div className="animate-fadeIn space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Juegos Interactivos para CTE</h2>
                    <p className="text-sm text-slate-500">Crea trivias y dinámicas para las sesiones de Consejo Técnico Escolar</p>
                </div>
                <button
                    onClick={() => setShowCreateForm(true)}
                    className="bg-violet-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-violet-700 transition-colors shadow-lg shadow-violet-200"
                >
                    <Plus size={18} />
                    Crear Juego
                </button>
            </div>

            {showCreateForm && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="bg-violet-600 p-5 text-white flex justify-between items-center">
                            <h3 className="text-lg font-bold">Crear Juego Interactivo</h3>
                            <button onClick={resetForm} className="text-white/80 hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Plantillas Prediseñadas</label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {PRESET_TOPICS.map((topic, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => loadPreset(idx)}
                                            className="p-3 rounded-xl border-2 border-violet-200 bg-violet-50 text-violet-700 text-xs font-bold hover:bg-violet-100 hover:border-violet-400 transition-all"
                                        >
                                            {topic.title}
                                            <span className="block text-violet-400 text-[10px] mt-0.5">{topic.questions.length} preguntas</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Título del Juego</label>
                                    <input
                                        type="text"
                                        value={newGameTitle}
                                        onChange={e => setNewGameTitle(e.target.value)}
                                        placeholder="Ej: Conociendo la NEM"
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Juego</label>
                                    <select
                                        value={newGameType}
                                        onChange={e => setNewGameType(e.target.value as any)}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                                    >
                                        <option value="TRIVIA">Trivia (Opción Múltiple)</option>
                                        <option value="SURVEY">Encuesta / Opinión</option>
                                        <option value="OPEN_QUESTION">Pregunta Abierta</option>
                                    </select>
                                </div>
                            </div>

                            <div className="border-2 border-dashed border-purple-300 rounded-xl p-5 bg-gradient-to-br from-purple-50 to-indigo-50">
                                <div className="flex items-center gap-2 mb-3">
                                    <Sparkles size={20} className="text-purple-600" />
                                    <h4 className="font-bold text-purple-800">Generar con Inteligencia Artificial</h4>
                                </div>
                                <p className="text-xs text-purple-600 mb-4">Sube documentos o describe el tema y la IA creará preguntas automáticamente para tu juego CTE.</p>

                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Tema o descripción del juego</label>
                                        <textarea
                                            value={aiTopic}
                                            onChange={e => setAiTopic(e.target.value)}
                                            rows={3}
                                            placeholder="Ej: Trivia sobre la Nueva Escuela Mexicana para docentes. Incluir preguntas sobre los 4 campos formativos, ejes articuladores, evaluación formativa y Plan de Mejora Escolar..."
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Subir documentos (PDF, imágenes, texto)</label>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            multiple
                                            accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.webp"
                                            onChange={handleFileSelect}
                                            className="hidden"
                                        />
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-full border-2 border-dashed border-slate-300 rounded-lg py-3 text-sm text-slate-500 hover:border-purple-400 hover:text-purple-600 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <FileUp size={16} /> Seleccionar archivos
                                        </button>
                                        {aiFiles.length > 0 && (
                                            <div className="mt-2 space-y-1">
                                                {aiFiles.map((file, idx) => (
                                                    <div key={idx} className="flex items-center justify-between bg-white rounded-lg px-3 py-1.5 border border-slate-200">
                                                        <span className="text-xs text-slate-600 truncate flex-1">
                                                            {file.type.startsWith('image/') ? <Image size={12} className="inline mr-1 text-blue-500" /> : <FileText size={12} className="inline mr-1 text-red-500" />}
                                                            {file.name}
                                                        </span>
                                                        <button onClick={() => removeFile(idx)} className="text-red-400 hover:text-red-600 ml-2"><X size={14} /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <label className="text-xs font-bold text-slate-600">Preguntas:</label>
                                        <input
                                            type="number"
                                            min={3}
                                            max={20}
                                            value={aiQuestionCount}
                                            onChange={e => setAiQuestionCount(Number(e.target.value))}
                                            className="w-20 border border-slate-300 rounded-lg px-2 py-1.5 text-sm text-center"
                                        />
                                    </div>

                                    {aiError && (
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">{aiError}</div>
                                    )}

                                    <button
                                        onClick={generateWithAI}
                                        disabled={isGenerating || (!aiTopic.trim() && aiFiles.length === 0)}
                                        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-xl font-bold text-sm hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-200"
                                    >
                                        {isGenerating ? (
                                            <><Loader2 size={16} className="animate-spin" /> Generando preguntas...</>
                                        ) : (
                                            <><Brain size={16} /> Generar Preguntas con IA</>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Agregar Pregunta Manualmente</label>
                                <input
                                    type="text"
                                    value={newQText}
                                    onChange={e => setNewQText(e.target.value)}
                                    placeholder="Escribe la pregunta..."
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3 focus:ring-2 focus:ring-violet-500"
                                />
                                {(newGameType === 'TRIVIA' || newGameType === 'SURVEY') && (
                                    <div className="grid grid-cols-2 gap-2 mb-3">
                                        {newQOptions.map((opt, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setNewQCorrect(i)}
                                                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 ${newQCorrect === i ? 'bg-violet-600 text-white border-violet-600' : 'border-slate-300 text-slate-400'}`}
                                                >
                                                    {String.fromCharCode(65 + i)}
                                                </button>
                                                <input
                                                    type="text"
                                                    value={opt}
                                                    onChange={e => {
                                                        const updated = [...newQOptions];
                                                        updated[i] = e.target.value;
                                                        setNewQOptions(updated);
                                                    }}
                                                    placeholder={`Opción ${String.fromCharCode(65 + i)}`}
                                                    className="flex-1 border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:ring-1 focus:ring-violet-500"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <button
                                    onClick={addQuestion}
                                    disabled={!newQText.trim()}
                                    className="bg-violet-100 text-violet-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-violet-200 disabled:opacity-50 transition-colors flex items-center gap-1"
                                >
                                    <Plus size={14} /> Agregar Pregunta
                                </button>
                            </div>

                            {newQuestions.length > 0 && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Preguntas Agregadas ({newQuestions.length})</label>
                                    <div className="space-y-2">
                                        {newQuestions.map((q, i) => (
                                            <div key={q.id} className="flex items-start justify-between p-3 bg-white rounded-lg border border-slate-200">
                                                <div>
                                                    <span className="text-xs font-bold text-violet-600">#{i + 1}</span>
                                                    <p className="text-sm text-slate-800 font-medium">{q.text}</p>
                                                    {q.options && (
                                                        <div className="flex gap-2 mt-1">
                                                            {q.options.map((opt, oi) => (
                                                                <span key={oi} className={`text-xs px-1.5 py-0.5 rounded ${oi === q.correctIndex ? 'bg-emerald-100 text-emerald-700 font-bold' : 'bg-slate-100 text-slate-500'}`}>
                                                                    {String.fromCharCode(65 + oi)}: {opt}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => setNewQuestions(prev => prev.filter((_, idx) => idx !== i))}
                                                    className="text-red-400 hover:text-red-600 ml-2"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="px-6 pb-2">
                            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Asignar a Docentes</label>
                                <div className="flex gap-3 mb-3">
                                    <button
                                        onClick={() => setAssignTo('ALL')}
                                        className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${assignTo === 'ALL' ? 'bg-violet-600 text-white' : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'}`}
                                    >
                                        Todos los Docentes
                                    </button>
                                    <button
                                        onClick={() => setAssignTo('SPECIFIC')}
                                        className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${assignTo === 'SPECIFIC' ? 'bg-violet-600 text-white' : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'}`}
                                    >
                                        Seleccionar Docentes
                                    </button>
                                </div>
                                {assignTo === 'SPECIFIC' && (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {staff.map(s => {
                                            const isSelected = selectedStaffIds.includes(s.id);
                                            return (
                                                <button
                                                    key={s.id}
                                                    onClick={() => {
                                                        setSelectedStaffIds(prev =>
                                                            isSelected ? prev.filter(id => id !== s.id) : [...prev, s.id]
                                                        );
                                                    }}
                                                    className={`p-2.5 rounded-lg text-xs font-bold transition-all border-2 ${
                                                        isSelected
                                                            ? 'bg-violet-100 border-violet-400 text-violet-700'
                                                            : 'bg-white border-slate-200 text-slate-600 hover:border-violet-300'
                                                    }`}
                                                >
                                                    {isSelected && <CheckCircle2 size={12} className="inline mr-1" />}
                                                    {s.name.split(' ')[0]}
                                                    <span className="block text-[10px] opacity-60 font-normal">{s.group}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-200 flex justify-end gap-3 bg-slate-50">
                            <button onClick={resetForm} className="px-5 py-2 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors">Cancelar</button>
                            <button
                                onClick={handleSaveGame}
                                disabled={!newGameTitle.trim() || newQuestions.length === 0}
                                className="bg-violet-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-violet-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                            >
                                <CheckCircle2 size={16} /> Guardar Juego
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeGame && (
                <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-gradient-to-br from-violet-900 to-indigo-900 animate-fadeIn">
                    <div className="w-full max-w-2xl">
                        {gamePhase === 'lobby' && (
                            <div className="text-center space-y-6">
                                <h2 className="text-4xl font-black text-white">{activeGame.title}</h2>
                                <p className="text-violet-200">{activeGame.questions.length} preguntas</p>

                                <div className="bg-white/10 rounded-2xl p-6 backdrop-blur-sm">
                                    <label className="block text-sm font-bold text-violet-200 uppercase mb-3">¿Quién responde?</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
                                        {staff.map(s => (
                                            <button
                                                key={s.id}
                                                onClick={() => setCurrentPlayer(s.name)}
                                                className={`p-3 rounded-xl font-bold text-sm transition-all ${currentPlayer === s.name ? 'bg-white text-violet-700 shadow-lg scale-105' : 'bg-white/10 text-white hover:bg-white/20'}`}
                                            >
                                                {s.name.split(' ')[0]}
                                            </button>
                                        ))}
                                    </div>
                                    {staff.length === 0 && (
                                        <input
                                            type="text"
                                            value={currentPlayer}
                                            onChange={e => setCurrentPlayer(e.target.value)}
                                            placeholder="Nombre del participante"
                                            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 text-center text-lg mb-4"
                                        />
                                    )}
                                    <button
                                        onClick={() => setGamePhase('playing')}
                                        disabled={!currentPlayer}
                                        className="bg-white text-violet-700 px-8 py-4 rounded-xl font-black text-xl hover:bg-violet-50 disabled:opacity-40 transition-all shadow-lg"
                                    >
                                        <Play size={24} className="inline mr-2" /> ¡Comenzar!
                                    </button>
                                </div>

                                {Object.keys(scores).length > 0 && (
                                    <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                                        <h3 className="text-sm font-bold text-violet-200 uppercase mb-2">Puntuaciones</h3>
                                        {Object.entries(scores).sort(([,a],[,b]) => b-a).map(([name, score]) => (
                                            <div key={name} className="flex justify-between text-white py-1">
                                                <span>{name}</span>
                                                <span className="font-bold">{score} pts</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <button onClick={closeGame} className="text-violet-300 hover:text-white text-sm">
                                    <X size={16} className="inline mr-1" /> Cerrar juego
                                </button>
                            </div>
                        )}

                        {gamePhase === 'playing' && activeGame.questions[activeQuestionIndex] && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <span className="text-violet-300 text-sm font-bold">
                                        Pregunta {activeQuestionIndex + 1} de {activeGame.questions.length}
                                    </span>
                                    <span className="text-white text-sm font-bold bg-white/10 px-3 py-1 rounded-full">
                                        {currentPlayer}
                                    </span>
                                </div>

                                <div className="bg-white rounded-2xl p-8 shadow-2xl">
                                    <h3 className="text-xl font-bold text-slate-800 mb-6">
                                        {activeGame.questions[activeQuestionIndex].text}
                                    </h3>

                                    {activeGame.questions[activeQuestionIndex].options && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {activeGame.questions[activeQuestionIndex].options!.map((opt, i) => {
                                                const isSelected = selectedAnswer === i;
                                                const isCorrect = i === activeGame.questions[activeQuestionIndex].correctIndex;
                                                let btnClass = 'border-2 border-slate-200 bg-slate-50 text-slate-700 hover:border-violet-400 hover:bg-violet-50';
                                                if (showResult) {
                                                    if (isCorrect) btnClass = 'border-2 border-emerald-500 bg-emerald-50 text-emerald-700';
                                                    else if (isSelected && !isCorrect) btnClass = 'border-2 border-red-500 bg-red-50 text-red-700';
                                                    else btnClass = 'border-2 border-slate-200 bg-slate-50 text-slate-400';
                                                } else if (isSelected) {
                                                    btnClass = 'border-2 border-violet-500 bg-violet-50 text-violet-700';
                                                }
                                                return (
                                                    <button
                                                        key={i}
                                                        onClick={() => !showResult && setSelectedAnswer(i)}
                                                        disabled={showResult}
                                                        className={`p-4 rounded-xl font-bold text-left transition-all ${btnClass}`}
                                                    >
                                                        <span className="inline-block w-8 h-8 rounded-full bg-current/10 text-center leading-8 mr-2">
                                                            {String.fromCharCode(65 + i)}
                                                        </span>
                                                        {opt}
                                                        {showResult && isCorrect && <CheckCircle2 size={20} className="inline ml-2 text-emerald-600" />}
                                                        {showResult && isSelected && !isCorrect && <XCircle size={20} className="inline ml-2 text-red-600" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-center gap-4">
                                    {!showResult ? (
                                        <button
                                            onClick={submitAnswer}
                                            disabled={selectedAnswer === null}
                                            className="bg-white text-violet-700 px-8 py-3 rounded-xl font-black text-lg hover:bg-violet-50 disabled:opacity-40 transition-all shadow-lg"
                                        >
                                            Confirmar
                                        </button>
                                    ) : (
                                        <button
                                            onClick={nextQuestion}
                                            className="bg-white text-violet-700 px-8 py-3 rounded-xl font-black text-lg hover:bg-violet-50 transition-all shadow-lg"
                                        >
                                            {activeQuestionIndex < activeGame.questions.length - 1 ? (
                                                <>Siguiente <ChevronRight size={20} className="inline" /></>
                                            ) : (
                                                <>Ver Resultados <Trophy size={20} className="inline" /></>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {gamePhase === 'results' && (
                            <div className="text-center space-y-6">
                                <Trophy size={64} className="mx-auto text-yellow-400" />
                                <h2 className="text-4xl font-black text-white">¡Resultados Finales!</h2>

                                <div className="bg-white/10 rounded-2xl p-6 backdrop-blur-sm max-w-md mx-auto">
                                    {Object.entries(scores).sort(([,a],[,b]) => b-a).map(([name, score], idx) => (
                                        <div key={name} className={`flex justify-between items-center py-3 px-4 rounded-xl mb-2 ${idx === 0 ? 'bg-yellow-400/20' : ''}`}>
                                            <div className="flex items-center gap-3">
                                                {idx === 0 && <Trophy size={20} className="text-yellow-400" />}
                                                <span className="text-white font-bold">{name}</span>
                                            </div>
                                            <span className="text-white font-black text-xl">{score}/{activeGame.questions.length}</span>
                                        </div>
                                    ))}
                                    {Object.keys(scores).length === 0 && (
                                        <p className="text-violet-200">No hay participantes aún</p>
                                    )}
                                </div>

                                <div className="flex justify-center gap-4">
                                    <button
                                        onClick={() => {
                                            setGamePhase('lobby');
                                            setActiveQuestionIndex(0);
                                            setSelectedAnswer(null);
                                            setShowResult(false);
                                        }}
                                        className="bg-white/20 text-white px-6 py-3 rounded-xl font-bold hover:bg-white/30 transition-all flex items-center gap-2"
                                    >
                                        <RotateCcw size={18} /> Jugar de Nuevo
                                    </button>
                                    <button
                                        onClick={closeGame}
                                        className="bg-white text-violet-700 px-6 py-3 rounded-xl font-bold hover:bg-violet-50 transition-all"
                                    >
                                        Cerrar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {games.length === 0 && !showCreateForm ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
                    <Gamepad2 size={48} className="mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-bold text-slate-600">No hay juegos creados</h3>
                    <p className="text-sm text-slate-400 mt-1">Crea trivias interactivas para tus sesiones de CTE</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {games.map(game => {
                        const gameResultsList = gameResults.filter(r => r.gameId === game.id);
                        const completedCount = gameResultsList.length;
                        const avgScore = completedCount > 0
                            ? Math.round(gameResultsList.reduce((sum, r) => sum + r.score, 0) / completedCount)
                            : 0;
                        const totalAssigned = game.assignedTo === 'ALL'
                            ? staff.length
                            : (game.assignedTo as string[] || []).length;

                        return (
                            <div key={game.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-lg transition-all">
                                <div className="p-5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="p-1.5 rounded-lg bg-violet-100 text-violet-600">
                                            {getGameTypeIcon(game.type)}
                                        </span>
                                        <span className="text-xs font-bold text-slate-400 uppercase">{getGameTypeLabel(game.type)}</span>
                                    </div>
                                    <h3 className="font-bold text-slate-800 mb-1">{game.title}</h3>
                                    <p className="text-xs text-slate-400">{game.questions.length} preguntas</p>

                                    {totalAssigned > 0 && (
                                        <div className="mt-3 flex items-center gap-3 text-xs">
                                            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">
                                                {completedCount}/{totalAssigned} completados
                                            </span>
                                            {avgScore > 0 && (
                                                <span className={`font-bold ${avgScore >= 80 ? 'text-emerald-600' : avgScore >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                                                    Prom: {avgScore}%
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="border-t border-slate-100 p-3 flex gap-2">
                                    <button
                                        onClick={() => startGame(game)}
                                        className="flex-1 bg-violet-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-violet-700 transition-colors flex items-center justify-center gap-1"
                                    >
                                        <Play size={14} /> Jugar
                                    </button>
                                    {completedCount > 0 && (
                                        <button
                                            onClick={() => setViewingResultsGameId(viewingResultsGameId === game.id ? null : game.id)}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Ver resultados"
                                        >
                                            <Trophy size={16} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => {
                                            if (confirm('¿Eliminar este juego y todos sus resultados?')) {
                                                onDeleteGameResults(game.id);
                                                onDeleteGame(game.id);
                                            }
                                        }}
                                        className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                {viewingResultsGameId === game.id && (
                                    <div className="border-t border-slate-100 p-4 bg-slate-50 animate-fadeIn">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Resultados por Docente</h4>
                                        <div className="space-y-2 max-h-64 overflow-y-auto">
                                            {gameResultsList
                                                .sort((a, b) => b.score - a.score)
                                                .map(r => (
                                                    <div key={r.id} className="flex items-center justify-between bg-white rounded-lg p-2.5 border border-slate-200">
                                                        <div>
                                                            <span className="text-sm font-bold text-slate-800">{r.staffName}</span>
                                                            <span className="text-xs text-slate-400 ml-2">
                                                                {new Date(r.completedAt).toLocaleDateString('es-MX')}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-slate-500">{r.correctAnswers}/{r.totalQuestions}</span>
                                                            <span className={`text-sm font-black ${r.score >= 80 ? 'text-emerald-600' : r.score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                                                                {r.score}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            {gameResultsList.length === 0 && (
                                                <p className="text-xs text-slate-400 italic text-center py-2">Sin resultados aún</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
