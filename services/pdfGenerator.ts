import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Student, SchoolConfig, BehaviorLog } from '../types';
import QRCode from 'qrcode';

type ColorTuple = [number, number, number];

const COLORS: Record<string, ColorTuple> = {
    primary: [79, 70, 229], // Indigo 600
    secondary: [100, 116, 139], // Slate 500
    accent: [244, 63, 94], // Rose 500
    text: [30, 41, 59], // Slate 800
    lightText: [100, 116, 139], // Slate 500
};

// Helper to convert image URL to Base64
const getBase64ImageFromUrl = async (imageUrl: string): Promise<string | null> => {
    try {
        const res = await fetch(imageUrl);
        const blob = await res.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.warn('Failed to load image', imageUrl, e);
        return null;
    }
};

// Helper to find teacher for a student
const getTeacherForStudent = (config: SchoolConfig, studentGroup?: string): string => {
    if (!studentGroup) return config.teacherName; // Fallback to current user if no group info
    if (!config.staff || config.staff.length === 0) return config.teacherName;

    const sStr = studentGroup.toUpperCase();
    const sGrade = sStr.match(/(\d+)/)?.[0];
    const sLetter = sStr.match(/[A-F]/)?.[0];

    // If we can't parse a specific Grade+Letter, try exact match or return default
    if (!sGrade || !sLetter) return config.teacherName;

    const found = config.staff.find(s => {
        const staffStr = (s.group || '').toUpperCase();
        // Skip directors/admin from this matching
        if (staffStr.includes('DIREC') || staffStr.includes('ADMIN')) return false;

        const staffGrade = staffStr.match(/(\d+)/)?.[0];
        const staffLetter = staffStr.match(/[A-F]/)?.[0];
        return staffGrade === sGrade && staffLetter === sLetter;
    });

    return found ? found.name : config.teacherName;
};

const addHeader = (doc: jsPDF, config: SchoolConfig, title: string) => {
    const pageWidth = doc.internal.pageSize.width;

    // Logo
    if (config.schoolLogo && config.schoolLogo.startsWith('data:')) {
        try {
            const imgFormat = config.schoolLogo.includes('image/png') ? 'PNG' : 'JPEG';
            // Place logo on the left
            doc.addImage(config.schoolLogo, imgFormat, 20, 15, 25, 25);
        } catch (e) {
            console.warn('Could not add logo to PDF', e);
        }
    }

    // School Name
    doc.setFontSize(18);
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(config.schoolName.toUpperCase(), pageWidth / 2, 20, { align: 'center' });

    // Subheader info
    doc.setFontSize(10);
    doc.setTextColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
    doc.setFont('helvetica', 'normal');
    doc.text(`CCT: ${config.cct} | Zona: ${config.zone} | Sector: ${config.sector}`, pageWidth / 2, 26, { align: 'center' });
    doc.text(`${config.location}`, pageWidth / 2, 31, { align: 'center' });

    // Title
    doc.setFontSize(16);
    doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(title, pageWidth / 2, 45, { align: 'center' });

    // Line separator
    doc.setDrawColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.setLineWidth(0.5);
    doc.line(20, 50, pageWidth - 20, 50);
};

const addStudentInfo = (doc: jsPDF, student: Student, config: SchoolConfig, startY: number) => {
    doc.setFontSize(10);
    doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);

    const teacherName = getTeacherForStudent(config, student.group || config.gradeGroup);

    // Row 1
    doc.setFont('helvetica', 'bold');
    doc.text('Alumno:', 20, startY);
    doc.setFont('helvetica', 'normal');
    doc.text(student.name, 45, startY);

    doc.setFont('helvetica', 'bold');
    doc.text('Grado:', 120, startY);
    doc.setFont('helvetica', 'normal');
    doc.text(student.group || config.gradeGroup, 140, startY);

    // Row 2
    doc.setFont('helvetica', 'bold');
    doc.text('CURP:', 20, startY + 6);
    doc.setFont('helvetica', 'normal');
    doc.text(student.curp || '', 45, startY + 6);

    doc.setFont('helvetica', 'bold');
    doc.text('Docente:', 120, startY + 6);
    doc.setFont('helvetica', 'normal');
    doc.text(teacherName, 140, startY + 6);
};

