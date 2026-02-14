import React, { useState, useRef } from 'react';
import { Student, SchoolConfig, BehaviorLog, Assignment } from '../types';
import { generateReportCard, generateBehaviorReport, generateStudentCredentials } from '../services/pdfGenerator';
import { Plus, Search, Edit2, Trash2, X, Save, User, Phone, Image as ImageIcon, QrCode, Download, FileText, Printer, Building2, Calendar, MapPin, Hash, GraduationCap, AlertCircle, Upload, FileSpreadsheet, Cake, CheckCircle, FileDown, Users, RectangleHorizontal, PieChart, CheckCircle2, Circle } from 'lucide-react';
import { GroupAnalysisModal } from './GroupAnalysisModal';

interface StudentsViewProps {
  students: Student[];
  onAdd: (student: Omit<Student, 'id' | 'attendance' | 'behaviorPoints' | 'assignmentsCompleted' | 'totalAssignments' | 'participationCount' | 'grades' | 'completedAssignmentIds'> & { id?: string }) => void;
  onEdit: (id: string, data: Partial<Student>) => void;
  onDelete: (id: string) => void;
  onImport?: (students: Partial<Student>[]) => void;
  config: SchoolConfig;
  logs: BehaviorLog[];
  assignments?: Assignment[];
  readOnly?: boolean;
}

const INITIAL_FORM_DATA: Omit<Student, 'id' | 'attendance' | 'behaviorPoints' | 'assignmentsCompleted' | 'totalAssignments' | 'participationCount' | 'completedAssignmentIds'> & { id?: string } = {
  id: '',
  name: '',
  curp: '',
  sex: 'HOMBRE',
  birthDate: '',
  birthPlace: '',
  enrollmentDate: new Date().toISOString().split('T')[0],
  status: 'INSCRITO',
  repeater: false,
  bap: 'NINGUNA',
  usaer: false,
  avatar: '',
  guardianName: '',
  guardianPhone: '',
  annualFeePaid: false,
  grades: [],
  address: '',
  guardianOccupation: ''
};

