import React, { useState } from 'react';
import { Student, SchoolConfig, Assignment } from '../types';
import { generateDocumentContent } from '../services/ai';
import { generateStudentAnalysis } from '../services/ai';
import { getTeacherForStudent, generateAttendanceListPDF, generateDashboardReportPDF, generateReportCardDeliveryListPDF } from '../services/pdfGenerator';
import { calculateStudentMetrics, getTrimesterAvg, getStudentGlobalAverage } from '../services/gradeUtils';
import { FileText, Download, Printer, Copy, CheckCircle, AlertTriangle, Calendar, User, FileOutput, Bus, Upload, ClipboardList, Award } from 'lucide-react';
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
    assignments?: Assignment[];
}

type DocumentType = 'INCIDENCIA' | 'CITATORIO' | 'FICHA_DESCRIPTIVA' | 'PLANEACION' | 'ACTA_HECHOS' | 'PERMISO_SALIDA' | 'AUTORIZACION_EVENTO' | 'PRESENTACION_RESULTADOS' | 'OBSERVACIONES_BOLETA' | 'INFORME_PADRES' | 'INFORME_ACTIVIDADES' | 'LISTA_ASISTENCIA_PADRES' | 'PLAN_REZAGO' | 'REPORTE_RENDIMIENTO_GRUPO' | 'LISTA_ENTREGA_BOLETAS';

