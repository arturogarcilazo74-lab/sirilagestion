import React, { useState } from 'react';
import { Student, SchoolConfig } from '../types';
import { generateDocumentContent } from '../services/ai';
import { FileText, Download, Printer, Copy, CheckCircle, AlertTriangle, Calendar, User, FileOutput, Bus, Upload } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker source for pdfjs
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

if (typeof window !== 'undefined' && 'Worker' in window) {
    try {
        const lib = pdfjsLib as any;
        if (lib.GlobalWorkerOptions) {
            lib.GlobalWorkerOptions.workerSrc = pdfWorker;
        } else if (lib.default?.GlobalWorkerOptions) {
            lib.default.GlobalWorkerOptions.workerSrc = pdfWorker;
        }
    } catch (e) {
        console.error("Error configuring PDF worker:", e);
    }
}

interface DocumentsViewProps {
    students: Student[];
    config: SchoolConfig;
    initialType?: DocumentType;
}

type DocumentType = 'INCIDENCIA' | 'CITATORIO' | 'FICHA_DESCRIPTIVA' | 'PLANEACION' | 'ACTA_HECHOS' | 'PERMISO_SALIDA' | 'AUTORIZACION_EVENTO' | 'PRESENTACION_RESULTADOS' | 'OBSERVACIONES_BOLETA';

