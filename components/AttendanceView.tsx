import React, { useState, useEffect, useRef } from 'react';
import { Student, AttendanceStatus } from '../types';
import { QrCode, CheckCircle, XCircle, Users, Clock, AlertTriangle, Search, Calendar } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface AttendanceViewProps {
  students: Student[];
  onUpdateAttendance: (studentId: string, status: AttendanceStatus, date?: string) => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({ students, onUpdateAttendance }) => {
  const [mode, setMode] = useState<'LIST' | 'SCAN'>('LIST');
  const [lastScanned, setLastScanned] = useState<Student | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // Stats
  const stats = {
    present: students.filter(s => s.attendance[selectedDate] === AttendanceStatus.PRESENT).length,
    absent: students.filter(s => s.attendance[selectedDate] === AttendanceStatus.ABSENT).length,
    late: students.filter(s => s.attendance[selectedDate] === AttendanceStatus.LATE).length,
    total: students.length
  };

  useEffect(() => {
    if (mode === 'SCAN') {
      // Initialize Scanner
      const scanner = new Html5QrcodeScanner(
        "reader",
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
  }, [mode]);

  const onScanSuccess = (decodedText: string, decodedResult: any) => {
    // Handle the scanned code
    const student = students.find(s => s.id === decodedText);
    if (student) {
      setLastScanned(student);
      onUpdateAttendance(student.id, AttendanceStatus.PRESENT, selectedDate);
      setScanError(null);

      // Play success sound (optional)
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play().catch(e => console.log("Audio play failed", e));

      // Clear success message after 3 seconds
      setTimeout(() => setLastScanned(null), 3000);
    } else {
      setScanError("Código QR no reconocido en el sistema.");
      setTimeout(() => setScanError(null), 3000);
    }
  };

  const onScanFailure = (error: any) => {
    // console.warn(`Code scan error = ${error}`);
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.id.includes(searchTerm)
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Control de Asistencia</h2>
          <div className="flex items-center gap-2 mt-1">
            <Calendar size={18} className="text-slate-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-none text-slate-500 font-medium focus:ring-0 cursor-pointer"
            />
          </div>
        </div>

        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setMode('LIST')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${mode === 'LIST' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Lista Manual
          </button>
          <button
            onClick={() => setMode('SCAN')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${mode === 'SCAN' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <QrCode size={16} />
            Escanear QR
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-full">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">Total</p>
            <p className="text-2xl font-extrabold text-slate-800">{stats.total}</p>
          </div>
        </div>
        <div className="glass-card p-4 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-green-100 text-green-600 rounded-full">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">Presentes</p>
            <p className="text-2xl font-extrabold text-green-600">{stats.present}</p>
          </div>
        </div>
        <div className="glass-card p-4 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-red-100 text-red-600 rounded-full">
            <XCircle size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">Ausentes</p>
            <p className="text-2xl font-extrabold text-red-600">{stats.absent}</p>
          </div>
        </div>
        <div className="glass-card p-4 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-yellow-100 text-yellow-600 rounded-full">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">Retardos</p>
            <p className="text-2xl font-extrabold text-yellow-600">{stats.late}</p>
          </div>
        </div>
      </div>

      {/* Scanner Mode */}
      {mode === 'SCAN' && (
        <div className="glass-card p-6 rounded-2xl animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Scanner Area */}
            <div className="flex flex-col items-center">
              <div id="reader" className="w-full max-w-sm overflow-hidden rounded-xl border-2 border-slate-200 shadow-inner bg-slate-50"></div>
              <p className="text-sm text-slate-500 mt-4 text-center">
                Coloca el código QR del alumno frente a la cámara.
              </p>
            </div>

            {/* Result Area */}
            <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-xl border border-slate-100">
              {lastScanned ? (
                <div className="text-center animate-bounce">
                  <div className="w-24 h-24 mx-auto mb-4 rounded-full border-4 border-green-500 p-1">
                    <img src={lastScanned.avatar} alt={lastScanned.name} className="w-full h-full rounded-full object-cover" />
                  </div>
                  <h3 className="text-2xl font-extrabold text-slate-800 mb-1">{lastScanned.name}</h3>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full font-bold">
                    <CheckCircle size={20} />
                    Asistencia Registrada
                  </div>
                </div>
              ) : scanError ? (
                <div className="text-center animate-pulse">
                  <div className="w-20 h-20 mx-auto mb-4 bg-red-100 text-red-500 rounded-full flex items-center justify-center">
                    <AlertTriangle size={40} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-1">Error de Lectura</h3>
                  <p className="text-red-500 font-medium">{scanError}</p>
                </div>
              ) : (
                <div className="text-center opacity-50">
                  <QrCode size={64} className="mx-auto mb-4 text-slate-300" />
                  <p className="text-lg font-medium text-slate-400">Esperando escaneo...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* List Mode */}
      {mode === 'LIST' && (
        <div className="glass-card rounded-2xl overflow-hidden">
          {/* Search Bar */}
          <div className="p-4 border-b border-slate-100 bg-white/50 backdrop-blur-sm">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar alumno..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80"
              />
            </div>
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/80 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-4 font-bold">Estudiante</th>
                  <th className="p-4 font-bold text-center">Estado</th>
                  <th className="p-4 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map(student => {
                  const status = student.attendance[selectedDate] || 'PENDIENTE';
                  return (
                    <tr key={student.id} className="hover:bg-indigo-50/30 transition-colors group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img src={student.avatar} alt={student.name} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" />
                          <div>
                            <div className="font-bold text-slate-800 text-sm">{student.name}</div>
                            <div className="text-xs text-slate-500 font-mono">ID: {student.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold shadow-sm
                                ${status === AttendanceStatus.PRESENT ? 'bg-green-100 text-green-700 border border-green-200' :
                            status === AttendanceStatus.ABSENT ? 'bg-red-100 text-red-700 border border-red-200' :
                              status === AttendanceStatus.LATE ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                                'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}>
                          {status === 'PENDIENTE' as any ? 'NO REGISTRADO' : status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onUpdateAttendance(student.id, AttendanceStatus.PRESENT, selectedDate)}
                            className={`p-2 rounded-lg transition-all ${status === AttendanceStatus.PRESENT ? 'bg-green-500 text-white shadow-md' : 'hover:bg-green-100 text-green-600'}`}
                            title="Presente"
                          >
                            <CheckCircle size={18} />
                          </button>
                          <button
                            onClick={() => onUpdateAttendance(student.id, AttendanceStatus.LATE, selectedDate)}
                            className={`p-2 rounded-lg transition-all ${status === AttendanceStatus.LATE ? 'bg-yellow-500 text-white shadow-md' : 'hover:bg-yellow-100 text-yellow-600'}`}
                            title="Retardo"
                          >
                            <Clock size={18} />
                          </button>
                          <button
                            onClick={() => onUpdateAttendance(student.id, AttendanceStatus.ABSENT, selectedDate)}
                            className={`p-2 rounded-lg transition-all ${status === AttendanceStatus.ABSENT ? 'bg-red-500 text-white shadow-md' : 'hover:bg-red-100 text-red-600'}`}
                            title="Ausente"
                          >
                            <XCircle size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="md:hidden divide-y divide-slate-100 bg-white">
            {filteredStudents.map(student => {
              const status = student.attendance[selectedDate] || 'PENDIENTE';
              return (
                <div key={student.id} className="p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={student.avatar} alt={student.name} className="w-12 h-12 rounded-full object-cover border border-slate-100" />
                      <div>
                        <div className="font-bold text-slate-800 text-sm line-clamp-1">{student.name}</div>
                        <div className="text-xs text-slate-500">ID: {student.id}</div>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase
                        ${status === AttendanceStatus.PRESENT ? 'bg-green-100 text-green-700' :
                        status === AttendanceStatus.ABSENT ? 'bg-red-100 text-red-700' :
                          status === AttendanceStatus.LATE ? 'bg-yellow-100 text-yellow-700' :
                            'bg-slate-100 text-slate-400'
                      }`}>
                      {status === 'PENDIENTE' as any ? 'SR' : status}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => onUpdateAttendance(student.id, AttendanceStatus.PRESENT, selectedDate)}
                      className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all text-sm
                        ${status === AttendanceStatus.PRESENT ? 'bg-green-500 text-white shadow-md ring-2 ring-green-200' : 'bg-green-50 text-green-600 border border-green-200'}`}
                    >
                      <CheckCircle size={18} /> Asistir
                    </button>
                    <button
                      onClick={() => onUpdateAttendance(student.id, AttendanceStatus.LATE, selectedDate)}
                      className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all text-sm
                        ${status === AttendanceStatus.LATE ? 'bg-yellow-500 text-white shadow-md ring-2 ring-yellow-200' : 'bg-yellow-50 text-yellow-600 border border-yellow-200'}`}
                    >
                      <Clock size={18} /> Retardo
                    </button>
                    <button
                      onClick={() => onUpdateAttendance(student.id, AttendanceStatus.ABSENT, selectedDate)}
                      className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all text-sm
                        ${status === AttendanceStatus.ABSENT ? 'bg-red-500 text-white shadow-md ring-2 ring-red-200' : 'bg-red-50 text-red-600 border border-red-200'}`}
                    >
                      <XCircle size={18} /> Falta
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};