const addFooter = (doc: jsPDF, config: SchoolConfig, student?: Student) => {
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;

    // Resolve teacher name
    // If student provided, look up their specific teacher. Else use current user (config.teacherName)
    const teacherName = student
        ? getTeacherForStudent(config, student.group || config.gradeGroup)
        : config.teacherName;

    // Signatures
    const sigY = pageHeight - 30;

    // Teacher (Left)
    doc.setFontSize(8);
    doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
    doc.setLineWidth(0.5);
    doc.setDrawColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);

    doc.line(30, sigY, 80, sigY);
    doc.text(teacherName, 55, sigY + 5, { align: 'center' });
    doc.setFontSize(7);
    doc.setTextColor(COLORS.lightText[0], COLORS.lightText[1], COLORS.lightText[2]);
    doc.text('Docente de Grupo', 55, sigY + 9, { align: 'center' });

    // Director (Center/Right)
    doc.setDrawColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
    doc.line(pageWidth / 2 - 25, sigY, pageWidth / 2 + 25, sigY);
    doc.setFontSize(8);
    doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
    doc.text(config.directorName || 'Director Escolar', pageWidth / 2, sigY + 5, { align: 'center' });
    doc.setFontSize(7);
    doc.setTextColor(COLORS.lightText[0], COLORS.lightText[1], COLORS.lightText[2]);
    doc.text('Director(a) de la Escuela', pageWidth / 2, sigY + 9, { align: 'center' });

    // Parent (Right)
    doc.line(pageWidth - 80, sigY, pageWidth - 30, sigY);
    doc.setFontSize(7);
    doc.text('Firma del Padre o Tutor', pageWidth - 55, sigY + 5, { align: 'center' });

    // Date
    doc.setFontSize(6);
    const date = new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(`Generado el: ${date}`, 20, pageHeight - 5);
};

export const generateReportCard = async (student: Student, config: SchoolConfig) => {
    try {
        const doc = new jsPDF();

        // Pre-load logo if needed
        let printConfig = { ...config };
        if (config.schoolLogo && !config.schoolLogo.startsWith('data:')) {
            const base64Logo = await getBase64ImageFromUrl(config.schoolLogo);
            if (base64Logo) printConfig.schoolLogo = base64Logo;
        }

        addHeader(doc, printConfig, 'BOLETA DE EVALUACIÓN');
        // Debug line to ensure PDF is not blank
        doc.setFontSize(12);
        doc.setTextColor(255, 0, 0);

        addStudentInfo(doc, student, printConfig, 65);

        // Grades Table
        const getGradeValue = (g: any) => {
            if (typeof g === 'number') return g;
            if (typeof g === 'string' && !isNaN(parseFloat(g))) return parseFloat(g);
            if (typeof g === 'object' && g !== null) {
                return (Number(g.lenguajes || 0) + Number(g.saberes || 0) + Number(g.etica || 0) + Number(g.humano || 0)) / 4;
            }
            return 0;
        };

        const grades = student.grades || [];
        const gradesData = grades.map((grade, index) => [`Evaluación ${index + 1}`, getGradeValue(grade).toFixed(1)]);

        const sum = grades.reduce((acc, grade) => acc + getGradeValue(grade), 0);
        const average = grades.length > 0 ? (sum / grades.length).toFixed(1) : '0';

        autoTable(doc, {
            startY: 85,
            head: [['Periodo / Concepto', 'Calificación']],
            body: [...gradesData, ['PROMEDIO FINAL', average]],
            theme: 'grid',
            headStyles: { fillColor: COLORS.primary },
            footStyles: { fillColor: [240, 240, 240], textColor: COLORS.text, fontStyle: 'bold' },
            styles: { fontSize: 10, cellPadding: 3 },
        });

        // Attendance & Behavior Summary
        const finalY = (doc as any).lastAutoTable.finalY + 15;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Resumen General', 20, finalY);

        const attendance = student.attendance || {};
        const attendanceCount = Object.values(attendance).filter(s => s === 'Presente').length;
        const absences = Object.values(attendance).filter(s => s === 'Ausente').length;

        autoTable(doc, {
            startY: finalY + 5,
            head: [['Concepto', 'Detalle']],
            body: [
                ['Asistencias', attendanceCount.toString()],
                ['Faltas', absences.toString()],
                ['Puntos de Conducta', (student.behaviorPoints || 0).toString()],
                ['Tareas Entregadas', `${student.assignmentsCompleted} / ${student.totalAssignments}`]
            ],
            theme: 'striped',
            headStyles: { fillColor: COLORS.secondary },
        });

        addFooter(doc, config, student);
        doc.save(`Boleta_${student.name.replace(/\s+/g, '_')}.pdf`);
    } catch (e) {
        console.error('Error generating report card PDF:', e);
    }
};