export const DocumentsView: React.FC<DocumentsViewProps> = ({ students, config, initialType }) => {
    const [selectedType, setSelectedType] = useState<DocumentType>(initialType || 'INCIDENCIA');
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');
    const [generatedContent, setGeneratedContent] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);

    // Form States
    const [incidentDetails, setIncidentDetails] = useState('');
    const [citationReason, setCitationReason] = useState('');
    const [citationDate, setCitationDate] = useState('');
    const [planningTopic, setPlanningTopic] = useState('');
    const [planningSubject, setPlanningSubject] = useState('');
    const [keywords, setKeywords] = useState('');
    const [location, setLocation] = useState('');
    const [authorizedPerson, setAuthorizedPerson] = useState('');
    const [eventName, setEventName] = useState('');
    const [eventLocation, setEventLocation] = useState('');
    const [transport, setTransport] = useState('');
    const [cost, setCost] = useState('');
    const [contextContent, setContextContent] = useState('');
    const [fileName, setFileName] = useState('');

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setFileName(file.name);

            if (file.type === 'application/pdf') {
                try {
                    const arrayBuffer = await file.arrayBuffer();
                    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                    let fullText = '';

                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        const pageText = textContent.items.map((item: any) => item.str).join(' ');
                        fullText += pageText + '\n';
                    }

                    setContextContent(fullText);
                } catch (error) {
                    console.error("Error reading PDF:", error);
                    alert("Error al leer el archivo PDF. Asegúrate de que no esté protegido.");
                }
            } else {
                // Text files
                const reader = new FileReader();
                reader.onload = (e) => {
                    const text = e.target?.result;
                    if (typeof text === 'string') {
                        setContextContent(text);
                    }
                };
                reader.readAsText(file);
            }
        }
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        setGeneratedContent('');

        const student = students.find(s => s.id === selectedStudentId);
        const studentName = student ? student.name : "Alumno General";
        const guardianName = student ? student.guardianName : "Padre/Tutor";

        // Calculate real stats for student
        const getGradeAvg = (g: any) => {
            if (typeof g === 'number') return g;
            if (!g) return 0;
            return (Number(g.lenguajes || 0) + Number(g.saberes || 0) + Number(g.etica || 0) + Number(g.humano || 0)) / 4;
        };

        const average = student?.grades?.length
            ? (student.grades.reduce((acc, grade) => acc + getGradeAvg(grade), 0) / student.grades.length).toFixed(1)
            : 'N/A';

        const totalAttendanceDays = student ? Object.keys(student.attendance).length : 0;
        const presentDays = student ? Object.values(student.attendance).filter(s => s === 'Presente').length : 0;
        const attendanceRate = totalAttendanceDays > 0 ? ((presentDays / totalAttendanceDays) * 100).toFixed(0) : '100';

        // Calculate Group Stats for Presentation
        let groupAverage = '0';
        let groupAttendance = '0';
        let atRiskCount = 0;
        let assignmentsCount = 0;

        if (students.length > 0) {
            // Group Average
            const allGrades = students.flatMap(s => s.grades || []);
            if (allGrades.length > 0) {
                groupAverage = (allGrades.reduce((acc, grade) => acc + getGradeAvg(grade), 0) / allGrades.length).toFixed(1);
            }

            // Group Attendance
            let totalDays = 0;
            let totalPresent = 0;
            students.forEach(s => {
                const dates = Object.values(s.attendance || {});
                totalDays += dates.length;
                totalPresent += dates.filter(d => d === 'Presente').length;
            });
            groupAttendance = totalDays > 0 ? ((totalPresent / totalDays) * 100).toFixed(0) : '0';

            // Risk Count
            atRiskCount = students.filter(s => {
                const avg = s.grades && s.grades.length > 0
                    ? (s.grades.reduce((acc, grade) => acc + getGradeAvg(grade), 0) / s.grades.length)
                    : 10;
                return avg < 6 || s.behaviorPoints < 0;
            }).length;

            // Assignments
            assignmentsCount = students.reduce((acc, s) => acc + (s.completedAssignmentIds?.length || 0), 0);
        }

        const data = {
            studentName,
            guardianName,
            schoolName: config.schoolName,
            teacherName: config.teacherName,
            date: new Date().toLocaleDateString(),
            incidentDetails,
            reason: citationReason,
            dateTime: citationDate,
            topic: planningTopic,
            subject: planningSubject,
            // Real Data for Ficha Descriptiva
            average,
            attendanceRate,
            behaviorPoints: student?.behaviorPoints || 0,
            bap: student?.bap || 'Ninguna',
            keywords: keywords,
            // Legacy/Fallback (can be removed if AI prompt is updated to ignore them)
            strengths: "Basado en datos reales",
            areasOfImprovement: "Basado en datos reales",
            recommendations: "Basado en datos reales",
            // New fields
            location,
            authorizedPerson,
            eventName,
            eventLocation,
            transport,
            cost,
            contextContent,
            // Group Data
            groupAverage,
            groupAttendance,
            atRiskCount,
            assignmentsCount
        };

        try {
            const content = await generateDocumentContent(selectedType, data);
            setGeneratedContent(content);
        } catch (error) {
            console.error("Error generating document:", error);
            setGeneratedContent(`Error al generar el documento: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedContent);
        alert("Contenido copiado al portapapeles");
    };

    const handlePrint = () => {
        const printWindow = window.open('', '', 'height=600,width=800');
        if (printWindow) {
            printWindow.document.write('<html><head><title>Imprimir Documento</title>');
            printWindow.document.write('</head><body style="font-family: \'Times New Roman\', serif; padding: 40px; line-height: 1.5; color: #000;">');

            // Header
            printWindow.document.write(`
                <div style="text-align: center; margin-bottom: 40px; border-bottom: 1px solid #000; padding-bottom: 20px;">
                    <div style="display: flex; align-items: center; justify-content: center; gap: 20px; margin-bottom: 15px;">
                        ${config.schoolLogo ? `<img src="${config.schoolLogo}" style="height: 80px; width: auto; object-fit: contain;" />` : ''}
                        <div style="text-align: center;">
                            <h1 style="margin: 0; font-size: 16px; font-weight: bold; text-transform: uppercase;">${config.schoolName}</h1>
                            <p style="margin: 5px 0 0 0; font-size: 12px;">CCT: ${config.cct}</p>
                            <p style="margin: 0; font-size: 12px;">Zona Escolar: ${config.zone} | Sector: ${config.sector}</p>
                        </div>
                    </div>
                </div>
            `);

            // Content with Justification
            printWindow.document.write(`
                <div style="text-align: justify; font-size: 12pt;">
                    ${generatedContent.replace(/\n/g, '<br>')}
                </div>
            `);

            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.print();
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn pb-10">
            <header>
                <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Generador de Documentos IA</h2>
                <p className="text-slate-500 font-medium">Crea reportes, citatorios y planeaciones con enfoque NEM</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Configuration Panel */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="glass-card p-6 rounded-2xl">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <FileOutput size={20} className="text-indigo-600" />
                            Tipo de Documento
                        </h3>
                        <div className="space-y-2">
                            {[
                                { id: 'INCIDENCIA', label: 'Reporte de Incidencia', icon: AlertTriangle },
                                { id: 'ACTA_HECHOS', label: 'Acta de Hechos', icon: FileText },
                                { id: 'AUTORIZACION_EVENTO', label: 'Autorización Evento', icon: Bus },
                                { id: 'CITATORIO', label: 'Citatorio a Padres', icon: Calendar },
                                { id: 'PERMISO_SALIDA', label: 'Permiso de Salida', icon: AlertTriangle },
                                { id: 'FICHA_DESCRIPTIVA', label: 'Ficha Descriptiva', icon: User },
                                { id: 'PLANEACION', label: 'Planeación Didáctica', icon: FileText },
                                { id: 'PRESENTACION_RESULTADOS', label: 'Presentación de Resultados (Junta)', icon: FileOutput },
                                { id: 'OBSERVACIONES_BOLETA', label: 'Observaciones Boleta', icon: FileText },
                            ].map((type) => (
                                <button
                                    key={type.id}
                                    onClick={() => setSelectedType(type.id as DocumentType)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${selectedType === type.id
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                        }`}
                                >
                                    <type.icon size={18} />
                                    <span className="font-bold text-sm">{type.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="glass-card p-6 rounded-2xl">
                        <h3 className="font-bold text-slate-800 mb-4">Detalles</h3>
                        <div className="space-y-4">
                            {selectedType !== 'PLANEACION' && selectedType !== 'PRESENTACION_RESULTADOS' && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Estudiante</label>
                                    <select
                                        value={selectedStudentId}
                                        onChange={(e) => setSelectedStudentId(e.target.value)}
                                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80"
                                    >
                                        <option value="">Seleccionar Alumno...</option>
                                        {students.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {selectedType === 'INCIDENCIA' && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Detalles del Incidente</label>
                                    <textarea
                                        value={incidentDetails}
                                        onChange={(e) => setIncidentDetails(e.target.value)}
                                        placeholder="Describe brevemente qué sucedió..."
                                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80 h-32 resize-none"
                                    />
                                </div>
                            )}

                            {selectedType === 'CITATORIO' && (
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Motivo</label>
                                        <input
                                            type="text"
                                            value={citationReason}
                                            onChange={(e) => setCitationReason(e.target.value)}
                                            placeholder="Ej. Revisión de conducta, boleta..."
                                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha y Hora</label>
                                        <input
                                            type="datetime-local"
                                            value={citationDate}
                                            onChange={(e) => setCitationDate(e.target.value)}
                                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80"
                                        />
                                    </div>
                                </>
                            )}

                            {(selectedType === 'FICHA_DESCRIPTIVA' || selectedType === 'OBSERVACIONES_BOLETA') && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Palabras Clave / Enfoque</label>
                                    <input
                                        type="text"
                                        value={keywords}
                                        onChange={(e) => setKeywords(e.target.value)}
                                        placeholder="Ej. Kinestésico, Liderazgo, Matemáticas..."
                                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80"
                                    />
                                    <p className="text-xs text-slate-400 mt-1">Opcional: Agrega palabras clave para guiar a la IA.</p>
                                </div>
                            )}

                            {selectedType === 'PLANEACION' && (
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Materia / Campo Formativo</label>
                                        <input
                                            type="text"
                                            value={planningSubject}
                                            onChange={(e) => setPlanningSubject(e.target.value)}
                                            placeholder="Ej. Saberes y Pensamiento Científico"
                                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tema</label>
                                        <input
                                            type="text"
                                            value={planningTopic}
                                            onChange={(e) => setPlanningTopic(e.target.value)}
                                            placeholder="Ej. El ciclo del agua"
                                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80"
                                        />
                                    </div>
                                </>
                            )}

                            {/* Context Upload Section - Available for all, but emphasized for Planning */}
                            <div className="border-t border-slate-200 pt-4 mt-4">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                    Lineamientos / Contexto Adicional
                                </label>
                                <div className="space-y-3">
                                    <div className="relative">
                                        <input
                                            type="file"
                                            accept=".txt,.md,.csv,.json,.pdf"
                                            onChange={handleFileUpload}
                                            className="hidden"
                                            id="file-upload"
                                        />
                                        <label
                                            htmlFor="file-upload"
                                            className="flex items-center justify-center gap-2 w-full p-3 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-all text-slate-500 hover:text-indigo-600"
                                        >
                                            <Upload size={18} />
                                            <span className="text-sm font-medium truncate">
                                                {fileName || "Subir archivo (.pdf, .txt)"}
                                            </span>
                                        </label>
                                    </div>
                                    <textarea
                                        value={contextContent}
                                        onChange={(e) => setContextContent(e.target.value)}
                                        placeholder="O pega aquí los lineamientos, aprendizajes esperados o contexto específico..."
                                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80 h-24 text-sm"
                                    />
                                </div>
                            </div>

                            {selectedType === 'ACTA_HECHOS' && (
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Lugar de los Hechos</label>
                                        <input
                                            type="text"
                                            value={location}
                                            onChange={(e) => setLocation(e.target.value)}
                                            placeholder="Ej. Patio escolar, Salón de clases..."
                                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descripción de los Hechos</label>
                                        <textarea
                                            value={incidentDetails}
                                            onChange={(e) => setIncidentDetails(e.target.value)}
                                            placeholder="Narración cronológica de lo sucedido..."
                                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80 h-32 resize-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha y Hora</label>
                                        <input
                                            type="datetime-local"
                                            value={citationDate}
                                            onChange={(e) => setCitationDate(e.target.value)}
                                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80"
                                        />
                                    </div>
                                </>
                            )}

                            {selectedType === 'PERMISO_SALIDA' && (
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Motivo de Salida</label>
                                        <input
                                            type="text"
                                            value={citationReason}
                                            onChange={(e) => setCitationReason(e.target.value)}
                                            placeholder="Ej. Cita médica, Asunto familiar..."
                                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Persona Autorizada</label>
                                        <input
                                            type="text"
                                            value={authorizedPerson}
                                            onChange={(e) => setAuthorizedPerson(e.target.value)}
                                            placeholder="Nombre completo de quien recoge..."
                                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha y Hora de Salida</label>
                                        <input
                                            type="datetime-local"
                                            value={citationDate}
                                            onChange={(e) => setCitationDate(e.target.value)}
                                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80"
                                        />
                                    </div>
                                </>
                            )}

                            {selectedType === 'AUTORIZACION_EVENTO' && (
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre del Evento</label>
                                        <input
                                            type="text"
                                            value={eventName}
                                            onChange={(e) => setEventName(e.target.value)}
                                            placeholder="Ej. Torneo de Fútbol, Visita al Museo..."
                                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Lugar del Evento</label>
                                        <input
                                            type="text"
                                            value={eventLocation}
                                            onChange={(e) => setEventLocation(e.target.value)}
                                            placeholder="Ej. Estadio Municipal, Museo de Historia..."
                                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Transporte</label>
                                            <input
                                                type="text"
                                                value={transport}
                                                onChange={(e) => setTransport(e.target.value)}
                                                placeholder="Ej. Autobús escolar, Particular..."
                                                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Costo ($)</label>
                                            <input
                                                type="text"
                                                value={cost}
                                                onChange={(e) => setCost(e.target.value)}
                                                placeholder="Ej. 150.00"
                                                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha y Hora</label>
                                        <input
                                            type="datetime-local"
                                            value={citationDate}
                                            onChange={(e) => setCitationDate(e.target.value)}
                                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80"
                                        />
                                    </div>
                                </>
                            )}

                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2 mt-4"
                            >
                                {isGenerating ? <span className="animate-spin">✨</span> : <FileText size={18} />}
                                {isGenerating ? 'Generando...' : 'Generar Documento'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Preview Panel */}
                <div className="lg:col-span-2">
                    <div className="glass-card p-8 rounded-2xl h-full flex flex-col min-h-[600px]">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-200 pb-4">
                            <h3 className="font-bold text-slate-800 text-lg">Vista Previa del Documento</h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCopy}
                                    disabled={!generatedContent}
                                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
                                    title="Copiar Texto"
                                >
                                    <Copy size={20} />
                                </button>
                                <button
                                    onClick={handlePrint}
                                    disabled={!generatedContent}
                                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
                                    title="Imprimir"
                                >
                                    <Printer size={20} />
                                </button>
                                <button
                                    disabled={!generatedContent}
                                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
                                    title="Descargar PDF (Próximamente)"
                                >
                                    <Download size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 bg-white border border-slate-200 rounded-xl p-8 shadow-inner overflow-y-auto custom-scrollbar">
                            {generatedContent ? (
                                <div className="prose prose-slate max-w-none whitespace-pre-line font-serif text-slate-800">
                                    {generatedContent}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                    <FileText size={64} className="mb-4 opacity-20" />
                                    <p className="font-medium text-lg">El documento generado aparecerá aquí.</p>
                                    <p className="text-sm">Selecciona un tipo y completa los detalles para comenzar.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