export const StudentsView: React.FC<StudentsViewProps> = ({ students, onAdd, onEdit, onDelete, onImport, config, logs, assignments = [], readOnly }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [qrStudent, setQrStudent] = useState<Student | null>(null);
  const [reportStudent, setReportStudent] = useState<Student | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);

  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('ALL');

  // Extract unique groups from students
  const studentGroups = Array.from(new Set(students.map(s => s.group || config?.gradeGroup || 'Sin Grupo'))).sort();

  const filteredStudents = students
    .filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.guardianName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.curp?.toLowerCase().includes(searchTerm.toLowerCase());

      const sGroup = s.group || config?.gradeGroup || 'Sin Grupo';
      const matchesGroup = selectedGroupFilter === 'ALL' || sGroup === selectedGroupFilter;

      return matchesSearch && matchesGroup;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const getAge = (dateString: string) => {
    if (!dateString) return '';
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleOpenModal = (student?: Student) => {
    if (readOnly) return;
    if (student) {
      setEditingId(student.id);
      setFormData({
        id: student.id,
        name: student.name,
        curp: student.curp || '',
        sex: student.sex || 'HOMBRE',
        birthDate: student.birthDate || '',
        birthPlace: student.birthPlace || '',
        enrollmentDate: student.enrollmentDate || '',
        status: student.status || 'INSCRITO',
        repeater: student.repeater || false,
        bap: student.bap || 'NINGUNA',
        usaer: student.usaer || false,
        guardianName: student.guardianName,
        guardianPhone: student.guardianPhone,
        avatar: student.avatar,
        annualFeePaid: student.annualFeePaid || false,
        grades: student.grades || [],
        group: student.group || '',
        address: student.address || '',
        guardianOccupation: student.guardianOccupation || ''
      });
    } else {
      setEditingId(null);
      setFormData({
        ...INITIAL_FORM_DATA,
        group: config.gradeGroup || '',
        avatar: `https://picsum.photos/100/100?random=${Math.floor(Math.random() * 1000)}`
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      onEdit(editingId, formData);
      setSuccessMessage('Información actualizada correctamente');
    } else {
      onAdd(formData);
      setSuccessMessage('Alumno registrado exitosamente');
    }
    setIsModalOpen(false);

    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
  };

  const handleDeleteClick = (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este alumno? Esta acción no se puede deshacer.')) {
      onDelete(id);
    }
  };

  const handleDownloadQR = async (student: Student) => {
    try {
      const response = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${student.id}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `QR_${student.name.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading QR:', error);
      window.open(`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${student.id}`, '_blank');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadTemplate = () => {
    const headers = [
      'CLAVE_ALUMNO',
      'CURP',
      'NOMBRE_COMPLETO',
      'SEXO (HOMBRE/MUJER)',
      'FECHA_NACIMIENTO (YYYY-MM-DD)',
      'LUGAR_NACIMIENTO',
      'FECHA_INSCRIPCION (YYYY-MM-DD)',
      'ESTATUS (INSCRITO/BAJA/TRASLADO)',
      'GRADO_Y_GRUPO',
      'ES_REPETIDOR (SI/NO)',
      'BAP (NINGUNA o descripción)',
      'USAER (SI/NO)',
      'NOMBRE_TUTOR',
      'TELEFONO_TUTOR',
      'TRIM1_LENGUAJES',
      'TRIM1_SABERES',
      'TRIM1_ETICA',
      'TRIM1_HUMANO',
      'TRIM2_LENGUAJES',
      'TRIM2_SABERES',
      'TRIM2_ETICA',
      'TRIM2_HUMANO',
      'TRIM3_LENGUAJES',
      'TRIM3_SABERES',
      'TRIM3_ETICA',
      'TRIM3_HUMANO'
    ];
    const csvContent = headers.join(',');
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `plantilla_alumnos_completa_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImport) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      // Robust line splitting
      const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
      if (lines.length < 2) {
        alert('El archivo no contiene datos suficientes (se ignoran filas vacías y encabezado).');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      // Detect separator based on header
      const headerLine = lines[0];
      const separator = headerLine.includes(';') ? ';' : ',';

      console.log(`Detected CSV separator: "${separator}"`);

      const dataLines = lines.slice(1);

      const importedStudents: Partial<Student>[] = dataLines.map((line, index) => {
        const cols = line.split(separator).map(c => c.trim());

        // Basic validation: Name and at least some other field
        if (cols.length < 2) {
          console.warn(`Skipping line ${index + 2}: Insufficient columns`);
          return null;
        }

        const name = cols[0];
        if (!name) return null;

        // Helper function to parse SI/NO to boolean
        const parseBool = (val: string) => val?.toUpperCase().trim() === 'SI';

        // Helper to parse grade value (handling empty or invalid)
        const parseGrade = (val: string | undefined): number => {
          if (!val || val.trim() === '') return 0;
          const parsed = parseFloat(val);
          return isNaN(parsed) ? 0 : Math.max(5, Math.min(10, parsed)); // Clamp between 5-10
        };

        return {
          id: cols[0]?.trim() || undefined, // CLAVE_ALUMNO (auto-generated if empty)
          curp: cols[1]?.toUpperCase() || '',
          name: cols[2]?.toUpperCase() || name.toUpperCase(),
          sex: cols[3]?.toUpperCase().includes('MUJER') ? 'MUJER' : 'HOMBRE',
          birthDate: cols[4] || '',
          birthPlace: cols[5]?.toUpperCase() || '',
          enrollmentDate: cols[6] || new Date().toISOString().split('T')[0], // FECHA_INSCRIPCION
          status: (cols[7]?.toUpperCase().includes('BAJA') ? 'BAJA' :
            cols[7]?.toUpperCase().includes('TRASLADO') ? 'TRASLADO' :
              'INSCRITO') as any,
          group: cols[8]?.trim().toUpperCase(), // GRADO_Y_GRUPO
          repeater: parseBool(cols[9]), // ES_REPETIDOR
          bap: cols[10]?.toUpperCase() || 'NINGUNA', // BAP
          usaer: parseBool(cols[11]), // USAER
          guardianName: cols[12]?.toUpperCase() || '',
          guardianPhone: cols[13] || '',
          grades: [
            // Trimestre 1
            {
              lenguajes: parseGrade(cols[14]),
              saberes: parseGrade(cols[15]),
              etica: parseGrade(cols[16]),
              humano: parseGrade(cols[17])
            },
            // Trimestre 2
            {
              lenguajes: parseGrade(cols[18]),
              saberes: parseGrade(cols[19]),
              etica: parseGrade(cols[20]),
              humano: parseGrade(cols[21])
            },
            // Trimestre 3
            {
              lenguajes: parseGrade(cols[22]),
              saberes: parseGrade(cols[23]),
              etica: parseGrade(cols[24]),
              humano: parseGrade(cols[25])
            }
          ]
        };
      }).filter(s => s !== null) as Partial<Student>[];

      if (importedStudents.length > 0) {
        if (window.confirm(`Se encontraron ${importedStudents.length} alumnos válidos. ¿Desea importarlos?`)) {
          onImport(importedStudents);
          setSuccessMessage(`${importedStudents.length} alumnos importados correctamente`);
          setTimeout(() => setSuccessMessage(null), 3000);
        }
      } else {
        alert(`No se encontraron datos válidos. \nPosible causa: Formato de archivo incorrecto.\nSeparador detectado: [ ${separator} ]\nVerifique que el archivo CSV no esté dañado.`);
      }

      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const [isProcessing, setIsProcessing] = useState(false);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessing(true); // Start processing
      if (file.size > 5 * 1024 * 1024) {
        alert("La imagen es demasiado grande. Se intentará comprimir.");
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 300; // Resize to max 300x300 for LocalStorage safety

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // Compress to JPEG with 0.7 quality to save substantial space
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
            setFormData(prev => ({ ...prev, avatar: compressedDataUrl }));
            setIsProcessing(false); // Done
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Directorio de Alumnos</h2>
          <p className="text-slate-500">Gestión de inscripciones y reportes</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {!readOnly && (
            <>
              <button
                onClick={handleDownloadTemplate}
                className="flex items-center justify-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
                title="Descargar plantilla CSV"
              >
                <FileSpreadsheet size={20} />
                <span className="hidden md:inline">Plantilla</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
              >
                <Upload size={20} />
                <span className="hidden md:inline">Importar</span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".csv"
                onChange={handleFileUpload}
              />
            </>
          )}
          <button
            onClick={() => setIsAnalysisOpen(true)}
            className="flex items-center justify-center gap-2 bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
          >
            <PieChart size={20} />
            <span className="hidden md:inline">Análisis Grupal</span>
          </button>
          <button
            onClick={() => generateStudentCredentials(students, config)}
            className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
          >
            <RectangleHorizontal size={20} />
            <span className="hidden md:inline">Credenciales</span>
          </button>
          {!readOnly && (
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
            >
              <Plus size={20} />
              <span className="hidden md:inline">Nuevo Alumno</span>
              <span className="md:hidden">Nuevo</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-full">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">Total Alumnos</p>
            <p className="text-2xl font-extrabold text-slate-800">{students.length}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
            <User size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">Niños</p>
            <p className="text-2xl font-extrabold text-blue-600">
              {students.filter(s => s.sex === 'HOMBRE').length}
            </p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-pink-100 text-pink-600 rounded-full">
            <User size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">Niñas</p>
            <p className="text-2xl font-extrabold text-pink-600">
              {students.filter(s => s.sex === 'MUJER').length}
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative print:hidden">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={18} className="text-slate-400" />
        </div>
        <input
          type="text"
          placeholder="Buscar por nombre, CURP o tutor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none shadow-sm bg-white text-slate-900 placeholder:text-slate-400"
        />
      </div>

      {/* Group Filter Tabs (Only show if multiple groups exist) */}
      {studentGroups.length > 1 && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 print:hidden">
          <button
            onClick={() => setSelectedGroupFilter('ALL')}
            className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${selectedGroupFilter === 'ALL'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'
              }`}
          >
            Todos ({students.length})
          </button>
          {studentGroups.map(group => (
            <button
              key={group}
              onClick={() => setSelectedGroupFilter(group)}
              className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${selectedGroupFilter === group
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'
                }`}
            >
              {group} ({students.filter(s => (s.group || config?.gradeGroup || 'Sin Grupo') === group).length})
            </button>
          ))}
        </div>
      )}

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold">Alumno</th>
                <th className="p-4 font-semibold">Personal</th>
                <th className="p-4 font-semibold">Tutor / Contacto</th>
                <th className="p-4 font-semibold text-center">T1</th>
                <th className="p-4 font-semibold text-center">T2</th>
                <th className="p-4 font-semibold text-center">T3</th>
                <th className="p-4 font-semibold text-center">Prom</th>
                <th className="p-4 font-semibold text-center">Apoyos</th>
                <th className="p-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => {
                  const getTrimesterAverage = (g?: any) => {
                    if (!g) return 0;
                    if (typeof g === 'number') return g;
                    if (typeof g === 'string' && !isNaN(parseFloat(g))) return parseFloat(g);
                    if (typeof g === 'object') {
                      return (Number(g.lenguajes || 0) + Number(g.saberes || 0) + Number(g.etica || 0) + Number(g.humano || 0)) / 4;
                    }
                    return 0;
                  };

                  const t1Avg = getTrimesterAverage(student.grades?.[0]);
                  const t2Avg = getTrimesterAverage(student.grades?.[1]);
                  const t3Avg = getTrimesterAverage(student.grades?.[2]);

                  const hwScore = student.totalAssignments > 0
                    ? (student.assignmentsCompleted / student.totalAssignments) * 10
                    : 0;

                  const activeTrimesters = [t1Avg, t2Avg, t3Avg].filter(a => a > 0);
                  const academicAvg = activeTrimesters.length > 0
                    ? activeTrimesters.reduce((a, b) => a + b, 0) / activeTrimesters.length
                    : 0;

                  const finalAvg = academicAvg > 0
                    ? ((academicAvg + hwScore) / 2).toFixed(1)
                    : '-';

                  const age = getAge(student.birthDate);

                  return (
                    <tr key={student.id} className="group hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={student.avatar === "PENDING_LOAD" ? `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=random` : (student.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=random`)}
                            alt={student.name}
                            className="w-10 h-10 rounded-full object-cover border border-slate-200"
                          />
                          <div>
                            <div className="font-bold text-slate-800 text-sm">{student.name}</div>
                            <div className="text-xs text-slate-500 font-mono">ID: {student.id}</div>
                            {student.curp && <div className="text-[10px] text-slate-400 font-mono mt-0.5">{student.curp}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1 text-sm text-slate-600">
                          <div className="flex items-center gap-1.5" title="Sexo">
                            <User size={14} className={student.sex === 'MUJER' ? 'text-pink-400' : 'text-blue-400'} />
                            <span className="text-xs font-medium">{student.sex}</span>
                          </div>
                          {age !== '' && (
                            <div className="flex items-center gap-1.5" title="Edad">
                              <Cake size={14} className="text-orange-400" />
                              <span className="text-xs font-medium">{age} años</span>
                            </div>
                          )}
                          {student.birthDate && <span className="text-[10px] text-slate-400 pl-5">{student.birthDate}</span>}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm">
                          <div className="font-medium text-slate-700">{student.guardianName}</div>
                          <div className="text-slate-500 flex items-center gap-1 text-xs">
                            <Phone size={12} /> {student.guardianPhone}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`text-sm font-mono ${t1Avg > 0 ? (t1Avg < 6 ? 'text-red-500 font-bold' : 'text-slate-600') : 'text-slate-300'}`}>
                          {t1Avg > 0 ? t1Avg.toFixed(1) : '-'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`text-sm font-mono ${t2Avg > 0 ? (t2Avg < 6 ? 'text-red-500 font-bold' : 'text-slate-600') : 'text-slate-300'}`}>
                          {t2Avg > 0 ? t2Avg.toFixed(1) : '-'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`text-sm font-mono ${t3Avg > 0 ? (t3Avg < 6 ? 'text-red-500 font-bold' : 'text-slate-600') : 'text-slate-300'}`}>
                          {t3Avg > 0 ? t3Avg.toFixed(1) : '-'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <span className={`font-bold text-sm ${finalAvg === '-' ? 'text-slate-400' : Number(finalAvg) >= 8 ? 'text-emerald-600' : Number(finalAvg) >= 6 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {finalAvg}
                          </span>
                          <span className={`text-[10px] font-bold uppercase mt-1 px-1.5 py-0.5 rounded ${student.status === 'INSCRITO' ? 'bg-indigo-50 text-indigo-700' : 'bg-red-50 text-red-700'}`}>{student.status}</span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex flex-col gap-1.5 items-center">
                          {student.usaer ? (
                            <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold border border-blue-200">USAER</span>
                          ) : null}
                          {student.repeater && (
                            <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold border border-red-200">REPETIDOR</span>
                          )}
                          {student.bap !== 'NINGUNA' && (
                            <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-bold border border-orange-200 truncate max-w-[100px]" title={student.bap}>
                              BAP: {student.bap}
                            </span>
                          )}
                          {!student.usaer && !student.repeater && student.bap === 'NINGUNA' && (
                            <span className="text-slate-300 text-xs">-</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => setReportStudent(student)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Ver Reporte Completo"
                          >
                            <FileText size={18} />
                          </button>
                          <button
                            onClick={() => setQrStudent(student)}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Generar QR"
                          >
                            <QrCode size={18} />
                          </button>
                          {!readOnly && (
                            <>
                              <button
                                onClick={() => handleOpenModal(student)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button
                                onClick={() => handleDeleteClick(student.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 size={18} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    No se encontraron alumnos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4 print:hidden">
        {filteredStudents.length > 0 ? (
          filteredStudents.map((student) => {
            // Re-calculate for mobile view (simplified)
            const getTrimesterAverage = (g?: any) => {
              if (!g) return 0;
              if (typeof g === 'number') return g;
              if (typeof g === 'object') return (Number(g.lenguajes || 0) + Number(g.saberes || 0) + Number(g.etica || 0) + Number(g.humano || 0)) / 4;
              return 0;
            };
            const activeTrimesters = student.grades ? student.grades.map(g => getTrimesterAverage(g)).filter(a => a > 0) : [];
            const academicAvg = activeTrimesters.length > 0 ? activeTrimesters.reduce((a, b) => a + b, 0) / activeTrimesters.length : 0;

            return (
              <div key={student.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <img src={student.avatar === "PENDING_LOAD" ? `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=random` : (student.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=random`)} alt={student.name} className="w-12 h-12 rounded-full object-cover border border-slate-100" />
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">{student.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${student.status === 'INSCRITO' ? 'bg-indigo-50 text-indigo-700' : 'bg-red-50 text-red-700'}`}>{student.status}</span>
                        {academicAvg > 0 && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${academicAvg >= 8 ? 'bg-emerald-50 text-emerald-700' : academicAvg >= 6 ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'}`}>
                            Prom: {academicAvg.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {!readOnly && (
                    <button onClick={() => handleOpenModal(student)} className="text-slate-400 hover:text-indigo-600"><Edit2 size={18} /></button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 mb-4 bg-slate-50 p-3 rounded-lg">
                  <div className="flex items-center gap-1.5"><User size={14} /> <span>{student.curp || 'SIN CURP'}</span></div>
                  <div className="flex items-center gap-1.5"><Phone size={14} /> <span>{student.guardianPhone}</span></div>
                </div>

                <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                  <div className="flex gap-1">
                    {student.usaer && <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">USAER</span>}
                    {student.bap !== 'NINGUNA' && <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded">BAP</span>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setReportStudent(student)} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><FileText size={18} /></button>
                    <button onClick={() => setQrStudent(student)} className="p-2 bg-purple-50 text-purple-600 rounded-lg"><QrCode size={18} /></button>
                    {!readOnly && (
                      <button onClick={() => handleDeleteClick(student.id)} className="p-2 bg-red-50 text-red-600 rounded-lg"><Trash2 size={18} /></button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-10 bg-slate-50 rounded-xl text-slate-400">
            <Users size={32} className="mx-auto mb-2 opacity-30" />
            <p>No se encontraron alumnos</p>
          </div>
        )}
      </div>

      {/* Success Notification Toast */}
      {
        successMessage && (
          <div className="fixed bottom-6 right-6 z-[60] bg-emerald-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-[fadeIn_0.3s_ease-out]">
            <CheckCircle className="w-6 h-6" />
            <span className="font-bold">{successMessage}</span>
          </div>
        )
      }

      {/* Create/Edit Modal - Extended */}
      {
        isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn print:hidden">
            <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center flex-shrink-0">
                <h3 className="font-bold text-lg text-slate-800">
                  {editingId ? 'Editar Información del Alumno' : 'Registrar Nuevo Alumno'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="overflow-y-auto p-6 custom-scrollbar">
                <form onSubmit={handleSubmit} className="space-y-6">

                  {/* Header: Photo & Basic Name */}
                  <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="flex-shrink-0 flex flex-col items-center gap-2">
                      <div
                        className="relative group cursor-pointer w-28 h-28"
                        onClick={() => avatarInputRef.current?.click()}
                        title="Click para subir foto"
                      >
                        <img
                          src={formData.avatar}
                          alt="Avatar"
                          className="w-full h-full rounded-full border-4 border-slate-100 shadow-md object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name || 'A')}&background=random`;
                          }}
                        />
                        <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Upload className="text-white w-8 h-8" />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        className="text-xs text-indigo-600 font-medium cursor-pointer hover:underline"
                      >
                        Subir Foto
                      </button>
                      <input
                        type="file"
                        ref={avatarInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                      />
                    </div>

                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-slate-700 mb-1">Nombre Completo del Alumno</label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                          <input
                            required
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                            className="w-full pl-10 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-900 font-bold"
                            placeholder="APELLIDOS Y NOMBRES"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Clave Alumno (ID)</label>
                        <input
                          type="text"
                          value={formData.id}
                          onChange={e => setFormData({ ...formData, id: e.target.value })}
                          className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-900 font-mono"
                          placeholder="Auto-generado si se deja vacío"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">CURP</label>
                        <input
                          type="text"
                          value={formData.curp}
                          onChange={e => setFormData({ ...formData, curp: e.target.value.toUpperCase() })}
                          className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-900 font-mono"
                          placeholder="CLAVE ÚNICA DE REGISTRO"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 my-4"></div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Section: Identity */}
                    <div className="space-y-4">
                      <h4 className="font-bold text-indigo-700 flex items-center gap-2 text-sm border-b border-indigo-100 pb-2">
                        <User size={16} /> Identidad y Nacimiento
                      </h4>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Sexo</label>
                        <select
                          value={formData.sex}
                          onChange={e => setFormData({ ...formData, sex: e.target.value as any })}
                          className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900"
                        >
                          <option value="HOMBRE">HOMBRE</option>
                          <option value="MUJER">MUJER</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Fecha de Nacimiento</label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-2.5 text-slate-400 w-4 h-4 pointer-events-none" />
                          <input
                            type="date"
                            value={formData.birthDate}
                            onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                            className="w-full pl-9 p-2 border border-slate-300 rounded bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Lugar de Nacimiento</label>
                        <input
                          type="text"
                          value={formData.birthPlace}
                          onChange={e => setFormData({ ...formData, birthPlace: e.target.value.toUpperCase() })}
                          className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900"
                          placeholder="ESTADO / MUNICIPIO"
                        />
                      </div>
                    </div>

                    {/* Section: Academic Status */}
                    <div className="space-y-4">
                      <h4 className="font-bold text-indigo-700 flex items-center gap-2 text-sm border-b border-indigo-100 pb-2">
                        <GraduationCap size={16} /> Datos Escolares
                      </h4>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Fecha Alta</label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-2.5 text-slate-400 w-4 h-4 pointer-events-none" />
                            <input
                              type="date"
                              value={formData.enrollmentDate}
                              onChange={e => setFormData({ ...formData, enrollmentDate: e.target.value })}
                              className="w-full pl-9 p-2 border border-slate-300 rounded bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Estatus</label>
                          <select
                            value={formData.status}
                            onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                            className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900"
                          >
                            <option value="INSCRITO">INSCRITO</option>
                            <option value="BAJA">BAJA</option>
                            <option value="TRASLADO">TRASLADO</option>
                          </select>
                        </div>
                      </div>

                      <div className="mt-4 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                        <label className="block text-xs font-bold text-indigo-800 mb-2 uppercase tracking-wider">Asignación de Grupo</label>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <select
                              value={formData.group?.match(/(\d+)/)?.[0] || ''}
                              onChange={e => {
                                const currentGroupLetter = formData.group?.match(/[A-F]/i)?.[0] || 'A';
                                const newGrade = e.target.value;
                                setFormData({ ...formData, group: `${newGrade} ${currentGroupLetter}` });
                              }}
                              className="w-full p-2 border border-indigo-200 rounded bg-white text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                              <option value="">Grado...</option>
                              {[1, 2, 3, 4, 5, 6].map(g => <option key={g} value={g}>{g}°</option>)}
                            </select>
                          </div>
                          <div>
                            <select
                              value={formData.group?.match(/[A-F]/i)?.[0] || ''}
                              onChange={e => {
                                const currentGrade = formData.group?.match(/(\d+)/)?.[0] || '1';
                                const newLetter = e.target.value;
                                setFormData({ ...formData, group: `${currentGrade} ${newLetter}` });
                              }}
                              className="w-full p-2 border border-indigo-200 rounded bg-white text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                              <option value="">Grupo...</option>
                              {['A', 'B', 'C', 'D', 'E', 'F'].map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                          </div>
                        </div>

                        {/* Dynamic Teacher Display */}
                        <div className="mt-2 text-xs flex items-center gap-1.5 text-indigo-700 bg-white/50 p-2 rounded border border-indigo-100">
                          <User size={12} />
                          <span className="font-semibold opacity-70">Docente:</span>
                          <span className="font-bold">
                            {config.staff?.find(s => s.group === formData.group)?.name || 'Sin Asignar / Dirección'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="checkbox"
                          id="repeater"
                          checked={formData.repeater}
                          onChange={e => setFormData({ ...formData, repeater: e.target.checked })}
                          className="w-4 h-4 text-indigo-600 rounded"
                        />
                        <label htmlFor="repeater" className="text-sm font-medium text-slate-700">Es Repetidor</label>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mt-2">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Barreras (BAP)</label>
                        <input
                          type="text"
                          value={formData.bap}
                          onChange={e => setFormData({ ...formData, bap: e.target.value.toUpperCase() })}
                          className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900 mb-2"
                          placeholder="Ej. LENGUAJE, MOTRIZ, O 'NINGUNA'"
                        />
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="usaer"
                            checked={formData.usaer}
                            onChange={e => setFormData({ ...formData, usaer: e.target.checked })}
                            className="w-4 h-4 text-indigo-600 rounded"
                          />
                          <label htmlFor="usaer" className="text-sm font-medium text-slate-700">Recibe apoyo USAER</label>
                        </div>
                      </div>
                    </div>

                    {/* Section: Academic Grades (Trimestres Detailed) */}
                    <div className="space-y-4">
                      <h4 className="font-bold text-indigo-700 flex items-center gap-2 text-sm border-b border-indigo-100 pb-2">
                        <FileText size={16} /> Calificaciones por Campo Formativo
                      </h4>

                      {[0, 1, 2].map((trimesterIdx) => (
                        <div key={trimesterIdx} className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                          <h5 className="text-xs font-bold text-indigo-600 uppercase mb-2">Trimestre {trimesterIdx + 1}</h5>
                          <div className="grid grid-cols-2 gap-3">
                            {/* Lenguajes */}
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 truncate" title="Lenguajes">Lenguajes</label>
                              <input
                                type="number" min="5" max="10" step="0.1"
                                className="w-full p-1 text-sm border border-slate-300 rounded text-center"
                                value={(formData.grades[trimesterIdx] as any)?.lenguajes || ''}
                                onChange={(e) => {
                                  const newGrades = [...formData.grades];
                                  if (!newGrades[trimesterIdx]) newGrades[trimesterIdx] = { lenguajes: 0, saberes: 0, etica: 0, humano: 0 };
                                  // Ensure it's treated as object now
                                  if (typeof newGrades[trimesterIdx] === 'number') newGrades[trimesterIdx] = { lenguajes: 0, saberes: 0, etica: 0, humano: 0 }; // Migrating on fly

                                  newGrades[trimesterIdx] = {
                                    ...newGrades[trimesterIdx],
                                    lenguajes: parseFloat(e.target.value) || 0
                                  };
                                  setFormData({ ...formData, grades: newGrades });
                                }}
                                placeholder="-"
                              />
                            </div>
                            {/* Saberes */}
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 truncate" title="Saberes y Pensamiento Científico">Saberes y P.C.</label>
                              <input
                                type="number" min="5" max="10" step="0.1"
                                className="w-full p-1 text-sm border border-slate-300 rounded text-center"
                                value={(formData.grades[trimesterIdx] as any)?.saberes || ''}
                                onChange={(e) => {
                                  const newGrades = [...formData.grades];
                                  if (!newGrades[trimesterIdx]) newGrades[trimesterIdx] = { lenguajes: 0, saberes: 0, etica: 0, humano: 0 };
                                  if (typeof newGrades[trimesterIdx] === 'number') newGrades[trimesterIdx] = { lenguajes: 0, saberes: 0, etica: 0, humano: 0 };

                                  newGrades[trimesterIdx] = {
                                    ...newGrades[trimesterIdx],
                                    saberes: parseFloat(e.target.value) || 0
                                  };
                                  setFormData({ ...formData, grades: newGrades });
                                }}
                                placeholder="-"
                              />
                            </div>
                            {/* Ética */}
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 truncate" title="Ética, Naturaleza y Sociedades">Ética, Nat. y Soc.</label>
                              <input
                                type="number" min="5" max="10" step="0.1"
                                className="w-full p-1 text-sm border border-slate-300 rounded text-center"
                                value={(formData.grades[trimesterIdx] as any)?.etica || ''}
                                onChange={(e) => {
                                  const newGrades = [...formData.grades];
                                  if (!newGrades[trimesterIdx]) newGrades[trimesterIdx] = { lenguajes: 0, saberes: 0, etica: 0, humano: 0 };
                                  if (typeof newGrades[trimesterIdx] === 'number') newGrades[trimesterIdx] = { lenguajes: 0, saberes: 0, etica: 0, humano: 0 };

                                  newGrades[trimesterIdx] = {
                                    ...newGrades[trimesterIdx],
                                    etica: parseFloat(e.target.value) || 0
                                  };
                                  setFormData({ ...formData, grades: newGrades });
                                }}
                                placeholder="-"
                              />
                            </div>
                            {/* Humano */}
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 truncate" title="De lo Humano y lo Comunitario">De lo Humano</label>
                              <input
                                type="number" min="5" max="10" step="0.1"
                                className="w-full p-1 text-sm border border-slate-300 rounded text-center"
                                value={(formData.grades[trimesterIdx] as any)?.humano || ''}
                                onChange={(e) => {
                                  const newGrades = [...formData.grades];
                                  if (!newGrades[trimesterIdx]) newGrades[trimesterIdx] = { lenguajes: 0, saberes: 0, etica: 0, humano: 0 };
                                  if (typeof newGrades[trimesterIdx] === 'number') newGrades[trimesterIdx] = { lenguajes: 0, saberes: 0, etica: 0, humano: 0 };

                                  newGrades[trimesterIdx] = {
                                    ...newGrades[trimesterIdx],
                                    humano: parseFloat(e.target.value) || 0
                                  };
                                  setFormData({ ...formData, grades: newGrades });
                                }}
                                placeholder="-"
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                      <p className="text-[10px] text-slate-400">
                        * Ingrese calificaciones del 5 al 10 en cada campo.
                        <br />
                        * El promedio final del alumno se calculará combinando estos promedios con el % de tareas entregadas.
                      </p>
                    </div>

                    {/* Section: Contact */}
                    <div className="space-y-4">
                      <h4 className="font-bold text-indigo-700 flex items-center gap-2 text-sm border-b border-indigo-100 pb-2">
                        <Phone size={16} /> Contacto Emergencia
                      </h4>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Nombre del Tutor</label>
                        <input
                          required
                          type="text"
                          value={formData.guardianName}
                          onChange={e => setFormData({ ...formData, guardianName: e.target.value.toUpperCase() })}
                          className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900"
                          placeholder="NOMBRE COMPLETO"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Teléfono</label>
                        <input
                          required
                          type="tel"
                          value={formData.guardianPhone}
                          onChange={e => setFormData({ ...formData, guardianPhone: e.target.value })}
                          className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900"
                          placeholder="10 dígitos"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Domicilio</label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-2.5 text-slate-400 w-4 h-4 pointer-events-none" />
                          <input
                            type="text"
                            value={formData.address || ''}
                            onChange={e => setFormData({ ...formData, address: e.target.value.toUpperCase() })}
                            className="w-full pl-9 p-2 border border-slate-300 rounded bg-white text-slate-900"
                            placeholder="DOMICILIO COMPLETO"
                          />
                        </div>
                      </div>

                      <div className="md:col-span-1">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Ocupación del Tutor</label>
                        <input
                          type="text"
                          value={formData.guardianOccupation || ''}
                          onChange={e => setFormData({ ...formData, guardianOccupation: e.target.value.toUpperCase() })}
                          className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900"
                          placeholder="OCUPACIÓN"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex gap-3 border-t border-slate-100 mt-6">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 py-3 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isProcessing}
                      className={`flex-1 py-3 rounded-xl font-bold transition-colors shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 ${isProcessing ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                    >
                      <Save size={18} />
                      {isProcessing ? 'Procesando Imagen...' : 'Guardar Datos'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )
      }

      {/* QR Code Modal */}
      {
        qrStudent && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn print:hidden"
            onClick={() => setQrStudent(null)}
          >
            <div
              className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl flex flex-col items-center"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-full flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-slate-800">Credencial Escolar</h3>
                <button onClick={() => setQrStudent(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              <div className="flex flex-col items-center mb-6 w-full">
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-indigo-100 mb-2">
                  <img src={qrStudent.avatar} alt={qrStudent.name} className="w-full h-full object-cover" />
                </div>
                <h4 className="text-lg font-bold text-slate-800 text-center">{qrStudent.name}</h4>
                <p className="text-sm text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded mt-1">ID: {qrStudent.id}</p>
              </div>

              <div className="bg-white p-4 rounded-xl border-2 border-slate-100 shadow-inner mb-6">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${qrStudent.id}`}
                  alt={`QR Code for ${qrStudent.name}`}
                  className="w-48 h-48 mix-blend-multiply"
                />
              </div>

              <button
                onClick={() => handleDownloadQR(qrStudent)}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
              >
                <Download size={20} />
                Descargar Imagen
              </button>
            </div>
          </div>
        )
      }

      {/* FULL REPORT PRINT VIEW OVERLAY */}
      {
        reportStudent && (
          <div className="fixed inset-0 z-[100] bg-white overflow-y-auto overflow-x-auto animate-fadeIn print:static print:overflow-visible print:h-auto print:bg-white">
            {/* Header Actions - Hidden on Print */}
            <div className="sticky top-0 bg-slate-800 text-white p-4 flex flex-col md:flex-row justify-between items-center gap-4 print:hidden shadow-lg z-50">
              <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
                <button
                  onClick={() => setReportStudent(null)}
                  className="flex items-center gap-2 hover:text-slate-300 transition-colors"
                >
                  <X size={24} />
                  <span className="font-bold">Cerrar</span>
                </button>
                <div className="h-6 w-px bg-slate-600 hidden md:block"></div>
                <h2 className="font-bold text-sm md:text-base">Vista Preliminar</h2>
              </div>

              <div className="flex gap-2 flex-wrap justify-center w-full md:w-auto">
                <button
                  onClick={handlePrint}
                  className="bg-white text-slate-900 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-100 transition-colors text-sm flex-1 md:flex-none justify-center"
                >
                  <Printer size={18} />
                  <span>Imprimir</span>
                </button>
                <button
                  onClick={() => generateReportCard(reportStudent, config)}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 text-sm flex-1 md:flex-none justify-center"
                >
                  <FileDown size={18} />
                  <span>Boleta</span>
                </button>
                <button
                  onClick={() => generateBehaviorReport(reportStudent, logs, config)}
                  className="bg-rose-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200 text-sm flex-1 md:flex-none justify-center"
                >
                  <AlertCircle size={18} />
                  <span>Conducta</span>
                </button>
              </div>
            </div>

            {/* Report Content - A4 sized container */}
            <div id="print-container" className="max-w-[210mm] mx-auto bg-white p-[10mm] min-h-[297mm] shadow-xl my-8 print:shadow-none print:m-0 print:w-full print:h-auto text-slate-900 text-sm">

              {/* School Header */}
              <div className="flex border-b-2 border-slate-800 pb-6 mb-8 gap-6 items-center">
                <div className="w-24 h-24 flex-shrink-0 flex items-center justify-center">
                  {config.schoolLogo ? (
                    <img src={config.schoolLogo} alt="Logo" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <Building2 size={64} className="text-slate-200" />
                  )}
                </div>
                <div className="flex-1 text-center">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Secretaría de Educación Pública y Cultura</h3>
                  <h1 className="text-2xl font-bold uppercase tracking-wider mb-1 text-slate-900">{config.schoolName}</h1>
                  <div className="flex justify-center gap-4 text-xs font-bold mt-2 text-slate-500 mb-2">
                    <span>C.C.T: {config.cct}</span>
                    <span>•</span>
                    <span>{config.zone}</span>
                    <span>•</span>
                    <span>{config.sector}</span>
                  </div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">{config.location}</p>
                </div>
                <div className="w-24 text-right flex flex-col items-center gap-2">
                  <div className="border border-slate-300 w-24 h-32 bg-slate-50 flex items-center justify-center overflow-hidden">
                    <img src={reportStudent.avatar} alt="Alumno" className="w-full h-full object-cover" />
                  </div>
                  <div className="border border-slate-200 p-1 bg-white">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${reportStudent.id}`}
                      alt="QR"
                      className="w-20 h-20 mix-blend-multiply"
                    />
                  </div>
                </div>
              </div>

              {/* Personal Extended Info */}
              <div className="mb-8">
                <h2 className="text-lg font-bold bg-slate-800 text-white px-4 py-2 mb-4 uppercase tracking-wider rounded-sm">Ficha de Identificación</h2>

                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div className="col-span-2">
                    <label className="block text-[10px] text-slate-500 font-bold uppercase">Nombre Completo</label>
                    <div className="font-bold text-lg border-b border-slate-300">{reportStudent.name}</div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase">Clave Alumno</label>
                    <div className="font-mono text-base border-b border-slate-300">{reportStudent.id}</div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase">Estatus</label>
                    <div className="font-bold text-base border-b border-slate-300">{reportStudent.status || 'INSCRITO'}</div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase">CURP</label>
                    <div className="font-mono text-sm border-b border-slate-300">{reportStudent.curp || '-'}</div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase">Fecha Nacimiento</label>
                    <div className="text-sm border-b border-slate-300">{reportStudent.birthDate || '-'}</div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase">Lugar Nacimiento</label>
                    <div className="text-sm border-b border-slate-300">{reportStudent.birthPlace || '-'}</div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase">Sexo</label>
                    <div className="text-sm border-b border-slate-300">{reportStudent.sex || '-'}</div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase">Grado y Grupo</label>
                    <div className="text-sm border-b border-slate-300">{reportStudent.group || config.gradeGroup}</div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase">Fecha Alta</label>
                    <div className="text-sm border-b border-slate-300">{reportStudent.enrollmentDate || '-'}</div>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] text-slate-500 font-bold uppercase">Necesidades Educativas</label>
                    <div className="text-sm border-b border-slate-300 flex gap-2">
                      {reportStudent.usaer && <span className="font-bold text-blue-800">[USAER]</span>}
                      {reportStudent.repeater && <span className="font-bold text-red-800">[REPETIDOR]</span>}
                      {reportStudent.bap !== 'NINGUNA' && <span>BAP: {reportStudent.bap}</span>}
                      {!reportStudent.usaer && !reportStudent.repeater && reportStudent.bap === 'NINGUNA' && <span>SIN OBSERVACIONES</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="mb-8 p-4 bg-slate-50 rounded border border-slate-200">
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase">Tutor Legal</label>
                    <div className="font-bold text-slate-800">{reportStudent.guardianName}</div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase">Teléfono de Contacto</label>
                    <div className="font-bold text-slate-800">{reportStudent.guardianPhone}</div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase">Docente Responsable</label>
                    <div className="text-slate-800">
                      {(() => {
                        // Extract grade number and letter separately for flexible matching
                        const studentGroupStr = (reportStudent.group || config.gradeGroup || '').toUpperCase();
                        const studentGrade = studentGroupStr.match(/(\d+)/)?.[0]; // Extract number
                        const studentLetter = studentGroupStr.match(/[A-F]/)?.[0]; // Extract letter

                        if (!studentGrade || !studentLetter) {
                          return config.teacherName; // Fallback if no valid group
                        }

                        const foundTeacher = config.staff?.find(s => {
                          const staffGroupStr = (s.group || '').toUpperCase();
                          const staffGrade = staffGroupStr.match(/(\d+)/)?.[0];
                          const staffLetter = staffGroupStr.match(/[A-F]/)?.[0];

                          return staffGrade === studentGrade && staffLetter === studentLetter;
                        });

                        return foundTeacher?.name || config.teacherName;
                      })()}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6 mt-4 pt-4 border-t border-slate-200">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase">Domicilio</label>
                    <div className="font-bold text-slate-800 text-sm whitespace-normal">{reportStudent.address || 'NO REGISTRADO'}</div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase">Ocupación del Tutor</label>
                    <div className="font-bold text-slate-800 text-sm">{reportStudent.guardianOccupation || 'NO REGISTRADO'}</div>
                  </div>
                </div>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="text-sm font-bold uppercase text-slate-600 border-b border-slate-200 pb-1 mb-3">Estadística de Asistencia</h3>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-green-50 p-2 rounded border border-green-100">
                      <div className="text-xl font-bold text-green-700">{Object.values(reportStudent.attendance).filter(x => x === 'Presente').length}</div>
                      <div className="text-[10px] uppercase font-bold text-green-600">Asistencias</div>
                    </div>
                    <div className="bg-red-50 p-2 rounded border border-red-100">
                      <div className="text-xl font-bold text-red-700">{Object.values(reportStudent.attendance).filter(x => x === 'Ausente').length}</div>
                      <div className="text-[10px] uppercase font-bold text-red-600">Faltas</div>
                    </div>
                    <div className="bg-yellow-50 p-2 rounded border border-yellow-100">
                      <div className="text-xl font-bold text-yellow-700">{Object.values(reportStudent.attendance).filter(x => x === 'Retardo').length}</div>
                      <div className="text-[10px] uppercase font-bold text-yellow-600">Retardos</div>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase text-slate-600 border-b border-slate-200 pb-1 mb-3">Cumplimiento Académico</h3>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-50 p-2 rounded border border-slate-200">
                      <div className="text-xl font-bold text-indigo-700">
                        {reportStudent.grades.length > 0
                          ? (() => {
                            // Safe calculation of average from Trimester objects
                            const sumAvgs = reportStudent.grades.reduce((acc, g: any) => {
                              if (typeof g === 'number') return acc + g; // Legacy
                              const tAvg = (Number(g.lenguajes || 0) + Number(g.saberes || 0) + Number(g.etica || 0) + Number(g.humano || 0)) / 4;
                              return acc + tAvg;
                            }, 0);
                            return (sumAvgs / reportStudent.grades.length).toFixed(1);
                          })()
                          : '-'}
                      </div>
                      <div className="text-[10px] uppercase font-bold text-slate-500">Promedio</div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded border border-slate-200">
                      <div className="text-xl font-bold text-slate-700">
                        {reportStudent.behaviorPoints > 0 ? '+' : ''}{reportStudent.behaviorPoints}
                      </div>
                      <div className="text-[10px] uppercase font-bold text-slate-500">Conducta</div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded border border-slate-200">
                      <div className="text-xl font-bold text-blue-700">
                        {reportStudent.totalAssignments > 0
                          ? Math.round((reportStudent.assignmentsCompleted / reportStudent.totalAssignments) * 100)
                          : 0}%
                      </div>
                      <div className="text-[10px] uppercase font-bold text-slate-500">Tareas</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grades Table */}
              <div className="mb-8">
                <h3 className="text-sm font-bold uppercase text-slate-600 border-b border-slate-200 pb-1 mb-4">Historial de Evaluaciones</h3>
                <table className="w-full text-sm border-collapse border border-slate-200">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="border border-slate-200 p-2 text-left">Concepto / Periodo</th>
                      <th className="border border-slate-200 p-2 text-center w-32">Calificación</th>
                      <th className="border border-slate-200 p-2 text-center w-48">Nivel de Desempeño</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportStudent.grades.length === 0 ? (
                      <tr><td colSpan={3} className="p-4 text-center text-slate-400">Sin calificaciones registradas</td></tr>
                    ) : (
                      reportStudent.grades.map((grade, idx) => {
                        // Calculate single trimester average for display
                        // Calculate single trimester average for display
                        let score = 0;
                        if (typeof grade === 'number') {
                          score = grade;
                        } else if (typeof grade === 'string') {
                          score = parseFloat(grade) || 0;
                        } else if (typeof grade === 'object' && grade !== null) {
                          const g = grade as any;
                          // If object keys are missing, they default to 0. 
                          // If grade is actually a Number object (rare), this might fail? No, typeof null is object.
                          score = (Number(g.lenguajes || 0) + Number(g.saberes || 0) + Number(g.etica || 0) + Number(g.humano || 0)) / 4;
                        } else {
                          // Fallback for weird string cases that are just numbers
                          score = Number(grade) || 0;
                        }

                        return (
                          <tr key={idx}>
                            <td className="border border-slate-200 p-2">Evaluación Parcial {idx + 1}</td>
                            <td className="border border-slate-200 p-2 text-center font-bold">{score.toFixed(1)}</td>
                            <td className="border border-slate-200 p-2 text-center text-xs">
                              {(() => {
                                const val = Number(score);
                                if (val >= 9) return 'DESTACADO';
                                if (val >= 8) return 'SATISFACTORIO';
                                if (val >= 6) return 'SUFICIENTE';
                                return 'INSUFICIENTE';
                              })()}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Assignments Tracking */}
              <div className="mb-8">
                <h3 className="text-sm font-bold uppercase text-slate-600 border-b border-slate-200 pb-1 mb-4">Seguimiento de Actividades y Tareas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h4 className="text-[10px] font-bold text-orange-600 uppercase tracking-wider mb-3 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                      Pendientes
                    </h4>
                    <div className="space-y-2">
                      {assignments.filter(a => !reportStudent.completedAssignmentIds?.includes(a.id)).length === 0 ? (
                        <div className="text-[10px] text-slate-400 text-center py-2 italic">Sin pendientes</div>
                      ) : (
                        assignments.filter(a => !reportStudent.completedAssignmentIds?.includes(a.id)).map(a => (
                          <div key={a.id} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100">
                            <span className="text-[10px] font-bold text-slate-700 truncate">{a.title}</span>
                            <span className="text-[9px] text-slate-400">{new Date(a.dueDate).toLocaleDateString()}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h4 className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-3 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                      Completadas
                    </h4>
                    <div className="space-y-2">
                      {assignments.filter(a => reportStudent.completedAssignmentIds?.includes(a.id)).length === 0 ? (
                        <div className="text-[10px] text-slate-400 text-center py-2 italic font-medium">Sin entregas</div>
                      ) : (
                        assignments.filter(a => reportStudent.completedAssignmentIds?.includes(a.id)).map(a => (
                          <div key={a.id} className="flex justify-between items-center bg-white p-2 rounded-lg border border-emerald-100">
                            <span className="text-[10px] font-bold text-slate-700 truncate">{a.title}</span>
                            {reportStudent.assignmentResults?.[a.id] !== undefined && (
                              <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-1 rounded">{reportStudent.assignmentResults[a.id]}</span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Behavior History */}
              <div className="mb-8">
                <h3 className="text-sm font-bold uppercase text-slate-600 border-b border-slate-200 pb-1 mb-4">Historial de Conducta e Incidencias</h3>
                <table className="w-full text-sm border-collapse border border-slate-200">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="border border-slate-200 p-2 text-left w-32">Fecha</th>
                      <th className="border border-slate-200 p-2 text-left w-32">Tipo</th>
                      <th className="border border-slate-200 p-2 text-left">Descripción / Observación</th>
                      <th className="border border-slate-200 p-2 text-center w-24">Puntos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Filter logs for this student */}
                    {(() => {
                      const studentLogs = logs.filter(l => l.studentId === reportStudent.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                      if (studentLogs.length === 0) {
                        return (
                          <tr><td colSpan={4} className="p-4 text-center text-slate-400">Sin registro de incidencias o conductas.</td></tr>
                        );
                      }

                      return studentLogs.map((log, idx) => (
                        <tr key={log.id || idx}>
                          <td className="border border-slate-200 p-2 text-xs">{new Date(log.date).toLocaleDateString()}</td>
                          <td className="border border-slate-200 p-2 text-xs font-semibold">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] border ${log.type === 'POSITIVE' ? 'bg-green-50 text-green-700 border-green-200' :
                              log.type === 'NEGATIVE' ? 'bg-red-50 text-red-700 border-red-200' :
                                'bg-slate-50 text-slate-600 border-slate-200'
                              }`}>
                              {log.type === 'POSITIVE' ? 'POSITIVO' : log.type === 'NEGATIVE' ? 'NEGATIVO' : 'NEUTRO'}
                            </span>
                          </td>
                          <td className="border border-slate-200 p-2 text-xs text-slate-600">{log.description}</td>
                          <td className={`border border-slate-200 p-2 text-center font-bold ${log.points > 0 ? 'text-green-600' : log.points < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                            {log.points > 0 ? '+' : ''}{log.points}
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Footer Signatures */}
              <div className="mt-auto pt-24 flex justify-between items-end">
                <div className="text-center w-1/3">
                  <div className="border-t border-slate-400 pt-2 mb-1"></div>
                  <p className="text-sm font-bold">
                    {(() => {
                      // Dynamic Teacher Lookup based on group
                      const studentGroupStr = (reportStudent.group || config.gradeGroup || '').toUpperCase();
                      // Only try to match if we have staff loaded
                      if (!config.staff || config.staff.length === 0) return config.teacherName;

                      const studentGrade = studentGroupStr.match(/(\d+)/)?.[0];
                      const studentLetter = studentGroupStr.match(/[A-F]/)?.[0];

                      if (!studentGrade || !studentLetter) return config.teacherName;

                      const foundTeacher = config.staff.find(s => {
                        const staffGroupStr = (s.group || '').toUpperCase();
                        // Ignore directors
                        if (staffGroupStr.includes('DIREC') || staffGroupStr.includes('ADMIN')) return false;

                        const staffGrade = staffGroupStr.match(/(\d+)/)?.[0];
                        const staffLetter = staffGroupStr.match(/[A-F]/)?.[0];
                        return staffGrade === studentGrade && staffLetter === studentLetter;
                      });

                      return foundTeacher ? foundTeacher.name : config.teacherName;
                    })()}
                  </p>
                  <p className="text-xs text-slate-500">Docente de Grupo</p>
                </div>
                <div className="text-center w-1/3">
                  <div className="border-t border-slate-400 pt-2 mb-1"></div>
                  <p className="text-sm font-bold">{config.directorName || 'Director(a) Escolar'}</p>
                  <p className="text-xs text-slate-500">Director(a) de la Escuela</p>
                </div>
              </div>

              <div className="mt-8 text-center text-[10px] text-slate-400">
                <p>Documento generado el {new Date().toLocaleDateString()} a las {new Date().toLocaleTimeString()} | ID Sistema: {reportStudent.id}</p>
              </div>

            </div>
          </div>
        )
      }
      {isAnalysisOpen && (
        <GroupAnalysisModal
          students={filteredStudents}
          groupName={selectedGroupFilter === 'ALL' ? 'Todos los Grupos' : selectedGroupFilter}
          teacherName={config.teacherName}
          onClose={() => setIsAnalysisOpen(false)}
          onViewReport={(student) => {
            setIsAnalysisOpen(false);
            setReportStudent(student);
          }}
        />
      )}
    </div >
  );
};