export const DocumentsView: React.FC<DocumentsViewProps> = ({ students, config, initialType, assignments = [] }) => {
    const [selectedType, setSelectedType] = useState<DocumentType>(initialType || 'INCIDENCIA');
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');
    const [generatedContent, setGeneratedContent] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);

    // Batch descriptive sheet generation states
    const [isBatchMode, setIsBatchMode] = useState(false);
    const [includeGroupSheet, setIncludeGroupSheet] = useState(true);
    const [selectedStudentIds, setSelectedStudentIds] = useState<Record<string, boolean>>({});
    const [batchProgress, setBatchProgress] = useState<string | null>(null);

    // Initialize all students as selected by default when students list loads
    React.useEffect(() => {
        if (students && students.length > 0) {
            const initialIds: Record<string, boolean> = {};
            students.forEach(s => {
                initialIds[s.id] = true;
            });
            setSelectedStudentIds(initialIds);
        }
    }, [students]);

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
    const [showAverageInDeliveryList, setShowAverageInDeliveryList] = useState(true);

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

        // --- BATCH GENERATION FOR FICHA DESCRIPTIVA ---
        if (selectedType === 'FICHA_DESCRIPTIVA' && isBatchMode) {
            setBatchProgress('Iniciando generación en lote...');
            let combinedContent = '';

            // 1. Generate Group Descriptive Sheet if selected
            if (includeGroupSheet) {
                setBatchProgress('Generando Ficha Descriptiva del Grupo...');
                try {
                    const totalStudents = students.length;
                    const totalBoys = students.filter(s => s.sex === 'HOMBRE').length;
                    const totalGirls = students.filter(s => s.sex === 'MUJER').length;
                    
                    let groupAverage = '0';
                    const studentsWithGrades = students.filter(s => s.grades && s.grades.length > 0);
                    if (studentsWithGrades.length > 0) {
                        const totalAvg = studentsWithGrades.reduce((acc, s) => acc + getStudentGlobalAverage(s), 0);
                        groupAverage = (totalAvg / studentsWithGrades.length).toFixed(1);
                    }

                    let groupAttendance = '0';
                    let totalDays = 0;
                    let totalPresent = 0;
                    students.forEach(s => {
                        const dates = Object.values(s.attendance || {});
                        totalDays += dates.length;
                        totalPresent += dates.filter(d => d === 'Presente').length;
                    });
                    groupAttendance = totalDays > 0 ? ((totalPresent / totalDays) * 100).toFixed(0) : '0';

                    const atRiskCount = students.filter(s => {
                        const avg = getStudentGlobalAverage(s);
                        return (avg > 0 && avg < 6);
                    }).length;
                    const conductRiskCount = students.filter(s => s.behaviorPoints < 0).length;
                    const bapCount = students.filter(s => s.usaer || (s.bap && s.bap !== 'NINGUNA')).length;

                    const specialStudents = students.filter(s => {
                        const avg = getStudentGlobalAverage(s);
                        return (avg > 0 && avg < 6.5) || s.behaviorPoints < 0 || s.usaer || (s.bap && s.bap !== 'NINGUNA');
                    }).map(s => ({
                        name: s.name,
                        average: s.grades?.length ? getStudentGlobalAverage(s).toFixed(1) : 'N/A',
                        bap: s.bap || 'Ninguna',
                        usaer: s.usaer ? 'Sí' : 'No',
                        behavior: s.behaviorPoints
                    }));

                    const groupData = {
                        schoolName: config.schoolName,
                        teacherName: config.teacherName,
                        groupName: config.gradeGroup,
                        schoolYear: config.schoolYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
                        groupAverage,
                        groupAttendance,
                        totalStudents,
                        totalBoys,
                        totalGirls,
                        atRiskCount,
                        conductRiskCount,
                        bapCount,
                        specialStudents
                    };

                    const groupContent = await generateDocumentContent('FICHA_DESCRIPTIVA_GRUPO', groupData);
                    combinedContent += groupContent;
                } catch (error) {
                    console.error("Error generating group sheet:", error);
                    combinedContent += `# ERROR AL GENERAR FICHA DEL GRUPO\n\n${error instanceof Error ? error.message : String(error)}`;
                }
            }

            // 2. Generate Student Descriptive Sheets
            const selectedStudents = students.filter(s => selectedStudentIds[s.id]);
            for (let i = 0; i < selectedStudents.length; i++) {
                const student = selectedStudents[i];
                setBatchProgress(`Generando Ficha de ${student.name} (${i + 1}/${selectedStudents.length})...`);
                
                if (combinedContent) {
                    combinedContent += '\n\n<!-- PAGE_BREAK -->\n\n';
                }

                try {
                    const average = student.grades?.length
                        ? getStudentGlobalAverage(student).toFixed(1)
                        : 'N/A';

                    const totalAttendanceDays = Object.keys(student.attendance || {}).length;
                    const presentDays = Object.values(student.attendance || {}).filter(s => s === 'Presente').length;
                    const attendanceRate = totalAttendanceDays > 0 ? ((presentDays / totalAttendanceDays) * 100).toFixed(0) : '100';

                    const studentData = {
                        studentName: student.name,
                        average,
                        attendanceRate,
                        behaviorPoints: student.behaviorPoints || 0,
                        bap: student.bap || 'Ninguna',
                        keywords: keywords,
                        teacherName: config.teacherName,
                        schoolName: config.schoolName,
                        contextContent: contextContent
                    };

                    const studentContent = await generateDocumentContent('FICHA_DESCRIPTIVA', studentData);
                    combinedContent += studentContent;
                } catch (error) {
                    console.error(`Error generating sheet for ${student.name}:`, error);
                    combinedContent += `# ERROR AL GENERAR FICHA DE ${student.name.toUpperCase()}\n\n${error instanceof Error ? error.message : String(error)}`;
                }

                // Add a small delay between generations to avoid hitting rate limits or blocking UI
                await new Promise(resolve => setTimeout(resolve, 800));
            }

            setGeneratedContent(combinedContent);
            setBatchProgress(null);
            setIsGenerating(false);
            return;
        }

        const student = students.find(s => s.id === selectedStudentId);
        const studentName = student ? student.name : "Alumno General";
        const guardianName = student ? student.guardianName : "Padre/Tutor";

        // --- INFORME PARA PADRES CON ANÁLISIS IA ---
        if (selectedType === 'INFORME_PADRES') {
            if (!student) {
                setGeneratedContent('Error: Debes seleccionar un alumno para generar el informe.');
                setIsGenerating(false);
                return;
            }

            try {
                // Usando función compartida para consistencia
                const gradesData = (student.grades || []).map((g, idx) => {
                    if (typeof g === 'object' && g !== null) {
                        const leng = Number(g.lenguajes || 0);
                        const sab = Number(g.saberes || 0);
                        const eti = Number(g.etica || 0);
                        const hum = Number(g.humano || 0);
                        // Usando la misma lógica que la función compartida
                        const validFields = [leng, sab, eti, hum].filter(v => v > 0);
                        const avg = validFields.length > 0 ? validFields.reduce((a, b) => a + b, 0) / validFields.length : 0;
                        return { trimester: idx + 1, lenguajes: leng, saberes: sab, etica: eti, humano: hum, promedio: Number(avg.toFixed(1)) };
                    }
                    return { trimester: idx + 1, lenguajes: 0, saberes: 0, etica: 0, humano: 0, promedio: 0 };
                });

                const attendance = student.attendance || {};
                const studentLogs = (window as any).__appLogs || []; // Will be passed via props later

                // Calculate overall average using shared function for consistency
                const gradesAvg = getStudentGlobalAverage(student);

                const analysis = await generateStudentAnalysis(student.name, {
                    grades: gradesData,
                    attendance: {
                        presentes: Object.values(attendance).filter(s => s === 'Presente').length,
                        faltas: Object.values(attendance).filter(s => s === 'Ausente').length,
                        retardos: Object.values(attendance).filter(s => s === 'Retardo').length
                    },
                    behavior: {
                        puntos: student.behaviorPoints || 0,
                        positivos: 0,
                        negativos: 0,
                        incidentes: []
                    },
                    tareas: {
                        completadas: student.assignmentsCompleted || 0,
                        total: student.totalAssignments || 0,
                        porcentaje: student.totalAssignments > 0 ? Math.round((student.assignmentsCompleted / student.totalAssignments) * 100) : 0
                    },
                    bap: student.bap || 'NINGUNA',
                    usaer: student.usaer || false,
                    repetidor: student.repeater || false,
                    promedioGeneral: Number(gradesAvg.toFixed(1))
                });

                // Format the complete report
                const date = new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                const cycle = config.schoolYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

                const header = `
═══════════════════════════════════════════════════════════════════

                    ${config.schoolName.toUpperCase()}
                    C.C.T: ${config.cct} | Zona: ${config.zone}
                    Ciclo Escolar: ${cycle}

═══════════════════════════════════════════════════════════════════

              INFORME INDIVIDUAL DEL ALUMNO
              Para entrega a Padres de Familia

═══════════════════════════════════════════════════════════════════

FICHA DE IDENTIFICACIÓN
───────────────────────────────────────────────────────────────────
Nombre del Alumno:     ${student.name}
Clave:                 ${student.id}
CURP:                  ${student.curp || 'No registrada'}
Sexo:                  ${student.sex}
Fecha de Nacimiento:   ${student.birthDate || 'No registrada'}
Lugar de Nacimiento:   ${student.birthPlace || 'No registrado'}
Grado y Grupo:         ${student.group || config.gradeGroup}
Fecha de Inscripción:  ${student.enrollmentDate || 'No registrada'}
Estatus:               ${student.status || 'INSCRITO'}
Tutor Legal:           ${student.guardianName}
Teléfono de Contacto:  ${student.guardianPhone}
Domicilio:             ${student.address || 'No registrado'}
Ocupación del Tutor:   ${student.guardianOccupation || 'No registrada'}

${student.usaer ? '⚠ Recibe apoyo USAER\n' : ''}${student.bap && student.bap !== 'NINGUNA' ? '⚠ BAP: ' + student.bap + '\n' : ''}${student.repeater ? '⚠ Alumno repetidor\n' : ''}
Docente Responsable:   ${student ? getTeacherForStudent(config, student.group) : config.teacherName}
Director(a):           ${config.directorName || 'No registrado'}
Fecha del Informe:     ${date}
`;

                // Grades table
                let gradesSection = `
═══════════════════════════════════════════════════════════════════

  CALIFICACIONES POR CAMPO FORMATIVO (NEM)
═══════════════════════════════════════════════════════════════════

Modelo: Nueva Escuela Mexicana (NEM)
Escala de evaluación: 5 a 10
`;

                if (gradesData.length > 0) {
                    gradesSection += `
┌─────────────┬───────────┬────────────┬──────────────┬──────────────┬──────────┐
│  Trimestre  │Lenguajes  │Sab.P.Cient.│Ética Nat.Soc.│De lo Humano  │Promedio  │
├─────────────┼───────────┼────────────┼──────────────┼──────────────┼──────────┤`;

                    gradesData.forEach(g => {
                        const getNivel = (p: number) => {
                            if (p >= 9) return '★★★ Destacado';
                            if (p >= 8) return '★★ Satisfactorio';
                            if (p >= 6) return '★ Suficiente';
                            return 'Insuficiente';
                        };
                        gradesSection += `
│  Trimestre ${g.trimester} │   ${g.lenguajes.toFixed(1)}    │    ${g.saberes.toFixed(1)}     │     ${g.etica.toFixed(1)}      │     ${g.humano.toFixed(1)}      │  ${g.promedio.toFixed(1)}   │
│             │           │            │              │              │ ${getNivel(g.promedio).padEnd(8)} │`;
                    });

                    gradesSection += `
├─────────────┴───────────┴────────────┴──────────────┴──────────────┴──────────┤
│  PROMEDIO GENERAL: ${gradesAvg.toFixed(1)}                                                       │
└────────────────────────────────────────────────────────────────────────────────────┘

Nivel de Desempeño General: ${gradesAvg >= 9 ? 'DESTACADO' : gradesAvg >= 8 ? 'SATISFACTORIO' : gradesAvg >= 6 ? 'SUFICIENTE' : 'INSUFICIENTE'}
`;
                } else {
                    gradesSection += '\n  Sin calificaciones registradas.\n';
                }

                // Attendance and conduct
                const attendCount = Object.values(attendance).filter(s => s === 'Presente').length;
                const absCount = Object.values(attendance).filter(s => s === 'Ausente').length;
                const tardCount = Object.values(attendance).filter(s => s === 'Retardo').length;
                const totalDays = Object.keys(attendance).length;

                let attendanceSection = `
═══════════════════════════════════════════════════════════════════

  ASISTENCIA Y CONDUCTA
═══════════════════════════════════════════════════════════════════

  Asistencias:  ${attendCount} de ${totalDays} días (${totalDays > 0 ? Math.round((attendCount / totalDays) * 100) : 0}%)
  Faltas:       ${absCount}
  Retardos:     ${tardCount}

  Puntos de Conducta: ${student.behaviorPoints > 0 ? '+' : ''}${student.behaviorPoints || 0}
  Evaluación de Conducta: ${student.behaviorPoints >= 5 ? 'EXCELENTE' : student.behaviorPoints >= 0 ? 'BUENA' : student.behaviorPoints >= -3 ? 'REGULAR' : 'REQUIERE ATENCIÓN'}

  Tareas Completadas: ${student.assignmentsCompleted || 0} de ${student.totalAssignments || 0} (${student.totalAssignments > 0 ? Math.round((student.assignmentsCompleted / student.totalAssignments) * 100) : 0}%)
`;

                // AI Analysis section
                let aiSection = `
═══════════════════════════════════════════════════════════════════

  ANÁLISIS INTEGRAL DEL ALUMNO
  Generado con Inteligencia Artificial
═══════════════════════════════════════════════════════════════════

${analysis}
`;

                // Footer
                const footer = `
═══════════════════════════════════════════════════════════════════

  FIRMAS
═══════════════════════════════════════════════════════════════════



  ________________________    ________________________    ________________________
       Docente de Grupo            Director(a) de la            Firma del Padre
      ${student ? getTeacherForStudent(config, student.group) : config.teacherName}         Escuela                        o Tutor



  Documento generado automáticamente por el Sistema SIRILA
  ${date}
`;

                setGeneratedContent(header + gradesSection + attendanceSection + aiSection + footer);
            } catch (error) {
                console.error("Error generando informe:", error);
                setGeneratedContent(`Error al generar el informe: ${error instanceof Error ? error.message : String(error)}`);
            } finally {
                setIsGenerating(false);
            }
            return;
        }

        // --- INFORME DE ACTIVIDADES PENDIENTES ---
        if (selectedType === 'INFORME_ACTIVIDADES') {
            if (!student) {
                setGeneratedContent('Error: Debes seleccionar un alumno para generar el informe de actividades.');
                setIsGenerating(false);
                return;
            }

            try {
                const date = new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                const cycle = config.schoolYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

                // Filter assignments for this student's group
                const studentAssignments = assignments.filter(a => 
                    !a.targetGroup || a.targetGroup === student.group || a.targetGroup === 'GLOBAL' || a.targetGroup === 'TODOS'
                );

                const completedIds = student.completedAssignmentIds || [];
                const completed = studentAssignments.filter(a => completedIds.includes(a.id));
                const pending = studentAssignments.filter(a => !completedIds.includes(a.id));

                // Separate by type
                const completedTasks = completed.filter(a => a.type !== 'INTERACTIVE');
                const completedInteractive = completed.filter(a => a.type === 'INTERACTIVE');
                const pendingTasks = pending.filter(a => a.type !== 'INTERACTIVE');
                const pendingInteractive = pending.filter(a => a.type === 'INTERACTIVE');

                let report = `
═══════════════════════════════════════════════════════════════════

                    ${config.schoolName.toUpperCase()}
                    C.C.T: ${config.cct} | Zona: ${config.zone}
                    Ciclo Escolar: ${cycle}

═══════════════════════════════════════════════════════════════════

          INFORME DE ACTIVIDADES Y TAREAS
          Para entrega a Padres de Familia

═══════════════════════════════════════════════════════════════════

Nombre del Alumno:     ${student.name}
Grado y Grupo:         ${student.group || config.gradeGroup}
Tutor Legal:           ${student.guardianName}
Fecha del Informe:     ${date}
Docente:               ${student ? getTeacherForStudent(config, student.group) : config.teacherName}

═══════════════════════════════════════════════════════════════════

  RESUMEN GENERAL
═══════════════════════════════════════════════════════════════════

  Total de Actividades Asignadas:  ${studentAssignments.length}
  Actividades Completadas:         ${completed.length}
  Actividades Pendientes:          ${pending.length}
  Porcentaje de Avance:            ${studentAssignments.length > 0 ? Math.round((completed.length / studentAssignments.length) * 100) : 0}%

`;

                // Pending activities detail
                if (pending.length > 0) {
                    report += `
═══════════════════════════════════════════════════════════════════

  ⚠ ACTIVIDADES PENDIENTES (${pending.length})
  Su hijo(a) NO ha completado las siguientes actividades:
═══════════════════════════════════════════════════════════════════

`;

                    pending.forEach((a, idx) => {
                        const isLate = new Date(a.dueDate) < new Date();
                        const typeLabel = a.type === 'INTERACTIVE' ? '[INTERACTIVA]' : '[TAREA]';
                        const statusLabel = isLate ? '⚠ VENCIDA' : '⏳ PENDIENTE';
                        
                        report += `  ${idx + 1}. ${a.title}  ${typeLabel}  ${statusLabel}
     Fecha de entrega: ${a.dueDate}
`;
                        if (a.description) {
                            report += `     Descripción: ${a.description}
`;
                        }
                        report += `
`;
                    });

                    report += `
  ═══════════════════════════════════════════════════════════════
  IMPORTANTE: Se solicita a los padres de familia apoyar a su
  hijo(a) para que complete las actividades pendientes lo antes
  posible. Pueden acceder al portal de padres para ver y
  realizar las actividades interactivas.
  ═══════════════════════════════════════════════════════════════

`;
                }

                // Completed activities detail
                if (completed.length > 0) {
                    report += `
═══════════════════════════════════════════════════════════════════

  ✓ ACTIVIDADES COMPLETADAS (${completed.length})
═══════════════════════════════════════════════════════════════════

`;

                    completed.forEach((a, idx) => {
                        const typeLabel = a.type === 'INTERACTIVE' ? '[INTERACTIVA]' : '[TAREA]';
                        const score = student.assignmentResults?.[a.id];
                        const scoreLabel = score !== undefined ? `Calificación: ${score}/10` : '';
                        
                        report += `  ${idx + 1}. ${a.title}  ${typeLabel}  ✓ COMPLETADA
     Fecha de entrega: ${a.dueDate}
`;
                        if (scoreLabel) {
                            report += `     ${scoreLabel}
`;
                        }
                        report += `
`;
                    });
                }

                // Recommendations for parents
                report += `
═══════════════════════════════════════════════════════════════════

  RECOMENDACIONES PARA LA FAMILIA
═══════════════════════════════════════════════════════════════════

  1. Revise diariamente las actividades pendientes de su hijo(a).
  2. Establezca un horario fijo para realizar tareas escolares.
  3. Asegúrese de que cuente con los materiales necesarios.
  4. Apóyelo preguntándole qué aprendió en clase.
  5. Ingrese al Portal de Padres para ver actividades interactivas:
     ${window.location.origin}/padres

  Para cualquier duda o aclaración, favor de contactar al docente.
  Teléfono de contacto de la escuela o del docente.

═══════════════════════════════════════════════════════════════════

  FIRMAS
═══════════════════════════════════════════════════════════════════



  ________________________    ________________________
       Docente de Grupo            Firma del Padre
      ${student ? getTeacherForStudent(config, student.group) : config.teacherName}           o Tutor



  Documento generado automáticamente por el Sistema SIRILA
  ${date}
`;

                setGeneratedContent(report);
            } catch (error) {
                console.error("Error generando informe de actividades:", error);
                setGeneratedContent(`Error al generar el informe: ${error instanceof Error ? error.message : String(error)}`);
            } finally {
                setIsGenerating(false);
            }
            return;
        }

        // --- LISTA DE ASISTENCIA PARA JUNTA DE PADRES (PDF) ---
        if (selectedType === 'LISTA_ASISTENCIA_PADRES') {
            try {
                await generateAttendanceListPDF(students, config, {
                    meetingType: citationReason || 'Junta de Padres de Familia',
                    date: citationDate,
                    hour: location || '13:00',
                    place: eventLocation || 'Aula del grupo',
                });
                setGeneratedContent('✅ PDF generado y descargado exitosamente.\n\nRevisa tu carpeta de descargas.');
            } catch (error) {
                console.error("Error generando PDF:", error);
                setGeneratedContent(`Error al generar el PDF: ${error instanceof Error ? error.message : String(error)}`);
            } finally {
                setIsGenerating(false);
            }
            return;
        }

        // --- LISTA DE ENTREGA DE BOLETAS (PDF) ---
        if (selectedType === 'LISTA_ENTREGA_BOLETAS') {
            try {
                await generateReportCardDeliveryListPDF(students, config, {
                    period: citationReason || 'Trimestre 1',
                    date: citationDate,
                    showAverage: showAverageInDeliveryList,
                });
                setGeneratedContent('✅ PDF de la Lista de Entrega de Boletas generado y descargado exitosamente.\n\nRevisa tu carpeta de descargas.');
            } catch (error) {
                console.error("Error generando PDF:", error);
                setGeneratedContent(`Error al generar el PDF: ${error instanceof Error ? error.message : String(error)}`);
            } finally {
                setIsGenerating(false);
            }
            return;
        }

        // --- REPORTE DE RENDIMIENTO Y CUADRO DE HONOR (PDF) ---
        if (selectedType === 'REPORTE_RENDIMIENTO_GRUPO') {
            try {
                await generateDashboardReportPDF(students, config, assignments);
                setGeneratedContent('✅ PDF del Reporte de Rendimiento, Promedios y Plan de Intervención generado y descargado exitosamente.\n\nRevisa tu carpeta de descargas.');
            } catch (error) {
                console.error("Error generando PDF:", error);
                setGeneratedContent(`Error al generar el PDF: ${error instanceof Error ? error.message : String(error)}`);
            } finally {
                setIsGenerating(false);
            }
            return;
        }

        // --- Resto de tipos de documentos (lógica existente) ---
        // Calculate real stats for student using shared function for consistency
        const average = student?.grades?.length
            ? getStudentGlobalAverage(student).toFixed(1)
            : 'N/A';

        const totalAttendanceDays = student ? Object.keys(student.attendance).length : 0;
        const presentDays = student ? Object.values(student.attendance).filter(s => s === 'Presente').length : 0;
        const attendanceRate = totalAttendanceDays > 0 ? ((presentDays / totalAttendanceDays) * 100).toFixed(0) : '100';

        // Calculate Group Stats for Presentation using shared function for consistency
        let groupAverage = '0';
        let groupAttendance = '0';
        let atRiskCount = 0;
        let assignmentsCount = 0;

        if (students.length > 0) {
            // Group Average using shared function
            const studentsWithGrades = students.filter(s => s.grades && s.grades.length > 0);
            if (studentsWithGrades.length > 0) {
                const totalAvg = studentsWithGrades.reduce((acc, s) => acc + getStudentGlobalAverage(s), 0);
                groupAverage = (totalAvg / studentsWithGrades.length).toFixed(1);
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

            // Risk Count using shared function for consistency
            atRiskCount = students.filter(s => {
                const avg = getStudentGlobalAverage(s);
                return (avg > 0 && avg < 6) || s.behaviorPoints < 0;
            }).length;

            // Assignments
            assignmentsCount = students.reduce((acc, s) => acc + (s.completedAssignmentIds?.length || 0), 0);
        }

        // Detect students in academic lag (rezago)
        const laggingStudentsList = students.filter(s => {
            const average = s.grades?.length ? getStudentGlobalAverage(s) : 0;
            const hasLowGrades = average > 0 && average < 6.5;

            const homeworkRate = s.totalAssignments > 0 ? (s.assignmentsCompleted / s.totalAssignments) : 1;
            const hasLowHomework = homeworkRate < 0.6;

            const totalAttendanceDays = Object.keys(s.attendance || {}).length;
            const presentDays = Object.values(s.attendance || {}).filter(st => st === 'Presente').length;
            const attendanceRate = totalAttendanceDays > 0 ? (presentDays / totalAttendanceDays) : 1;
            const hasLowAttendance = attendanceRate < 0.8;

            return hasLowGrades || hasLowHomework || hasLowAttendance || s.behaviorPoints < 0;
        }).map(s => ({
            name: s.name,
            average: s.grades?.length ? getStudentGlobalAverage(s).toFixed(1) : 'N/A',
            bap: s.bap || 'Ninguna',
            usaer: s.usaer ? 'Sí' : 'No',
            attendance: Object.keys(s.attendance || {}).length > 0
                ? (Object.values(s.attendance || {}).filter(st => st === 'Presente').length / Object.keys(s.attendance || {}).length * 100).toFixed(0) + '%'
                : '100%',
            homework: s.totalAssignments > 0 ? Math.round(s.assignmentsCompleted / s.totalAssignments * 100) + '%' : '100%',
            behavior: s.behaviorPoints
        }));

        const data = {
            studentName,
            guardianName,
            schoolName: config.schoolName,
            teacherName: config.teacherName,
            date: new Date().toLocaleDateString(),
            laggingStudents: laggingStudentsList,
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

            // Content with Justification and Page Breaks
            let formattedContent = generatedContent.replace(/\n/g, '<br>');
            formattedContent = formattedContent.replace(/<!-- PAGE_BREAK -->/g, '<div style="page-break-before: always;"></div>');

            printWindow.document.write(`
                <div style="text-align: justify; font-size: 12pt;">
                    ${formattedContent}
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
                                { id: 'INFORME_PADRES', label: 'Informe para Padres (Completo)', icon: FileText },
                                { id: 'INFORME_ACTIVIDADES', label: 'Informe de Actividades Pendientes', icon: AlertTriangle },
                                { id: 'LISTA_ASISTENCIA_PADRES', label: 'Lista de Asistencia - Junta Padres', icon: Calendar },
                                { id: 'LISTA_ENTREGA_BOLETAS', label: 'Lista de Entrega de Boletas', icon: ClipboardList },
                                { id: 'PLAN_REZAGO', label: 'Plan de Intervención de Rezago (22-30 Jun)', icon: ClipboardList },
                                { id: 'REPORTE_RENDIMIENTO_GRUPO', label: 'Reporte de Rendimiento y Cuadro de Honor', icon: Award },
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
                            {(selectedType === 'FICHA_DESCRIPTIVA' || selectedType === 'OBSERVACIONES_BOLETA') && (
                                <div className="mb-4">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Modo de Generación</label>
                                    <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                                        <button
                                            type="button"
                                            onClick={() => setIsBatchMode(false)}
                                            className={`py-2 text-xs font-bold rounded-lg transition-all ${!isBatchMode ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                                        >
                                            Individual
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsBatchMode(true)}
                                            className={`py-2 text-xs font-bold rounded-lg transition-all ${isBatchMode ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                                        >
                                            Generar en Lote
                                        </button>
                                    </div>
                                </div>
                            )}

                             {selectedType !== 'PLANEACION' && selectedType !== 'PRESENTACION_RESULTADOS' && selectedType !== 'LISTA_ASISTENCIA_PADRES' && selectedType !== 'LISTA_ENTREGA_BOLETAS' && selectedType !== 'PLAN_REZAGO' && selectedType !== 'REPORTE_RENDIMIENTO_GRUPO' && (
                                <>
                                    {(selectedType === 'FICHA_DESCRIPTIVA' || selectedType === 'OBSERVACIONES_BOLETA') && isBatchMode ? (
                                        <div className="space-y-4 border border-indigo-100 bg-indigo-50/20 p-4 rounded-xl">
                                            {selectedType === 'FICHA_DESCRIPTIVA' && (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        id="includeGroupSheet"
                                                        checked={includeGroupSheet}
                                                        onChange={(e) => setIncludeGroupSheet(e.target.checked)}
                                                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 bg-white cursor-pointer"
                                                    />
                                                    <label htmlFor="includeGroupSheet" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                                                        Generar Ficha del Grupo
                                                    </label>
                                                </div>
                                            )}

                                            <div className={selectedType === 'FICHA_DESCRIPTIVA' ? "border-t border-slate-200/60 pt-3" : "pt-1"}>
                                                <div className="flex justify-between items-center mb-2">
                                                    <label className="block text-xs font-bold text-slate-500 uppercase">Alumnos a Generar</label>
                                                    <div className="flex items-center gap-1.5">
                                                        <input
                                                            type="checkbox"
                                                            id="selectAllStudents"
                                                            checked={students.length > 0 && students.every(s => selectedStudentIds[s.id])}
                                                            onChange={(e) => {
                                                                const checked = e.target.checked;
                                                                const newIds: Record<string, boolean> = {};
                                                                students.forEach(s => {
                                                                    newIds[s.id] = checked;
                                                                });
                                                                setSelectedStudentIds(newIds);
                                                            }}
                                                            className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 bg-white cursor-pointer"
                                                        />
                                                        <label htmlFor="selectAllStudents" className="text-xs font-bold text-slate-500 cursor-pointer select-none">Todos</label>
                                                    </div>
                                                </div>

                                                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-white/80 space-y-1.5 custom-scrollbar">
                                                    {students.map(s => (
                                                        <div key={s.id} className="flex items-center gap-2 hover:bg-slate-50 p-1.5 rounded transition-colors">
                                                            <input
                                                                type="checkbox"
                                                                id={`check-${s.id}`}
                                                                checked={!!selectedStudentIds[s.id]}
                                                                onChange={(e) => {
                                                                    setSelectedStudentIds(prev => ({
                                                                        ...prev,
                                                                        [s.id]: e.target.checked
                                                                    }));
                                                                }}
                                                                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 bg-white cursor-pointer"
                                                            />
                                                            <label htmlFor={`check-${s.id}`} className="text-xs font-medium text-slate-700 cursor-pointer select-none truncate">
                                                                {s.name}
                                                            </label>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                                {(selectedType === 'INFORME_PADRES' || selectedType === 'INFORME_ACTIVIDADES') ? 'Alumno (Obligatorio)' : 'Estudiante'}
                                            </label>
                                            <select
                                                value={selectedStudentId}
                                                onChange={(e) => setSelectedStudentId(e.target.value)}
                                                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80 ${(selectedType === 'INFORME_PADRES' || selectedType === 'INFORME_ACTIVIDADES') && !selectedStudentId ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
                                            >
                                                <option value="">Seleccionar Alumno...</option>
                                                {students.map(s => (
                                                    <option key={s.id} value={s.id}>{s.name}</option>
                                                ))}
                                            </select>
                                            {(selectedType === 'INFORME_PADRES' || selectedType === 'INFORME_ACTIVIDADES') && !selectedStudentId && (
                                                <p className="text-xs text-red-500 mt-1 font-medium">* Debes seleccionar un alumno para generar el informe</p>
                                            )}
                                        </div>
                                    )}
                                </>
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

                            {selectedType === 'LISTA_ENTREGA_BOLETAS' && (
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Periodo / Trimestre</label>
                                        <select
                                            value={citationReason || 'Trimestre 1'}
                                            onChange={(e) => setCitationReason(e.target.value)}
                                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80"
                                        >
                                            <option value="Trimestre 1">Trimestre 1</option>
                                            <option value="Trimestre 2">Trimestre 2</option>
                                            <option value="Trimestre 3">Trimestre 3</option>
                                            <option value="Promedio Final">Promedio Final</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha de Entrega</label>
                                        <input
                                            type="date"
                                            value={citationDate}
                                            onChange={(e) => setCitationDate(e.target.value)}
                                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <input
                                            type="checkbox"
                                            id="showAverageInDeliveryList"
                                            checked={showAverageInDeliveryList}
                                            onChange={(e) => setShowAverageInDeliveryList(e.target.checked)}
                                            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 bg-white cursor-pointer"
                                        />
                                        <label htmlFor="showAverageInDeliveryList" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                                            Mostrar Promedio en la lista
                                        </label>
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

                            {(selectedType === 'PLANEACION' || selectedType === 'PLAN_REZAGO') && (
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                            {selectedType === 'PLAN_REZAGO' ? 'Campos Formativos / Asignaturas a Atender' : 'Materia / Campo Formativo'}
                                        </label>
                                        <input
                                            type="text"
                                            value={planningSubject}
                                            onChange={(e) => setPlanningSubject(e.target.value)}
                                            placeholder={selectedType === 'PLAN_REZAGO' ? 'Ej. Lenguajes y Saberes' : 'Ej. Saberes y Pensamiento Científico'}
                                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                            {selectedType === 'PLAN_REZAGO' ? 'Temas o Aprendizajes Clave a Priorizar' : 'Tema'}
                                        </label>
                                        <input
                                            type="text"
                                            value={planningTopic}
                                            onChange={(e) => setPlanningTopic(e.target.value)}
                                            placeholder={selectedType === 'PLAN_REZAGO' ? 'Ej. Operaciones básicas, lectoescritura' : 'Ej. El ciclo del agua'}
                                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80"
                                        />
                                    </div>
                                    {selectedType === 'PLAN_REZAGO' && (
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Periodo de Aplicación</label>
                                            <input
                                                type="text"
                                                disabled
                                                value="Del 22 al 30 de junio de 2026 (7 días hábiles)"
                                                className="w-full p-3 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 outline-none"
                                            />
                                        </div>
                                    )}
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

                            {selectedType === 'LISTA_ASISTENCIA_PADRES' && (
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Junta</label>
                                        <select
                                            value={citationReason}
                                            onChange={(e) => setCitationReason(e.target.value)}
                                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80"
                                        >
                                            <option value="">Seleccionar...</option>
                                            <option value="Junta Ordinaria de Padres de Familia">Junta Ordinaria</option>
                                            <option value="Junta Extraordinaria de Padres de Familia">Junta Extraordinaria</option>
                                            <option value="Entrega de Boletas">Entrega de Boletas</option>
                                            <option value="Reunión de Seguimiento Académico">Reunión de Seguimiento Académico</option>
                                            <option value="Junta Informativa">Junta Informativa</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha de la Junta</label>
                                        <input
                                            type="date"
                                            value={citationDate}
                                            onChange={(e) => setCitationDate(e.target.value)}
                                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hora</label>
                                        <input
                                            type="time"
                                            value={location}
                                            onChange={(e) => setLocation(e.target.value)}
                                            placeholder="Ej. 13:00"
                                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Lugar</label>
                                        <input
                                            type="text"
                                            value={eventLocation}
                                            onChange={(e) => setEventLocation(e.target.value)}
                                            placeholder="Ej. Aula de 4to A"
                                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80"
                                        />
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">* La lista se genera con todos los alumnos del grupo actual. No es necesario seleccionar un alumno individual.</p>
                                </>
                            )}

                            <button
                                onClick={handleGenerate}
                                disabled={
                                    isGenerating ||
                                    (!isBatchMode && ['FICHA_DESCRIPTIVA', 'OBSERVACIONES_BOLETA', 'INFORME_PADRES', 'INFORME_ACTIVIDADES'].includes(selectedType) && !selectedStudentId) ||
                                    (selectedType === 'FICHA_DESCRIPTIVA' && isBatchMode && !includeGroupSheet && !students.some(s => selectedStudentIds[s.id])) ||
                                    (selectedType === 'OBSERVACIONES_BOLETA' && isBatchMode && !students.some(s => selectedStudentIds[s.id]))
                                }
                                className={`w-full py-3 rounded-xl font-bold shadow-lg transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2 mt-4 ${selectedType === 'INFORME_PADRES' ? 'bg-teal-600 hover:bg-teal-700 text-white' : selectedType === 'INFORME_ACTIVIDADES' ? 'bg-orange-600 hover:bg-orange-700 text-white' : selectedType === 'LISTA_ASISTENCIA_PADRES' ? 'bg-purple-600 hover:bg-purple-700 text-white' : selectedType === 'PLAN_REZAGO' ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                            >
                                {isGenerating ? <span className="animate-spin">✨</span> : <FileText size={18} />}
                                {isGenerating ? (batchProgress || 'Generando...') : selectedType === 'FICHA_DESCRIPTIVA' && isBatchMode ? 'Generar Fichas en Lote' : selectedType === 'OBSERVACIONES_BOLETA' && isBatchMode ? 'Generar Observaciones en Lote' : selectedType === 'INFORME_PADRES' ? 'Generar Informe con Análisis IA' : selectedType === 'INFORME_ACTIVIDADES' ? 'Generar Informe de Actividades' : selectedType === 'LISTA_ASISTENCIA_PADRES' ? 'Generar Lista de Asistencia' : selectedType === 'PLAN_REZAGO' ? 'Generar Plan de Intervención' : selectedType === 'REPORTE_RENDIMIENTO_GRUPO' ? 'Generar Reporte de Rendimiento' : 'Generar Documento'}
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
                                <div className="prose prose-slate max-w-none whitespace-pre-line font-serif text-slate-800 space-y-6">
                                    {generatedContent.split('<!-- PAGE_BREAK -->').map((part, index) => (
                                        <React.Fragment key={index}>
                                            {index > 0 && (
                                                <div className="my-8 border-t-2 border-dashed border-indigo-300 relative print:hidden py-4">
                                                    <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-white px-3 text-xs font-bold text-indigo-500 uppercase tracking-wider border border-indigo-200 rounded-full shadow-sm">
                                                        Salto de Página
                                                    </span>
                                                </div>
                                            )}
                                            <div className="min-h-[200px]">{part.trim()}</div>
                                        </React.Fragment>
                                    ))}
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
