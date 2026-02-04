import React, { useState, useEffect, useRef } from 'react';
import { Student } from '../types';
import { generateSmartTeams, generateActivityAdaptation, generateExam } from '../services/ai';
import { Shuffle, Users, Bot, Trophy, Dice5, Timer, Play, Pause, RotateCcw, Volume2, VolumeX, Sparkles, BookOpen, Wand2, FileQuestion } from 'lucide-react';

interface ToolsViewProps {
  students: Student[];
}

export const ToolsView: React.FC<ToolsViewProps> = ({ students }) => {
  // Random Picker State
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  // Team Generator State
  const [teamCount, setTeamCount] = useState(4);
  const [teams, setTeams] = useState<{ name: string, members: string[] }[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);

  // Timer State
  const [time, setTime] = useState(300); // 5 minutes default
  const [isActive, setIsActive] = useState(false);
  const [initialTime, setInitialTime] = useState(300);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Timer Logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isActive && time > 0) {
      interval = setInterval(() => {
        setTime((prevTime) => prevTime - 1);
      }, 1000);
    } else if (time === 0 && isActive) {
      setIsActive(false);
      if (!isMuted) {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/1354/1354-preview.mp3'); // Alarm sound
        audio.play().catch(e => console.log("Audio play failed", e));
      }
    }
    return () => clearInterval(interval);
  }, [isActive, time, isMuted]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => {
    setIsActive(false);
    setTime(initialTime);
  };
  const setCustomTime = (mins: number) => {
    const newTime = mins * 60;
    setInitialTime(newTime);
    setTime(newTime);
    setIsActive(false);
  };

  // Random Picker Logic
  const handleRandomPick = () => {
    if (students.length === 0) return;
    setIsRolling(true);
    let counter = 0;
    const maxIterations = 20;
    const interval = setInterval(() => {
      const random = students[Math.floor(Math.random() * students.length)];
      setSelectedStudent(random);
      counter++;
      if (counter > maxIterations) {
        clearInterval(interval);
        setIsRolling(false);
        // Winner sound
        if (!isMuted) {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3');
          audio.play().catch(e => console.log("Audio play failed", e));
        }
      }
    }, 100);
  };

  // Team Generator Logic
  const handleCreateTeams = async () => {
    setLoadingTeams(true);
    try {
      const result = await generateSmartTeams(students, teamCount);
      setTeams(result.teams);
    } catch (e) {
      console.error(e);
      // Fallback if API fails
      const shuffled = [...students].sort(() => 0.5 - Math.random());
      const newTeams: any[] = Array.from({ length: teamCount }, (_, i) => ({ name: `Equipo ${i + 1}`, members: [] }));

      shuffled.forEach((s, i) => {
        newTeams[i % teamCount].members.push(s.name);
      });
      setTeams(newTeams);
    } finally {
      setLoadingTeams(false);
    }
  };

  // Activity Generator State
  const [activityTopic, setActivityTopic] = useState('');
  const [activityType, setActivityType] = useState('QUIZ');
  const [generatedActivity, setGeneratedActivity] = useState<string | null>(null);
  const [isGeneratingActivity, setIsGeneratingActivity] = useState(false);

  // Activity Adaptation State
  const [adaptationTopic, setAdaptationTopic] = useState('');
  const [bapType, setBapType] = useState('TDAH');
  const [adaptedActivity, setAdaptedActivity] = useState<string | null>(null);
  const [isAdapting, setIsAdapting] = useState(false);

  // Activity Adaptation Logic
  const handleAdaptActivity = async () => {
    if (!adaptationTopic) return;
    setIsAdapting(true);
    setAdaptedActivity(null);
    try {
      const result = await generateActivityAdaptation(adaptationTopic, bapType);
      setAdaptedActivity(result);
    } catch (error) {
      console.error("Error adapting activity:", error);
      setAdaptedActivity("Hubo un error al generar la adaptación. Por favor intenta de nuevo.");
    } finally {
      setIsAdapting(false);
    }
  };

  // Exam Generator State
  const [examTopic, setExamTopic] = useState('');
  const [examCount, setExamCount] = useState(5);
  const [examType, setExamType] = useState('Opción Múltiple');
  const [generatedExam, setGeneratedExam] = useState<string | null>(null);
  const [isGeneratingExam, setIsGeneratingExam] = useState(false);

  // Exam Generator Logic
  const handleGenerateExam = async () => {
    if (!examTopic) return;
    setIsGeneratingExam(true);
    setGeneratedExam(null);
    try {
      const result = await generateExam(examTopic, examCount, examType);
      setGeneratedExam(result);
    } catch (error) {
      console.error("Error generating exam:", error);
      setGeneratedExam("Hubo un error al generar el examen. Por favor intenta de nuevo.");
    } finally {
      setIsGeneratingExam(false);
    }
  };

  // Activity Generator Logic
  const handleGenerateActivity = () => {
    if (!activityTopic) return;
    setIsGeneratingActivity(true);
    setGeneratedActivity(null);

    // Simulate AI Delay
    setTimeout(() => {
      const templates: Record<string, string[]> = {
        QUIZ: [
          `**Quiz Rápido: ${activityTopic}**\n\n1. ¿Cuál es el concepto clave de ${activityTopic}?\n2. Menciona un ejemplo de la vida real sobre ${activityTopic}.\n3. Verdadero o Falso: ${activityTopic} siempre es constante.\n4. Pregunta de desafío: ¿Cómo se relaciona ${activityTopic} con lo visto la semana pasada?\n\n*Bono: Dibuja algo que represente este tema.*`,
          `**Desafío de Conocimiento: ${activityTopic}**\n\nInstrucciones: Responde en tu cuaderno.\n1. Define ${activityTopic} en tus propias palabras.\n2. Crea un mapa mental rápido sobre ${activityTopic}.\n3. Intercambia tu cuaderno con un compañero y califica su definición.`
        ],
        DEBATE: [
          `**Gran Debate: ${activityTopic}**\n\n**Equipo A:** A favor / Es esencial.\n**Equipo B:** En contra / Es irrelevante.\n\n**Ronda 1 (5 min):** Preparación de argumentos.\n**Ronda 2 (10 min):** Discusión abierta.\n**Cierre:** Votación de la clase sobre quién tuvo mejores argumentos.`,
          `**Mesa Redonda: ${activityTopic}**\n\nSelecciona 4 expertos para pasar al frente.\nEl resto de la clase prepara preguntas difíciles sobre ${activityTopic}.\nEl moderador (Docente) dirige la discusión.`
        ],
        ROLEPLAY: [
          `**Simulación: ${activityTopic}**\n\n**Escenario:** Imagina que eres un experto en ${activityTopic} y debes explicarlo a alguien que no sabe nada.\n\n**Roles:**\n- Experto\n- Entrevistador\n- Público (toma notas)\n\n**Acción:** Realicen una entrevista de 3 minutos.`
        ],
        GAME: [
          `**Juego: Adivina el Concepto**\n\nTema: ${activityTopic}\nUn estudiante pasa al frente y se pone de espaldas al pizarrón. El docente escribe una palabra relacionada con ${activityTopic}. La clase debe dar pistas sin decir la palabra exacta hasta que el estudiante adivine.`,
          `**Carrera de Relevos: ${activityTopic}**\n\nDivide el pizarrón en dos. Dos equipos. Cada miembro corre a escribir un dato sobre ${activityTopic}. El equipo con más datos correctos en 2 minutos gana.`
        ]
      };

      const options = templates[activityType] || templates['QUIZ'];
      const randomTemplate = options[Math.floor(Math.random() * options.length)];
      setGeneratedActivity(randomTemplate);
      setIsGeneratingActivity(false);
    }, 1500);
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-10">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Herramientas de Aula</h2>
          <p className="text-slate-500 font-medium">Utilidades para gestión dinámica de la clase</p>
        </div>
        <button
          onClick={() => setIsMuted(!isMuted)}
          className={`p-2 rounded-full transition-colors ${isMuted ? 'bg-slate-200 text-slate-500' : 'bg-indigo-100 text-indigo-600'}`}
          title={isMuted ? "Activar Sonido" : "Silenciar"}
        >
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Timer Widget */}
        <div className="glass-card p-8 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 to-indigo-500"></div>
          <div className="flex items-center gap-2 mb-6 text-slate-500 font-bold uppercase tracking-widest text-sm">
            <Timer size={18} /> Temporizador
          </div>

          <div className="text-8xl font-black text-slate-800 font-mono tracking-tighter mb-8 tabular-nums">
            {formatTime(time)}
          </div>

          <div className="flex gap-4 mb-8">
            <button onClick={toggleTimer} className={`p-4 rounded-full shadow-lg transition-all transform active:scale-95 ${isActive ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-green-500 text-white hover:bg-green-600'}`}>
              {isActive ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
            </button>
            <button onClick={resetTimer} className="p-4 rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 shadow-lg transition-all active:scale-95">
              <RotateCcw size={32} />
            </button>
          </div>

          <div className="flex gap-2">
            {[1, 5, 10, 15, 20].map(m => (
              <button
                key={m}
                onClick={() => setCustomTime(m)}
                className="px-3 py-1 rounded-lg bg-slate-100 text-slate-600 font-bold text-sm hover:bg-indigo-100 hover:text-indigo-600 transition-colors"
              >
                {m}m
              </button>
            ))}
          </div>
        </div>

        {/* Random Picker */}
        <div className="glass-card p-6 rounded-2xl flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Dice5 size={24} /></div>
            <h3 className="text-xl font-bold text-slate-800">Sorteo de Participación</h3>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center py-8 bg-slate-50/50 rounded-xl border-2 border-dashed border-slate-200 mb-6 min-h-[200px] relative overflow-hidden">
            {selectedStudent ? (
              <div className={`text-center transition-all duration-300 z-10 ${isRolling ? 'scale-90 opacity-70 blur-sm' : 'scale-110 opacity-100'}`}>
                <div className="relative inline-block">
                  <img src={selectedStudent.avatar} alt="Winner" className="w-32 h-32 rounded-full mx-auto mb-4 border-4 border-purple-500 shadow-xl object-cover" />
                  {!isRolling && <div className="absolute -top-2 -right-2 bg-yellow-400 text-white p-2 rounded-full shadow-lg animate-bounce"><Trophy size={20} fill="currentColor" /></div>}
                </div>
                <h4 className="text-3xl font-black text-slate-800 tracking-tight">{selectedStudent.name}</h4>
                <p className="text-purple-600 font-bold mt-2 uppercase tracking-wide">{isRolling ? 'Mezclando...' : '¡Seleccionado!'}</p>
              </div>
            ) : (
              <div className="text-center text-slate-400">
                <Shuffle size={48} className="mx-auto mb-2 opacity-20" />
                <p>Presiona el botón para seleccionar a alguien</p>
              </div>
            )}
          </div>

          <button
            onClick={handleRandomPick}
            disabled={isRolling}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
          >
            <Shuffle size={20} />
            {isRolling ? 'Sorteando...' : 'Elegir Alumno al Azar'}
          </button>
        </div>

        {/* Team Generator */}
        <div className="glass-card p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><Bot size={24} /></div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">Formación de Equipos IA</h3>
                <p className="text-xs text-slate-500">Balanceado por rendimiento y conducta</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="text-sm font-bold text-slate-600">Equipos:</label>
              <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                <button onClick={() => setTeamCount(Math.max(2, teamCount - 1))} className="w-8 h-8 flex items-center justify-center bg-white rounded shadow-sm hover:text-indigo-600 font-bold">-</button>
                <span className="w-8 text-center font-bold text-slate-800">{teamCount}</span>
                <button onClick={() => setTeamCount(Math.min(10, teamCount + 1))} className="w-8 h-8 flex items-center justify-center bg-white rounded shadow-sm hover:text-indigo-600 font-bold">+</button>
              </div>
              <button
                onClick={handleCreateTeams}
                disabled={loadingTeams}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-md transition-all active:scale-95 disabled:opacity-70 flex items-center gap-2"
              >
                {loadingTeams ? <span className="animate-spin">Wait...</span> : <Users size={18} />}
                {loadingTeams ? 'Generando...' : 'Generar'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teams.length > 0 ? (
              teams.map((team, idx) => (
                <div key={idx} className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                  <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 font-bold text-slate-700 text-sm flex justify-between items-center">
                    {team.name}
                    <span className="bg-white px-2 py-0.5 rounded text-xs text-slate-500 border border-slate-200">{team.members.length}</span>
                  </div>
                  <div className="p-3 space-y-2">
                    {team.members.map((member, mIdx) => (
                      <div key={mIdx} className="flex items-center gap-2 text-sm text-slate-700">
                        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold">
                          {member.charAt(0)}
                        </div>
                        <span className="truncate">{member}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-12 bg-slate-50/50 rounded-xl border-2 border-dashed border-slate-200 text-slate-400">
                <Users size={48} className="mx-auto mb-3 opacity-20" />
                <p>Selecciona la cantidad de equipos y presiona Generar.</p>
              </div>
            )}
          </div>
        </div>

        {/* AI Activity Generator */}
        <div className="glass-card p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-pink-100 text-pink-600 rounded-lg"><Sparkles size={24} /></div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">Generador de Actividades</h3>
              <p className="text-xs text-slate-500">Crea dinámicas instantáneas con IA</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tema de la Clase</label>
                <input
                  type="text"
                  value={activityTopic}
                  onChange={e => setActivityTopic(e.target.value)}
                  placeholder="Ej. Fracciones, Revolución Mexicana..."
                  className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none bg-white/80"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
                <select
                  value={activityType}
                  onChange={e => setActivityType(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none bg-white/80"
                >
                  <option value="QUIZ">Quiz</option>
                  <option value="DEBATE">Debate</option>
                  <option value="ROLEPLAY">Roleplay</option>
                  <option value="GAME">Juego</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleGenerateActivity}
              disabled={isGeneratingActivity || !activityTopic}
              className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isGeneratingActivity ? <span className="animate-spin">✨</span> : <Sparkles size={18} />}
              {isGeneratingActivity ? 'Diseñando Actividad...' : 'Crear Actividad Mágica'}
            </button>

            {generatedActivity && (
              <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl animate-fadeIn">
                <div className="prose prose-sm prose-slate max-w-none whitespace-pre-line">
                  {generatedActivity}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* AI Activity Adaptation (BAP) */}
        <div className="glass-card p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-teal-100 text-teal-600 rounded-lg"><BookOpen size={24} /></div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">Adaptador Curricular (BAP)</h3>
              <p className="text-xs text-slate-500">Ajustes razonables para inclusión</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Actividad o Tema Original</label>
              <textarea
                value={adaptationTopic}
                onChange={e => setAdaptationTopic(e.target.value)}
                placeholder="Ej. Lectura de comprensión sobre el ciclo del agua..."
                className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none bg-white/80 h-20 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Barrera o Condición (BAP)</label>
              <select
                value={bapType}
                onChange={e => setBapType(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none bg-white/80"
              >
                <option value="TDAH">TDAH (Déficit de Atención)</option>
                <option value="DISLEXIA">Dislexia</option>
                <option value="DISCAPACIDAD_INTELECTUAL">Discapacidad Intelectual Leve</option>
                <option value="BAJA_VISION">Baja Visión</option>
                <option value="AUTISMO">TEA (Autismo)</option>
                <option value="MOTRIZ">Discapacidad Motriz</option>
              </select>
            </div>

            <button
              onClick={handleAdaptActivity}
              disabled={isAdapting || !adaptationTopic}
              className="w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isAdapting ? <span className="animate-spin">🔄</span> : <Wand2 size={18} />}
              {isAdapting ? 'Generando Ajustes...' : 'Adaptar Actividad'}
            </button>

            {adaptedActivity && (
              <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl animate-fadeIn">
                <div className="prose prose-sm prose-slate max-w-none whitespace-pre-line">
                  {adaptedActivity}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Exam Generator */}
        <div className="glass-card p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg"><FileQuestion size={24} /></div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">Generador de Exámenes</h3>
              <p className="text-xs text-slate-500">Evaluaciones instantáneas</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tema del Examen</label>
              <input
                type="text"
                value={examTopic}
                onChange={e => setExamTopic(e.target.value)}
                placeholder="Ej. Estados de la Materia"
                className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none bg-white/80"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Preguntas</label>
                <select
                  value={examCount}
                  onChange={e => setExamCount(Number(e.target.value))}
                  className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none bg-white/80"
                >
                  <option value={5}>5 Preguntas</option>
                  <option value={10}>10 Preguntas</option>
                  <option value={15}>15 Preguntas</option>
                  <option value={20}>20 Preguntas</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
                <select
                  value={examType}
                  onChange={e => setExamType(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none bg-white/80"
                >
                  <option value="Opción Múltiple">Opción Múltiple</option>
                  <option value="Abiertas">Abiertas</option>
                  <option value="Verdadero/Falso">Verdadero/Falso</option>
                  <option value="Mixto">Mixto</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleGenerateExam}
              disabled={isGeneratingExam || !examTopic}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isGeneratingExam ? <span className="animate-spin">🔄</span> : <FileQuestion size={18} />}
              {isGeneratingExam ? 'Generando...' : 'Generar Examen'}
            </button>

            {generatedExam && (
              <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl animate-fadeIn max-h-96 overflow-y-auto">
                <div className="prose prose-sm prose-slate max-w-none whitespace-pre-line">
                  {generatedExam}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div >
  );
};