import React, { useState, useEffect, useRef } from 'react';
import { Student, Assignment } from '../types';
import { QrCode, CheckCircle, AlertCircle, BookOpen, Download, X, Plus, Save, List, Search, AlertTriangle } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface HomeworkQRViewProps {
  students: Student[];
  assignments: Assignment[];
  onToggleAssignment: (studentId: string, assignmentId: string) => void;
  onAddAssignment: (assignment: any) => void; // Changed from (title, date) to object to match App handler
}

export const HomeworkQRView: React.FC<HomeworkQRViewProps> = ({ students, assignments, onToggleAssignment, onAddAssignment }) => {
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>(assignments[0]?.id || '');
  const [mode, setMode] = useState<'SCAN' | 'MANUAL'>('SCAN');
  const [searchTerm, setSearchTerm] = useState('');

  // ... (rest of state items are fine, not modifying them here)
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ student: Student; status: 'SUCCESS' | 'ALREADY_DONE' } | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // New Assignment State
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);

  // Auto-select first assignment if available and none selected
  useEffect(() => {
    if (!selectedAssignmentId && assignments.length > 0) {
      setSelectedAssignmentId(assignments[0].id);
    }
  }, [assignments, selectedAssignmentId]);

  // If a new assignment was just added (detected by length change), select it
  useEffect(() => {
    if (assignments.length > 0) {
      const exists = assignments.find(a => a.id === selectedAssignmentId);
      if (!exists) {
        setSelectedAssignmentId(assignments[assignments.length - 1].id);
      }
    }
  }, [assignments.length]);

  // Real Camera/Scanning Logic
  useEffect(() => {
    if (isScanning && selectedAssignmentId && mode === 'SCAN') {
      // Initialize Scanner
      const scanner = new Html5QrcodeScanner(
        "homework-reader",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
            /* verbose= */ false
      );

      scanner.render(onScanSuccess, onScanFailure);
      scannerRef.current = scanner;

      return () => {
        if (scannerRef.current) {
          scannerRef.current.clear().catch(error => console.error("Failed to clear scanner", error));
        }
      };
    }
  }, [isScanning, selectedAssignmentId, mode]);

  const onScanSuccess = (decodedText: string, decodedResult: any) => {
    if (!selectedAssignmentId) return;

    const student = students.find(s => s.id === decodedText);

    if (student) {
      const isAlreadyCompleted = student.completedAssignmentIds.includes(selectedAssignmentId);

      setScanResult({
        student,
        status: isAlreadyCompleted ? 'ALREADY_DONE' : 'SUCCESS'
      });

      if (!isAlreadyCompleted) {
        onToggleAssignment(student.id, selectedAssignmentId);
        // Success Sound
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(e => console.log("Audio play failed", e));
      } else {
        // Warning Sound (optional)
      }

      setScanError(null);
      // Clear result after 2.5 seconds to allow next scan
      setTimeout(() => setScanResult(null), 2500);
    } else {
      setScanError("Código QR no reconocido.");
      setTimeout(() => setScanError(null), 3000);
    }
  };

  const onScanFailure = (error: any) => {
    // console.warn(`Code scan error = ${error}`);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTitle.trim()) {
      // FIX: Pass object, not arguments, to match App.tsx wrapper
      onAddAssignment({
        title: newTitle,
        dueDate: newDate,
        type: 'TASK'
      });
      setNewTitle('');
      setShowCreateModal(false);
    }
  };

  const handleDownloadQR = async () => {
    if (!selectedAssignment) return;
    try {
      const response = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${selectedAssignment.id}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `QR_Tarea_${selectedAssignment.title.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading QR:', error);
      window.open(`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${selectedAssignment.id}`, '_blank');
    }
  };

  const selectedAssignment = assignments.find(a => a.id === selectedAssignmentId);
  const filteredStudents = students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 animate-fadeIn h-full flex flex-col">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Revisión de Tareas</h2>
          <p className="text-slate-500 font-medium">Registra entregas mediante código QR o lista manual</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-sm"
        >
          <Plus size={20} />
          Nueva Tarea
        </button>
      </header>

      {assignments.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center glass-card p-8 text-center rounded-2xl">
          <BookOpen size={48} className="text-slate-300 mb-4" />
          <h3 className="text-xl font-bold text-slate-700">No hay tareas registradas</h3>
          <p className="text-slate-500 mt-2 mb-6">Crea una nueva tarea para comenzar.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-colors shadow-lg"
          >
            <Plus size={20} />
            Crear Primera Tarea
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">

          {/* Controls Panel */}
          <div className="lg:col-span-1 glass-card p-6 rounded-2xl h-fit">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <BookOpen size={20} className="text-indigo-600" />
              Configuración
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Seleccionar Tarea</label>
              <div className="flex gap-2">
                <select
                  value={selectedAssignmentId}
                  onChange={(e) => setSelectedAssignmentId(e.target.value)}
                  disabled={isScanning}
                  className="flex-1 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80 text-slate-900 text-sm"
                >
                  {assignments.map(a => (
                    <option key={a.id} value={a.id}>{a.title} ({new Date(a.dueDate).toLocaleDateString()})</option>
                  ))}
                </select>
                <button
                  onClick={() => setShowQrModal(true)}
                  className="p-3 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                  title="Ver código QR de la tarea"
                >
                  <QrCode size={20} />
                </button>
              </div>
            </div>

            <div className="p-4 bg-indigo-50/50 rounded-lg border border-indigo-100 mb-6">
              <div className="text-sm text-indigo-800 font-medium">Progreso de Entrega</div>
              {selectedAssignment && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span>Completados</span>
                    <span className="font-bold">
                      {students.filter(s => s.completedAssignmentIds.includes(selectedAssignmentId)).length} / {students.length}
                    </span>
                  </div>
                  <div className="w-full bg-white h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full transition-all duration-500"
                      style={{ width: `${students.length > 0 ? (students.filter(s => s.completedAssignmentIds.includes(selectedAssignmentId)).length / students.length) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            {/* Mode Switcher */}
            <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
              <button
                onClick={() => { setMode('SCAN'); setIsScanning(false); }}
                className={`flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${mode === 'SCAN' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                <QrCode size={16} /> Escáner
              </button>
              <button
                onClick={() => { setMode('MANUAL'); setIsScanning(false); }}
                className={`flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${mode === 'MANUAL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                <List size={16} /> Lista Manual
              </button>
            </div>

            {mode === 'SCAN' ? (
              <>
                <button
                  onClick={() => setIsScanning(!isScanning)}
                  className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2 ${isScanning
                    ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                >
                  <QrCode size={24} />
                  {isScanning ? 'Detener Escáner' : 'Iniciar Cámara'}
                </button>
                <p className="text-xs text-slate-400 text-center mt-3">
                  {isScanning ? "Apunte la cámara al código QR del alumno" : "Presione para comenzar a revisar"}
                </p>
              </>
            ) : (
              <div className="p-4 bg-slate-50 rounded-xl text-center text-sm text-slate-500 border border-slate-100">
                <p>Modo manual activo.</p>
                <p className="mt-1">Busque al alumno en la lista para marcar la tarea como entregada.</p>
              </div>
            )}
          </div>

          {/* Right Panel: Scanner or Manual List */}
          <div className="lg:col-span-2 rounded-2xl overflow-hidden shadow-sm relative flex flex-col min-h-[400px]">

            {mode === 'SCAN' ? (
              <div className="bg-slate-100 w-full h-full relative flex items-center justify-center rounded-2xl overflow-hidden border border-slate-200">
                {/* Background Effect */}
                {!isScanning && (
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-slate-200 flex flex-col items-center justify-center text-slate-500">
                    <QrCode size={64} className="opacity-20 mb-4" />
                    <p>Cámara inactiva</p>
                  </div>
                )}

                {isScanning && (
                  <div id="homework-reader" className="w-full h-full"></div>
                )}

                {/* Scan Result Overlay */}
                {scanResult && (
                  <div className="absolute inset-0 z-30 bg-slate-900/95 flex flex-col items-center justify-center p-8 text-center animate-fadeIn backdrop-blur-sm">
                    <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 ${scanResult.status === 'SUCCESS' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                      }`}>
                      {scanResult.status === 'SUCCESS' ? <CheckCircle size={64} /> : <AlertCircle size={64} />}
                    </div>

                    <h2 className="text-4xl font-bold text-white mb-2">{scanResult.student.name}</h2>
                    <p className="text-xl text-slate-300 mb-6">ID: {scanResult.student.id}</p>

                    {scanResult.status === 'SUCCESS' ? (
                      <div className="bg-green-500/20 text-green-300 px-6 py-3 rounded-full border border-green-500/50 font-bold text-lg">
                        ¡Tarea Registrada Correctamente!
                      </div>
                    ) : (
                      <div className="bg-yellow-500/20 text-yellow-300 px-6 py-3 rounded-full border border-yellow-500/50 font-bold text-lg">
                        Esta tarea ya estaba registrada
                      </div>
                    )}
                  </div>
                )}

                {scanError && (
                  <div className="absolute bottom-10 z-30 bg-red-500/90 text-white px-6 py-3 rounded-full font-bold animate-bounce flex items-center gap-2">
                    <AlertTriangle size={20} />
                    {scanError}
                  </div>
                )}
              </div>
            ) : (
              // Manual Mode List
              <div className="glass-card flex flex-col h-full rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                  <Search className="text-slate-400" size={20} />
                  <input
                    type="text"
                    placeholder="Buscar alumno por nombre..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-slate-700 placeholder:text-slate-400 font-medium"
                  />
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                  {filteredStudents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8">
                      <Search size={32} className="mb-2 opacity-50" />
                      <p>No se encontraron alumnos.</p>
                    </div>
                  ) : (
                    filteredStudents.map(student => {
                      const isCompleted = student.completedAssignmentIds.includes(selectedAssignmentId);
                      return (
                        <div
                          key={student.id}
                          onClick={() => onToggleAssignment(student.id, selectedAssignmentId)}
                          className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-100 cursor-pointer group"
                        >
                          <div className="flex items-center gap-3">
                            <img src={student.avatar} alt="" className="w-10 h-10 rounded-full object-cover border border-slate-100" />
                            <div>
                              <div className="font-bold text-slate-800">{student.name}</div>
                              <div className="text-xs text-slate-400">ID: {student.id}</div>
                            </div>
                          </div>

                          <div className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors ${isCompleted
                            ? 'bg-green-100 text-green-700 group-hover:bg-green-200'
                            : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
                            }`}>
                            {isCompleted ? (
                              <>
                                <CheckCircle size={18} />
                                Entregado
                              </>
                            ) : (
                              <>
                                <div className="w-4 h-4 rounded-full border-2 border-slate-400"></div>
                                Pendiente
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Assignment QR Modal */}
      {showQrModal && selectedAssignment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl flex flex-col items-center"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-full flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-800">QR de Actividad</h3>
                <p className="text-xs text-slate-500">Para compartir o imprimir</p>
              </div>
              <button onClick={() => setShowQrModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="text-center mb-6 bg-slate-50 p-3 rounded-lg w-full">
              <h4 className="font-bold text-indigo-700 text-lg">{selectedAssignment.title}</h4>
              <p className="text-sm text-slate-500">Fecha Límite: {new Date(selectedAssignment.dueDate).toLocaleDateString()}</p>
            </div>

            <div className="bg-white p-4 rounded-xl border-2 border-slate-100 shadow-inner mb-6">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${selectedAssignment.id}`}
                alt={`QR Code for ${selectedAssignment.title}`}
                className="w-56 h-56 mix-blend-multiply"
              />
            </div>

            <button
              onClick={handleDownloadQR}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
            >
              <Download size={20} />
              Descargar QR
            </button>
          </div>
        </div>
      )}

      {/* Create Assignment Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">Crear Nueva Tarea</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Título de la Tarea</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ej. Resumen del Capítulo 4"
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-900"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Límite</label>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-900"
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                >
                  <Save size={20} />
                  Guardar Tarea
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};