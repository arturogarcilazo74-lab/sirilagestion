import React, { useState, useEffect, useMemo } from 'react';
import { Student, BehaviorLog } from '../types';
import {
  ThumbsUp, ThumbsDown, AlertTriangle, Star, MessageCircle,
  X, Send, Trophy, Medal, Pen, Check, Search, Filter,
  Clock, Flame, Award, Zap, ChevronRight, User
} from 'lucide-react';

interface BehaviorViewProps {
  students: Student[];
  onLogBehavior: (studentId: string, type: 'POSITIVE' | 'NEGATIVE', desc: string) => void;
  logs: BehaviorLog[];
  onEditStudent: (id: string, data: Partial<Student>) => void;
  totalAssignmentCount: number;
}

const POSITIVE_PRESETS = [
  'Participación destacada',
  'Ayuda a compañeros',
  'Trabajo excelente',
  'Orden y limpieza',
  'Superación personal',
  'Liderazgo positivo'
];

const NEGATIVE_PRESETS = [
  'Interrupción de clase',
  'Falta de materiales',
  'No trajo tarea',
  'Falta de respeto',
  'Uso de celular',
  'Incumplimiento de normas'
];

export const BehaviorView: React.FC<BehaviorViewProps> = ({ students, onLogBehavior, logs, onEditStudent, totalAssignmentCount }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  const [selectedStudentForAction, setSelectedStudentForAction] = useState<Student | null>(null);
  const [actionType, setActionType] = useState<'POSITIVE' | 'NEGATIVE' | null>(null);
  const [customNote, setCustomNote] = useState('');
  const [notification, setNotification] = useState<{ student: Student, message: string } | null>(null);

  // Groups for filtering
  const groups = useMemo(() => {
    const g = Array.from(new Set(students.map(s => s.group || 'General'))).sort();
    return ['ALL', ...g];
  }, [students]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesGroup = selectedGroup === 'ALL' || (s.group || 'General') === selectedGroup;
      return matchesSearch && matchesGroup;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [students, searchTerm, selectedGroup]);

  const handleQuickLog = (student: Student, type: 'POSITIVE' | 'NEGATIVE', reason: string) => {
    onLogBehavior(student.id, type, reason);

    if (type === 'NEGATIVE') {
      const message = `Hola ${student.guardianName}, le informamos de la dirección que su hijo(a) ${student.name} ha registrado una incidencia de conducta: "${reason}". Agradecemos su atención.`;
      setNotification({ student, message });
      setTimeout(() => setNotification(null), 8000);
    }

    // Close modal/overlay
    setSelectedStudentForAction(null);
    setActionType(null);
    setCustomNote('');
  };

  const getPointsColor = (points: number) => {
    if (points > 10) return 'text-emerald-500 bg-emerald-50 border-emerald-100';
    if (points > 0) return 'text-green-500 bg-green-50 border-green-100';
    if (points === 0) return 'text-slate-400 bg-slate-50 border-slate-100';
    if (points > -5) return 'text-orange-500 bg-orange-50 border-orange-100';
    return 'text-red-500 bg-red-50 border-red-100';
  };

  return (
    <div className="flex flex-col h-full gap-4 md:gap-6 animate-fadeIn p-4 md:p-8 overflow-hidden">

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar alumno por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-700"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 max-w-full">
          {groups.map(g => (
            <button
              key={g}
              onClick={() => setSelectedGroup(g)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${selectedGroup === g
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                : 'bg-white text-slate-500 border border-slate-200 hover:border-indigo-300'
                }`}
            >
              {g === 'ALL' ? 'Todos' : g}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden flex-1 min-h-0">

        {/* Main Grid: Student Cards */}
        <div className="lg:col-span-8 overflow-y-auto pr-2 custom-scrollbar h-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredStudents.map(student => (
              <div
                key={student.id}
                className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all p-4 flex flex-col justify-between"
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="relative">
                    <img
                      src={student.avatar || `https://ui-avatars.com/api/?name=${student.name}`}
                      className="w-12 h-12 rounded-full object-cover border-2 border-slate-100"
                      alt=""
                    />
                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black ${getPointsColor(student.behaviorPoints)}`}>
                      {student.behaviorPoints}
                    </div>
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="font-bold text-slate-800 truncate text-sm leading-tight">{student.name}</h4>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">{student.group || 'Sin Grupo'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setSelectedStudentForAction(student);
                      setActionType('POSITIVE');
                    }}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-50 text-emerald-600 rounded-xl font-bold text-xs hover:bg-emerald-100 border border-emerald-100 transition-colors"
                  >
                    <ThumbsUp size={14} /> Positivo
                  </button>
                  <button
                    onClick={() => {
                      setSelectedStudentForAction(student);
                      setActionType('NEGATIVE');
                    }}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-rose-50 text-rose-600 rounded-xl font-bold text-xs hover:bg-rose-100 border border-rose-100 transition-colors"
                  >
                    <ThumbsDown size={14} /> Negativo
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredStudents.length === 0 && (
            <div className="text-center py-20 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
              <Search className="mx-auto text-slate-300 mb-4" size={48} />
              <p className="text-slate-500 font-medium">No se encontraron alumnos con ese nombre.</p>
            </div>
          )}
        </div>

        {/* Side Panel: Recent Feed and Stats */}
        <div className="lg:col-span-4 flex flex-col gap-6 overflow-hidden h-full min-h-0">

          {/* Recent History Mini-Feed */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col flex-1 overflow-hidden min-h-[150px]">
            <div className="p-4 border-b border-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                <Clock size={16} className="text-indigo-500" /> Historial Reciente
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {logs.slice(-15).reverse().map((log) => (
                <div key={log.id} className="flex gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${log.type === 'POSITIVE' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                    }`}>
                    {log.type === 'POSITIVE' ? <ThumbsUp size={14} /> : <ThumbsDown size={14} />}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-slate-800 truncate">{log.studentName}</p>
                    <p className="text-[10px] text-slate-500 line-clamp-1">{log.description}</p>
                  </div>
                </div>
              ))}
              {logs.length === 0 && (
                <p className="text-center text-xs text-slate-400 py-8">Sin registros hoy</p>
              )}
            </div>
          </div>

          {/* Top Performers Mini-Dashboard */}
          <div className="bg-indigo-600 rounded-[2rem] p-5 text-white shadow-lg shadow-indigo-200 flex flex-col gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <Trophy size={20} className="text-indigo-200" />
              <h3 className="font-bold">Cuadro de Honor</h3>
            </div>

            <div className="space-y-3">
              {[...students].sort((a, b) => b.behaviorPoints - a.behaviorPoints).slice(0, 3).map((s, idx) => (
                <div key={s.id} className="flex items-center justify-between bg-white/10 p-2 rounded-xl backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <span className="font-black text-indigo-200 w-4">{idx + 1}</span>
                    <img src={s.avatar || `https://ui-avatars.com/api/?name=${s.name}`} className="w-8 h-8 rounded-full border border-white/20" alt="" />
                    <span className="text-xs font-bold truncate max-w-[120px]">{s.name}</span>
                  </div>
                  <span className="font-black bg-white text-indigo-600 px-2 py-0.5 rounded-lg text-xs">
                    {s.behaviorPoints}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Modal/Overlay */}
      {selectedStudentForAction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn" onClick={() => setSelectedStudentForAction(null)}>
          <div
            className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-scaleIn"
            onClick={e => e.stopPropagation()}
          >
            <div className={`p-6 text-white flex justify-between items-start ${actionType === 'POSITIVE' ? 'bg-emerald-600' : 'bg-rose-600'
              }`}>
              <div className="flex items-center gap-4">
                <img
                  src={selectedStudentForAction.avatar || `https://ui-avatars.com/api/?name=${selectedStudentForAction.name}`}
                  className="w-16 h-16 rounded-2xl border-2 border-white/20 object-cover"
                  alt=""
                />
                <div>
                  <h3 className="text-xl font-black">{selectedStudentForAction.name}</h3>
                  <p className="text-white/80 font-bold uppercase text-xs tracking-widest">{actionType === 'POSITIVE' ? 'Puntos Positivos' : 'Incidencia Negativa'}</p>
                </div>
              </div>
              <button onClick={() => setSelectedStudentForAction(null)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Selecciona un motivo común:</label>
                <div className="grid grid-cols-2 gap-3">
                  {(actionType === 'POSITIVE' ? POSITIVE_PRESETS : NEGATIVE_PRESETS).map(preset => (
                    <button
                      key={preset}
                      onClick={() => handleQuickLog(selectedStudentForAction, actionType!, preset)}
                      className={`p-3 rounded-2xl border text-sm font-bold text-center transition-all ${actionType === 'POSITIVE'
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-600 hover:text-white'
                        : 'bg-rose-50 border-rose-100 text-rose-700 hover:bg-rose-600 hover:text-white'
                        }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-x-0 top-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase tracking-widest font-black">
                  <span className="px-3 bg-white text-slate-400 italic">O escribe un motivo personalizado</span>
                </div>
              </div>

              <div className="space-y-4">
                <textarea
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="Escribe aquí el detalle de la conducta..."
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl h-24 resize-none outline-none focus:border-indigo-500 transition-all font-medium text-slate-700"
                />
                <button
                  disabled={!customNote.trim()}
                  onClick={() => handleQuickLog(selectedStudentForAction, actionType!, customNote)}
                  className={`w-full py-4 rounded-2xl font-black text-white flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 ${actionType === 'POSITIVE'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
                    }`}
                >
                  <Send size={20} /> Registrar Incidencia
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-[110] animate-fadeIn">
          <div className="bg-slate-900 text-white rounded-3xl shadow-2xl p-6 max-w-sm border border-white/10 flex flex-col gap-4 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full -mr-8 -mt-8"></div>

            <div className="flex items-start gap-4">
              <div className="p-3 bg-indigo-600 rounded-2xl shrink-0 shadow-lg shadow-indigo-500/30">
                <MessageCircle size={24} className="text-white" />
              </div>
              <div className="relative">
                <h4 className="font-bold text-lg leading-tight">Enviar Reporte</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  ¿Deseas enviar un WhatsApp a <span className="text-white font-bold">{notification.student.guardianName}</span> sobre esta incidencia?
                </p>
              </div>
              <button onClick={() => setNotification(null)} className="text-slate-500 hover:text-white transition-colors shrink-0">
                <X size={20} />
              </button>
            </div>

            <a
              href={`https://wa.me/${notification.student.guardianPhone?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(notification.message)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setNotification(null)}
              className="bg-green-600 hover:bg-green-700 text-white font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-900/40 active:scale-95 text-sm"
            >
              <Send size={18} /> Enviar vía WhatsApp
            </a>
          </div>
        </div>
      )}

    </div>
  );
};