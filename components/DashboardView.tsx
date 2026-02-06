
import React, { useEffect, useState } from 'react';
import { Student, BehaviorLog, SchoolEvent, Assignment, ViewState, StaffTask, StaffMember } from '../types';
import { generateRiskPlan, analyzeClassPerformance } from '../services/ai';
import { api } from '../services/api';
import { Sparkles, TrendingUp, Users, AlertCircle, History, X, Phone, User, CheckCircle, Calendar as CalendarIcon, BookOpen, Clock, Download, ClipboardList, ThumbsUp, ThumbsDown, ChevronLeft, ChevronRight, Plus, Edit2, Trash2, Save, MoreHorizontal, ArrowRight, Send, Megaphone, AlertTriangle, CheckSquare } from 'lucide-react';

interface DashboardProps {
  students: Student[];
  logs?: BehaviorLog[];
  events?: SchoolEvent[];
  assignments?: Assignment[];
  staffTasks?: StaffTask[];
  currentUser?: StaffMember | null;
  onAddEvent?: (event: Omit<SchoolEvent, 'id'>) => void;
  onEditEvent?: (id: string, event: Partial<SchoolEvent>) => void;
  onDeleteEvent?: (id: string) => void;
  onNavigate: (view: ViewState) => void;
  store?: any;
}

const EVENT_COLORS = {
  EXAM: 'bg-red-100 text-red-700 border-red-200',
  MEETING: 'bg-blue-100 text-blue-700 border-blue-200',
  HOLIDAY: 'bg-purple-100 text-purple-700 border-purple-200',
  ACTIVITY: 'bg-green-100 text-green-700 border-green-200'
};

const EVENT_DOT_COLORS = {
  EXAM: 'bg-red-500',
  MEETING: 'bg-blue-500',
  HOLIDAY: 'bg-purple-500',
  ACTIVITY: 'bg-green-500'
};

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const DAYS_OF_WEEK = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

