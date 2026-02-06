import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Student, SchoolEvent, Notification, Assignment, DraggableItem, InteractiveZone, BehaviorLog } from '../types';
import { Bell, Calendar as CalendarIcon, LogOut, MessageCircle, User, CheckCircle, Smartphone, Send, Play, Trophy, HelpCircle, X, Check, AlertCircle, BookOpen, Circle, Move, Trash2, LayoutDashboard } from 'lucide-react';

interface ParentsPortalProps {
    onBack: () => void;
    standalone?: boolean;
}

export const ParentsPortal: React.FC<ParentsPortalProps> = ({ onBack, standalone = false }) => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [loginId, setLoginId] = useState('');
    const [error, setError] = useState('');
    const [student, setStudent] = useState<Student | null>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [events, setEvents] = useState<SchoolEvent[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');

    // Quiz State
    const [activeQuiz, setActiveQuiz] = useState<Assignment | null>(null);
    const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
    const [quizResult, setQuizResult] = useState<{ score: number, passed: boolean } | null>(null);

    // Worksheet State
    const [activeWorksheet, setActiveWorksheet] = useState<Assignment | null>(null);
    const [canvasRef, setCanvasRef] = useState<HTMLCanvasElement | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawColor, setDrawColor] = useState('#ef4444'); // Red default
    const [drawMode, setDrawMode] = useState<'PEN' | 'ERASER' | 'HIGHLIGHTER' | 'MOVE' | 'MARKER'>('PEN');
    const [textAnswers, setTextAnswers] = useState<{ [key: string]: string }>({}); // Stores student text input active answers
    const [lastPos, setLastPos] = useState<{ x: number, y: number } | null>(null);
    const [isGrading, setIsGrading] = useState(false);
    const [studentMarks, setStudentMarks] = useState<{ x: number, y: number }[]>([]);

    // Draggable Items Runtime State
    // Draggable Items Runtime State
    const [activeDraggableItems, setActiveDraggableItems] = useState<{ id: string, x: number, y: number, content: string, type: 'TEXT' | 'IMAGE' }[]>([]);

    // New Interaction States
    const [selectedZoneIds, setSelectedZoneIds] = useState<string[]>([]);
    const [matchedPairs, setMatchedPairs] = useState<{ sourceId: string, targetId: string }[]>([]);
    const [activeMatchSource, setActiveMatchSource] = useState<string | null>(null);

    // New Detail State
    const [behaviorLogs, setBehaviorLogs] = useState<BehaviorLog[]>([]);
    const [activeDetail, setActiveDetail] = useState<'GRADES' | 'ATTENDANCE' | 'BEHAVIOR' | null>(null);

    // Load Assignments on Login
    useEffect(() => {
        if (isLoggedIn) {
            api.getAssignments().then((res: any) => {
                if (Array.isArray(res)) setAssignments(res);
                else if (res.assignments) setAssignments(res.assignments);
                else setAssignments([]);
            }).catch(err => {
                console.error("Failed to load assignments", err);
                setAssignments([]);
            });
        }
    }, [isLoggedIn]);

    const handleStartQuiz = async (assignment: Assignment) => {
        let fullAssignment = assignment;

        // Lazy load full data if missing or stripped (Optimized Load Support)
        const isStripped = assignment.interactiveData && (assignment.interactiveData as any).hasContent && !assignment.interactiveData.imageUrl && !assignment.interactiveData.questions;

        if (!assignment.interactiveData || isStripped) {
            try {
                const data = await api.getAssignmentById(assignment.id);
                if (data && data.interactiveData) {
                    fullAssignment = { ...assignment, interactiveData: data.interactiveData };
                } else {
                    alert("Error: No se pudieron cargar los datos de esta actividad.");
                    return;
                }
            } catch (e) {
                console.error("Failed to load assignment detail", e);
                alert("Error de conexión al cargar la actividad.");
                return;
            }
        }

        if (fullAssignment.interactiveData?.type === 'WORKSHEET') {
            setActiveWorksheet(fullAssignment);

            // Initialize draggable items if any
            if (fullAssignment.interactiveData.draggableItems && fullAssignment.interactiveData.draggableItems.length > 0) {
                // Initial placement: Start them at the top (tray) or specified initial pos
                setActiveDraggableItems(fullAssignment.interactiveData.draggableItems.map((item, idx) => ({
                    id: item.id,
                    content: item.content,
                    type: item.type,
                    x: 10 + (idx * 110), // Simple staggered initial placement
                    y: 10
                })));
                setDrawMode('MOVE'); // Auto-switch to Move mode if needed, or keep standard
            } else {
                setActiveDraggableItems([]);
            }
            return;
        }

        if (fullAssignment.interactiveData?.type === 'QUIZ') {
            if (!fullAssignment.interactiveData.questions || fullAssignment.interactiveData.questions.length === 0) {
                alert("Error: Esta actividad está marcada como interactiva pero no contiene preguntas válidas.");
                return;
            }
            setActiveQuiz(fullAssignment);
            setQuizAnswers({});
            setQuizResult(null);
        }
    };

    const handleCompleteWorksheet = async () => {
        if (!activeWorksheet || !student) return;

        setIsGrading(true);
        let score = 0;
        let feedback = "";
        let finalImage = "";

        try {
            const canvas = canvasRef;
            if (!canvas) throw new Error("No canvas");

            // --- 1. GENERATE FINAL IMAGE EVIDENCE ---
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            const tCtx = tempCanvas.getContext('2d');

            if (tCtx && activeWorksheet.interactiveData?.type === 'WORKSHEET') {
                // ... (Image generation code remains mostly same, condensed for brevity in thought but expounded here)
                const bgImg = new Image();
                bgImg.src = activeWorksheet.interactiveData.imageUrl;
                await new Promise((resolve) => {
                    if (bgImg.complete) resolve(true);
                    bgImg.onload = () => resolve(true);
                    bgImg.onerror = () => resolve(false);
                });
                tCtx.drawImage(bgImg, 0, 0, tempCanvas.width, tempCanvas.height);
                tCtx.drawImage(canvas, 0, 0);

                // Draw Text Answers for Evidence
                Object.entries(textAnswers).forEach(([zoneId, text]) => {
                    const zone = (activeWorksheet.interactiveData as any).interactiveZones?.find((z: any) => z.id === zoneId);
                    if (zone) {
                        const x = (zone.x / 100) * tempCanvas.width;
                        const y = (zone.y / 100) * tempCanvas.height;
                        tCtx.fillStyle = "blue";
                        tCtx.font = "bold 14px sans-serif";
                        tCtx.fillText(text, x + 5, y + 15);
                    }
                });

                // Evidence for SELECTABLE
                if (selectedZoneIds.length > 0) {
                    tCtx.strokeStyle = "#a855f7"; // purple
                    tCtx.lineWidth = 4;
                    selectedZoneIds.forEach(id => {
                        const zone = (activeWorksheet.interactiveData as any).interactiveZones?.find((z: any) => z.id === id);
                        if (zone) {
                            const x = (zone.x / 100) * tempCanvas.width;
                            const y = (zone.y / 100) * tempCanvas.height;
                            const w = (zone.width / 100) * tempCanvas.width;
                            const h = (zone.height / 100) * tempCanvas.height;
                            tCtx.strokeRect(x, y, w, h);
                        }
                    });
                }

                // Evidence for MATCHES
                if (matchedPairs.length > 0) {
                    tCtx.strokeStyle = "#10b981"; // emerald
                    tCtx.lineWidth = 3;
                    matchedPairs.forEach(pair => {
                        const s = (activeWorksheet.interactiveData as any).interactiveZones?.find((z: any) => z.id === pair.sourceId);
                        const t = (activeWorksheet.interactiveData as any).interactiveZones?.find((z: any) => z.id === pair.targetId);
                        if (s && t) {
                            tCtx.beginPath();
                            tCtx.moveTo((s.x + s.width / 2) / 100 * tempCanvas.width, (s.y + s.height / 2) / 100 * tempCanvas.height);
                            tCtx.lineTo((t.x + t.width / 2) / 100 * tempCanvas.width, (t.y + t.height / 2) / 100 * tempCanvas.height);
                            tCtx.stroke();
                        }
                    });
                }

                // Draw Draggables
                if (activeDraggableItems.length > 0) {
                    tCtx.font = "bold 16px sans-serif";
                    tCtx.textBaseline = "top";
                    activeDraggableItems.forEach(item => {
                        // Simple approximation for evidence saving
                        // Ideally we map coordinates precisely, but for evidence saving raw positions relative to canvas is acceptable if canvas matches viewport
                        // For now, assuming direct mapping since we set canvas.width to image native but displayed at 100%
                        // We need to scale item.x (CSS pixels) to Canvas pixels

                        // Note: This matches the previous implementation's logic gap, but sufficient for evidence visual
                        // We will rely on grading logic below for scorinng
                        tCtx.fillStyle = "black";
                        tCtx.fillText(item.content, item.x, item.y);
                    });
                }
                finalImage = tempCanvas.toDataURL('image/jpeg', 0.8);
            } else {
                finalImage = canvas.toDataURL('image/jpeg', 0.8);
            }


            // --- 2. GRADING LOGIC ---
            const data = activeWorksheet.interactiveData;
            // Type guard to ensure we are working with a WORKSHEET
            if (!data || data.type !== 'WORKSHEET') {
                // Should likely not happen here given previous checks, but for TS safety:
                // Fallback or exit? If type is QUIZ, we shouldn't be here.
                // But strictly speaking we just want to access interactiveZones if they exist.
            }
            const interactiveZones = (data && data.type === 'WORKSHEET') ? data.interactiveZones : undefined;
            const answerKeys = (data && data.type === 'WORKSHEET') ? data.answerKeyPoints : undefined;

            if (interactiveZones && interactiveZones.length > 0) {
                // --> MODE A: INTERACTIVE ZONES (New Standard)
                let correctPoints = 0;
                let totalPoints = 0;
                let resultsDetails: string[] = [];

                interactiveZones.forEach((zone: InteractiveZone) => { // Explicit any or InteractiveZone to avoid implicit any if inference fails
                    totalPoints += (zone.points || 1);
                    let isCorrect = false;

                    // ... existing logic ...
                    if (zone.type === 'TEXT_INPUT') {
                        // ...
                        const studentAnswer = (textAnswers[zone.id] || "").trim().toLowerCase();
                        const correct = (zone.correctAnswer || "").trim().toLowerCase();
                        if (studentAnswer === correct) isCorrect = true;
                    }
                    else if (zone.type === 'DROP_ZONE') {
                        const container = canvasRef.parentElement;
                        if (container) {
                            const rect = container.getBoundingClientRect();
                            const matches = activeDraggableItems.filter(item => {
                                const itemCX = item.x + 30;
                                const itemCY = item.y + 15;
                                const itemPctX = (itemCX / rect.width) * 100;
                                const itemPctY = (itemCY / rect.height) * 100;
                                return (itemPctX >= zone.x && itemPctX <= (zone.x + zone.width) && itemPctY >= zone.y && itemPctY <= (zone.y + zone.height));
                            });
                            const correctVal = (zone.correctAnswer || "").trim().toLowerCase();
                            if (matches.some(m => m.content.trim().toLowerCase() === correctVal)) isCorrect = true;
                        }
                    }
                    else if (zone.type === 'SELECTABLE') {
                        const selected = selectedZoneIds.includes(zone.id);
                        if (zone.isCorrect && selected) isCorrect = true;
                        else if (!zone.isCorrect && selected) isCorrect = false;
                    }
                    else if (zone.type === 'MATCH_SOURCE') {
                        const pair = matchedPairs.find(p => p.sourceId === zone.id);
                        if (pair) {
                            const target = interactiveZones.find((z: InteractiveZone) => z.id === pair.targetId);
                            if (target && target.type === 'MATCH_TARGET' && target.matchId === zone.matchId) isCorrect = true;
                        }
                    }
                    else if (zone.type === 'MATCH_TARGET') {
                        const pair = matchedPairs.find(p => p.targetId === zone.id);
                        if (pair) {
                            const source = interactiveZones.find((z: InteractiveZone) => z.id === pair.sourceId);
                            if (source && source.type === 'MATCH_SOURCE' && source.matchId === zone.matchId) isCorrect = true;
                        }
                    }

                    if (isCorrect) correctPoints += (zone.points || 1);
                    resultsDetails.push(isCorrect ? "✅ Correcto" : "❌ Incorrecto");
                });

                const rawScore = totalPoints > 0 ? (correctPoints / totalPoints) * 10 : 0;
                score = Math.round(rawScore * 10) / 10;
                feedback = `Has obtenido ${correctPoints} puntos de un total de ${totalPoints}.`;

            } else if (answerKeys && answerKeys.length > 0) {
                // --> MODE B: LEGACY GEOMETRIC MARKER
                let correctCount = 0;
                const threshold = 5; // tolerance
                answerKeys.forEach(tKey => {
                    const match = studentMarks.find(sMark => {
                        const dx = Math.abs(sMark.x - tKey.x);
                        const dy = Math.abs(sMark.y - tKey.y);
                        return Math.sqrt(dx * dx + dy * dy) < threshold;
                    });
                    if (match) correctCount++;
                });

                const rawScore = (correctCount / answerKeys.length) * 10;
                score = Math.round(rawScore * 10) / 10;
                feedback = `Has encontrado ${correctCount} de ${answerKeys.length} respuestas correctas.`;
                await new Promise(r => setTimeout(r, 1000));

            } else {
                // --> MODE C: AI GRADING (Fallback)
                const { gradeInteractiveWorksheet } = await import('../services/ai');
                const gradingCriteria = activeWorksheet.interactiveData?.type === 'WORKSHEET' ? activeWorksheet.interactiveData.gradingCriteria : undefined;
                const result = await gradeInteractiveWorksheet(finalImage, activeWorksheet.title, gradingCriteria);
                score = result.score;
                feedback = result.feedback;
            }

            // LATE SUBMISSION CHECK
            if (activeWorksheet.dueDate) {
                const now = new Date();
                const due = new Date(activeWorksheet.dueDate);
                due.setHours(23, 59, 59, 999);
                if (now > due) {
                    score = Math.round(score * 0.6 * 10) / 10; // 40% penalty
                    feedback += "\n\n⚠️ (Entrega tardía. Valor: 60%)";
                }
            }

            // 2. Show Result
            const minPass = activeWorksheet.interactiveData?.type === 'WORKSHEET' ? (activeWorksheet.interactiveData.minScoreToPass ?? 6) : 6;
            const passed = score >= minPass;

            alert(`¡Ficha Calificada!\n\nCalificación: ${score}/10\n\n${feedback}${!passed ? `\n\nNo has alcanzado el puntaje mínimo (${minPass}).` : ''}`);

            // 3. Mark as complete (Only if passed or if no minScore requirement, but typically we want pass)
            const newCompleted = passed ? [...new Set([...(student.completedAssignmentIds || []), activeWorksheet.id])] : (student.completedAssignmentIds || []);
            const newResults = { ...(student.assignmentResults || {}), [activeWorksheet.id]: score };

            const updatedStudent = {
                ...student,
                completedAssignmentIds: newCompleted,
                assignmentResults: newResults,
                assignmentsCompleted: newCompleted.length
            };
            setStudent(updatedStudent);
            await api.saveStudent(updatedStudent);

            // Notify Teacher via Message
            try {
                await api.sendParentMessage(student.id, `✅ Ficha completada: ${activeWorksheet.title} (Calificación: ${score}/10) ${!passed ? '[NO APROBADO]' : ''}`, 'PARENT');
            } catch (err) { console.error("Failed to notify teacher", err); }

            // 4. Download evidence
            const link = document.createElement('a');
            link.download = `ficha-${student.name}-${activeWorksheet.title}.jpg`;
            link.href = finalImage;
            link.click();

        } catch (e) {
            console.error("Grading failed", e);
            alert("Ocurrió un error al calificar. Tu trabajo se guardará como completado de todas formas.");
            // Fallback save
            const newCompleted = [...new Set([...(student.completedAssignmentIds || []), activeWorksheet.id])];
            const updatedStudent = { ...student, completedAssignmentIds: newCompleted, assignmentsCompleted: newCompleted.length };
            setStudent(updatedStudent);
            await api.saveStudent(updatedStudent);
        } finally {
            setIsGrading(false);
            setActiveWorksheet(null);
            setStudentMarks([]);
            setDrawMode('PEN');
            setSelectedZoneIds([]);
            setMatchedPairs([]);
        }
    };

    // Drawing Logic
    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        setIsDrawing(true);
        setLastPos({
            x: clientX - rect.left,
            y: clientY - rect.top
        });
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || !lastPos || !canvasRef) return;
        const canvas = canvasRef;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        // Handle scrolling offset if needed, but clientX/Y relative to rect usually works if rect accounts for scroll
        // However, if rect is fixed and content scrolls, we might need care. 
        // In this implementation, canvas is inside a scrolling container, BUT the canvas itself defines the drawing surface.
        // rect.left/top comes from the canvas element's position in the viewport.
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        const currentX = clientX - rect.left;
        const currentY = clientY - rect.top;

        ctx.beginPath();
        ctx.moveTo(lastPos.x, lastPos.y);
        ctx.lineTo(currentX, currentY);

        // Save context state
        ctx.save();

        if (drawMode === 'HIGHLIGHTER') {
            ctx.globalAlpha = 0.5;
            ctx.globalCompositeOperation = 'multiply'; // Better formatting for highlighter over text
            ctx.strokeStyle = drawColor;
            ctx.lineWidth = 25;
        } else if (drawMode === 'ERASER') {
            ctx.globalAlpha = 1.0;
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 30; // Bigger eraser
        } else {
            // PEN
            ctx.globalAlpha = 1.0;
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = drawColor;
            ctx.lineWidth = 3;
        }

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Restore context state to avoid affecting future ops (though we reset props above)
        ctx.restore();

        setLastPos({ x: currentX, y: currentY });
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        setLastPos(null);
    };

    const handleAnswer = (questionId: string, optionIndex: number) => {
        setQuizAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
    };

    const handleSubmitQuiz = async () => {
        if (!activeQuiz || !activeQuiz.interactiveData || !student) return;
        if (activeQuiz.interactiveData.type !== 'QUIZ') return;

        let correctCount = 0;
        activeQuiz.interactiveData.questions.forEach(q => {
            if (quizAnswers[q.id] === q.correctIndex) {
                correctCount++;
            }
        });

        const total = activeQuiz.interactiveData.questions.length;
        let rawScore = total > 0 ? (correctCount / total) * 10 : 0;

        // Check for late submission
        let isLate = false;
        if (activeQuiz.dueDate) {
            const now = new Date();
            const due = new Date(activeQuiz.dueDate);
            due.setHours(23, 59, 59, 999);
            if (now > due) {
                isLate = true;
                rawScore = rawScore * 0.6; // 40% penalty
            }
        }

        const score = Math.round(rawScore);
        const minPass = activeQuiz.interactiveData.minScoreToPass ?? 6;
        const passed = score >= minPass;

        setQuizResult({ score, passed });
        if (isLate) {
            alert("⚠️ Tu entrega está fuera de fecha. Tu calificación vale el 60% de la nota original.");
        }

        if (passed) {
            // Update Student
            const newCompleted = [...new Set([...(student.completedAssignmentIds || []), activeQuiz.id])];
            const newResults = { ...(student.assignmentResults || {}), [activeQuiz.id]: score };

            const updatedStudent = {
                ...student,
                completedAssignmentIds: newCompleted,
                assignmentResults: newResults,
                assignmentsCompleted: newCompleted.length
            };

            setStudent(updatedStudent);
            await api.saveStudent(updatedStudent);

            // Notify Teacher via Message
            try {
                await api.sendParentMessage(student.id, `✅ Cuestionario completado: ${activeQuiz.title} (Calificación: ${score}/10)`, 'PARENT');
            } catch (err) { console.error("Failed to notify teacher", err); }
        } else {
            // If failed, still save result but don't mark as complete? 
            // Better to save result so teacher sees it.
            const newResults = { ...(student.assignmentResults || {}), [activeQuiz.id]: score };
            const updatedStudent = { ...student, assignmentResults: newResults };
            setStudent(updatedStudent);
            await api.saveStudent(updatedStudent);
            alert(`No has alcanzado el puntaje mínimo (${minPass}/10). Puedes intentarlo de nuevo.`);
        }
    };
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [sendingMsg, setSendingMsg] = useState(false);
    const [currentTab, setCurrentTab] = useState<'HOME' | 'ACTIVITIES' | 'CALENDAR' | 'MESSAGES'>('HOME');


    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await api.parentLogin(loginId.trim().toUpperCase());
            if (res.success && res.student) {
                setStudent(res.student);
                setIsLoggedIn(true);
                // Load data
                loadNotifications(res.student.id);
                loadEvents();
                loadMessages(res.student.id);
                loadAssignments(res.student); // Fetch assignments with context

                // Fetch Behavior Logs
                api.getStudentBehaviorLogs(res.student.id).then(logs => setBehaviorLogs(logs)).catch(err => console.error(err));
            }
        } catch (err: any) {
            setError(err.message || 'Error al iniciar sesión');
        } finally {
            setLoading(false);
        }
    };

    // Polling for new messages and notifications
    useEffect(() => {
        if (!isLoggedIn || !student) return;

        const interval = setInterval(() => {
            loadMessages(student.id);
            loadNotifications(student.id);
        }, 10000);

        return () => clearInterval(interval);
    }, [isLoggedIn, student]);

    const loadNotifications = async (studentId: string) => {
        try {
            const notifs = await api.getNotifications(studentId);
            if (Array.isArray(notifs)) {
                setNotifications(notifs);
            } else {
                console.error("Notifications not array:", notifs);
                setNotifications([]);
            }
        } catch (e) {
            console.error(e);
            setNotifications([]);
        }
    };

    const loadEvents = async () => {
        try {
            const evs = await api.getEvents();
            if (Array.isArray(evs)) {
                setEvents(evs);
            } else {
                console.error("Events not array:", evs);
                setEvents([]);
            }
        } catch (e) {
            console.error(e);
            setEvents([]);
        }
    };

    const loadAssignments = async (currentStudent?: Student | null) => {
        // Use provided student or current state
        const targetStudent = currentStudent || student;
        if (!targetStudent) return;

        try {
            const allAssignments = await api.getAssignments();

            // Filter by Student Group
            console.log("Filtering Assignments for Student:", targetStudent.name, "Group:", targetStudent.group);

            const filtered = allAssignments.filter((a: Assignment) => {
                // Explicit GLOBAL
                if (a.targetGroup === 'GLOBAL') return true;

                // Student Group normalized
                // STRICT MODE: If student has no group, they generally shouldn't see group-restricted tasks
                // unless the task is also "No Group".
                const sGroupRaw = targetStudent.group || ''; // No default '4 A'
                const sGroup = sGroupRaw.toUpperCase().trim();
                const sGrade = sGroup.match(/(\d+)/)?.[0];
                const sLetter = sGroup.match(/[A-F]/)?.[0];

                // Assignment Group normalized.
                // Legacy support: If undefined, assume '4 A' (Main Group) or whatever legacy default is needed.
                // NOTE: If we want strict "No Group" -> "No Group", remove default. 
                // But typically legacy data = main group.
                const aGroupRaw = a.targetGroup || '4 A';
                const aGroup = aGroupRaw.toUpperCase().trim();
                const aGrade = aGroup.match(/(\d+)/)?.[0];
                const aLetter = aGroup.match(/[A-F]/)?.[0];

                let match = false;

                // 1. Precise Match (Grade + Letter)
                if (sGrade && sLetter && aGrade && aLetter) {
                    match = (sGrade === aGrade && sLetter === aLetter);
                }
                // 2. Grade Match only (Target is broad, e.g. "4")
                else if (aGrade && !aLetter && sGrade) {
                    match = (sGrade === aGrade);
                }
                // 3. Fallback String Match (e.g. "4A" vs "4A" or "PRIMERO" vs "PRIMERO")
                else {
                    match = (sGroup === aGroup);
                }

                // Debug specific mismatch
                if (a.title.toLowerCase().includes('verbos')) {
                    console.log(`[DEBUG FILTER] T:${a.title}`);
                    const dbgRaw = a.targetGroup; // capture raw
                    console.log(`  RawTarget: "${dbgRaw}"`);
                    console.log(`  Processed -> aGroup:"${aGroup}" (G:${aGrade} L:${aLetter})`);
                    console.log(`  Student -> sGroup:"${sGroup}" (G:${sGrade} L:${sLetter})`);
                    console.log(`  MATCH: ${match}`);
                }

                return match;
            });

            setAssignments(filtered);
        } catch (e) { console.error(e); }
    };

    const loadMessages = async (studentId: string) => {
        try {
            const msgs = await api.getParentMessages(studentId);
            if (Array.isArray(msgs)) {
                setMessages(msgs);
            } else {
                setMessages([]);
            }
        } catch (e) { console.error(e); setMessages([]); }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !student) return;
        setSendingMsg(true);
        try {
            await api.sendParentMessage(student.id, newMessage, 'PARENT');
            setNewMessage('');
            loadMessages(student.id);
        } catch (e) {
            console.error(e);
        } finally {
            setSendingMsg(false);
        }
    };

    const handleLogout = () => {
        setIsLoggedIn(false);
        setStudent(null);
        setLoginId('');
        setEvents([]);
        setNotifications([]);
        setMessages([]);
        setAssignments([]);
    };

    // Derived Calculations
    const completedCount = student?.completedAssignmentIds?.length || 0;
    const totalAssignmentsCount = assignments.length > 0 ? assignments.length : (student?.totalAssignments || 0);

    if (!isLoggedIn) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>

                {!standalone && (
                    <button onClick={onBack} className="absolute top-4 left-4 text-white/50 hover:text-white flex items-center gap-2 z-10 transition-colors">
                        <LogOut className="rotate-180" size={20} /> Regresar a Admin
                    </button>
                )}

                <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative z-10 animate-fadeIn">
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
                            <User size={40} />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-800">Portal para Padres</h1>
                        <p className="text-slate-500">Consulta la actividad escolar de tu hijo</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">CURP o ID del Estudiante</label>
                            <input
                                type="text"
                                value={loginId}
                                onChange={e => setLoginId(e.target.value)}
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-900"
                                placeholder="Ingresa la clave..."
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg font-medium flex items-center gap-2">
                                <CheckCircle size={16} className="text-red-500" />
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95 disabled:opacity-70"
                        >
                            {loading ? 'Verificando...' : 'Ingresar'}
                        </button>
                    </form>

                    <p className="text-center text-xs text-slate-400 mt-6">
                        Si no conoces tu ID, contacta al docente.
                    </p>
                </div>
            </div>
        );
    }

    // SAFETY NET: Strict Render-Time Filtering
    // Ensures that even if state is stale, we only show valid assignments for this student's group
    const relevantAssignments = assignments.filter(a => {
        if (a.targetGroup === 'GLOBAL') return true;

        const sGroupRaw = (student?.group || '').toUpperCase().trim();
        const sGrade = sGroupRaw.match(/(\d+)/)?.[0];
        const sLetter = sGroupRaw.match(/[A-F]/)?.[0];

        // Default to '4 A' if missing (Legacy)
        const aGroupRaw = (a.targetGroup || '4 A').toUpperCase().trim();
        const aGrade = aGroupRaw.match(/(\d+)/)?.[0];
        const aLetter = aGroupRaw.match(/[A-F]/)?.[0];

        if (sGrade && sLetter && aGrade && aLetter) {
            return sGrade === aGrade && sLetter === aLetter;
        }
        if (aGrade && !aLetter && sGrade) {
            return sGrade === aGrade;
        }
        return sGroupRaw === aGroupRaw;
    });

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-28"> {/* Adjusted padding for bottom nav */}
            {/* Header Mobile App Style */}
            <div className="bg-indigo-600 text-white p-6 pb-12 rounded-b-[2.5rem] shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 bg-white/5 rounded-full blur-3xl w-64 h-64 -mr-16 -mt-16 pointer-events-none"></div>

                <div className="relative z-10 flex justify-between items-start mb-6">
                    <div>
                        <p className="text-indigo-200 text-sm font-medium">Bienvenido, papá/mamá de</p>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            {student?.name.split(' ')[0]}
                            {student?.group && <span className="text-xs bg-white/20 px-2 py-1 rounded-lg font-normal tracking-wider border border-white/10">{student.group}</span>}
                        </h1>
                    </div>
                    <button onClick={handleLogout} className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition-colors">
                        <LogOut size={20} />
                    </button>
                </div>

                <div className="relative z-10 flex gap-4 p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
                    <img src={student?.avatar} alt="Avatar" className="w-16 h-16 rounded-full border-2 border-white object-cover" />
                    <div>
                        <div className="flex gap-2 mb-1">
                            <span className="px-2 py-0.5 bg-white/20 rounded-md text-[10px] font-bold tracking-wider uppercase">
                                {student?.status}
                            </span>
                            {student?.behaviorPoints !== undefined && (
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase ${student.behaviorPoints >= 0 ? 'bg-emerald-500/20 text-emerald-100' : 'bg-red-500/20 text-red-100'}`}>
                                    Conducta: {student.behaviorPoints}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-indigo-100 opacity-80 leading-relaxed max-w-[200px]">
                            {student?.bap && student.bap !== 'NINGUNA' ? 'Requiere apoyo en: ' + student.bap : 'Sin observaciones urgentes.'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="px-4 -mt-8 relative z-20 space-y-6">

                {/* TAB CONTENT RENDER */}
                {/* TAB CONTENT RENDER */}
                {currentTab === 'HOME' && (
                    <div className="space-y-6 animate-fadeIn pb-24">
                        {/* Summary Cards Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* Grades Card */}
                            <div
                                onClick={() => setActiveDetail('GRADES')}
                                className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center cursor-pointer hover:shadow-md transition-all active:scale-95"
                            >
                                <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2">
                                    <Trophy size={20} />
                                </div>
                                <span className="text-2xl font-bold text-slate-800">
                                    {student?.grades && student.grades.length > 0 ? (
                                        (student.grades.reduce((acc: number, g: any) => {
                                            if (typeof g === 'number') return acc + g;
                                            return acc + ((Number(g.lenguajes || 0) + Number(g.saberes || 0) + Number(g.etica || 0) + Number(g.humano || 0)) / 4);
                                        }, 0) / student.grades.length).toFixed(1)
                                    ) : '-'}
                                </span>
                                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Promedio</span>
                            </div>

                            {/* Attendance Card */}
                            <div
                                onClick={() => setActiveDetail('ATTENDANCE')}
                                className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center cursor-pointer hover:shadow-md transition-all active:scale-95"
                            >
                                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                                    <CalendarIcon size={20} />
                                </div>
                                <span className="text-2xl font-bold text-slate-800">
                                    {student?.attendance ? Object.values(student.attendance).filter(s => s === 'Presente').length : 0}
                                </span>
                                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Asistencias</span>
                            </div>

                            {/* Tasks Card - Goes to Tab */}
                            <div
                                onClick={() => setCurrentTab('ACTIVITIES')}
                                className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center cursor-pointer hover:shadow-md transition-all active:scale-95 relative"
                            >
                                {relevantAssignments.filter(a => !student?.completedAssignmentIds?.includes(a.id)).length > 0 && (
                                    <div className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                                )}
                                <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mb-2">
                                    <BookOpen size={20} />
                                </div>
                                <span className="text-2xl font-bold text-slate-800">
                                    {relevantAssignments.filter(a => !student?.completedAssignmentIds?.includes(a.id)).length}
                                </span>
                                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Tareas Pend.</span>
                            </div>

                            {/* Behavior Card */}
                            <div
                                onClick={() => setActiveDetail('BEHAVIOR')}
                                className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center cursor-pointer hover:shadow-md transition-all active:scale-95"
                            >
                                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                                    <CheckCircle size={20} />
                                </div>
                                <span className={`text-2xl font-bold ${student?.behaviorPoints && student.behaviorPoints < 0 ? 'text-red-500' : 'text-slate-800'}`}>
                                    {student?.behaviorPoints !== undefined ? student.behaviorPoints : 0}
                                </span>
                                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Puntos</span>
                            </div>
                        </div>

                        {/* Recent Events Preview */}
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <CalendarIcon size={18} className="text-indigo-500" />
                                    Próximos Eventos
                                </h3>
                                <button onClick={() => setCurrentTab('CALENDAR')} className="text-indigo-600 text-xs font-bold">Ver Todo</button>
                            </div>
                            <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                                {events.slice(0, 3).length === 0 ? (
                                    <div className="w-full bg-white p-4 rounded-xl border border-slate-100 text-slate-400 text-sm text-center">
                                        No hay eventos próximos.
                                    </div>
                                ) : (
                                    events.slice(0, 3).map(ev => (
                                        <div key={ev.id} className="min-w-[200px] bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 mb-1">{ev.type}</span>
                                            <h4 className="font-bold text-slate-800 text-sm mb-1">{ev.title}</h4>
                                            <p className="text-xs text-slate-500 mb-2">{new Date(ev.date).toLocaleDateString()}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {currentTab === 'ACTIVITIES' && (
                    <div className="animate-fadeIn pb-24">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-xl">
                            <BookOpen size={24} className="text-indigo-500" />
                            Tareas y Actividades
                        </h3>

                        <div className="space-y-8">
                            {/* PENDING SECTION */}
                            <div>
                                <h4 className="font-bold text-slate-600 mb-3 flex items-center gap-2 uppercase text-xs tracking-wider">
                                    <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                    Pendientes por Entregar
                                </h4>
                                <div className="space-y-3">
                                    {relevantAssignments.filter(assign => {
                                        if (assign.isVisibleInParentsPortal === false) return false;
                                        return !student?.completedAssignmentIds?.includes(assign.id);
                                    }).length === 0 ? (
                                        <div className="bg-white p-6 rounded-2xl border border-slate-100 text-center">
                                            <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-2">
                                                <Check size={24} />
                                            </div>
                                            <p className="text-sm text-slate-500 font-medium">¡Todo al día! No tienes tareas pendientes.</p>
                                        </div>
                                    ) : (
                                        relevantAssignments.filter(assign => {
                                            if (assign.isVisibleInParentsPortal === false) return false;
                                            return !student?.completedAssignmentIds?.includes(assign.id);
                                        }).map(assign => {
                                            const isInteractive = assign.type === 'INTERACTIVE';
                                            const dueEnd = new Date(assign.dueDate);
                                            dueEnd.setHours(23, 59, 59);
                                            const isLate = dueEnd < new Date();

                                            return (
                                                <div key={assign.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden transition-all hover:bg-slate-50">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${isInteractive ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                                                {isInteractive ? 'Interactiva' : 'Tarea'}
                                                            </span>
                                                            {isLate && (
                                                                <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded flex items-center gap-1">
                                                                    <AlertCircle size={10} /> Atrasada
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="text-orange-500 text-xs font-bold bg-orange-50 px-2 py-0.5 rounded-full">
                                                            Por hacer
                                                        </span>
                                                    </div>

                                                    <h4 className="font-bold text-slate-800 text-sm mb-1">{assign.title}</h4>
                                                    <p className="text-xs text-slate-500 mb-3 flex items-center gap-1">
                                                        <CalendarIcon size={12} />
                                                        Vence: {new Date(assign.dueDate).toLocaleDateString()}
                                                        {assign.description && <span className="ml-2 opacity-70">- {assign.description}</span>}
                                                    </p>

                                                    {isInteractive && (
                                                        <button
                                                            onClick={() => handleStartQuiz(assign)}
                                                            className="w-full py-2 bg-purple-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-purple-700 transition-colors shadow-md shadow-purple-200"
                                                        >
                                                            <Play size={14} fill="currentColor" /> Comenzar Actividad
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            {/* COMPLETED SECTION */}
                            <div className="opacity-80">
                                <h4 className="font-bold text-slate-600 mb-3 flex items-center gap-2 uppercase text-xs tracking-wider">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                    Completadas
                                </h4>
                                <div className="space-y-3">
                                    {relevantAssignments.filter(assign => {
                                        if (assign.isVisibleInParentsPortal === false) return false;
                                        return student?.completedAssignmentIds?.includes(assign.id);
                                    }).length === 0 ? (
                                        <div className="min-h-[100px] flex items-center justify-center text-slate-400 text-xs">
                                            Aún no has completado ninguna tarea.
                                        </div>
                                    ) : (
                                        relevantAssignments.filter(assign => {
                                            if (assign.isVisibleInParentsPortal === false) return false;
                                            return student?.completedAssignmentIds?.includes(assign.id);
                                        }).map(assign => {
                                            const isInteractive = assign.type === 'INTERACTIVE';
                                            const score = student?.assignmentResults?.[assign.id];
                                            return (
                                                <div key={assign.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200/50 relative overflow-hidden">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <h4 className="font-bold text-slate-700 text-sm line-through decoration-slate-400">{assign.title}</h4>
                                                        <div className="flex items-center gap-2">
                                                            {score !== undefined && (
                                                                <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${score >= 6 ? 'bg-indigo-100 text-indigo-700' : 'bg-red-100 text-red-700'}`}>
                                                                    Nota: {score}/10
                                                                </span>
                                                            )}
                                                            <span className="text-emerald-600 flex items-center gap-1 text-[10px] font-bold bg-emerald-50 px-2 py-0.5 rounded">
                                                                <CheckCircle size={10} /> Entregada
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <p className="text-[10px] text-slate-400">
                                                        Vencía: {new Date(assign.dueDate).toLocaleDateString()}
                                                    </p>
                                                    {isInteractive && (
                                                        <button
                                                            onClick={() => handleStartQuiz(assign)}
                                                            className="mt-2 w-full py-1.5 bg-white border border-purple-200 text-purple-600 rounded text-[10px] font-bold hover:bg-purple-50 transition-colors"
                                                        >
                                                            Volver a ver
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>
                )}

                {currentTab === 'CALENDAR' && (
                    <div className="animate-fadeIn pb-24">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-xl">
                            <CalendarIcon size={24} className="text-indigo-500" />
                            Calendario Escolar
                        </h3>
                        {/* Placeholder for full calendar, using list for now */}
                        <div className="space-y-3">
                            {events.map(ev => (
                                <div key={ev.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-start gap-4">
                                    <div className="bg-indigo-50 w-12 h-12 rounded-lg flex flex-col items-center justify-center text-indigo-600 flex-shrink-0">
                                        <span className="text-xs font-bold uppercase">{new Date(ev.date).toLocaleString('default', { month: 'short' })}</span>
                                        <span className="text-lg font-black">{new Date(ev.date).getDate()}</span>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800">{ev.title}</h4>
                                        <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{ev.type}</span>
                                        <p className="text-sm text-slate-500 mt-1">{ev.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {currentTab === 'MESSAGES' && (
                    <div className="animate-fadeIn pb-24 max-w-3xl mx-auto space-y-4">
                        <div className="bg-white rounded-2xl h-[60vh] flex flex-col border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white z-10 relative">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <MessageCircle className="text-indigo-600" />
                                    Chat con el Docente
                                </h3>
                                <span className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded-full border border-slate-100">
                                    {messages.length} mensajes
                                </span>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 custom-scrollbar relative">
                                {messages.length === 0 ? (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 opacity-60">
                                        <MessageCircle size={48} className="mb-2" />
                                        <p className="text-sm font-medium">No hay mensajes aún</p>
                                    </div>
                                ) : (
                                    messages.map((msg: any, idx: number) => (
                                        <div key={msg.id || idx} className={`flex ${msg.sender === 'PARENT' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${msg.sender === 'PARENT'
                                                ? 'bg-indigo-600 text-white rounded-br-none'
                                                : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none'
                                                }`}>
                                                <p>{msg.message}</p>
                                                <span className={`block text-[10px] mt-1 text-right ${msg.sender === 'PARENT' ? 'text-indigo-200' : 'text-slate-400'}`}>
                                                    {new Date(msg.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="p-3 border-t border-slate-100 bg-white flex gap-2 z-10 relative">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Escribe un mensaje..."
                                    className="flex-1 bg-slate-100 border-transparent focus:bg-white focus:border-indigo-300 border rounded-xl px-4 py-3 text-sm transition-all outline-none"
                                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={sendingMsg || !newMessage.trim()}
                                    className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:scale-95 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center min-w-[3rem]"
                                >
                                    {sendingMsg ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={20} />}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>

            {/* BOTTOM NAVIGATION BAR */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-2 pb-6 md:pb-2 z-40 flex justify-around items-center shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                <button onClick={() => setCurrentTab('HOME')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all w-16 ${currentTab === 'HOME' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                    <div className={`p-1 rounded-full ${currentTab === 'HOME' ? 'bg-indigo-100' : ''}`}><LayoutDashboard size={20} /></div>
                    <span className="text-[10px] font-bold">Inicio</span>
                </button>
                <button onClick={() => setCurrentTab('ACTIVITIES')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all w-16 ${currentTab === 'ACTIVITIES' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                    <div className={`p-1 rounded-full ${currentTab === 'ACTIVITIES' ? 'bg-indigo-100' : ''}`}><BookOpen size={20} /></div>
                    <span className="text-[10px] font-bold">Tareas</span>
                </button>
                <button onClick={() => setCurrentTab('CALENDAR')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all w-16 ${currentTab === 'CALENDAR' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                    <div className={`p-1 rounded-full ${currentTab === 'CALENDAR' ? 'bg-indigo-100' : ''}`}><CalendarIcon size={20} /></div>
                    <span className="text-[10px] font-bold">Eventos</span>
                </button>
                <button onClick={() => setCurrentTab('MESSAGES')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all w-16 ${currentTab === 'MESSAGES' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                    <div className={`p-1 rounded-full ${currentTab === 'MESSAGES' ? 'bg-indigo-100' : ''}`}><MessageCircle size={20} /></div>
                    <span className="text-[10px] font-bold">Chat</span>
                </button>
            </div>

            {/* QUIZ MODAL */}
            {activeQuiz && activeQuiz.interactiveData && activeQuiz.interactiveData.type === 'QUIZ' && (
                <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
                        <div className="bg-purple-600 p-6 text-white flex justify-between items-center sticky top-0 z-10">
                            <div>
                                <h2 className="text-xl font-bold">{activeQuiz.title}</h2>
                                <p className="text-purple-200 text-xs">Responde correctamente para aprobar.</p>
                            </div>
                            <button onClick={() => setActiveQuiz(null)} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X size={20} /></button>
                        </div>

                        {/* Video Embed */}
                        {activeQuiz.interactiveData.videoUrl && (
                            <div className="bg-slate-900 border-b border-slate-700 p-4 flex justify-center">
                                <div className="w-full max-w-2xl aspect-video rounded-lg overflow-hidden shadow-lg border border-slate-700">
                                    <iframe
                                        width="100%"
                                        height="100%"
                                        src={activeQuiz.interactiveData.videoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                                        title="Video de Apoyo"
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    ></iframe>
                                </div>
                            </div>
                        )}

                        <div className="p-6 space-y-8">
                            {quizResult ? (
                                <div className="text-center py-8 animate-fadeIn">
                                    <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 ${quizResult.passed ? 'bg-emerald-100 text-emerald-500' : 'bg-red-100 text-red-500'}`}>
                                        {quizResult.passed ? <Trophy size={48} /> : <AlertCircle size={48} />}
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-800 mb-2">
                                        {quizResult.passed ? '¡Excelente Trabajo!' : 'Inténtalo de nuevo'}
                                    </h3>
                                    <p className="text-slate-500 mb-6">
                                        Tu puntuación: <strong className="text-lg text-slate-800">{quizResult.score}/10</strong>
                                    </p>
                                    <div className="flex justify-center gap-4">
                                        {!quizResult.passed && (
                                            <button onClick={() => { setQuizResult(null); setQuizAnswers({}); }} className="px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                                                Reintentar
                                            </button>
                                        )}
                                        <button onClick={() => setActiveQuiz(null)} className={`px-6 py-3 font-bold rounded-xl text-white shadow-lg transition-all ${quizResult.passed ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200' : 'bg-slate-500 hover:bg-slate-600'}`}>
                                            {quizResult.passed ? 'Finalizar' : 'Cerrar'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {activeQuiz.interactiveData.questions.map((q, idx) => (
                                        <div key={q.id} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                            <h4 className="font-bold text-slate-800 mb-4 flex gap-3">
                                                <span className="bg-purple-100 text-purple-700 w-6 h-6 rounded flex items-center justify-center text-xs flex-shrink-0 mt-0.5">{idx + 1}</span>
                                                {q.text}
                                            </h4>
                                            <div className="space-y-2 pl-9">
                                                {q.options.map((opt, i) => (
                                                    <label key={i} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${quizAnswers[q.id] === i ? 'bg-purple-50 border-purple-300 ring-1 ring-purple-300' : 'bg-white border-slate-200 hover:border-purple-200'}`}>
                                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${quizAnswers[q.id] === i ? 'border-purple-600 bg-purple-600' : 'border-slate-300'}`}>
                                                            {quizAnswers[q.id] === i && <div className="w-2 h-2 bg-white rounded-full" />}
                                                        </div>
                                                        <input
                                                            type="radio"
                                                            name={`q-${q.id}`}
                                                            className="hidden"
                                                            checked={quizAnswers[q.id] === i}
                                                            onChange={() => handleAnswer(q.id, i)}
                                                        />
                                                        <span className="text-sm text-slate-700 font-medium">{opt}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}

                                    <div className="flex justify-end pt-4">
                                        <button
                                            onClick={handleSubmitQuiz}
                                            disabled={Object.keys(quizAnswers).length < activeQuiz.interactiveData.questions.length}
                                            className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-xl shadow-purple-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center gap-2"
                                        >
                                            <Check size={20} /> Enviar Respuestas
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* WORKSHEET MODAL - REDESIGNED FOR USABILITY */}
            {activeWorksheet && activeWorksheet.interactiveData && activeWorksheet.interactiveData.type === 'WORKSHEET' && (
                <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-0 md:p-4 animate-fadeIn">
                    <div className="bg-white md:rounded-2xl w-full max-w-5xl h-full md:h-[95vh] flex flex-col shadow-2xl overflow-hidden">
                        {/* Header */}
                        <div className="bg-indigo-600 p-4 text-white flex justify-between items-center flex-shrink-0 shadow-md z-20">
                            <div>
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    <BookOpen size={20} className="text-indigo-200" />
                                    <span className="truncate max-w-[200px] md:max-w-md">{activeWorksheet.title}</span>
                                </h2>
                                <p className="text-indigo-200 text-xs hidden md:block">Selecciona una herramienta para completar la actividad.</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCompleteWorksheet}
                                    disabled={isGrading}
                                    className="px-4 py-2 bg-emerald-500 text-white font-bold rounded-lg hover:bg-emerald-600 shadow-lg shadow-emerald-900/20 flex items-center gap-2 text-sm disabled:opacity-70 disabled:cursor-not-allowed transition-transform active:scale-95"
                                >
                                    {isGrading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                            <span className="hidden md:inline">Enviando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Check size={18} />
                                            <span>Terminar</span>
                                        </>
                                    )}
                                </button>
                                <button onClick={() => setActiveWorksheet(null)} className="p-2 bg-indigo-700 hover:bg-indigo-800 rounded-lg text-white/80 hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Toolbar - Sticky Responsive */}
                        <div className="bg-white p-2 border-b border-slate-200 flex flex-wrap gap-2 justify-center items-center shadow-sm z-10 shrink-0">
                            {/* Tools Group */}
                            <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                                <button
                                    onClick={() => setDrawMode('MOVE')}
                                    className={`p-2.5 rounded-lg flex flex-col items-center justify-center gap-1 min-w-[60px] transition-all ${drawMode === 'MOVE' ? 'bg-white text-indigo-600 shadow-sm font-bold ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}
                                >
                                    <Move size={20} />
                                    <span className="text-[9px] uppercase tracking-wider">Mover</span>
                                </button>
                                <div className="w-px bg-slate-200 my-1 mx-1"></div>
                                <button
                                    onClick={() => setDrawMode('PEN')}
                                    className={`p-2.5 rounded-lg flex flex-col items-center justify-center gap-1 min-w-[60px] transition-all ${drawMode === 'PEN' ? 'bg-white text-indigo-600 shadow-sm font-bold ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}
                                >
                                    <div className="relative">
                                        <div className="w-5 h-5 rounded-full border-2 border-current" style={{ backgroundColor: drawMode === 'PEN' ? drawColor : 'transparent' }}></div>
                                    </div>
                                    <span className="text-[9px] uppercase tracking-wider">Lápiz</span>
                                </button>
                                <button
                                    onClick={() => setDrawMode('HIGHLIGHTER')} // Replaces MARKER
                                    className={`p-2.5 rounded-lg flex flex-col items-center justify-center gap-1 min-w-[60px] transition-all ${drawMode === 'HIGHLIGHTER' ? 'bg-white text-pink-600 shadow-sm font-bold ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}
                                >
                                    <div className="w-5 h-5 bg-pink-200 opacity-50 rounded-sm border border-pink-500"></div>
                                    <span className="text-[9px] uppercase tracking-wider">Resaltar</span>
                                </button>
                                <button
                                    onClick={() => setDrawMode('ERASER')}
                                    className={`p-2.5 rounded-lg flex flex-col items-center justify-center gap-1 min-w-[60px] transition-all ${drawMode === 'ERASER' ? 'bg-white text-slate-800 shadow-sm font-bold ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}
                                >
                                    <div className="w-5 h-5 border border-slate-400 bg-white rounded-none transform -rotate-12"></div>
                                    <span className="text-[9px] uppercase tracking-wider">Borrar</span>
                                </button>
                            </div>

                            {/* Colors (Only for Pen/Highlighter) */}
                            {(drawMode === 'PEN' || drawMode === 'HIGHLIGHTER') && (
                                <div className="flex gap-1.5 bg-slate-100 p-1.5 rounded-xl ml-2 animate-fadeIn">
                                    {(drawMode === 'HIGHLIGHTER' ? ['#fef08a', '#fda4af', '#bae6fd', '#bbf7d0'] : ['#ef4444', '#3b82f6', '#22c55e', '#a855f7', '#000000']).map(c => (
                                        <button
                                            key={c}
                                            onClick={() => setDrawColor(c)}
                                            className={`w-8 h-8 rounded-full border-2 transition-transform ${drawColor === c ? 'border-indigo-600 scale-110 shadow-sm' : 'border-transparent hover:scale-105'}`}
                                            style={{ backgroundColor: c, opacity: drawMode === 'HIGHLIGHTER' ? 0.6 : 1 }}
                                            title="Cambiar Color"
                                        />
                                    ))}
                                </div>
                            )}

                            <button
                                onClick={() => {
                                    if (window.confirm("¿Borrar todo lo que has dibujado?")) {
                                        const ctx = canvasRef?.getContext('2d');
                                        ctx?.clearRect(0, 0, canvasRef?.width || 0, canvasRef?.height || 0);
                                        setStudentMarks([]);
                                    }
                                }}
                                className="ml-auto p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Limpiar Todo"
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>

                        {/* Canvas Area - MAIN WORKSPACE */}
                        <div className="flex-1 overflow-auto bg-slate-100 relative touch-auto custom-scrollbar flex items-start justify-center p-4 md:p-8">
                            <div
                                className="relative shadow-2xl bg-white select-none transition-shadow"
                                style={{
                                    boxShadow: drawMode === 'MOVE' ? '0 0 0 2px rgba(99, 102, 241, 0.2)' : '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                                    width: 'fit-content'
                                }}
                            >
                                {/* Background Image */}
                                <img
                                    src={activeWorksheet.interactiveData.imageUrl}
                                    alt="Ficha"
                                    className="max-w-none w-auto h-auto block pointer-events-none"
                                    style={{
                                        width: '100%',
                                        height: 'auto',
                                        display: 'block'
                                    }}
                                    onLoad={(e) => {
                                        const img = e.currentTarget;
                                        if (canvasRef) {
                                            // Match canvas resolution to image native size for best quality
                                            canvasRef.width = img.naturalWidth;
                                            canvasRef.height = img.naturalHeight;
                                            // But visually stretch to match the DOM element size
                                            // Actually standard approach: Canvas size = logical pixels.
                                            // If we set width/height attributes, that's the resolution.
                                            // We want resolution to match the IMAGE size to avoid blurring.
                                            // And apply CSS width: 100% to match container.

                                            // WAIT: Using clientWidth depends on current render. 
                                            // Better to use naturalWidth/Height for the buffer.
                                            canvasRef.style.width = '100%';
                                            canvasRef.style.height = '100%';
                                        }
                                    }}
                                />

                                {/* Drawing Layer */}
                                <canvas
                                    ref={setCanvasRef}
                                    className={`absolute inset-0 w-full h-full touch-none ${drawMode === 'MOVE' ? 'pointer-events-none opacity-90' : 'cursor-crosshair'}`}
                                    onMouseDown={drawMode !== 'MOVE' ? startDrawing : undefined}
                                    onMouseMove={drawMode !== 'MOVE' ? draw : undefined}
                                    onMouseUp={drawMode !== 'MOVE' ? stopDrawing : undefined}
                                    onMouseLeave={drawMode !== 'MOVE' ? stopDrawing : undefined}
                                    onTouchStart={drawMode !== 'MOVE' ? startDrawing : undefined}
                                    onTouchMove={drawMode !== 'MOVE' ? draw : undefined}
                                    onTouchEnd={drawMode !== 'MOVE' ? stopDrawing : undefined}
                                />

                                {/* Interactive Zones Layer (Inputs & Drop Targets) */}
                                {activeWorksheet.interactiveData?.interactiveZones?.map((zone) => (
                                    <div
                                        key={zone.id}
                                        className="absolute"
                                        style={{
                                            left: `${zone.x}%`,
                                            top: `${zone.y}%`,
                                            width: `${zone.width}%`,
                                            height: `${zone.height}%`,
                                            zIndex: 15 // Above canvas (z-index 0) and image, below draggables (z-index 50 when active)
                                        }}
                                    >
                                        {zone.type === 'TEXT_INPUT' ? (
                                            <input
                                                type="text"
                                                value={textAnswers[zone.id] || ''}
                                                onChange={(e) => setTextAnswers({ ...textAnswers, [zone.id]: e.target.value })}
                                                className="w-full h-full bg-blue-50/30 border border-blue-200/50 rounded px-1 text-sm text-blue-900 font-bold focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all placeholder-blue-300/50"
                                                placeholder="Escribe aquí..."
                                                style={{ fontSize: 'clamp(10px, 1.5vw, 16px)' }}
                                            />
                                        ) : zone.type === 'DROP_ZONE' ? (
                                            <div
                                                className={`w-full h-full border-2 border-dashed border-pink-400/30 bg-pink-50/10 rounded-lg flex items-center justify-center transition-colors ${activeDraggableItems.some(item => {
                                                    // Simple proximity highlight logic could go here if we tracked drag pos globally
                                                    return false;
                                                }) ? 'bg-pink-100/30' : ''}`}
                                            >
                                                {/* Drop Zone Visual Indicator */}
                                            </div>
                                        ) : zone.type === 'SELECTABLE' ? (
                                            <div
                                                onClick={() => {
                                                    if (drawMode !== 'MOVE' && drawMode !== 'PEN') return; // Allow interaction mainly in pointer modes, or just always? Let's say any mode except drawing on top?
                                                    // Actually, user might want to select while drawing. Let's allow global click.
                                                    const isSelected = selectedZoneIds.includes(zone.id);
                                                    setSelectedZoneIds(isSelected ? selectedZoneIds.filter(id => id !== zone.id) : [...selectedZoneIds, zone.id]);
                                                }}
                                                className={`w-full h-full cursor-pointer transition-all border-2 rounded-lg flex items-center justify-center
                                                        ${selectedZoneIds.includes(zone.id) ? 'bg-purple-500/30 border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]' : 'border-transparent hover:bg-purple-100/10 hover:border-purple-200/50'}
                                                    `}
                                            >
                                                {selectedZoneIds.includes(zone.id) && <CheckCircle className="text-purple-600 drop-shadow-md" size={24} strokeWidth={3} />}
                                            </div>
                                        ) : (zone.type === 'MATCH_SOURCE' || zone.type === 'MATCH_TARGET') ? (
                                            <div
                                                onClick={() => {
                                                    if (zone.type === 'MATCH_SOURCE') {
                                                        // Start connecting (or re-start)
                                                        setActiveMatchSource(zone.id);
                                                        // Remove any existing matches starting from this source
                                                        setMatchedPairs(matchedPairs.filter(p => p.sourceId !== zone.id));
                                                    } else {
                                                        // Target
                                                        if (activeMatchSource) {
                                                            // Prevent duplicate pairs or self-loops (impossible via types but good to check)
                                                            // Also remove any existing matches to this target? Usually 1-to-1.
                                                            setMatchedPairs([...matchedPairs.filter(p => p.sourceId !== activeMatchSource && p.targetId !== zone.id), { sourceId: activeMatchSource, targetId: zone.id }]);
                                                            setActiveMatchSource(null);
                                                        }
                                                    }
                                                }}
                                                className={`w-full h-full flex items-center justify-center cursor-pointer group`}
                                            >
                                                <div className={`w-4 h-4 rounded-full border-2 transition-all shadow-md relative z-20 
                                                        ${zone.type === 'MATCH_SOURCE' ?
                                                        (activeMatchSource === zone.id ? 'bg-emerald-500 scale-125 ring-2 ring-emerald-200' : 'bg-emerald-100 border-emerald-500 group-hover:bg-emerald-200') :
                                                        (matchedPairs.some(p => p.targetId === zone.id) ? 'bg-emerald-500 border-emerald-600' : 'bg-white border-emerald-400 group-hover:scale-110')
                                                    }
                                                    `} />
                                            </div>
                                        ) : null}
                                    </div>
                                ))}

                                {/* SVG Layer for Connections */}
                                <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" style={{ overflow: 'visible' }}>
                                    {matchedPairs.map((pair, idx) => {
                                        const s = (activeWorksheet.interactiveData as any).interactiveZones?.find((z: any) => z.id === pair.sourceId);
                                        const t = (activeWorksheet.interactiveData as any).interactiveZones?.find((z: any) => z.id === pair.targetId);
                                        if (!s || !t) return null;

                                        // Coordinates in %
                                        return (
                                            <line
                                                key={idx}
                                                x1={`${s.x + s.width / 2}%`}
                                                y1={`${s.y + s.height / 2}%`}
                                                x2={`${t.x + t.width / 2}%`}
                                                y2={`${t.y + t.height / 2}%`}
                                                stroke="#10b981"
                                                strokeWidth="3"
                                                strokeDasharray="5,5"
                                                className="animate-fadeIn"
                                            />
                                        );
                                    })}
                                    {/* Pending Line (Optional: Draw from activeSource to mouse position? Hard without tracking mouse globally in SVG coordinates. Skip for simple click-click) */}
                                </svg>

                                {/* Draggable Items Layer */}
                                {activeDraggableItems.map((item, i) => (
                                    <div
                                        key={item.id}
                                        className={`absolute cursor-grab active:cursor-grabbing select-none shadow-md border-2 transition-transform active:scale-105 active:shadow-xl active:z-50 ${drawMode === 'MOVE' ? 'border-purple-500 shadow-purple-200 z-50' : 'border-slate-300 bg-white/90 z-20'}`}
                                        style={{
                                            left: item.x,
                                            top: item.y,
                                            touchAction: 'none',
                                        }}
                                        onPointerDown={(e) => {
                                            // Allow dragging ONLY in MOVE mode to prevent accidental drags while drawing
                                            if (drawMode !== 'MOVE') return;

                                            e.stopPropagation();
                                            const target = e.currentTarget;
                                            try { target.setPointerCapture(e.pointerId); } catch (err) { }

                                            const startX = e.clientX;
                                            const startY = e.clientY;
                                            const initialItemX = item.x;
                                            const initialItemY = item.y;

                                            const onMove = (moveEvent: PointerEvent) => {
                                                const dx = moveEvent.clientX - startX;
                                                const dy = moveEvent.clientY - startY;
                                                const newItems = [...activeDraggableItems];
                                                newItems[i] = { ...newItems[i], x: initialItemX + dx, y: initialItemY + dy };
                                                setActiveDraggableItems(newItems);
                                            };

                                            const onUp = (upEvent: PointerEvent) => {
                                                try { target.releasePointerCapture(upEvent.pointerId); } catch (err) { }
                                                target.removeEventListener('pointermove', onMove as any);
                                                target.removeEventListener('pointerup', onUp as any);
                                            };

                                            target.addEventListener('pointermove', onMove as any);
                                            target.addEventListener('pointerup', onUp as any);
                                        }}
                                    >
                                        {item.type === 'TEXT' ? (
                                            <div className="bg-white px-3 py-1.5 font-bold rounded text-sm whitespace-nowrap text-slate-700">
                                                {item.content}
                                            </div>
                                        ) : (
                                            <img src={item.content} alt="Item" className="w-16 h-16 object-contain bg-white rounded" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Mobile Hint Toast */}
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-slate-900/80 text-white text-xs px-4 py-2 rounded-full pointer-events-none backdrop-blur-sm animate-bounce">
                            {drawMode === 'MOVE' ? '👆 Desliza para moverte por la hoja' : '✏️ Dibuja sobre la hoja'}
                        </div>
                    </div>
                </div>
            )}

            {/* Notifications Section */}
            <div>
                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <Bell size={18} className="text-orange-500" />
                    Avisos y Notificaciones
                </h3>
                <div className="space-y-3">
                    {notifications.length === 0 ? (
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 text-center text-slate-400 text-sm">
                            No hay notificaciones nuevas.
                        </div>
                    ) : (
                        notifications.map((notif) => (
                            <div key={notif.id} className={`bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden ${!notif.isRead ? 'border-l-4 border-l-orange-500' : ''}`}>
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className="font-bold text-slate-800 text-sm">{notif.title}</h4>
                                    <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">{new Date(notif.date).toLocaleDateString()}</span>
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed mb-2">
                                    {notif.message}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* CTA or Extra Actions */}
            {/* Messages Section */}
            <div>
                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <MessageCircle size={18} className="text-teal-500" />
                    Mensajes con el Docente
                </h3>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-4">
                    <div className="h-64 overflow-y-auto p-4 space-y-3 bg-slate-50">
                        {messages.length === 0 ? (
                            <p className="text-center text-xs text-slate-400 mt-10">Inicia una conversación con el docente.</p>
                        ) : (
                            messages.map(msg => (
                                <div key={msg.id} className={`flex ${msg.sender === 'PARENT' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] p-3 rounded-xl text-xs ${msg.sender === 'PARENT' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'}`}>
                                        <p>{msg.message}</p>
                                        <span className={`block text-[9px] mt-1 text-right ${msg.sender === 'PARENT' ? 'text-indigo-200' : 'text-slate-400'}`}>
                                            {new Date(msg.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="p-3 bg-white border-t border-slate-100 flex gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={e => setNewMessage(e.target.value)}
                            placeholder="Escribe un mensaje..."
                            className="flex-1 bg-slate-100 px-4 py-2 rounded-full text-sm outline-none focus:ring-2 focus:ring-teal-500"
                            onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={sendingMsg}
                            className="p-2 bg-teal-500 text-white rounded-full hover:bg-teal-600 disabled:opacity-50"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* DETAIL MODALS */}
            {activeDetail === 'GRADES' && (
                <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn" onClick={() => setActiveDetail(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="bg-indigo-600 p-4 text-white flex justify-between items-center">
                            <h3 className="font-bold flex items-center gap-2">
                                <Trophy size={20} /> Historial de Calificaciones
                            </h3>
                            <button onClick={() => setActiveDetail(null)} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X size={20} /></button>
                        </div>
                        <div className="p-4 max-h-[70vh] overflow-y-auto">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 text-left">
                                        <th className="py-2 text-slate-500 font-bold uppercase text-xs">Evaluación</th>
                                        <th className="py-2 text-center text-slate-500 font-bold uppercase text-xs">Calificación</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(!student?.grades || student.grades.length === 0) ? (
                                        <tr><td colSpan={2} className="py-4 text-center text-slate-400">Sin registros aún.</td></tr>
                                    ) : (
                                        student.grades.map((g: any, i: number) => {
                                            let val = 0;
                                            if (typeof g === 'number') val = g;
                                            else {
                                                val = (Number(g.lenguajes || 0) + Number(g.saberes || 0) + Number(g.etica || 0) + Number(g.humano || 0)) / 4;
                                            }
                                            return (
                                                <tr key={i} className="border-b border-slate-100 last:border-0">
                                                    <td className="py-3 font-medium text-slate-700">Parcial {i + 1}</td>
                                                    <td className="py-3 text-center font-bold text-indigo-600">{val.toFixed(1)}</td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeDetail === 'ATTENDANCE' && (
                <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn" onClick={() => setActiveDetail(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="bg-blue-500 p-4 text-white flex justify-between items-center">
                            <h3 className="font-bold flex items-center gap-2">
                                <CalendarIcon size={20} /> Historial de Asistencia
                            </h3>
                            <button onClick={() => setActiveDetail(null)} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X size={20} /></button>
                        </div>
                        <div className="p-4 max-h-[70vh] overflow-y-auto">
                            <div className="flex justify-around mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-green-600">{student?.attendance ? Object.values(student.attendance).filter(s => s === 'Presente').length : 0}</div>
                                    <div className="text-[10px] uppercase font-bold text-slate-400">Asistencias</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-red-500">{student?.attendance ? Object.values(student.attendance).filter(s => s === 'Ausente').length : 0}</div>
                                    <div className="text-[10px] uppercase font-bold text-slate-400">Faltas</div>
                                </div>
                            </div>
                            {/* Small list of recent absences if any */}
                            <h4 className="font-bold text-slate-800 text-sm mb-2">Registros Recientes</h4>
                            {student?.attendance && Object.keys(student.attendance).length > 0 ? (
                                <div className="space-y-2">
                                    {Object.entries(student.attendance)
                                        .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime()) // Sort desc
                                        .slice(0, 10) // Show last 10
                                        .map(([date, status]) => (
                                            <div key={date} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                                                <span className="text-sm text-slate-600 capitalize">{new Date(date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                                                <span className={`px-2 py-0.5 rounded textxs font-bold ${status === 'Presente' ? 'bg-green-100 text-green-700' : status === 'Ausente' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                                                    {status as string}
                                                </span>
                                            </div>
                                        ))
                                    }
                                </div>
                            ) : (
                                <p className="text-center text-slate-400 text-sm">No hay registros de asistencia.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeDetail === 'BEHAVIOR' && (
                <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn" onClick={() => setActiveDetail(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="bg-emerald-500 p-4 text-white flex justify-between items-center">
                            <h3 className="font-bold flex items-center gap-2">
                                <CheckCircle size={20} /> Reporte de Conducta
                            </h3>
                            <button onClick={() => setActiveDetail(null)} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X size={20} /></button>
                        </div>
                        <div className="p-4 max-h-[70vh] overflow-y-auto">
                            <div className="text-center mb-6">
                                <span className={`text-4xl font-black ${student?.behaviorPoints && student.behaviorPoints < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                    {student?.behaviorPoints !== undefined ? (student.behaviorPoints > 0 ? '+' + student.behaviorPoints : student.behaviorPoints) : 0}
                                </span>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">Puntos Totales</p>
                            </div>

                            <h4 className="font-bold text-slate-800 text-sm mb-3 border-b border-slate-100 pb-2">Historial de Incidencias</h4>
                            <div className="space-y-3">
                                {behaviorLogs.length === 0 ? (
                                    <div className="text-center py-4 text-slate-400">
                                        <p>✨ Sin incidencias registradas.</p>
                                    </div>
                                ) : (
                                    behaviorLogs.map(log => (
                                        <div key={log.id} className="flex gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                            <div className={`w-1 shrink-0 rounded-full ${log.type === 'POSITIVE' ? 'bg-emerald-400' : 'bg-red-400'}`}></div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${log.type === 'POSITIVE' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                                                        {log.type === 'POSITIVE' ? 'Positivo' : 'Negativo'}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">{new Date(log.date).toLocaleDateString()}</span>
                                                </div>
                                                <p className="text-xs text-slate-700 font-medium leading-relaxed">{log.description}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