export const generateBehaviorReport = async (student: Student, logs: BehaviorLog[], config: SchoolConfig) => {
    const doc = new jsPDF();

    // Pre-load logo if needed
    let printConfig = { ...config };
    if (config.schoolLogo && !config.schoolLogo.startsWith('data:')) {
        const base64Logo = await getBase64ImageFromUrl(config.schoolLogo);
        if (base64Logo) printConfig.schoolLogo = base64Logo;
    }

    addHeader(doc, printConfig, 'REPORTE DE CONDUCTA');
    addStudentInfo(doc, student, printConfig, 65);

    const validLogs = logs || [];
    const studentLogs = validLogs.filter(l => l.studentId === student.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (studentLogs.length === 0) {
        doc.setFontSize(12);
        doc.setTextColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
        doc.text('No hay incidencias registradas para este alumno.', 20, 100);
    } else {
        autoTable(doc, {
            startY: 85,
            head: [['Fecha', 'Tipo', 'Descripción']],
            body: studentLogs.map(log => [
                new Date(log.date).toLocaleDateString(),
                log.type === 'POSITIVE' ? 'Positiva' : 'Negativa',
                log.description
            ]),
            theme: 'grid',
            headStyles: { fillColor: COLORS.primary },
            columnStyles: {
                0: { cellWidth: 30 },
                1: { cellWidth: 30 },
                2: { cellWidth: 'auto' }
            },
            didParseCell: (data) => {
                if (data.section === 'body' && data.column.index === 1) {
                    const type = data.cell.raw;
                    if (type === 'Positiva') {
                        data.cell.styles.textColor = [22, 163, 74]; // Green
                    } else {
                        data.cell.styles.textColor = [220, 38, 38]; // Red
                    }
                }
            }
        });
    }

    // Behavior Points Summary
    const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 15 : 100;

    doc.setFontSize(12);
    doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(`Puntaje Total de Conducta: ${student.behaviorPoints || 0}`, 20, finalY);

    addFooter(doc, config, student);
    doc.save(`Conducta_${student.name.replace(/\s+/g, '_')}.pdf`);
};



export const generateStudentCredentials = async (students: Student[], config: SchoolConfig) => {
    const doc = new jsPDF();

    // Card Setup (Vertical ID Card size approx 60x90mm)
    const cardW = 60;
    const cardH = 90;
    const marginX = 15;
    const marginY = 10;
    const gapX = 0;
    const cutGap = 2;

    let x = marginX;
    let y = marginY;
    let row = 0;

    // Load School Logo if available from config
    let schoolLogoBase64: string | null = null;
    if (config.schoolLogo && config.schoolLogo.startsWith('data:')) {
        schoolLogoBase64 = config.schoolLogo;
    }

    for (const student of students) {
        // --- PREPARE ASSETS ---
        const qrDataUrl = await QRCode.toDataURL(student.id, { margin: 1, width: 300 });

        let avatarBase64 = null;
        if (student.avatar) {
            if (student.avatar.startsWith('data:')) {
                avatarBase64 = student.avatar;
            } else {
                avatarBase64 = await getBase64ImageFromUrl(student.avatar);
            }
        }

        // ====================
        // FRONT SIDE
        // ====================
        const xF = x;
        const yF = y;

        // Background
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.1);
        doc.roundedRect(xF, yF, cardW, cardH, 3, 3, 'FD');

        // Header Background (Taller to allow space for hole at top)
        const headerHeight = 28;
        doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
        doc.rect(xF + 0.2, yF + 0.2, cardW - 0.4, headerHeight, 'F');

        // PUNCH HOLE GUIDE (Visual)
        doc.setFillColor(255, 255, 255);
        doc.circle(xF + cardW / 2, yF + 6, 2.5, 'F'); // 5mm hole centered at 6mm from top
        doc.setDrawColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
        doc.setLineWidth(0.1);
        doc.circle(xF + cardW / 2, yF + 6, 2.5, 'S');

        // --> Logo & School Name Layout (Shifted down: Start Y ~ 12)
        const contentStartY = yF + 12;
        const logoSize = 13;
        const headerTextStart = schoolLogoBase64 ? xF + 5 + logoSize + 2 : xF + cardW / 2;
        const alignMode = schoolLogoBase64 ? 'left' : 'center';

        // Draw Logo if exists
        if (schoolLogoBase64) {
            try {
                doc.setFillColor(255, 255, 255);
                doc.circle(xF + 5 + logoSize / 2, contentStartY + logoSize / 2, logoSize / 2 + 0.5, 'F');
                doc.addImage(schoolLogoBase64, 'PNG', xF + 5, contentStartY, logoSize, logoSize);
            } catch (e) {
                console.warn('Logo draw failed', e);
            }
        }

        // School Name Text
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(schoolLogoBase64 ? 7 : 8);
        doc.setFont('helvetica', 'bold');

        const maxTextW = schoolLogoBase64 ? (cardW - logoSize - 10) : (cardW - 4);
        const schoolNameLines = doc.splitTextToSize(config.schoolName.toUpperCase(), maxTextW);

        const textBlockH = schoolNameLines.length * 3 + 6;
        let textY = contentStartY + (logoSize - textBlockH) / 2 + 2;

        doc.text(schoolNameLines, schoolLogoBase64 ? headerTextStart : xF + cardW / 2, textY, { align: alignMode });

        doc.setFontSize(5);
        doc.setFont('helvetica', 'normal');
        doc.text(`${config.cct} | ${config.zone}`, schoolLogoBase64 ? headerTextStart : xF + cardW / 2, textY + (schoolNameLines.length * 3.5), { align: alignMode });

        // Title "Credencial" (Below Header)
        doc.setFontSize(6);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
        doc.text('ALUMNO', xF + cardW / 2, yF + headerHeight + 5, { align: 'center' });

        // Photo
        const photoY = yF + headerHeight + 8;
        const photoSize = 28; // Smaller photo

        if (avatarBase64) {
            try {
                doc.addImage(avatarBase64, 'JPEG', xF + (cardW - photoSize) / 2, photoY, photoSize, photoSize);
            } catch {
                doc.setFillColor(240, 240, 240);
                doc.circle(xF + cardW / 2, photoY + photoSize / 2, photoSize / 2, 'F');
            }
        } else {
            doc.setFillColor(240, 240, 240);
            doc.circle(xF + cardW / 2, photoY + photoSize / 2, photoSize / 2, 'F');
        }
        doc.setDrawColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
        doc.setLineWidth(0.5);
        doc.roundedRect(xF + (cardW - photoSize) / 2, photoY, photoSize, photoSize, 1, 1, 'S');

        // Student Content
        const infoY = photoY + photoSize + 5;
        doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        const splitName = doc.splitTextToSize(student.name, cardW - 6);
        doc.text(splitName, xF + cardW / 2, infoY, { align: 'center' });

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
        const textNextY = infoY + (splitName.length * 4);
        doc.text(config.gradeGroup, xF + cardW / 2, textNextY, { align: 'center' });

        // Footer Strip (Front)
        doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
        doc.rect(xF, yF + cardH - 4, cardW, 4, 'F');
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.1);
        doc.roundedRect(xF, yF, cardW, cardH, 3, 3, 'S');

        // ====================
        // BACK SIDE
        // ====================
        const xB = x + cardW + cutGap;
        const yB = y;

        // Background
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.1);
        doc.roundedRect(xB, yB, cardW, cardH, 3, 3, 'FD');

        // Header Strip (Back)
        doc.setFillColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
        doc.rect(xB + 0.2, yB + 0.2, cardW - 0.4, 15, 'F'); // Taller header on back too to match/clear hole

        // Hole Guide Back
        doc.setFillColor(255, 255, 255);
        doc.circle(xB + cardW / 2, yB + 6, 2.5, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text('CÓDIGO DE ACCESO', xB + cardW / 2, yB + 12, { align: 'center' });

        // QR Code
        const qrSize = 42;
        const qrY = yB + 20;
        doc.addImage(qrDataUrl, 'PNG', xB + (cardW - qrSize) / 2, qrY, qrSize, qrSize);

        // ID & Signature
        doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(student.id, xB + cardW / 2, qrY + qrSize + 6, { align: 'center' });
        doc.setFontSize(6);
        doc.setTextColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
        doc.text('ID DE ESTUDIANTE', xB + cardW / 2, qrY + qrSize + 9, { align: 'center' });

        const sigY = yB + cardH - 15;
        doc.setDrawColor(150, 150, 150);
        doc.line(xB + 10, sigY, xB + cardW - 10, sigY);
        doc.setFontSize(6);
        doc.text('FIRMA DEL TUTOR', xB + cardW / 2, sigY + 3, { align: 'center' });

        // Footer Strip (Back)
        doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
        doc.rect(xB, yB + cardH - 4, cardW, 4, 'F');
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.1);
        doc.roundedRect(xB, yB, cardW, cardH, 3, 3, 'S');

        row++;
        y += cardH + 2;

        if (row >= 3) {
            doc.addPage();
            row = 0;
            y = marginY;
        }
    }

    doc.save(`Credenciales_Escolares_${new Date().toISOString().split('T')[0]}.pdf`);
};