export const DashboardView: React.FC<DashboardProps> = ({
  students = [],
  logs = [],
  events = [],
  assignments = [],
  staffTasks = [],
  currentUser = null,
  onAddEvent,
  onEditEvent,
  onDeleteEvent,
  onNavigate,
  store
}) => {
  // Sort students alphabetically
  const sortedStudents = [...students].sort((a, b) => a.name.localeCompare(b.name));

  const [aiInsight, setAiInsight] = useState<string>("");
  const [loadingAi, setLoadingAi] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Official Notices State
  const [officialNotices, setOfficialNotices] = useState<any[]>([]);

  // Notification Ref to avoid spam
  // Notification Ref to avoid spam (Persistent)
  const notifiedTasksRef = React.useRef<Set<string>>(new Set(
    JSON.parse(localStorage.getItem('sirila_notified_tasks') || '[]')
  ));

  useEffect(() => {
    // Logic to send reminder notifications for urgent tasks
    if (!staffTasks || staffTasks.length === 0) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const myId = currentUser?.id || 'MAIN';

    // Filter tasks relevant to the current user
    const myRelevantTasks = staffTasks.filter(task => {
      if (task.status === 'COMPLETED') return false; // Task is globally complete

      // If currentUser is null, we treat as main admin who might want to see Docente tasks or just specific ones
      // Existing logic in render uses: const isDocente = currentUser?.role === 'Docente' || !currentUser;
      const isDocente = currentUser?.role === 'Docente' || !currentUser;

      if (task.assignedTo === 'ALL') return true;
      if (isDocente && task.assignedTo === 'DOCENTES') return true;
      if (task.assignedTo === myId) return true;

      return false;
    });

    myRelevantTasks.forEach(task => {
      // Skip if already notified this session
      if (notifiedTasksRef.current.has(task.id)) return;

      // Skip if user already completed it
      const isCompleted = task.completedBy?.includes(myId);
      if (isCompleted) return;

      // Check dates
      const dueDate = new Date(task.dueDate);
      const today = new Date();
      // Reset time parts for accurate day comparison
      dueDate.setHours(0, 0, 0, 0);
      const todayZero = new Date();
      todayZero.setHours(0, 0, 0, 0);

      const timeDiff = dueDate.getTime() - todayZero.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)); // Days remaining

      // Notify if due today (0) or tomorrow (1)
      if (daysDiff <= 1 && daysDiff >= 0) {
        const title = daysDiff === 0 ? '¡TAREA VENCE HOY!' : 'Recordatorio de Tarea';
        const body = `"${task.title}" vence ${daysDiff === 0 ? 'hoy' : 'mañana'}. Por favor, realiza la entrega.`;

        try {
          new Notification(title, {
            body: body,
            icon: '/logo escuela.png',
            tag: task.id // Prevent duplicate notifications from OS if supported
          });
          // Also play a sound if urgent
          if (daysDiff === 0) {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.volume = 0.5;
            audio.play().catch(e => console.log('Audio error', e));
          }
        } catch (e) {
          console.error("Notification error", e);
        }

        notifiedTasksRef.current.add(task.id);
        localStorage.setItem('sirila_notified_tasks', JSON.stringify(Array.from(notifiedTasksRef.current)));
      }
    });
  }, [staffTasks, currentUser]);

  useEffect(() => {
    // Load official global notifications
    api.getNotifications().then(setOfficialNotices).catch(console.error);
  }, []);

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());

  // Event Modal State
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  // Helper for local date string YYYY-MM-DD
  const getLocalDateString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const [eventFormData, setEventFormData] = useState<Omit<SchoolEvent, 'id'>>({
    title: '',
    date: getLocalDateString(),
    type: 'ACTIVITY',
    description: ''
  });

  // Risk Plan State
  const [loadingRisk, setLoadingRisk] = useState(false);
  const [riskPlan, setRiskPlan] = useState<string | null>(null);

  useEffect(() => {
    if (students.length > 0 && (import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY)) {
      setLoadingAi(true);
      analyzeClassPerformance(students)
        .then(setAiInsight)
        .catch((e) => {
          console.error(e);
          setAiInsight("Error al conectar con Gemini. Verifique su API Key.");
        })
        .finally(() => setLoadingAi(false));
    }
  }, [students]);

  useEffect(() => {
    // Reset risk plan when modal closes or student changes
    if (!selectedStudent) setRiskPlan(null);
  }, [selectedStudent]);

  // Data prep
  const attendanceStats = students.reduce((acc, curr) => {
    const present = Object.values(curr.attendance || {}).filter(s => s === 'Presente').length;
    return acc + present;
  }, 0);

  const totalPossibleAttendance = students.length * 20; // Assuming 20 days context for demo
  const attendanceRate = Math.round((attendanceStats / totalPossibleAttendance) * 100) || 0;

  // Helper to get dummy assignments based on completion status for the selected student
  const getStudentAssignments = (student: Student) => {
    // In a real app we would use the actual Assignment objects via completedAssignmentIds
    // Here we map the global assignments to statuses
    return assignments.map(a => ({
      ...a,
      status: (student.completedAssignmentIds || []).includes(a.id) ? 'Completado' : 'Pendiente'
    }));
  };

  const getLastFiveWeekdays = () => {
    const days = [];
    let current = new Date();
    let count = 0;
    let loopLimit = 0;
    // Get last 5 weekdays (Mon-Fri)
    while (count < 5 && loopLimit < 14) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) { // 0 is Sun, 6 is Sat
        days.push(new Date(current));
        count++;
      }
      current.setDate(current.getDate() - 1);
      loopLimit++;
    }
    return days.reverse();
  };

  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Nombre',
      'Tutor',
      'Teléfono',
      'Puntos Conducta',
      'Tareas Completadas',
      'Total Tareas',
      'Participaciones',
      'Promedio Calificación',
      'Días Asistidos'
    ];

    const csvContent = [
      headers.join(','),
      ...sortedStudents.map(s => {
        const grades = s.grades || [];
        const avg = grades.length
          ? (grades.reduce((acc, g) => {
            if (typeof g === 'number') return acc + g;
            const gObj = g as any;
            return acc + ((Number(gObj.lenguajes || 0) + Number(gObj.saberes || 0) + Number(gObj.etica || 0) + Number(gObj.humano || 0)) / 4);
          }, 0) / grades.length).toFixed(1)
          : '0';
        const attendanceCount = Object.values(s.attendance || {}).filter(x => x === 'Presente').length;
        return [
          s.id,
          `"${s.name}"`,
          `"${s.guardianName}"`,
          s.guardianPhone,
          s.behaviorPoints,
          s.assignmentsCompleted,
          s.totalAssignments,
          s.participationCount,
          avg,
          attendanceCount
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([`\uFEFF${csvContent} `], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `reporte_aula_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get behavior summary for selected student
  const getStudentBehaviorLogs = (studentId: string) => {
    return logs
      .filter(log => log.studentId === studentId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);
  };

  const handleGenerateRiskPlan = async () => {
    if (!selectedStudent) return;
    setLoadingRisk(true);

    // Calculate risk reasons
    const assignmentRate = selectedStudent.totalAssignments > 0 ? (selectedStudent.assignmentsCompleted / selectedStudent.totalAssignments) : 1;
    const attendanceRate = Object.values(selectedStudent.attendance || {}).length > 0
      ? Object.values(selectedStudent.attendance || {}).filter(st => st === 'Presente').length / Object.values(selectedStudent.attendance || {}).length
      : 1;

    let reasons = [];
    if (assignmentRate < 0.5) reasons.push("Bajo cumplimiento de tareas");
    if (selectedStudent.behaviorPoints < 0) reasons.push("Incidencias de conducta");
    if (attendanceRate < 0.8) reasons.push("Inasistencia frecuente");

    try {
      const plan = await generateRiskPlan(selectedStudent.name, reasons.join(', '), selectedStudent.guardianName);
      setRiskPlan(plan);
    } catch (e) {
      console.error(e);
      setRiskPlan("Error al generar el plan.");
    } finally {
      setLoadingRisk(false);
    }
  };

  // Calendar Logic
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Event Modal Handlers
  const openEventModal = (event?: SchoolEvent) => {
    if (event) {
      setEditingEventId(event.id);
      setEventFormData({
        title: event.title,
        date: event.date,
        type: event.type,
        description: event.description || ''
      });
    } else {
      setEditingEventId(null);
      setEventFormData({
        title: '',
        date: getLocalDateString(),
        type: 'ACTIVITY',
        description: ''
      });
    }
    setIsEventModalOpen(true);
  };

  const handleDayClick = (dateStr: string) => {
    setEditingEventId(null);
    setEventFormData({
      title: '',
      date: dateStr,
      type: 'ACTIVITY',
      description: ''
    });
    setIsEventModalOpen(true);
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEventId && onEditEvent) {
      onEditEvent(editingEventId, eventFormData);
    } else if (onAddEvent) {
      onAddEvent(eventFormData);
    }
    setIsEventModalOpen(false);
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Empty cells for previous month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty - ${i} `} className="h-10"></div>);
    }

    // Days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEvents = events.filter(e => e.date === dateStr);
      const isToday = getLocalDateString() === dateStr;

      days.push(
        <div
          key={day}
          onClick={() => handleDayClick(dateStr)}
          className={`h - 10 flex flex - col items - center justify - center relative rounded - lg text - sm font - medium transition - colors cursor - pointer group
                ${isToday ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-600'}
`}
          title={`Click para agregar evento el ${day} `}
        >
          <span>{day}</span>
          {dayEvents.length > 0 && (
            <div className="flex gap-0.5 mt-0.5">
              {dayEvents.map((evt, idx) => (
                <div key={idx} className={`w - 1.5 h - 1.5 rounded - full ${EVENT_DOT_COLORS[evt.type]} border border - white`}></div>
              ))}
            </div>
          )}
          {/* Hover indicator for adding event */}
          <div className="absolute top-0 right-0 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-1.5 h-1.5 bg-indigo-300 rounded-full"></div>
          </div>
        </div>
      );
    }
    return days;
  };

  return (
    <div className="space-y-6 animate-fadeIn relative">
      <header className="mb-2 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Panel de Control</h2>
          <p className="text-slate-500 font-medium">Resumen general del rendimiento del aula</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-colors font-medium shadow-sm"
        >
          <Download size={18} />
          Exportar Datos
        </button>
      </header>

      {/* --- STAFF TASKS NOTIFICATION SECTION --- */}
      {(() => {
        const myPendingTasks = staffTasks.filter(task => {
          if (task.status === 'COMPLETED') return false;

          const isDocente = currentUser?.role === 'Docente' || !currentUser; // Default to Docente if null (main account)
          const myId = currentUser?.id;

          if (task.assignedTo === 'ALL') return true;
          if (isDocente && task.assignedTo === 'DOCENTES') return true;
          if (myId && task.assignedTo === myId) return true;

          return false;
        });

        if (myPendingTasks.length === 0) return null;

        return (
          <div className="bg-amber-50 border-l-4 border-amber-500 rounded-r-xl p-6 shadow-sm animate-slideDown mb-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <AlertTriangle size={120} className="text-amber-500" />
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-full">
                  <Megaphone size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Tienes Tareas Asignadas</h3>
                  <p className="text-sm text-slate-500">Dirección te ha asignado las siguientes actividades:</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                {myPendingTasks.map(task => (
                  <div key={task.id} className="bg-white p-4 rounded-lg border border-amber-100 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide ${task.type === 'COMMISSION' ? 'bg-purple-100 text-purple-700' :
                        task.type === 'DOCUMENTATION' ? 'bg-blue-100 text-blue-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                        {task.type === 'COMMISSION' ? 'Comisión' : task.type === 'DOCUMENTATION' ? 'Entrega Doc' : 'Actividad'}
                      </span>
                      {task.dueDate && (
                        <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                          <Clock size={12} /> {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-slate-800 mb-1">{task.title}</h4>
                    {task.description && <p className="text-xs text-slate-500 line-clamp-2">{task.description}</p>}

                    <div className="mt-3 pt-3 border-t border-slate-50">
                      {(() => {
                        const myId = currentUser?.id || 'MAIN';
                        const isCompleted = task.completedBy?.includes(myId);

                        if (isCompleted) {
                          return (
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-green-600 font-bold flex items-center gap-1">
                                <CheckCircle size={14} /> Entregado
                              </span>
                              <span className="text-[8px] text-slate-400">
                                ✓ Confirmado
                              </span>
                            </div>
                          );
                        }

                        // Calculate days until due date
                        const dueDate = new Date(task.dueDate);
                        const today = new Date();
                        const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                        const isUrgent = daysDiff <= 1 && daysDiff >= 0;

                        return (
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-[10px] font-bold flex items-center gap-1 ${isUrgent ? 'text-red-600 animate-pulse' : 'text-amber-600'
                              }`}>
                              <AlertCircle size={12} /> {isUrgent ? (daysDiff === 0 ? '¡VENCE HOY!' : '¡Mañana!') : 'Pendiente'}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm('¿Confirmar entrega de esta tarea?')) {
                                  store?.handleCompleteStaffTask?.(task.id, myId);
                                }
                              }}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold rounded transition-colors flex items-center gap-1 shadow-sm hover:shadow-md"
                            >
                              <CheckSquare size={12} /> Marcar Entregado
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* AI Insight Banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-1 shadow-xl relative overflow-hidden group hover:shadow-2xl transition-all duration-500">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 relative z-10 h-full border border-white/10">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/20 rounded-xl shadow-inner backdrop-blur-sm animate-float">
              <Sparkles className="w-6 h-6 text-yellow-300" />
            </div>
            <div>
              <h3 className="font-bold text-xl mb-1 text-white tracking-tight">Análisis IA del Grupo</h3>
              <p className="text-indigo-50 text-sm leading-relaxed font-medium opacity-90">
                {loadingAi ? "Analizando datos del grupo..." : aiInsight || "Agrega estudiantes y conecta Gemini para obtener recomendaciones."}
              </p>
            </div>
          </div>
        </div>
        <div className="absolute right-0 top-0 opacity-20 transform translate-x-10 -translate-y-10 group-hover:scale-110 transition-transform duration-700">
          <Sparkles className="w-64 h-64 text-white" />
        </div>
      </div>

      {/* RISK DETECTION SECTION */}
      {(() => {
        const atRiskStudents = sortedStudents.filter(s => {
          const totalAssignments = assignments.length;
          const completedCount = s.completedAssignmentIds?.length || 0;
          const assignmentRate = totalAssignments > 0 ? (completedCount / totalAssignments) : 1;
          const attendanceRate = Object.values(s.attendance || {}).length > 0
            ? Object.values(s.attendance || {}).filter(st => st === 'Presente').length / Object.values(s.attendance || {}).length
            : 1;

          return assignmentRate < 0.5 || s.behaviorPoints < 0 || attendanceRate < 0.8;
        });

        if (atRiskStudents.length === 0) return null;

        return (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-6 animate-fadeIn">
            <h3 className="flex items-center gap-2 font-bold text-red-700 text-lg mb-4">
              <AlertCircle size={24} />
              Alerta Temprana de Riesgo Detectada ({atRiskStudents.length})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
              {atRiskStudents.map(s => {
                const totalAssignments = assignments.length;
                const completedCount = s.completedAssignmentIds?.length || 0;
                const assignmentRate = totalAssignments > 0 ? (completedCount / totalAssignments) : 1;
                const attendanceRate = Object.values(s.attendance || {}).length > 0
                  ? Object.values(s.attendance || {}).filter(st => st === 'Presente').length / Object.values(s.attendance || {}).length
                  : 1;

                let reasons = [];
                if (assignmentRate < 0.5) reasons.push("Bajo cumplimiento");
                if (s.behaviorPoints < 0) reasons.push("Conducta");
                if (attendanceRate < 0.8) reasons.push("Inasistencias");

                return (
                  <div key={s.id} className="bg-white p-3 rounded-xl border-l-4 border-red-500 shadow-sm flex flex-col justify-between h-full">
                    <div>
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-1">
                        <h4 className="font-bold text-slate-800 text-sm truncate">{s.name}</h4>
                        <span className="hidden md:inline-block bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Riesgo</span>
                      </div>
                      <ul className="text-[10px] text-red-600/80 list-disc list-inside mb-2 space-y-0.5 leading-tight">
                        {reasons.slice(0, 2).map(r => <li key={r}>{r}</li>)}
                      </ul>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedStudent(s);
                      }}
                      className="w-full py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-[10px] font-bold transition-colors flex items-center justify-center gap-1"
                    >
                      <Sparkles size={12} /> Plan IA
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Priority Section: Events & Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Upcoming Events Panel */}
        <div className="glass-card p-6 rounded-2xl flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><CalendarIcon size={20} /></div>
              <h3 className="font-bold text-slate-700 text-lg">Agenda Escolar</h3>
            </div>
            <button
              onClick={() => openEventModal()}
              className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus size={16} /> Agregar
            </button>
          </div>

          <div className="flex-1 space-y-3">
            {events.length === 0 ? (
              <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                <CalendarIcon size={32} className="mx-auto mb-2 opacity-50" />
                <p>No hay eventos próximos.</p>
              </div>
            ) : (
              [...events]
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .slice(0, 5)
                .map(evt => {
                  // Parse date manually to avoid timezone shift (UTC vs Local)
                  // evt.date is "YYYY-MM-DD"
                  const parts = evt.date.split('-');
                  const day = parts[2] ? parseInt(parts[2]) : '?';
                  const monthIdx = parts[1] ? parseInt(parts[1]) - 1 : -1;
                  const monthName = MONTH_NAMES[monthIdx] || "---";
                  const month = monthName.substring(0, 3);
                  return (
                    <div key={evt.id} className="flex gap-4 p-3 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100 group">
                      <div className="flex flex-col items-center justify-center bg-slate-100 text-slate-600 rounded-lg w-14 h-14 shrink-0 font-bold border border-slate-200">
                        <span className="text-xs uppercase">{month}</span>
                        <span className="text-xl leading-none">{day}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-slate-800 line-clamp-1">{evt.title}</h4>
                          <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                            <button onClick={() => openEventModal(evt)} className="text-blue-500 hover:bg-blue-50 p-1 rounded"><Edit2 size={14} /></button>
                            <button onClick={() => onDeleteEvent && onDeleteEvent(evt.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={14} /></button>
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{evt.description}</p>
                        <span className={`inline - block mt - 2 text - [10px] font - bold px - 2 py - 0.5 rounded - full ${EVENT_COLORS[evt.type]} `}>
                          {evt.type === 'ACTIVITY' ? 'Actividad' : evt.type === 'EXAM' ? 'Examen' : evt.type === 'MEETING' ? 'Junta' : 'Suspensión'}
                        </span>
                      </div>
                    </div>
                  )
                })
            )}
          </div>
        </div>

        {/* Active Tasks Progress Panel - Navigates to Activities */}
        <div
          onClick={() => onNavigate('ACTIVITIES')}
          className="glass-card p-6 rounded-2xl flex flex-col cursor-pointer group"
        >
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-100 transition-colors"><BookOpen size={20} /></div>
              <h3 className="font-bold text-slate-700 text-lg group-hover:text-emerald-700 transition-colors">Avance de Tareas Activas</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                {assignments.length} Activas
              </span>
              <ArrowRight size={16} className="text-slate-300 group-hover:text-emerald-500" />
            </div>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto max-h-[300px] custom-scrollbar pr-2">
            {assignments.length === 0 ? (
              <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                <BookOpen size={32} className="mx-auto mb-2 opacity-50" />
                <p>No hay tareas registradas.</p>
              </div>
            ) : (
              assignments.slice(-5).reverse().map(assignment => {
                const completedCount = students.filter(s => (s.completedAssignmentIds || []).includes(assignment.id)).length;
                const totalStudents = students.length;
                const percentage = totalStudents > 0 ? Math.round((completedCount / totalStudents) * 100) : 0;

                return (
                  <div key={assignment.id}>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-sm font-medium text-slate-700">{assignment.title}</span>
                      <span className="text-xs font-bold text-slate-500">{completedCount}/{totalStudents} ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: percentage === 100 ? '#10b981' :
                            percentage > 50 ? '#3b82f6' :
                              percentage > 20 ? '#facc15' : '#f87171' // emerald-500, blue-500, yellow-400, red-400
                        }}
                      ></div>
                    </div>
                    <div className="mt-1 text-right">
                      <span className="text-[10px] text-slate-400">Vence: {new Date(assignment.dueDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards - Navigation Enabled */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigate('ATTENDANCE')}
          className="glass-card p-5 rounded-2xl cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 text-green-600 rounded-lg group-hover:bg-green-200"><TrendingUp size={20} /></div>
            <span className="text-slate-500 text-sm font-medium">Asistencia Global</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">{attendanceRate}%</div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${attendanceRate}%`, backgroundColor: '#22c55e' }}></div>
          </div>
        </div>

        <div
          onClick={() => onNavigate('STUDENTS')}
          className="glass-card p-5 rounded-2xl cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg group-hover:bg-blue-200"><Users size={20} /></div>
            <span className="text-slate-500 text-sm font-medium">Total Alumnos</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">{students.length}</div>
        </div>

        <div
          onClick={() => onNavigate('BEHAVIOR')}
          className="glass-card p-5 rounded-2xl cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg group-hover:bg-orange-200"><AlertCircle size={20} /></div>
            <span className="text-slate-500 text-sm font-medium">Incidencias (Semana)</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">
            {students.filter(s => s.behaviorPoints < 0).length}
          </div>
        </div>

        <div
          onClick={() => onNavigate('ACTIVITIES')}
          className="glass-card p-5 rounded-2xl cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg group-hover:bg-purple-200"><CheckCircle size={20} /></div>
            <span className="text-slate-500 text-sm font-medium">Tareas Entregadas</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">
            {students.reduce((acc, s) => acc + (s.completedAssignmentIds || []).length, 0)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column: Calendar & Notices */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                <CalendarIcon size={18} className="text-indigo-500" />
                Calendario
              </h3>
              <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-1">
                <button onClick={handlePrevMonth} className="p-1 hover:bg-white hover:shadow-sm rounded transition-all text-slate-500">
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm font-bold text-slate-700 min-w-[80px] text-center select-none">
                  {(MONTH_NAMES[currentDate.getMonth()] || "---").substring(0, 3)} {currentDate.getFullYear()}
                </span>
                <button onClick={handleNextMonth} className="p-1 hover:bg-white hover:shadow-sm rounded transition-all text-slate-500">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS_OF_WEEK.map(d => (
                <div key={d} className="text-center text-xs font-bold text-slate-400 py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {renderCalendar()}
            </div>
            <div className="mt-4 flex gap-2 justify-center flex-wrap">
              {Object.entries(EVENT_DOT_COLORS).map(([type, colorClass]) => (
                <div key={type} className="flex items-center gap-1 text-[10px] text-slate-500">
                  <div className={`w-2 h-2 rounded-full ${colorClass}`}></div>
                  <span>{type === 'ACTIVITY' ? 'Act' : type === 'EXAM' ? 'Exam' : type === 'MEETING' ? 'Junta' : 'Susp'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* NEW: Official Notices Widget */}
          <div className="glass-card p-6 rounded-2xl flex flex-col max-h-[400px]">
            <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <Megaphone size={18} className="text-orange-500" />
              Boletines Oficiales
            </h3>
            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
              {officialNotices.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  <Megaphone size={24} className="mx-auto mb-2 opacity-20" />
                  No hay avisos recientes de Dirección.
                </div>
              ) : (
                officialNotices.map(n => (
                  <div key={n.id} className="p-3 bg-orange-50/50 rounded-xl border border-orange-100 hover:bg-orange-50 transition-colors">
                    <div className="flex justify-between items-start mb-1 gap-2">
                      <span className="font-bold text-orange-800 text-xs leading-tight">{n.title}</span>
                      <span className="text-[9px] text-orange-600 opacity-70 whitespace-nowrap">{new Date(n.date).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-4">{n.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Grades History Section (Right 2 cols) */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><History size={20} /></div>
            <h3 className="font-semibold text-slate-700">Historial de Calificaciones (Últimas 5)</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="py-3 pl-2 font-medium">Estudiante</th>
                  <th className="py-3 font-medium">Evaluaciones Recientes</th>
                  <th className="py-3 font-medium text-right pr-2">Promedio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedStudents.map((student) => {
                  const grades = student.grades || [];
                  const lastGrades = grades.slice(-5); // Get last 5

                  const getGradeValue = (g: any) => {
                    if (typeof g === 'number') return g;
                    if (typeof g === 'string' && !isNaN(parseFloat(g))) return parseFloat(g);
                    if (typeof g === 'object' && g !== null) {
                      return (Number(g.lenguajes || 0) + Number(g.saberes || 0) + Number(g.etica || 0) + Number(g.humano || 0)) / 4;
                    }
                    return 0;
                  };

                  const avg = grades.length > 0
                    ? grades.reduce((acc, g) => acc + getGradeValue(g), 0) / grades.length
                    : 0;

                  return (
                    <tr
                      key={student.id}
                      onClick={() => setSelectedStudent(student)}
                      className="group hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <td className="py-3 pl-2">
                        <div className="flex items-center gap-3">
                          <img
                            src={student.avatar === "PENDING_LOAD" ? `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=random` : (student.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=random`)}
                            alt={student.name}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200"
                          />
                          <span className="font-medium text-slate-700 text-sm group-hover:text-indigo-600 transition-colors">{student.name}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          {lastGrades.map((grade, idx) => {
                            const val = getGradeValue(grade);
                            return (
                              <div
                                key={idx}
                                className={`w - 8 h - 8 flex items - center justify - center rounded - md text - xs font - bold border ${val >= 9 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                  val >= 8 ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                    val >= 6 ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                                      'bg-red-50 text-red-700 border-red-100'
                                  } `}
                                title={`Evaluación ${student.grades.length - lastGrades.length + idx + 1} `}
                              >
                                {val.toFixed(0)}
                              </div>
                            )
                          })}
                          {lastGrades.length < 5 && Array.from({ length: 5 - lastGrades.length }).map((_, i) => (
                            <div key={`empty - ${i} `} className="w-8 h-8 rounded-md bg-slate-50 border border-slate-100" />
                          ))}
                        </div>
                      </td>
                      <td className="py-3 text-right pr-2">
                        <span className={`font - bold text - sm px - 2 py - 1 rounded - full ${avg >= 9 ? 'bg-emerald-100 text-emerald-800' :
                          avg >= 8 ? 'bg-blue-100 text-blue-800' :
                            avg >= 6 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                          } `}>
                          {avg.toFixed(1)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-4 text-center">Haz clic en un estudiante para ver el reporte detallado.</p>
        </div>
      </div>

      {/* Student Detail Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn" onClick={() => setSelectedStudent(null)}>
          <div
            className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-indigo-600 p-6 text-white relative flex-shrink-0">
              <button
                onClick={() => setSelectedStudent(null)}
                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-4">
                <img
                  src={selectedStudent.avatar === "PENDING_LOAD" ? `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedStudent.name)}&background=random` : (selectedStudent.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedStudent.name)}&background=random`)}
                  alt={selectedStudent.name}
                  className="w-16 h-16 rounded-full border-4 border-white/30"
                />
                <div>
                  <h2 className="text-2xl font-bold">{selectedStudent.name}</h2>
                  <p className="text-indigo-200 text-sm">ID: {selectedStudent.id}</p>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto custom-scrollbar space-y-8">

              {/* RISK PLAN GENERATOR INTERFACE */}
              {loadingRisk ? (
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-8 text-center animate-pulse">
                  <Sparkles size={32} className="mx-auto text-indigo-500 mb-3 animate-spin-slow" />
                  <p className="font-bold text-indigo-700">La IA está analizando el caso y redactando el plan...</p>
                </div>
              ) : riskPlan ? (
                <div className="bg-white border-2 border-indigo-100 rounded-xl p-4 shadow-xl animate-fadeIn ring-4 ring-indigo-50">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="flex items-center gap-2 font-bold text-indigo-700">
                      <Sparkles size={18} /> Plan de Intervención Generado
                    </h4>
                    <button onClick={() => setRiskPlan(null)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
                  </div>
                  <textarea
                    className="w-full h-48 p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 mb-4 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={riskPlan}
                    onChange={(e) => setRiskPlan(e.target.value)}
                  ></textarea>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => {
                      if (!riskPlan || !selectedStudent) return;
                      // Confirmation
                      if (!window.confirm("¿Confirmar envío de reporte al tutor? Esto enviará una notificación a la App del padre.")) return;

                      const btn = document.activeElement as HTMLButtonElement;
                      if (btn) btn.disabled = true;

                      api.sendParentMessage(selectedStudent.id, riskPlan, 'TEACHER')
                        .then(() => {
                          alert("Mensaje enviado exitosamente.");
                          setRiskPlan(null);
                        })
                        .catch(err => {
                          console.error(err);
                          alert("Error al enviar: " + (err.message || 'Error desconocido'));
                          if (btn) btn.disabled = false;
                        });
                    }} className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-green-200 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none">
                      <Send size={18} /> Enviar al Tutor
                    </button>
                  </div>
                </div>
              ) : (
                // Show Generate Button if student is at risk (or always for manual trigger)
                <button onClick={handleGenerateRiskPlan} className="w-full py-4 border-2 border-dashed border-indigo-200 rounded-xl bg-indigo-50 text-indigo-600 font-bold hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2 group">
                  <Sparkles size={20} className="group-hover:scale-110 transition-transform text-yellow-500" />
                  Generar Reporte de Riesgo con IA
                </button>
              )}

              {/* Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <h4 className="flex items-center gap-2 text-slate-800 font-bold mb-3">
                    <User size={18} className="text-indigo-500" />
                    Tutor / Contacto
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Nombre:</span>
                      <span className="font-medium text-slate-700">{selectedStudent.guardianName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Teléfono:</span>
                      <span className="font-medium text-slate-700 flex items-center gap-1">
                        <Phone size={14} /> {selectedStudent.guardianPhone}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <h4 className="flex items-center gap-2 text-slate-800 font-bold mb-3">
                    <TrendingUp size={18} className="text-emerald-500" />
                    Resumen Académico
                  </h4>
                  <div className="flex justify-around text-center">
                    <div>
                      <div className="text-2xl font-bold text-slate-800">
                        {(selectedStudent.grades.length > 0
                          ? (selectedStudent.grades.reduce((acc, g: any) => {
                            const val = typeof g === 'number' ? g : (Number(g.lenguajes || 0) + Number(g.saberes || 0) + Number(g.etica || 0) + Number(g.humano || 0)) / 4;
                            return acc + val;
                          }, 0) / selectedStudent.grades.length)
                          : 0
                        ).toFixed(1)}
                      </div>
                      <div className="text-xs text-slate-500">Promedio</div>
                    </div>
                    <div>
                      <div className={`text - 2xl font - bold ${selectedStudent.behaviorPoints >= 0 ? 'text-green-600' : 'text-red-600'} `}>
                        {selectedStudent.behaviorPoints > 0 ? '+' : ''}{selectedStudent.behaviorPoints}
                      </div>
                      <div className="text-xs text-slate-500">Conducta</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-slate-800">
                        {Math.round((selectedStudent.assignmentsCompleted / selectedStudent.totalAssignments) * 100)}%
                      </div>
                      <div className="text-xs text-slate-500">Tareas</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Assignments List */}
              <div>
                <h4 className="flex items-center gap-2 text-slate-800 font-bold mb-4">
                  <BookOpen size={18} className="text-blue-500" />
                  Tareas Recientes
                </h4>
                <div className="space-y-3">
                  <div className="w-full bg-slate-100 rounded-full h-2 mb-4">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(selectedStudent.assignmentsCompleted / selectedStudent.totalAssignments) * 100}% ` }}
                    />
                  </div>
                  {getStudentAssignments(selectedStudent).map((assignment, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg hover:shadow-sm transition-shadow">
                      <div className="flex items-center gap-3">
                        <div className={`p - 1.5 rounded - full ${assignment.status === 'Completado' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'} `}>
                          {assignment.status === 'Completado' ? <CheckCircle size={16} /> : <Clock size={16} />}
                        </div>
                        <div>
                          <div className="font-medium text-slate-800 text-sm">{assignment.title}</div>
                          <div className="text-xs text-slate-400">{assignment.dueDate}</div>
                        </div>
                      </div>
                      <span className={`text - xs font - medium px - 2 py - 1 rounded - full ${assignment.status === 'Completado' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'
                        } `}>
                        {assignment.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Behavior Logs Section */}
              <div>
                <h4 className="flex items-center gap-2 text-slate-800 font-bold mb-4">
                  <ClipboardList size={18} className="text-orange-500" />
                  Registro de Incidencias (Últimas 3)
                </h4>
                <div className="space-y-3">
                  {getStudentBehaviorLogs(selectedStudent.id).length === 0 ? (
                    <div className="text-center p-4 bg-slate-50 rounded-lg border border-slate-100 text-slate-400 text-sm">
                      No hay incidencias registradas.
                    </div>
                  ) : (
                    getStudentBehaviorLogs(selectedStudent.id).map((log) => (
                      <div key={log.id} className="flex gap-4 p-3 bg-white border border-slate-100 rounded-lg shadow-sm">
                        <div className={`mt - 1 p - 2 rounded - full h - fit ${log.type === 'POSITIVE' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'} `}>
                          {log.type === 'POSITIVE' ? <ThumbsUp size={14} /> : <ThumbsDown size={14} />}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <p className="text-sm font-bold text-slate-800">
                              {log.type === 'POSITIVE' ? 'Conducta Positiva' : 'Incidencia Negativa'}
                            </p>
                            <span className="text-xs text-slate-400">{new Date(log.date).toLocaleDateString()}</span>
                          </div>
                          <p className="text-sm text-slate-600 mt-1">{log.description}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Attendance Log with Visual Week */}
              <div>
                <h4 className="flex items-center gap-2 text-slate-800 font-bold mb-4">
                  <CalendarIcon size={18} className="text-purple-500" />
                  Historial de Asistencia
                </h4>

                {/* Visual Last 5 Days */}
                <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <h5 className="text-xs font-bold text-slate-500 uppercase mb-3 tracking-wider">Últimos 5 Días Escolares</h5>
                  <div className="flex gap-2">
                    {getLastFiveWeekdays().map(date => {
                      const dateStr = date.toISOString().split('T')[0];
                      const status = selectedStudent.attendance[dateStr];
                      const dayName = date.toLocaleDateString('es-ES', { weekday: 'short' });
                      const dayNum = date.getDate();

                      let statusColor = 'bg-white border-slate-200 text-slate-400';
                      if (status === 'Presente') statusColor = 'bg-green-100 border-green-200 text-green-700';
                      if (status === 'Ausente') statusColor = 'bg-red-50 border-red-200 text-red-600';
                      if (status === 'Retardo') statusColor = 'bg-yellow-50 border-yellow-200 text-yellow-600';

                      return (
                        <div key={dateStr} className={`flex - 1 border rounded - lg p - 2 flex flex - col items - center justify - center text - center transition - all ${statusColor} `}>
                          <span className="text-[10px] uppercase font-bold opacity-70 mb-1">{dayName}</span>
                          <span className="text-xl font-bold leading-none mb-1">{dayNum}</span>
                          <span className="text-[9px] font-medium truncate w-full px-1">
                            {status || '-'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="p-3 font-medium">Fecha</th>
                        <th className="p-3 font-medium">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {Object.keys(selectedStudent.attendance).length === 0 ? (
                        <tr>
                          <td colSpan={2} className="p-4 text-center text-slate-400">Sin registros recientes</td>
                        </tr>
                      ) : (
                        Object.entries(selectedStudent.attendance).slice(-5).reverse().map(([date, status]) => (
                          <tr key={date}>
                            <td className="p-3 text-slate-600">{date}</td>
                            <td className="p-3">
                              <span className={`px - 2 py - 1 rounded text - xs font - medium ${status === 'Presente' ? 'bg-green-100 text-green-700' :
                                status === 'Ausente' ? 'bg-red-100 text-red-700' :
                                  'bg-yellow-100 text-yellow-700'
                                } `}>
                                {status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Event Modal */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn" onClick={() => setIsEventModalOpen(false)}>
          <div
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800">
                {editingEventId ? 'Editar Evento' : 'Nuevo Evento'}
              </h3>
              <button
                onClick={() => setIsEventModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Título</label>
                <input
                  required
                  type="text"
                  value={eventFormData.title}
                  onChange={e => setEventFormData({ ...eventFormData, title: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-900"
                  placeholder="Ej. Examen Parcial"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
                  <input
                    required
                    type="date"
                    value={eventFormData.date}
                    onChange={e => setEventFormData({ ...eventFormData, date: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                  <select
                    value={eventFormData.type}
                    onChange={e => setEventFormData({ ...eventFormData, type: e.target.value as any })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-900"
                  >
                    <option value="ACTIVITY">Actividad</option>
                    <option value="EXAM">Examen</option>
                    <option value="MEETING">Junta</option>
                    <option value="HOLIDAY">Suspensión</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                <textarea
                  value={eventFormData.description}
                  onChange={e => setEventFormData({ ...eventFormData, description: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-900 h-24 resize-none"
                  placeholder="Detalles adicionales..."
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};