import React, { useState, useRef, useEffect } from 'react'; // AI Feature Enabled
import { Student, Assignment, InteractiveQuestion, DraggableItem, InteractiveZone } from '../types';
import { api } from '../services/api';
import { CheckCircle, Circle, Plus, Trash2, Calendar, BarChart3, AlertCircle, X, Save, Trophy, TrendingUp, Sparkles, HelpCircle, Eye, EyeOff, Upload, FileText, Image as ImageIcon, Move, Play, BrainCircuit, Settings, Check } from 'lucide-react';

import { generateInteractiveQuiz, generateInteractiveQuizFromContext, generateWorksheetSVG, generateCompleteWorksheet, autoDetectWorksheetZones, generateNEMPlanning } from '../services/ai';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface ActivitiesViewProps {
  students: Student[];
  assignments: Assignment[];
  onToggleAssignment: (studentId: string, assignmentId: string, score?: number) => void;
  onAddAssignment: (assignment: Partial<Assignment>) => void; // UPDATED SIGNATURE
  onUpdateAssignment: (id: string, updatedData: Partial<Assignment>) => void;
  onDeleteAssignment: (id: string) => void;
  defaultTargetGroup?: string;
}

export const ActivitiesView: React.FC<ActivitiesViewProps> = ({
  students,
  assignments,
  onToggleAssignment,
  onAddAssignment,
  onUpdateAssignment,
  onDeleteAssignment,
  defaultTargetGroup = '4 A'
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [isVisibleInParentsPortal, setIsVisibleInParentsPortal] = useState(true);
  const [targetGroup, setTargetGroup] = useState(defaultTargetGroup); // Default group

  // Interactive Quiz State
  const [activityType, setActivityType] = useState<'TASK' | 'QUIZ' | 'WORKSHEET' | 'PLANNING'>('TASK');
  const [isGenerating, setIsGenerating] = useState(false);
  const [questions, setQuestions] = useState<InteractiveQuestion[]>([]);
  // NEM Plan State
  const [nemPlanResult, setNemPlanResult] = useState('');
  const [aiContextText, setAiContextText] = useState('');
  const [curQuestion, setCurQuestion] = useState('');
  const [curOptions, setCurOptions] = useState(['', '', '']);
  const [curCorrect, setCurCorrect] = useState(0);

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [worksheetImage, setWorksheetImage] = useState('');
  const [gradingCriteria, setGradingCriteria] = useState('');
  const [answerKeyPoints, setAnswerKeyPoints] = useState<{ x: number, y: number }[]>([]);
  const [isMarkingMode, setIsMarkingMode] = useState(false);

  // Draggable Items State
  const [draggableItems, setDraggableItems] = useState<DraggableItem[]>([]);
  const [newDraggableText, setNewDraggableText] = useState('');

  // New AI Worksheet State
  const [aiWorksheetType, setAiWorksheetType] = useState<string>('');
  const [aiWorksheetTopic, setAiWorksheetTopic] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [imageError, setImageError] = useState(false);

  // -- LIVEWORKSHEETS EDITOR STATE --
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [interactiveZones, setInteractiveZones] = useState<InteractiveZone[]>([]);
  const [editorTool, setEditorTool] = useState<'SELECT' | 'DRAW'>('SELECT');
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [currentRect, setCurrentRect] = useState<Partial<InteractiveZone> | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  // GRADING MODAL STATE
  const [gradingAssignment, setGradingAssignment] = useState<Assignment | null>(null);
  const [gradingStudentId, setGradingStudentId] = useState<string | null>(null);
  const [gradingScores, setGradingScores] = useState<Record<string, number>>({});

  const handleOpenGrading = async (assignment: Assignment, studentId: string) => {
    let fullAssignment = assignment;

    // Lazy load full data if missing or stripped (Optimized Load Support)
    const isStripped = assignment.interactiveData && (assignment.interactiveData as any).hasContent && !assignment.interactiveData.questions;

    if (isStripped) {
      try {
        const data = await api.getAssignmentById(assignment.id);
        if (data && data.interactiveData) {
          fullAssignment = { ...assignment, interactiveData: data.interactiveData };
        }
      } catch (e) {
        console.error("Failed to load assignment detail for grading", e);
      }
    }

    setGradingAssignment(fullAssignment);
    setGradingStudentId(studentId);
    setGradingScores({});
  };

  const handleSaveGrading = () => {
    if (gradingAssignment && gradingStudentId) {
      const student = students.find(s => s.id === gradingStudentId);
      if (student) {
        // Calculate Score
        const total = gradingAssignment.interactiveData?.type === 'QUIZ' ? gradingAssignment.interactiveData.questions.length : 1;
        const correct = Object.values(gradingScores).filter(v => v === 1).length;
        const score = Math.round((correct / total) * 10);

        const newCompleted = [...new Set([...(student.completedAssignmentIds || []), gradingAssignment.id])];
        const newResults = { ...(student.assignmentResults || {}), [gradingAssignment.id]: score };

        // We use a local update first if onToggleAssignment doesn't support scores (it usually just toggles)
        // Ideally we'd have onUpdateStudent but we'll try to use onToggleAssignment and then a manual save if needed
        // For now, let's assume onToggleAssignment only handles the ID.
        onToggleAssignment(gradingStudentId, gradingAssignment.id, score);

        // Notify through state or API
        setGradingAssignment(null);
        setGradingStudentId(null);
      }
    }
  };

  const getRelativeCoords = (e: React.MouseEvent) => {
    if (!imageRef.current || !containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    // Use the relative container rect which now wraps the image exactly
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (editorTool === 'DRAW' && imageRef.current) {
      setIsDrawing(true);
      const { x, y } = getRelativeCoords(e);
      setDrawStart({ x, y });
      setCurrentRect({ x, y, width: 0, height: 0 });
      setSelectedZoneId(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDrawing && currentRect) {
      const { x, y } = getRelativeCoords(e);
      const width = Math.abs(x - drawStart.x);
      const height = Math.abs(y - drawStart.y);
      const newX = Math.min(x, drawStart.x);
      const newY = Math.min(y, drawStart.y);
      setCurrentRect({ x: newX, y: newY, width, height });
    }
  };

  const handleMouseUp = () => {
    if (isDrawing && currentRect && (currentRect.width || 0) > 2) {
      const newZone: InteractiveZone = {
        id: Date.now().toString(),
        type: 'TEXT_INPUT', // Default
        x: currentRect.x || 0,
        y: currentRect.y || 0,
        width: currentRect.width || 10,
        height: currentRect.height || 5,
        points: 1,
        correctAnswer: ''
      };
      setInteractiveZones([...interactiveZones, newZone]);
      setSelectedZoneId(newZone.id);
      setEditorTool('SELECT'); // Auto switch back to select to configure
    }
    setIsDrawing(false);
    setCurrentRect(null);
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTitle.trim()) {
      const newAssignment: Partial<Assignment> = {
        title: newTitle,
        dueDate: newDate,
        type: activityType === 'TASK' ? 'TASK' : 'INTERACTIVE',
        isVisibleInParentsPortal: isVisibleInParentsPortal,
        targetGroup: targetGroup.trim().toUpperCase() || 'GLOBAL'
      };

      if (activityType === 'QUIZ') {
        if (questions.length === 0) {
          alert("Debes agregar al menos una pregunta para crear un Cuestionario Interactivo.");
          return;
        }
        newAssignment.interactiveData = {
          type: 'QUIZ',
          questions: questions,
          videoUrl: videoUrl.trim() || undefined
        };
      } else if (activityType === 'WORKSHEET') {
        if (!worksheetImage) {
          alert("Debes subir una imagen o PDF para la ficha.");
          return;
        }
        newAssignment.interactiveData = {
          type: 'WORKSHEET',
          imageUrl: worksheetImage,
          gradingCriteria: gradingCriteria.trim(),
          interactiveZones: interactiveZones,
          draggableItems: draggableItems.length > 0 ? draggableItems : undefined,
          videoUrl: videoUrl.trim() || undefined
        };
      } else if (activityType === 'PLANNING') {
        // NEM AGENT LOGIC
        if (questions.length > 0) {
          // If a quiz was generated, save as INTERACTIVE QUIZ but for TEACHER EVALUATION
          newAssignment.type = 'INTERACTIVE';
          newAssignment.assignmentType = 'NEM_EVALUATION'; // Mark as special teacher tool
          newAssignment.isVisibleInParentsPortal = false; // Hidden from parents/students by default
          newAssignment.interactiveData = {
            type: 'QUIZ',
            questions: questions,
            videoUrl: videoUrl.trim() || undefined,
            forTeacherOnly: true // Flag to ensure it's not taken by student
          };
        } else {
          // Otherwise save as standard TASK
          newAssignment.type = 'TASK';
        }
        newAssignment.description = nemPlanResult; // Save the plan as description in both cases
      }

      onAddAssignment(newAssignment);

      // Reset
      setNewTitle('');
      setIsAdding(false);
      setActivityType('TASK');
      setIsVisibleInParentsPortal(true);
      setQuestions([]);
      setVideoUrl('');
      setAiWorksheetTopic('');
      setAiWorksheetType('');
      setImageError(false);
      setInteractiveZones([]);
      setEditorTool('SELECT');
    }
  };

  const addQuestion = () => {
    if (!curQuestion.trim() || curOptions.some(o => !o.trim())) return;
    setQuestions([...questions, {
      id: Date.now().toString(),
      text: curQuestion,
      options: [...curOptions],
      correctIndex: curCorrect,
      points: 10
    }]);
    setCurQuestion('');
    setCurOptions(['', '', '']);
    setCurCorrect(0);
  };

  return (
    <div className="space-y-6 animate-fadeIn h-[calc(100vh-120px)] flex flex-col">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 flex-shrink-0">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-500 bg-clip-text text-transparent flex items-center gap-2 md:gap-3">
            <CheckCircle className="text-indigo-600" size={28} />
            Actividades
          </h2>
          <p className="text-slate-500 mt-1 font-medium text-sm md:text-base">Gestiona y califica las tareas del grupo</p>
        </div>
        <button
          onClick={() => { setIsAdding(true); setIsVisibleInParentsPortal(true); }}
          className="w-full md:w-auto bg-indigo-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 active:scale-95 group"
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform" />
          Nueva Actividad
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-shrink-0">
        <div className="glass-card p-5 rounded-2xl flex items-center gap-4 hover:scale-[1.02] transition-transform cursor-default border border-white/50">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
            <Trophy size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800">{assignments.length}</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Tareas</div>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl flex items-center gap-4 hover:scale-[1.02] transition-transform cursor-default border border-white/50">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
            <TrendingUp size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800">
              {assignments.length > 0
                ? Math.round(
                  assignments.reduce((acc, a) => {
                    const completedCount = students.filter(s => s.completedAssignmentIds?.includes(a.id)).length;
                    return acc + (completedCount / students.length);
                  }, 0) / assignments.length * 100
                )
                : 0}%
            </div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cumplimiento</div>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl flex items-center gap-4 hover:scale-[1.02] transition-transform cursor-default border border-white/50">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
            <FileText size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800">
              {assignments.filter(a => a.type !== 'TASK').length}
            </div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Activas</div>
          </div>
        </div>
      </div>

      {/* Add Assignment Modal - Rich Aesthetics Redesign */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-slideUp">

            {/* Modal Header */}
            <div className="bg-slate-50/50 px-8 py-6 border-b border-slate-100 flex justify-between items-center backdrop-blur-sm sticky top-0 z-10">
              <div>
                <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <Sparkles className="text-indigo-500" size={24} />
                  Crear Nueva Actividad
                </h3>
                <p className="text-slate-500 text-sm">Selecciona el tipo de actividad y configura sus detalles</p>
              </div>
              <button
                onClick={() => setIsAdding(false)}
                className="w-10 h-10 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-all"
                aria-label="Cerrar modal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8 bg-white">
              <form id="activityForm" onSubmit={handleSubmit} className="space-y-8">

                {/* 1. Activity Type Selection - Big Cards */}
                <section>
                  <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">1. Tipo de Actividad</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <button
                      type="button"
                      onClick={() => setActivityType('PLANNING')}
                      className={`relative p-6 rounded-2xl border-2 text-left transition-all group overflow-hidden ${activityType === 'PLANNING'
                        ? 'border-emerald-500 bg-emerald-50 shadow-md transform scale-[1.02]'
                        : 'border-slate-100 bg-white hover:border-emerald-200 hover:shadow-sm'
                        }`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${activityType === 'PLANNING' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-600'}`}>
                        <Sparkles size={24} />
                      </div>
                      <h4 className={`font-bold text-lg mb-1 ${activityType === 'PLANNING' ? 'text-emerald-900' : 'text-slate-700'}`}>Agente NEM</h4>
                      <p className="text-xs text-slate-500 leading-snug">Generador de Planeaciones, Proyectos y Adecuaciones (IA).</p>
                      {activityType === 'PLANNING' && <div className="absolute top-4 right-4 text-emerald-500"><CheckCircle size={20} fill="currentColor" className="text-white" /></div>}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivityType('TASK')}
                      className={`relative p-6 rounded-2xl border-2 text-left transition-all group overflow-hidden ${activityType === 'TASK'
                        ? 'border-indigo-600 bg-indigo-50 shadow-md transform scale-[1.02]'
                        : 'border-slate-100 bg-white hover:border-indigo-200 hover:shadow-sm'
                        }`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${activityType === 'TASK' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600'}`}>
                        <CheckCircle size={24} />
                      </div>
                      <h4 className={`font-bold text-lg mb-1 ${activityType === 'TASK' ? 'text-indigo-900' : 'text-slate-700'}`}>Tarea Simple</h4>
                      <p className="text-sm text-slate-500 leading-snug">Tarea estándar para marcar completado (ej. libro, maqueta).</p>
                      {activityType === 'TASK' && <div className="absolute top-4 right-4 text-indigo-600"><CheckCircle size={20} fill="currentColor" className="text-white" /></div>}
                    </button>

                    <button
                      type="button"
                      onClick={() => setActivityType('WORKSHEET')}
                      className={`relative p-6 rounded-2xl border-2 text-left transition-all group overflow-hidden ${activityType === 'WORKSHEET'
                        ? 'border-pink-500 bg-pink-50 shadow-md transform scale-[1.02]'
                        : 'border-slate-100 bg-white hover:border-pink-200 hover:shadow-sm'
                        }`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${activityType === 'WORKSHEET' ? 'bg-pink-500 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-pink-100 group-hover:text-pink-500'}`}>
                        <FileText size={24} />
                      </div>
                      <h4 className={`font-bold text-lg mb-1 ${activityType === 'WORKSHEET' ? 'text-pink-900' : 'text-slate-700'}`}>Ficha Interactiva</h4>
                      <p className="text-sm text-slate-500 leading-snug">Sube una imagen o PDF y añade zonas para escribir o arrastrar.</p>
                      {activityType === 'WORKSHEET' && <div className="absolute top-4 right-4 text-pink-500"><CheckCircle size={20} fill="currentColor" className="text-white" /></div>}
                    </button>

                    <button
                      type="button"
                      onClick={() => setActivityType('QUIZ')}
                      className={`relative p-6 rounded-2xl border-2 text-left transition-all group overflow-hidden ${activityType === 'QUIZ'
                        ? 'border-purple-500 bg-purple-50 shadow-md transform scale-[1.02]'
                        : 'border-slate-100 bg-white hover:border-purple-200 hover:shadow-sm'
                        }`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${activityType === 'QUIZ' ? 'bg-purple-500 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-purple-100 group-hover:text-purple-500'}`}>
                        <BrainCircuit size={24} />
                      </div>
                      <h4 className={`font-bold text-lg mb-1 ${activityType === 'QUIZ' ? 'text-purple-900' : 'text-slate-700'}`}>Cuestionario IA</h4>
                      <p className="text-sm text-slate-500 leading-snug">Exámen de opción múltiple autocalificable generado por IA.</p>
                      {activityType === 'QUIZ' && <div className="absolute top-4 right-4 text-purple-500"><CheckCircle size={20} fill="currentColor" className="text-white" /></div>}
                    </button>
                  </div>
                </section>

                {/* 2. Basic Information */}
                <section className="animate-fadeIn">
                  <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">2. Configuración General</label>
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Título de la Actividad</label>
                      <input
                        type="text"
                        placeholder={activityType === 'TASK' ? "Ej. Maqueta del Sistema Solar" : activityType === 'QUIZ' ? "Ej. Quiz de Historia" : "Ej. Ficha de Sumas"}
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Fecha de Entrega</label>
                      <input
                        type="date"
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-600 font-medium"
                        required
                        aria-label="Fecha de entrega"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Grupo Asignado</label>
                      <input
                        type="text"
                        value={targetGroup}
                        onChange={(e) => setTargetGroup(e.target.value)}
                        placeholder="Ej. 4 A, 3 B..."
                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-600 font-medium uppercase"
                      />
                    </div>


                    {/* Toggle Visibility */}
                    <div className="md:col-span-2 flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setIsVisibleInParentsPortal(!isVisibleInParentsPortal)}>
                      <div className={`w-12 h-7 flex items-center rounded-full p-1 transition-colors duration-300 ${isVisibleInParentsPortal ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                        <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${isVisibleInParentsPortal ? 'translate-x-5' : ''}`}></div>
                      </div>
                      <div>
                        <div className="font-bold text-slate-700 text-sm">Visible inmediatamente en la App de Padres</div>
                        <div className="text-xs text-slate-400">Si desactivas esto, podrás publicarla después.</div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* 3. Specific Configuration */}
                {activityType !== 'TASK' && (
                  <section className="animate-slideUp">
                    <label className="block text-sm font-bold text-indigo-400 uppercase tracking-wider mb-4">
                      3. Editor de Contenido - {
                        activityType === 'WORKSHEET' ? 'Ficha Interactiva' :
                          activityType === 'QUIZ' ? 'Cuestionario' :
                            'Planeación Didáctica NEM'
                      }
                    </label>

                    {/* PLANNING AGENT UI */}
                    {activityType === 'PLANNING' && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-6">
                          <div className="bg-gradient-to-br from-emerald-50 to-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
                            <h4 className="font-bold text-emerald-800 flex items-center gap-2 mb-4">
                              <Sparkles size={20} />
                              Contexto del Proyecto / Libro
                            </h4>

                            <div className="mb-4">
                              <label className="block text-xs font-bold text-emerald-600 uppercase mb-2">Opción A: Subir PDF / Imagen (Libro de Texto)</label>
                              <div className="bg-white border-2 border-dashed border-emerald-200 rounded-xl p-6 text-center cursor-pointer hover:bg-emerald-50 hover:border-emerald-400 transition-colors relative">
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept=".pdf,image/*" title="Subir página del libro o PDF" onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setIsProcessingFile(true);
                                    try {
                                      if (file.type === 'application/pdf') {
                                        const arrayBuffer = await file.arrayBuffer();
                                        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                                        const page = await pdf.getPage(1);

                                        // Extract Text
                                        const textContent = await page.getTextContent();
                                        const strings = textContent.items.map((item: any) => item.str).join(' ');
                                        setAiContextText(prev => prev + (prev ? '\n\n' : '') + strings);

                                        // Render Image Context
                                        const viewport = page.getViewport({ scale: 1.5 });
                                        const canvas = document.createElement('canvas');
                                        const context = canvas.getContext('2d');
                                        canvas.height = viewport.height;
                                        canvas.width = viewport.width;
                                        if (context) {
                                          await page.render({ canvasContext: context, viewport } as any).promise;
                                          setWorksheetImage(canvas.toDataURL('image/jpeg'));
                                        }
                                      } else {
                                        const reader = new FileReader();
                                        reader.onload = (re) => setWorksheetImage(re.target?.result as string);
                                        reader.readAsDataURL(file);
                                      }
                                    } catch (err) { alert("Error al procesar archivo"); } finally { setIsProcessingFile(false); }
                                  }
                                }} />
                                <Upload className="mx-auto text-emerald-400 mb-2" />
                                <p className="text-sm font-medium text-emerald-700">Subir página del libro o PDF</p>
                                <p className="text-xs text-emerald-500">Analizaremos el texto e imagen.</p>
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-emerald-600 uppercase mb-2">Opción B: Pegar Texto / Tema</label>
                              <textarea
                                className="w-full h-40 p-4 rounded-xl border border-emerald-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white"
                                placeholder="Pega aquí el texto del proyecto, el índice o describe el tema (Ej. 'Proyecto Aula: Composta escolar')..."
                                value={aiContextText}
                                onChange={e => setAiContextText(e.target.value)}
                              ></textarea>
                            </div>

                            <button
                              type="button"
                              onClick={async () => {
                                if (!aiContextText && !worksheetImage) {
                                  alert("Por favor proporciona texto o una imagen del libro.");
                                  return;
                                }
                                setIsGenerating(true);
                                try {
                                  // Send text + image if available
                                  const images = worksheetImage ? [worksheetImage] : [];
                                  const plan = await generateNEMPlanning(aiContextText, images);
                                  setNemPlanResult(plan);
                                  if (!newTitle) setNewTitle("Planeación NEM: " + (aiContextText.slice(0, 20) || 'Nuevo Proyecto'));
                                } catch (e: any) {
                                  alert(e.message);
                                } finally {
                                  setIsGenerating(false);
                                }
                              }}
                              disabled={isGenerating}
                              className="w-full py-4 mt-4 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              {isGenerating ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <Sparkles size={20} />}
                              {isGenerating ? 'Analizando Contenido...' : 'Generar Planeación Didáctica'}
                            </button>
                          </div>
                        </div>

                        {/* RESULT COLUMN */}
                        <div className="flex flex-col h-[600px]">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-bold text-slate-700 text-sm uppercase">Resultado del Agente</h4>
                            {nemPlanResult && (
                              <button
                                type="button"
                                onClick={() => { navigator.clipboard.writeText(nemPlanResult); alert("Copiado al portapapeles"); }}
                                className="text-xs font-bold text-indigo-600 hover:underline"
                              >
                                Copiar Texto
                              </button>
                            )}
                          </div>
                          <div className="flex-1 bg-slate-50 rounded-xl border border-slate-200 p-6 overflow-y-auto custom-scrollbar prose prose-sm max-w-none">
                            {nemPlanResult ? (
                              <div className="whitespace-pre-wrap font-medium text-slate-700">
                                {nemPlanResult}
                              </div>
                            ) : (
                              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-8">
                                <Sparkles size={48} className="mb-4 text-emerald-200" />
                                <p className="font-medium">El Agente Docente NEM está listo.</p>
                                <p className="text-sm mt-2">Sube una página del libro o escribe el tema para generar tu planeación y actividades.</p>
                              </div>
                            )}
                          </div>

                          {/* AUTOMATED EVALUATION RESOURCE GENERATOR */}
                          {nemPlanResult && (
                            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 animate-fadeIn shrink-0 mt-4">
                              <div className="flex justify-between items-center gap-4">
                                <div className="flex-1">
                                  <h5 className="font-bold text-purple-900 text-sm flex items-center gap-2">
                                    <BrainCircuit size={18} className="text-purple-600" />
                                    Recurso de Evaluación
                                  </h5>
                                  <p className="text-xs text-purple-700 mt-1 leading-snug">
                                    {questions.length > 0
                                      ? `¡Listo! Recurso de evaluación docente generado (${questions.length} items).`
                                      : "Genera una herramienta para que TÚ evalúes el desempeño del alumno."}
                                  </p>
                                </div>

                                {questions.length === 0 ? (
                                  <button
                                    type="button"
                                    disabled={isGenerating}
                                    onClick={async () => {
                                      setIsGenerating(true);
                                      try {
                                        // Generate quiz questions based on the plan
                                        const quizJsonCtx = await generateInteractiveQuizFromContext(nemPlanResult, [], 5);
                                        let cleanJson = quizJsonCtx.replace(/`|json/g, '').trim();
                                        const parsed = JSON.parse(cleanJson.substring(cleanJson.indexOf('['), cleanJson.lastIndexOf(']') + 1));
                                        const newQs = parsed.map((q: any) => ({ id: Math.random().toString(), text: q.text || q.question, options: q.options, correctIndex: q.correctIndex || 0, points: 10 }));
                                        setQuestions(newQs);
                                        alert("¡Herramienta de Evaluación generada! Se guardará como recurso privado (no visible al alumno).");
                                      } catch (e: any) {
                                        alert("Error al generar evaluación: " + e.message);
                                      } finally { setIsGenerating(false); }
                                    }}
                                    className="px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-lg shadow-md hover:bg-purple-700 transition-colors whitespace-nowrap"
                                  >
                                    {isGenerating ? 'Generando...' : 'Generar Herramienta Evaluación'}
                                  </button>
                                ) : (
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => { setQuestions([]); }}
                                      className="p-2 text-red-400 hover:bg-red-50 rounded"
                                      title="Borrar Evaluación"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                    <div className="px-3 py-1 bg-white rounded border border-purple-200 text-xs font-bold text-purple-700 flex items-center">
                                      <Check size={14} className="mr-1" /> Incluido
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Questions Preview */}
                              {questions.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-purple-100 max-h-32 overflow-y-auto custom-scrollbar space-y-1">
                                  {questions.map((q, i) => (
                                    <div key={i} className="text-[10px] text-purple-800 bg-white p-1.5 rounded border border-purple-100 truncate">
                                      <span className="font-bold mr-1">{i + 1}.</span> {q.text}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* WORKSHEET EDITOR UI */}
                    {activityType === 'WORKSHEET' && (
                      <div className="space-y-6">
                        {/* A. Source Selection */}
                        {!worksheetImage ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* AI Generate */}
                            <div className="bg-gradient-to-br from-pink-50 to-white p-6 rounded-2xl border-2 border-pink-100 hover:border-pink-300 transition-all shadow-sm group">
                              <div className="flex items-center gap-2 mb-3 text-pink-600">
                                <Sparkles size={24} />
                                <h4 className="font-bold text-lg">Generar con IA</h4>
                              </div>
                              <p className="text-xs text-slate-500 mb-4 h-10">Crea sopas de letras, crucigramas o ejercicios de unir correspondencias automáticamente.</p>
                              <div className="space-y-3">
                                <input
                                  placeholder="Tema (Ej. Animales Marinos)"
                                  className="w-full p-2.5 bg-white border border-pink-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-pink-400"
                                  value={aiWorksheetTopic} onChange={e => setAiWorksheetTopic(e.target.value)}
                                />
                                <input
                                  placeholder="Tipo (Ej. Sopa de Letras)"
                                  className="w-full p-2.5 bg-white border border-pink-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-pink-400"
                                  value={aiWorksheetType} onChange={e => setAiWorksheetType(e.target.value)}
                                />
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!aiWorksheetType || !aiWorksheetTopic) return;
                                    setIsGenerating(true);
                                    try {
                                      const data = await generateCompleteWorksheet(aiWorksheetTopic, aiWorksheetType);
                                      setWorksheetImage(`data:image/svg+xml;utf8,${encodeURIComponent(data.svg)}`);
                                      setInteractiveZones(data.zones);
                                      if (data.draggables.length > 0) setDraggableItems(data.draggables);
                                      if (!newTitle) setNewTitle(`Ficha: ${aiWorksheetTopic}`);
                                      alert("¡Ficha generada automáticamente con zonas interactivas!");
                                    } catch (e: any) { alert("Error: " + e.message); } finally { setIsGenerating(false); }
                                  }}
                                  disabled={isGenerating || !aiWorksheetTopic}
                                  className="w-full py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-lg font-bold text-sm shadow-md transition-all disabled:opacity-50"
                                >
                                  {isGenerating ? 'Generando...' : '✨ Generación Inteligente (Tipo Canva)'}
                                </button>
                              </div>
                            </div>

                            {/* File Upload */}
                            <div className="bg-white p-6 rounded-2xl border-2 border-slate-100 hover:border-indigo-300 transition-all shadow-sm flex flex-col items-center justify-center text-center group cursor-pointer relative">
                              <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept=".pdf,image/*" title="Subir PDF o Imagen" onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setIsProcessingFile(true);
                                  try {
                                    if (file.type === 'application/pdf') {
                                      // PDF handling minimal simplified
                                      const arrayBuffer = await file.arrayBuffer();
                                      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                                      const page = await pdf.getPage(1);
                                      const viewport = page.getViewport({ scale: 1.5 });
                                      const canvas = document.createElement('canvas');
                                      const context = canvas.getContext('2d');
                                      canvas.height = viewport.height;
                                      canvas.width = viewport.width;
                                      if (context) {
                                        await page.render({ canvasContext: context, viewport } as any).promise;
                                        setWorksheetImage(canvas.toDataURL('image/jpeg'));
                                      }

                                      // Extract Text for AI Context if standard worksheet also wants it
                                      try {
                                        const textContent = await page.getTextContent();
                                        const strings = textContent.items.map((item: any) => item.str).join(' ');
                                        if (!aiWorksheetTopic) setAiWorksheetTopic(strings.slice(0, 100)); // Just a hint
                                      } catch (e) { }

                                    } else {
                                      const reader = new FileReader();
                                      reader.onload = (re) => setWorksheetImage(re.target?.result as string);
                                      reader.readAsDataURL(file);
                                    }
                                  } catch (err) { alert("Error al archivo"); } finally { setIsProcessingFile(false); }
                                }
                              }} />
                              <div className="w-14 h-14 bg-indigo-50 text-indigo-400 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <Upload size={28} />
                              </div>
                              <h4 className="font-bold text-slate-700">Subir PDF o Imagen</h4>
                              <p className="text-xs text-slate-400 mt-1">Arrastra o haz clic para subir</p>
                            </div>
                          </div>
                        ) : (
                          /* B. Editor Interface */
                          <div className="flex flex-col lg:flex-row gap-6 h-[85vh]">
                            {/* Toolbar & Canvas */}
                            <div className="flex-1 flex flex-col gap-2">
                              <div className="bg-slate-800 text-white p-2 rounded-xl flex items-center gap-2 shadow-lg">
                                <div className="flex items-center gap-1 bg-slate-700/50 p-1 rounded-lg">
                                  <button type="button" onClick={() => setEditorTool('SELECT')} className={`p-2 rounded ${editorTool === 'SELECT' ? 'bg-indigo-500' : 'hover:bg-white/10'}`} title="Mover / Seleccionar" aria-label="Herramienta Seleccionar"><Move size={18} /></button>
                                  <button type="button" onClick={() => setEditorTool('DRAW')} className={`p-2 rounded ${editorTool === 'DRAW' ? 'bg-indigo-500 text-white' : 'hover:bg-white/10 text-emerald-400'}`} title="Dibujar Zona" aria-label="Herramienta Dibujar"><Plus size={18} /></button>
                                </div>
                                <div className="px-3 text-xs text-slate-400 border-l border-white/20">
                                  {interactiveZones.length} zonas activas
                                </div>
                                <button type="button" onClick={() => setWorksheetImage('')} className="ml-auto text-xs text-red-300 hover:text-red-100 px-3 py-1.5 hover:bg-red-500/20 rounded">Cambiar Imagen</button>
                              </div>

                              <div className="flex-1 overflow-auto bg-slate-200 rounded-xl border-2 border-slate-300 custom-scrollbar">
                                <div
                                  ref={containerRef}
                                  className={`relative select-none ${editorTool === 'DRAW' ? 'cursor-crosshair' : 'cursor-default'}`}
                                  style={{ width: '100%', height: 'auto' }}
                                  onMouseDown={handleMouseDown}
                                  onMouseMove={handleMouseMove}
                                  onMouseUp={handleMouseUp}
                                  onMouseLeave={handleMouseUp}
                                >
                                  <img ref={imageRef} src={worksheetImage} className="w-full h-auto pointer-events-none" alt="Ficha" />

                                  {/* SVG connection layer for MATCH types */}
                                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" style={{ overflow: 'visible' }}>
                                    {interactiveZones
                                      .filter(z => z.type === 'MATCH_SOURCE' && z.matchId)
                                      .map(source => {
                                        const targets = interactiveZones.filter(z => z.type === 'MATCH_TARGET' && z.matchId === source.matchId);
                                        return targets.map(target => (
                                          <line
                                            key={`${source.id}-${target.id}`}
                                            x1={`${source.x + source.width / 2}%`}
                                            y1={`${source.y + source.height / 2}%`}
                                            x2={`${target.x + target.width / 2}%`}
                                            y2={`${target.y + target.height / 2}%`}
                                            stroke="#10b981"
                                            strokeWidth="3"
                                            strokeDasharray="5,5"
                                            className="animate-pulse"
                                          />
                                        ));
                                      })}
                                  </svg>

                                  {/* Existing Zones */}
                                  {interactiveZones.map(zone => (
                                    // eslint-disable-next-line
                                    <div
                                      key={zone.id}
                                      onClick={(e) => { e.stopPropagation(); setSelectedZoneId(zone.id); setEditorTool('SELECT'); }}
                                      style={{ left: `${zone.x}%`, top: `${zone.y}%`, width: `${zone.width}%`, height: `${zone.height}%` }}
                                      className={`absolute border-2 rounded flex items-center justify-center text-xs font-bold transition-all
                                               ${selectedZoneId === zone.id ? 'border-yellow-400 bg-yellow-400/20 z-20 ring-2 ring-yellow-200' :
                                          zone.type === 'DROP_ZONE' ? 'border-pink-500 border-dashed bg-pink-50/20' :
                                            zone.type === 'SELECTABLE' ? 'border-purple-500 bg-purple-50/20' :
                                              zone.type.startsWith('MATCH') ? 'border-emerald-500 bg-emerald-50/20' :
                                                'border-blue-500 bg-blue-50/20'}
                                            `}
                                    >
                                      {zone.type === 'DROP_ZONE' ? <Move size={12} className="text-pink-600" /> :
                                        zone.type === 'SELECTABLE' ? <CheckCircle size={12} className="text-purple-600" /> :
                                          zone.type.startsWith('MATCH') ? <div className="flex flex-col items-center"><TrendingUp size={12} className="text-emerald-600" /><span className="text-[8px] bg-white px-1 rounded shadow text-emerald-800">{zone.matchId || '?'}</span></div> :
                                            <span className="text-blue-700">Abc</span>}
                                    </div>
                                  ))}

                                  {/* Drawing Rect */}
                                  {isDrawing && currentRect && (
                                    // eslint-disable-next-line
                                    <div
                                      style={{ left: `${currentRect.x}%`, top: `${currentRect.y}%`, width: `${currentRect.width}%`, height: `${currentRect.height}%` }}
                                      className="absolute border-2 border-emerald-400 bg-emerald-400/20" />
                                  )}
                                </div>
                              </div>
                              <p className="text-[10px] text-slate-400 text-center"><span className="font-bold">Tip:</span> Dibuja recuadros sobre los espacios en blanco de la ficha.</p>
                            </div>

                            {/* Sidebar Config */}
                            <div className="w-full lg:w-80 flex flex-col gap-4 h-full overflow-hidden">
                              {/* GLOBAL AUTO-DETECT ACTION (Canva Style) */}
                              <button
                                type="button"
                                disabled={isGenerating}
                                onClick={async () => {
                                  if (!worksheetImage) return;
                                  setIsGenerating(true);
                                  try {
                                    const data = await autoDetectWorksheetZones(worksheetImage, newTitle);
                                    if (data.zones && data.zones.length > 0) {
                                      setInteractiveZones(data.zones);
                                      if (data.draggables && data.draggables.length > 0) {
                                        setDraggableItems(data.draggables);
                                      }
                                      alert(`¡Éxito! Se detectaron ${data.zones.length} zonas y ${data.draggables.length} etiquetas.`);
                                    } else {
                                      alert("No se detectaron zonas automáticas. Intenta dibujar una manualmente.");
                                    }
                                  } catch (e: any) {
                                    alert("Error en detección: " + e.message);
                                  } finally { setIsGenerating(false); }
                                }}
                                className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                              >
                                {isGenerating ? <HelpCircle className="animate-spin" size={18} /> : <Sparkles size={18} />}
                                {isGenerating ? "Escaneando elementos..." : "Magia IA: Auto-detectar ✨"}
                              </button>

                              {selectedZoneId ? (
                                <div className="bg-white border-2 border-yellow-400/50 p-4 rounded-xl shadow-lg flex flex-col gap-3 animate-fadeIn">
                                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                                    <h5 className="font-bold text-slate-800">Editar Zona</h5>
                                    <button type="button" onClick={() => { setInteractiveZones(interactiveZones.filter(z => z.id !== selectedZoneId)); setSelectedZoneId(null); }} className="text-red-400 hover:text-red-500" aria-label="Eliminar zona"><Trash2 size={16} /></button>
                                  </div>

                                  <div>
                                    <label className="text-xs font-bold text-slate-500 block mb-1">Tipo de Interacción</label>
                                    <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-lg mb-2">
                                      <button type="button" onClick={() => setInteractiveZones(interactiveZones.map(z => z.id === selectedZoneId ? { ...z, type: 'TEXT_INPUT' } : z))} className={`py-1.5 text-[10px] font-bold rounded ${interactiveZones.find(z => z.id === selectedZoneId)?.type === 'TEXT_INPUT' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Escribir</button>
                                      <button type="button" onClick={() => setInteractiveZones(interactiveZones.map(z => z.id === selectedZoneId ? { ...z, type: 'DROP_ZONE' } : z))} className={`py-1.5 text-[10px] font-bold rounded ${interactiveZones.find(z => z.id === selectedZoneId)?.type === 'DROP_ZONE' ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-400'}`}>Arrastrar</button>
                                      <button type="button" onClick={() => setInteractiveZones(interactiveZones.map(z => z.id === selectedZoneId ? { ...z, type: 'SELECTABLE' } : z))} className={`py-1.5 text-[10px] font-bold rounded ${interactiveZones.find(z => z.id === selectedZoneId)?.type === 'SELECTABLE' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-400'}`}>Selección</button>
                                      <button type="button" onClick={() => setInteractiveZones(interactiveZones.map(z => z.id === selectedZoneId ? { ...z, type: 'MATCH_SOURCE', matchId: 'A' } : z))} className={`py-1.5 text-[10px] font-bold rounded ${interactiveZones.find(z => z.id === selectedZoneId)?.type?.startsWith('MATCH') ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Unir</button>
                                    </div>
                                  </div>

                                  {/* DYNAMIC CONFIG FIELDS */}
                                  {interactiveZones.find(z => z.id === selectedZoneId)?.type === 'TEXT_INPUT' && (
                                    <div>
                                      <label className="text-xs font-bold text-slate-500 block mb-1">Respuesta Correcta</label>
                                      <input
                                        value={interactiveZones.find(z => z.id === selectedZoneId)?.correctAnswer || ''} // Updated to correctAnswer
                                        onChange={(e) => setInteractiveZones(interactiveZones.map(z => z.id === selectedZoneId ? { ...z, correctAnswer: e.target.value } : z))}
                                        className="w-full p-2 border border-slate-200 rounded-lg text-sm" placeholder="Respuesta exacta..."
                                      />
                                    </div>
                                  )}

                                  {interactiveZones.find(z => z.id === selectedZoneId)?.type === 'DROP_ZONE' && (
                                    <div>
                                      <label className="text-xs font-bold text-slate-500 block mb-1">Elemento Correcto</label>
                                      <select
                                        value={interactiveZones.find(z => z.id === selectedZoneId)?.correctAnswer || ''}
                                        onChange={(e) => setInteractiveZones(interactiveZones.map(z => z.id === selectedZoneId ? { ...z, correctAnswer: e.target.value } : z))}
                                        className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                                        aria-label="Seleccionar elemento correcto"
                                      >
                                        <option value="">-- Cualquiera --</option>
                                        {draggableItems.map(d => <option key={d.id} value={d.id}>{d.content}</option>)}
                                      </select>
                                      {draggableItems.length === 0 && <p className="text-[10px] text-red-400 mt-1">Crea etiquetas abajo primero.</p>}
                                    </div>
                                  )}

                                  {interactiveZones.find(z => z.id === selectedZoneId)?.type === 'SELECTABLE' && (
                                    <div className="flex items-center gap-2 bg-purple-50 p-2 rounded-lg border border-purple-100">
                                      <input
                                        type="checkbox"
                                        checked={interactiveZones.find(z => z.id === selectedZoneId)?.isCorrect || false}
                                        onChange={(e) => setInteractiveZones(interactiveZones.map(z => z.id === selectedZoneId ? { ...z, isCorrect: e.target.checked } : z))}
                                        className="w-4 h-4 text-purple-600 rounded"
                                        aria-label="Es respuesta correcta"
                                      />
                                      <label className="text-xs font-bold text-purple-800">¿Es respuesta correcta?</label>
                                    </div>
                                  )}

                                  {interactiveZones.find(z => z.id === selectedZoneId)?.type?.startsWith('MATCH') && (
                                    <div className="space-y-2">
                                      <div>
                                        <label className="text-xs font-bold text-slate-500 block mb-1">ID de Pareja (Mismo ID = Conectados)</label>
                                        <input
                                          type="text"
                                          value={interactiveZones.find(z => z.id === selectedZoneId)?.matchId || ''}
                                          onChange={(e) => setInteractiveZones(interactiveZones.map(z => z.id === selectedZoneId ? { ...z, matchId: e.target.value.toUpperCase() } : z))}
                                          className="w-full p-2 border border-slate-200 rounded-lg text-sm uppercase"
                                          placeholder="Ej. A, PAREJA1, UNO..."
                                        />
                                      </div>
                                      <div className="flex gap-2">
                                        <button
                                          type="button"
                                          onClick={() => setInteractiveZones(interactiveZones.map(z => z.id === selectedZoneId ? { ...z, type: 'MATCH_SOURCE' } : z))}
                                          className={`flex-1 py-1 text-[10px] rounded border ${interactiveZones.find(z => z.id === selectedZoneId)?.type === 'MATCH_SOURCE' ? 'bg-emerald-100 border-emerald-500 text-emerald-700' : 'bg-white border-slate-200'}`}
                                        >
                                          Origen (Punto A)
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setInteractiveZones(interactiveZones.map(z => z.id === selectedZoneId ? { ...z, type: 'MATCH_TARGET' } : z))}
                                          className={`flex-1 py-1 text-[10px] rounded border ${interactiveZones.find(z => z.id === selectedZoneId)?.type === 'MATCH_TARGET' ? 'bg-emerald-100 border-emerald-500 text-emerald-700' : 'bg-white border-slate-200'}`}
                                        >
                                          Destino (Punto B)
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  <div>
                                    <label className="text-xs font-bold text-slate-500 block mb-1">Puntos</label>
                                    <input type="number" className="w-full p-2 border border-slate-200 rounded-lg text-sm" value={interactiveZones.find(z => z.id === selectedZoneId)?.points || 1} onChange={(e) => setInteractiveZones(interactiveZones.map(z => z.id === selectedZoneId ? { ...z, points: Number(e.target.value) } : z))} aria-label="Puntos de la zona" />
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-6 rounded-xl text-center flex flex-col items-center justify-center h-40 text-slate-400">
                                  <Move size={24} className="mb-2 opacity-50" />
                                  <p className="text-sm font-bold">Selecciona una zona</p>
                                  <p className="text-xs">Haz clic en el cuadro azul/rosa</p>
                                </div>
                              )}

                              {/* Draggables Manager */}
                              <div className="flex-1 bg-white border border-slate-200 rounded-xl p-4 flex flex-col overflow-hidden">
                                <h5 className="font-bold text-slate-700 text-sm mb-2 flex items-center gap-2"><FileText size={16} /> Etiquetas Recortables</h5>
                                <div className="flex gap-2 mb-2">
                                  <input
                                    value={newDraggableText} onChange={e => setNewDraggableText(e.target.value)}
                                    placeholder="Nueva etiqueta..."
                                    className="min-w-0 flex-1 p-2 border border-slate-200 rounded-lg text-sm"
                                    onKeyDown={e => e.key === 'Enter' && e.preventDefault()} // Prevent form submit
                                    aria-label="Texto de etiqueta"
                                  />
                                  <button type="button" onClick={() => { if (newDraggableText.trim()) { setDraggableItems([...draggableItems, { id: Date.now().toString(), type: 'TEXT', content: newDraggableText, width: 100 }]); setNewDraggableText(''); } }} className="bg-pink-500 text-white p-2 rounded-lg" aria-label="Agregar etiqueta"><Plus size={18} /></button>
                                </div>
                                <div className="flex-1 overflow-y-auto space-y-2 p-1 custom-scrollbar">
                                  {draggableItems.length === 0 && <p className="text-xs text-slate-400 italic text-center mt-4">Añade palabras para arrastrar.</p>}
                                  {draggableItems.map(d => (
                                    <div key={d.id} className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-100 text-sm">
                                      <span className="truncate font-medium text-slate-700">{d.content}</span>
                                      <button type="button" onClick={() => setDraggableItems(draggableItems.filter(i => i.id !== d.id))} className="text-slate-300 hover:text-red-500" aria-label="Eliminar etiqueta"><X size={14} /></button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}


                    {/* QUIZ EDITOR UI */}
                    {activityType === 'QUIZ' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* AI Generator */}
                        <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-3xl p-6 text-white text-center shadow-xl">
                          <Sparkles size={48} className="mx-auto mb-4 text-purple-200 opacity-50" />
                          <h4 className="text-xl font-bold mb-2">Generador IA</h4>
                          <p className="text-purple-100 text-sm mb-6">Crea 5 preguntas automáticas sobre el tema que quieras.</p>

                          <input
                            className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-white placeholder-purple-200 text-sm mb-4 outline-none focus:bg-white/20"
                            placeholder="Tema (Ej. Capitales de Europa)"
                            value={aiWorksheetTopic} onChange={e => setAiWorksheetTopic(e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              if (!aiWorksheetTopic) return;
                              setIsGenerating(true);
                              try {
                                const quizJson = await generateInteractiveQuizFromContext(`Tema: ${aiWorksheetTopic}`, [], 5);
                                let cleanJson = quizJson.replace(/`|json/g, '').trim();
                                const parsed = JSON.parse(cleanJson.substring(cleanJson.indexOf('['), cleanJson.lastIndexOf(']') + 1));
                                const newQs = parsed.map((q: any) => ({ id: Math.random().toString(), text: q.text || q.question, options: q.options, correctIndex: q.correctIndex || 0, points: 10 }));
                                setQuestions(newQs);
                                if (!newTitle) setNewTitle(`Quiz: ${aiWorksheetTopic}`);
                              } catch (e) { alert("Error"); } finally { setIsGenerating(false); }
                            }}
                            disabled={isGenerating || !aiWorksheetTopic}
                            className="w-full bg-white text-purple-700 font-bold py-3 rounded-xl hover:bg-purple-50 transition-colors shadow-lg disabled:opacity-70"
                          >
                            {isGenerating ? 'Creando Magia...' : 'Generar Preguntas'}
                          </button>
                        </div>

                        {/* Manual Editor */}
                        <div className="space-y-4">
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <h4 className="font-bold text-slate-700 mb-3 text-sm">Agregar Pregunta Manual</h4>
                            <input type="text" placeholder="Pregunta" value={curQuestion} onChange={e => setCurQuestion(e.target.value)} className="w-full p-2.5 mb-2 text-sm border rounded-lg bg-white" />
                            {curOptions.map((o, i) => (
                              <div key={i} className="flex gap-2 mb-2 items-center">
                                <div onClick={() => setCurCorrect(i)} className={`w-5 h-5 rounded-full border border-slate-300 cursor-pointer flex items-center justify-center ${curCorrect === i ? 'bg-emerald-500 border-emerald-500' : 'bg-white'}`}>
                                  {curCorrect === i && <Check size={12} className="text-white" />}
                                </div>
                                <input value={o} onChange={e => { const n = [...curOptions]; n[i] = e.target.value; setCurOptions(n); }} placeholder={`Opción ${i + 1}`} className="flex-1 p-2 text-sm border rounded-lg bg-white" />
                              </div>
                            ))}
                            <button type="button" onClick={addQuestion} className="w-full py-2 bg-slate-800 text-white font-bold rounded-lg text-xs hover:bg-slate-700 transition-colors mt-2">Agregar Pregunta</button>
                          </div>

                          {/* List */}
                          <div className="h-40 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {questions.map((q, idx) => (
                              <div key={q.id} className="bg-white p-3 rounded-xl border border-slate-100 flex justify-between items-start text-sm">
                                <div className="flex-1">
                                  <p className="font-bold text-slate-800"><span className="text-purple-500 mr-1">#{idx + 1}</span>{q.text}</p>
                                  <p className="text-xs text-slate-400 mt-1">{q.options[q.correctIndex || 0]}</p>
                                </div>
                                <button onClick={() => setQuestions(questions.filter(qi => qi.id !== q.id))} className="text-slate-300 hover:text-red-500" aria-label="Eliminar pregunta"><Trash2 size={14} /></button>
                              </div>
                            ))}
                            {questions.length === 0 && <p className="text-center text-xs text-slate-300 mt-10">No hay preguntas aún.</p>}
                          </div>
                        </div>
                      </div>
                    )}
                  </section>
                )}

              </form>
            </div>

            {/* Footer Actions */}
            <div className="bg-white p-6 border-t border-slate-100 flex justify-end gap-3 z-10">
              <button
                onClick={() => setIsAdding(false)}
                className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit} // Trigger form submit
                type="button"
                className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95 flex items-center gap-2 ${activityType === 'TASK' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' :
                  activityType === 'WORKSHEET' ? 'bg-pink-600 hover:bg-pink-700 shadow-pink-200' :
                    activityType === 'PLANNING' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' :
                      'bg-purple-600 hover:bg-purple-700 shadow-purple-200'
                  }`}
              >
                <Save size={18} />
                {activityType === 'PLANNING'
                  ? (questions.length > 0 ? 'Guardar Planeación + Quiz' : 'Guardar Planeación')
                  : 'Guardar Actividad'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Tracking Table / Matrix */}
      <div className="glass-card rounded-2xl flex-1 flex flex-col overflow-hidden max-w-[85vw] md:max-w-full">
        {assignments.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <div className="p-6 bg-slate-50 rounded-full mb-4">
              <Calendar className="w-12 h-12 opacity-30" />
            </div>
            <h3 className="text-xl font-bold text-slate-600">No hay actividades registradas</h3>
            <p className="text-sm mt-2">Crea una nueva actividad para comenzar el seguimiento.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-x-auto custom-scrollbar relative">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-slate-50/90 backdrop-blur-sm sticky top-0 z-20 shadow-sm">
                <tr>
                  <th className="p-4 font-bold text-slate-600 sticky left-0 bg-slate-50 z-30 w-64 border-r border-slate-200 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">Estudiante</th>
                  <th className="p-4 font-bold text-slate-600 w-48 bg-slate-50 z-20 text-center">Progreso</th>
                  {assignments.map(assignment => (
                    <th key={assignment.id} className="p-4 font-medium text-slate-600 min-w-[180px] border-l border-slate-200 relative group bg-slate-50">
                      <div className="flex justify-between items-start gap-2">
                        <span>{assignment.title}</span>
                        <button onClick={() => onDeleteAssignment(assignment.id)} className="text-slate-300 hover:text-red-500 transition-colors" aria-label="Eliminar actividad">
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal mt-1 flex items-center gap-1">
                        <Calendar size={10} />
                        {new Date(assignment.dueDate).toLocaleDateString()}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map(student => {
                  const completedCount = assignments.filter(a => student.completedAssignmentIds?.includes(a.id)).length;
                  const progress = Math.round((completedCount / assignments.length) * 100);

                  return (
                    <tr key={student.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="p-4 sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-r border-slate-100 font-medium text-slate-700 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
                        <div className="flex items-center gap-3">
                          <img
                            src={student.avatar === "PENDING_LOAD" ? `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=random` : (student.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=random`)}
                            alt={student.name}
                            className="w-8 h-8 rounded-full object-cover shadow-sm bg-slate-200"
                          />
                          {student.name}
                        </div>
                      </td>
                      <td className="p-4 bg-white group-hover:bg-slate-50 z-0">
                        <div className="w-full bg-slate-100 rounded-full h-2 mb-1 overflow-hidden">
                          {/* eslint-disable-next-line */}
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="text-xs text-slate-400 text-center font-bold">{progress}%</div>
                      </td>
                      {assignments.map(assignment => {
                        const isCompleted = student.completedAssignmentIds?.includes(assignment.id);
                        const score = student.assignmentResults?.[assignment.id];
                        return (
                          <td key={`${student.id}-${assignment.id}`} className="p-4 border-l border-slate-100 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <button
                                onClick={() => {
                                  if (assignment.assignmentType === 'NEM_EVALUATION' && !isCompleted) {
                                    // Open Grading Modal if it's a teacher evaluation and not yet completed
                                    handleOpenGrading(assignment, student.id);
                                  } else {
                                    // Standard toggle behavior
                                    onToggleAssignment(student.id, assignment.id);
                                  }
                                }}
                                className={`transition-all duration-300 hover:scale-110 active:scale-95 p-2 rounded-full ${isCompleted ? 'text-emerald-500 bg-emerald-50' : 'text-slate-200 hover:text-slate-400 hover:bg-slate-100'
                                  }`}
                              >
                                {isCompleted ? (
                                  <CheckCircle className="w-6 h-6 fill-emerald-500 text-white" />
                                ) : (
                                  <Circle className="w-6 h-6" strokeWidth={2.5} />
                                )}
                              </button>
                              {isCompleted && score !== undefined && (
                                <span className={`text-[10px] font-bold px-1 rounded ${score >= 6 ? 'bg-indigo-50 text-indigo-600' : 'bg-red-50 text-red-600'}`}>
                                  {score}/10
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* GRADING MODAL FOR NEM EVALUATIONS */}
      {
        gradingAssignment && gradingStudentId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6 animate-slideUp">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Evaluación Docente</h3>
                  <p className="text-xs text-slate-500">{students.find(s => s.id === gradingStudentId)?.name}</p>
                </div>
                <button onClick={() => setGradingAssignment(null)} className="text-slate-400 hover:text-slate-600" aria-label="Cerrar evaluación"><X size={20} /></button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto custom-scrollbar space-y-4 mb-6">
                {gradingAssignment?.interactiveData && gradingAssignment.interactiveData.type === 'QUIZ' && gradingAssignment.interactiveData.questions.map((q: any, idx: number) => (
                  <div key={q.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p className="font-bold text-slate-700 text-sm mb-2"><span className="text-purple-600 mr-1">#{idx + 1}</span> {q.text}</p>
                    <div className="space-y-1 pl-4">
                      {q.options.map((opt: string, i: number) => (
                        <div key={i} className={`text-xs p-2 rounded ${i === q.correctIndex ? 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-200' : 'text-slate-500'}`}>
                          {opt} {i === q.correctIndex && <Check size={12} className="inline ml-1" />}
                        </div>
                      ))}
                    </div>

                    {/* Simple Teacher Observation Toggle */}
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => setGradingScores({ ...gradingScores, [q.id]: 1 })}
                        className={`flex-1 py-1.5 rounded text-xs font-bold transition-colors ${gradingScores[q.id] === 1 ? 'bg-emerald-500 text-white' : 'bg-white border border-slate-200 text-slate-400 hover:bg-emerald-50'}`}
                      >
                        Logrado
                      </button>
                      <button
                        onClick={() => setGradingScores({ ...gradingScores, [q.id]: 0 })}
                        className={`flex-1 py-1.5 rounded text-xs font-bold transition-colors ${gradingScores[q.id] === 0 ? 'bg-red-500 text-white' : 'bg-white border border-slate-200 text-slate-400 hover:bg-red-50'}`}
                      >
                        No Logrado
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3">
                <button onClick={() => setGradingAssignment(null)} className="px-4 py-2 text-slate-500 text-sm font-bold hover:bg-slate-50 rounded-lg">Cancelar</button>
                <button
                  onClick={handleSaveGrading}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg shadow-md transition-colors flex items-center gap-2"
                >
                  <CheckCircle size={16} /> Registrar Evaluación
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};