// --- NEW DOCUMENT GENERATORS ---

export const generateSchoolDocument = (
    type: 'CONSTANCIA' | 'CITATORIO' | 'ACTA_HECHOS' | 'ACTA_ADMINISTRATIVA' | 'PERMISO_ECONOMICO',
    data: any, // Generic data object depending on type
    config: SchoolConfig
) => {
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // Header
    let title = '';
    switch (type) {
        case 'CONSTANCIA': title = 'CONSTANCIA DE ESTUDIOS'; break;
        case 'CITATORIO': title = 'CITATORIO DE PADRES DE FAMILIA'; break;
        case 'ACTA_HECHOS': title = 'ACTA DE HECHOS'; break;
        case 'ACTA_ADMINISTRATIVA': title = 'ACTA ADMINISTRATIVA'; break;
        case 'PERMISO_ECONOMICO': title = 'SOLICITUD DE PERMISO ECONÓMICO'; break;
    }

    // Only call addHeader for document types that use the standard header
    if (type !== 'CONSTANCIA') {
        addHeader(doc, config, title);
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);

    const margin = 20;
    const pageWidth = doc.internal.pageSize.width;
    const contentWidth = pageWidth - (margin * 2);
    let y = 65; // Initial Y for content after header

    // Location and Date (Right aligned) - For non-CONSTANCIA types
    if (type !== 'CONSTANCIA') {
        doc.text(`${config.location}, a ${date}`, pageWidth - margin, y, { align: 'right' });
        y += 15;
    }

    // Content Body
    if (type === 'CONSTANCIA') {
        // --- 1. CONFIG & DATA ---
        const studentName = data.studentName || '______________________';
        const gradeStr = data.grade || config.gradeGroup || '_______';

        // Helper to format grade nicely
        const formatGrade = (g: string) => {
            const lower = g.toLowerCase();
            if (lower.includes('1')) return 'primer';
            if (lower.includes('2')) return 'segundo';
            if (lower.includes('3')) return 'tercero';
            if (lower.includes('4')) return 'cuarto';
            if (lower.includes('5')) return 'quinto';
            if (lower.includes('6')) return 'sexto';
            return g;
        };
        const gradeText = formatGrade(gradeStr);

        // Cycle Logic
        let cycle = config.schoolYear;
        if (!cycle) {
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth();
            if (currentMonth >= 7) cycle = `${currentYear}-${currentYear + 1}`;
            else cycle = `${currentYear - 1}-${currentYear}`;
        }

        const curp = data.curp || '___________________';
        const studentId = data.studentId || '___________________';
        const directorName = config.directorName || '___________________';

        // 1. Clean School Name (Remove "Escuela Primaria" if present to avoid dup)
        const cleanSchoolName = config.schoolName.replace(/^Esc\.?\s*Primaria\s*/i, '').replace(/^Escuela\s*Primaria\s*/i, '');

        // 2. Address & Location Logic
        // If config.location appears to be a full address, we default to "Guasave, Sinaloa" for the city part
        let city = config.location;
        if (city.length > 30 || city.toUpperCase().includes('MADERO')) {
            city = 'GUASAVE, SINALOA';
        }

        // Address Fallback
        const rawAddress = (config as any).address;
        const address = rawAddress && rawAddress !== 'Domicilio Conocido' ? rawAddress : 'Madero y Blas Valenzuela S/N';

        // 3. Precise Date Format: "08 DE ENERO DE 2026"
        const dateObj = new Date();
        const day = dateObj.getDate().toString().padStart(2, '0');
        const months = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
        const month = months[dateObj.getMonth()];
        const year = dateObj.getFullYear();
        const dateStr = `${day} DE ${month} DE ${year}`;


        // --- 2. CUSTOM HEADER FOR CONSTANCIA ---
        // Logo (Top Left) - Adjusted Y to accommodate new 3-line header
        if (config.schoolLogo && (config.schoolLogo.startsWith('data:') || config.schoolLogo.startsWith('http'))) {
            try {
                const imgFormat = config.schoolLogo.includes('image/png') ? 'PNG' : 'JPEG';
                doc.addImage(config.schoolLogo, imgFormat, margin, 15, 22, 22);
            } catch (e) {
                console.warn('School logo for Constancia failed to load', e);
            }
        }

        // Institutional Header (Centered at Top)
        doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]); // Dark Slate

        // Line 1: SECRETARIA
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('SECRETARIA DE EDUCACIÓN PÚBLICA Y CULTURA', pageWidth / 2, 20, { align: 'center' });

        // Line 2: SCHOOL NAME
        doc.setFontSize(10);
        // Ensure "ESCUELA PRIMARIA" is present if cleanName doesn't have it (it shouldn't per clean func).
        // User requested "TURNO VESPERTINO". We add it if not present in config name.
        let nameLine = `ESCUELA PRIMARIA ${cleanSchoolName}`;
        if (!nameLine.toUpperCase().includes('VESPERTINO') && !nameLine.toUpperCase().includes('MATUTINO')) {
            nameLine += '   TURNO VESPERTINO';
        }
        doc.text(nameLine.toUpperCase(), pageWidth / 2, 25, { align: 'center' });

        // Line 3: INFO
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`CLAVE: ${config.cct}    ZONA ESCOLAR ${config.zone}    SECTOR ${config.sector || 'II'}`, pageWidth / 2, 30, { align: 'center' });

        // Document Title (Centered, slightly lower)
        doc.setFontSize(16);
        doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]); // Indigo
        doc.setFont('helvetica', 'bold');
        doc.text('CONSTANCIA DE ESTUDIOS', pageWidth / 2, 45, { align: 'center' });

        // Horizontal Line below title
        doc.setDrawColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
        doc.setLineWidth(0.5);
        doc.line(margin, 50, pageWidth - margin, 50);

        // --- 3. LAYOUT (Content starts after custom header) ---
        y = 65; // Reset Y for content body after the custom header

        // Top Right Info (City, Date, and Subject)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
        doc.text(`${city.toUpperCase()}, A ${dateStr}`, pageWidth - margin, y, { align: 'right' });
        y += 10;
        doc.text('ASUNTO: CONSTANCIA DE ESTUDIOS', pageWidth - margin, y, { align: 'right' });
        y += 25;

        // "A QUIEN CORRESPONDA:"
        doc.text('A QUIEN CORRESPONDA:', margin, y);
        y += 15;

        // Paragraph 1: Director Info
        doc.setFont('helvetica', 'normal');
        const body1 = `La que suscribe Profa. ${directorName} directora en turno de la Escuela Primaria ${cleanSchoolName}, ubicada en ${address}, en la ciudad de ${city}.`;
        const splitBody1 = doc.splitTextToSize(body1, contentWidth);
        doc.text(splitBody1, margin, y, { align: 'justify', maxWidth: contentWidth });
        y += (splitBody1.length * 6) + 15;

        // "Hace constar" - Centered, Bold
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('Hace constar', pageWidth / 2, y, { align: 'center' });
        y += 15;

        // Paragraph 2: Student Info
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        const body2 = `Que el alumno ${studentName.toUpperCase()} con CURP ${curp} y clave de alumno ${studentId}, se encuentra inscrito en esta institución educativa, cursando el ${gradeText} grado de educación primaria, durante el ciclo escolar ${cycle}.`;
        const splitBody2 = doc.splitTextToSize(body2, contentWidth);
        doc.text(splitBody2, margin, y, { align: 'justify', maxWidth: contentWidth });
        y += (splitBody2.length * 6) + 15;

        // Closing
        const body3 = `Se expide la presente constancia a petición del interesado, y para los fines que a este convenga, en ${city}, a ${dateStr.toLowerCase()}.`;
        const splitBody3 = doc.splitTextToSize(body3, contentWidth);
        doc.text(splitBody3, margin, y, { align: 'justify', maxWidth: contentWidth });

        // --- 4. SIGNATURE ---
        const sigY = doc.internal.pageSize.height - 50; // Position signature block from bottom
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('ATENTAMENTE', pageWidth / 2, sigY - 35, { align: 'center' }); // Raised 'Atentamente' for better spacing

        doc.setLineWidth(0.5);
        doc.setDrawColor(0, 0, 0); // Ensure black line
        doc.line(pageWidth / 2 - 50, sigY, pageWidth / 2 + 50, sigY); // Signature line
        doc.setFontSize(10);
        doc.text((`PROFA. ${directorName}`).toUpperCase(), pageWidth / 2, sigY + 5, { align: 'center' }); // Director's name
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('DIRECTORA DE LA ESCUELA', pageWidth / 2, sigY + 10, { align: 'center' }); // Director's title
    }
    else if (type === 'CITATORIO') {
        const studentName = data.studentName;
        const reason = data.reason || 'Tratar asuntos relacionados con la educación de su hijo(a).';
        const dateStr = data.appointmentDate || '___/___/___';
        const timeStr = data.appointmentTime || '__:__';

        doc.setFont('helvetica', 'bold');
        doc.text(`C. PADRE DE FAMILIA O TUTOR DEL ALUMNO(A):`, margin, y);
        y += 7;
        doc.text(studentName.toUpperCase(), margin, y);
        y += 10;

        doc.setFont('helvetica', 'normal');
        const body = `Por medio del presente se le solicita de la manera más atenta su presencia en la dirección de esta escuela el día ${dateStr} a las ${timeStr} horas, con el motivo de:`;
        const splitBody = doc.splitTextToSize(body, contentWidth);
        doc.text(splitBody, margin, y);
        y += (splitBody.length * 5) + 5;

        doc.setFont('helvetica', 'bold'); // Reason bold
        const splitReason = doc.splitTextToSize(reason, contentWidth);
        doc.text(splitReason, margin, y);
        y += (splitReason.length * 5) + 10;

        doc.setFont('helvetica', 'normal');
        doc.text('Agradecemos de antemano su puntual asistencia y apoyo.', margin, y);
    }
    else if (type === 'ACTA_HECHOS' || type === 'ACTA_ADMINISTRATIVA') {
        const involved = data.involved || '______________________'; // Name of person
        const description = data.description || '';

        doc.setFont('helvetica', 'bold');
        doc.text(`INVOLUCRADO(S): ${involved.toUpperCase()}`, margin, y);
        y += 10;

        doc.setFont('helvetica', 'normal');
        doc.text('DESCRIPCION DE LOS HECHOS:', margin, y);
        y += 7;

        // Draw lines for description if empty, or text if provided
        if (description.length > 5) {
            const splitDesc = doc.splitTextToSize(description, contentWidth);
            doc.text(splitDesc, margin, y);
            y += (splitDesc.length * 5);
        } else {
            for (let i = 0; i < 15; i++) {
                doc.line(margin, y + (i * 8), pageWidth - margin, y + (i * 8));
            }
            y += (15 * 8);
        }

        y += 10;
        doc.setFontSize(9);
        doc.text('Firmando al calce los que en ella intervinieron para dar fe de legalidad.', margin, y);
    }
    else if (type === 'PERMISO_ECONOMICO') {
        const staffName = data.staffName || '______________________';
        const days = data.days || '___';
        const startDate = data.startDate || '___/___/___';

        doc.text(`C. SUPERVISOR(A) DE LA ZONA ESCOLAR No. ${config.zone}`, margin, y);
        doc.text('P R E S E N T E', margin, y + 5);
        y += 20;

        const body = `El (La) que suscribe, ${staffName}, con clave de servidor público ________________, adscrito(a) a la Escuela "${config.schoolName}", solicita a usted de la manera más atenta un PERMISO ECONÓMICO por ${days} día(s), a partir del día ${startDate}, reanudando labores el día ________________.`;
        const splitBody = doc.splitTextToSize(body, contentWidth);
        doc.text(splitBody, margin, y);
        y += (splitBody.length * 5) + 10;

        doc.text('Motivo: __________________________________________________________', margin, y);
    }

    // Signatures (For non-Constancia types, as Constancia has custom sig)
    if (type !== 'CONSTANCIA') {
        const sigY = doc.internal.pageSize.height - 40;

        // Director Signature (Always center/right)
        doc.setFontSize(10);
        doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
        doc.line(pageWidth / 2 - 25, sigY, pageWidth / 2 + 25, sigY);
        doc.text(config.directorName || 'Director Escolar', pageWidth / 2, sigY + 5, { align: 'center' });
        doc.setFontSize(8);
        doc.text('DIRECTOR(A)', pageWidth / 2, sigY + 9, { align: 'center' });

        // Additional signatures based on type
        if (type === 'CITATORIO') {
            doc.line(margin + 10, sigY, margin + 60, sigY);
            doc.setFontSize(10);
            doc.text('Padre o Tutor', margin + 35, sigY + 5, { align: 'center' });
        }
        if (type === 'ACTA_HECHOS' || type === 'ACTA_ADMINISTRATIVA') {
            doc.line(margin + 10, sigY, margin + 60, sigY);
            doc.setFontSize(10);
            doc.text('Involucrado', margin + 35, sigY + 5, { align: 'center' });

            doc.line(pageWidth - 70, sigY, pageWidth - 20, sigY);
            doc.text('Testigo', pageWidth - 45, sigY + 5, { align: 'center' });
        }
        if (type === 'PERMISO_ECONOMICO') {
            doc.line(margin + 10, sigY, margin + 60, sigY);
            doc.setFontSize(10);
            doc.text('Solicitante', margin + 35, sigY + 5, { align: 'center' });
        }
    }

    doc.save(`${title}_${new Date().getTime()}.pdf`);
};

export const generateGroupList = (
    students: Student[],
    config: SchoolConfig,
    options: {
        includeRisk: boolean,
        includeFee: boolean,
        includeEvents: boolean,
        includeExams: boolean
    },
    groupName: string
) => {
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString('es-MX');

    addHeader(doc, config, `LISTA DE GRUPO: ${groupName}`);
    doc.setFontSize(9);
    doc.text(`Fecha de Impresión: ${date}`, 20, 55);

    const headers = ['No.', 'Nombre Completo'];
    if (options.includeRisk) headers.push('Alerta Riesgo');
    if (options.includeFee) headers.push('Cuota Anual');
    if (options.includeEvents) headers.push('Eventos');
    if (options.includeExams) headers.push('Exámenes');

    // Filter students by group (handled by caller preferably, but lets filter just in case)
    const groupStudents = students.filter(s => (s.group || config.gradeGroup) === groupName).sort((a, b) => a.name.localeCompare(b.name));

    const body = groupStudents.map((s, idx) => {
        const row = [(idx + 1).toString(), s.name];

        if (options.includeRisk) {
            let risk = '';
            // Simple risk logic check
            const hasBehaviorRisk = s.behaviorPoints < 0;
            const hasRepeaterRisk = s.repeater;
            let avg = 0;
            if (s.grades && s.grades.length > 0) {
                let sum = 0;
                s.grades.forEach((g: any) => {
                    if (typeof g === 'object') sum += (Number(g.lenguajes || 0) + Number(g.saberes || 0) + Number(g.etica || 0) + Number(g.humano || 0)) / 4;
                    else sum += Number(g);
                });
                avg = sum / s.grades.length;
            }
            const hasGradeRisk = avg > 0 && avg < 7;

            if (hasBehaviorRisk) risk += 'Cond ';
            if (hasRepeaterRisk) risk += 'Rep ';
            if (hasGradeRisk) risk += 'Acad ';

            row.push(risk || 'Sin Riesgo');
        }

        if (options.includeFee) row.push(s.annualFeePaid ? 'PAGADO' : 'PENDIENTE');
        if (options.includeEvents) row.push(s.eventFeePaid ? 'PAGADO' : 'PENDIENTE');
        if (options.includeExams) row.push(s.examFeePaid ? 'PAGADO' : 'PENDIENTE');

        return row;
    });

    autoTable(doc, {
        startY: 60,
        head: [headers],
        body: body,
        theme: 'grid',
        headStyles: { fillColor: COLORS.primary },
        styles: { fontSize: 8 },
    });

    // Add simple stats at bottom
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.text(`Total Alumnos: ${groupStudents.length}`, 20, finalY);
    doc.text(`Hombres: ${groupStudents.filter(s => s.sex === 'HOMBRE').length} | Mujeres: ${groupStudents.filter(s => s.sex === 'MUJER').length}`, 20, finalY + 5);

    doc.save(`Lista_${groupName.replace(/\s+/g, '_')}.pdf`);
};
