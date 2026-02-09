import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Student, Assignment, BehaviorLog, SchoolEvent, SchoolConfig, FinanceEvent, AttendanceStatus, StaffTask, Book } from '../types';
import { MOCK_ASSIGNMENTS, MOCK_EVENTS, MOCK_STUDENTS, DEFAULT_CONFIG } from '../constants';

export const useAppStore = () => {
    // -- STATE (Initialized with Mocks/Empty primarily, then Server fills it) --
    // We prioritize Server data. We initialize with Mocks to show something immediately if offline/empty,
    // but we will NOT read from LocalStorage to avoid QuotaExceededError with images.
    // Helper to read from cache immediately
    const getCache = (key: string, fallback: any) => {
        try {
            const val = localStorage.getItem(key);
            if (val) {
                console.log(`%c󰆓 Cargado de caché: ${key}`, "color: gray; font-size: 10px;");
                return JSON.parse(val);
            }

            const hasRealData = localStorage.getItem('SIRILA_HAS_REAL_DATA') === 'true';
            if (hasRealData) {
                console.log(`%c󰆓 ${key} vacío (pero hay datos reales en otro lado)`, "color: gray; font-size: 10px;");
                if (Array.isArray(fallback)) return [];
                if (key === 'SIRILA_CACHE_CONFIG') return DEFAULT_CONFIG;
                return fallback;
            }

            return fallback;
        } catch (e) { return fallback; }
    };

    const [students, setStudents] = useState<Student[]>(() => getCache('SIRILA_CACHE_STUDENTS', MOCK_STUDENTS));
    const [assignments, setAssignments] = useState<Assignment[]>(() => getCache('SIRILA_CACHE_ASSIGNMENTS', MOCK_ASSIGNMENTS));
    const [behaviorLogs, setBehaviorLogs] = useState<BehaviorLog[]>(() => getCache('SIRILA_CACHE_LOGS', []));
    const [events, setEvents] = useState<SchoolEvent[]>(() => getCache('SIRILA_CACHE_EVENTS', MOCK_EVENTS));
    const [schoolConfig, setSchoolConfig] = useState<SchoolConfig>(() => getCache('SIRILA_CACHE_CONFIG', DEFAULT_CONFIG));
    const [financeEvents, setFinanceEvents] = useState<FinanceEvent[]>(() => getCache('SIRILA_CACHE_FINANCE', []));
    const [staffTasks, setStaffTasks] = useState<StaffTask[]>(() => getCache('SIRILA_CACHE_TASKS', []));
    const [books, setBooks] = useState<Book[]>(() => getCache('SIRILA_CACHE_BOOKS', []));

    // Functional setter to ensure we always have the latest state and trigger immediate cache flush
    const updateStateAndCache = async (key: string, setter: Function, data: any, apiCall?: Function) => {
        setter(data);
        saveToCache(key, data);
        if (apiCall) {
            try {
                await apiCall(data);
            } catch (e) {
                console.log(`Acción encolada para ${key}`);
                setPendingActions(api.getQueueLength());
            }
        }
    };

    // -- PERSISTENCE UTILS --
    const saveToCache = (key: string, data: any) => {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error(`ERROR CRÍTICO: No se pudo guardar ${key} en el dispositivo.`, e);
            const win = window as any;
            if (!win.localStorage_alert_shown) {
                // Suppress alert for Cloud users, just warn in console
                console.warn("⚠️ LocalStorage limit reached. Offline backup might be incomplete, but Cloud data is safe.");
                // alert("⚠️ MEMORIA LLENA: ..."); 
                win.localStorage_alert_shown = true;
            }
        }
    };

    const flushCache = (
        s = students, a = assignments, e = events, l = behaviorLogs,
        c = schoolConfig, f = financeEvents, t = staffTasks, b = books
    ) => {
        saveToCache('SIRILA_CACHE_STUDENTS', s);
        saveToCache('SIRILA_CACHE_ASSIGNMENTS', a);
        saveToCache('SIRILA_CACHE_EVENTS', e);
        saveToCache('SIRILA_CACHE_LOGS', l);
        saveToCache('SIRILA_CACHE_CONFIG', c);
        saveToCache('SIRILA_CACHE_FINANCE', f);
        saveToCache('SIRILA_CACHE_TASKS', t);
        saveToCache('SIRILA_CACHE_BOOKS', b);
        localStorage.setItem('SIRILA_HAS_REAL_DATA', 'true');
        console.log("%c✓ Caché persistida localmente", "color: green; font-weight: bold;");
    };

    const [unreadCount, setUnreadCount] = useState(0);
    const [needsSync, setNeedsSync] = useState(false);
    const [pendingActions, setPendingActions] = useState(0);

    // -- RECOVERY TOOL --
    const recoverLocalData = (silent = false) => {
        try {
            const getOld = (k: string) => localStorage.getItem(k);
            const lsStudents = getOld('SIRILA_DB_STUDENTS');
            const lsAssignments = getOld('SIRILA_DB_ASSIGNMENTS');
            const lsEvents = getOld('SIRILA_DB_EVENTS');
            const lsLogs = getOld('SIRILA_DB_LOGS');
            const lsConfig = getOld('SIRILA_DB_CONFIG');
            const lsFinance = getOld('SIRILA_DB_FINANCE');

            let found = false;
            if (lsStudents) { setStudents(JSON.parse(lsStudents)); found = true; }
            if (lsAssignments) { setAssignments(JSON.parse(lsAssignments)); found = true; }
            if (lsEvents) { setEvents(JSON.parse(lsEvents)); found = true; }
            if (lsLogs) {
                setBehaviorLogs(JSON.parse(lsLogs).map((log: any) => ({
                    ...log,
                    points: log.points !== undefined ? log.points : (log.type === 'POSITIVE' ? 1 : -1)
                })));
                found = true;
            }
            if (lsConfig) { setSchoolConfig(JSON.parse(lsConfig)); found = true; }
            if (lsFinance) { setFinanceEvents(JSON.parse(lsFinance)); found = true; }

            if (found) {
                if (!silent) alert("¡Datos antiguos recuperados! Pulsa 'Sincronizar con MySQL' en Configuración.");
                setNeedsSync(true);
                return true;
            }
            return false;
        } catch (e) {
            console.error("Recovery failed", e);
            return false;
        }
    };

    // -- INDIVIDUAL OFFLINE CACHING --
    // We separate these to ensure that if one (like students with images) exceeds quota, 
    // others (like config or tasks) are still saved.
    useEffect(() => {
        try { localStorage.setItem('SIRILA_CACHE_STUDENTS', JSON.stringify(students)); }
        catch (e) { console.warn("Cache Students failed (Quota?)", e); }
    }, [students]);

    useEffect(() => {
        try { localStorage.setItem('SIRILA_CACHE_ASSIGNMENTS', JSON.stringify(assignments)); }
        catch (e) { console.warn("Cache Assignments failed", e); }
    }, [assignments]);

    useEffect(() => {
        try { localStorage.setItem('SIRILA_CACHE_EVENTS', JSON.stringify(events)); }
        catch (e) { console.warn("Cache Events failed", e); }
    }, [events]);

    useEffect(() => {
        try { localStorage.setItem('SIRILA_CACHE_LOGS', JSON.stringify(behaviorLogs)); }
        catch (e) { console.warn("Cache Logs failed", e); }
    }, [behaviorLogs]);

    useEffect(() => {
        try { localStorage.setItem('SIRILA_CACHE_CONFIG', JSON.stringify(schoolConfig)); }
        catch (e) { console.warn("Cache Config failed", e); }
    }, [schoolConfig]);

    useEffect(() => {
        try { localStorage.setItem('SIRILA_CACHE_FINANCE', JSON.stringify(financeEvents)); }
        catch (e) { console.warn("Cache Finance failed", e); }
    }, [financeEvents]);

    useEffect(() => {
        try { localStorage.setItem('SIRILA_CACHE_TASKS', JSON.stringify(staffTasks)); }
        catch (e) { console.warn("Cache Tasks failed", e); }
    }, [staffTasks]);

    // Background Sync when online OR periodically
    useEffect(() => {
        const checkQueue = async () => {
            const count = api.getQueueLength();
            setPendingActions(count);
            if (count > 0) {
                const remaining = await api.processQueue();
                setPendingActions(remaining || 0);
            }
        };

        const handleOnline = () => {
            console.log("Internet connection restored. Syncing...");
            checkQueue();
        };

        window.addEventListener('online', handleOnline);

        // Periodic check every 30 seconds
        const interval = setInterval(checkQueue, 30000);

        // Initial check
        checkQueue();

        return () => {
            window.removeEventListener('online', handleOnline);
            clearInterval(interval);
        };
    }, []);

    const [isLoading, setIsLoading] = useState(false);

    // -- AUTO-SYNC FROM SERVER ON MOUNT --
    useEffect(() => {
        const loadFromServer = async () => {
            setIsLoading(true);
            try {
                console.log("%c☁ Buscando datos en el servidor...", "color: blue; font-weight: bold;");
                const result = await api.checkStatus();

                if (result) {
                    console.log("%c✓ Datos recibidos del servidor", "color: green; font-weight: bold;");
                    if (result.schoolConfig) setSchoolConfig(result.schoolConfig);

                    if (!result.isEmpty) {
                        const s = result.students || [];
                        const a = result.assignments || [];
                        const e = result.events || [];
                        const l = (result.behaviorLogs || []).map((log: any) => ({
                            ...log,
                            points: log.points !== undefined ? log.points : (log.type === 'POSITIVE' ? 1 : -1)
                        }));
                        const f = result.financeEvents || [];
                        const t = result.staffTasks || [];
                        const b = result.books || [];

                        setStudents(s);
                        setAssignments(a);
                        setEvents(e);
                        setBehaviorLogs(l);
                        setFinanceEvents(f);
                        setStaffTasks(t);
                        setBooks(b);

                        // If response was optimized (stripped avatars), fetch them now
                        if (result.isOptimized) {
                            console.log("%c🖼 Iniciando carga de avatars...", "color: purple;");
                            api.getAvatars().then(avatarMap => {
                                const count = Object.keys(avatarMap).length;
                                console.log(`%c🖼 Avatars recibidos: ${count}`, "color: purple; font-weight: bold;");

                                setStudents(prev => {
                                    const updated = prev.map(student => {
                                        if (avatarMap[student.id]) {
                                            return { ...student, avatar: avatarMap[student.id] };
                                        }
                                        return student;
                                    });

                                    // CRITICAL: Update cache with full students (including avatars)
                                    // We need to pass the updated list here
                                    flushCache(updated, a, e, l, result.schoolConfig || schoolConfig, f, t, b);
                                    return updated;
                                });
                                console.log("%c✓ Avatars aplicados y cacheados", "color: purple; font-weight: bold;");
                            }).catch(err => console.error("Failed to lazy load avatars:", err));
                        }

                        // CRITICAL: Flush to cache immediately
                        flushCache(s, a, e, l, result.schoolConfig || schoolConfig, f, t, b);
                    } else {
                        console.warn("Servidor vacío. Intentando recuperación local...");
                        recoverLocalData(true);
                    }
                }
            } catch (e) {
                console.log("%c📵 Servidor desconectado. Usando memoria local del dispositivo.", "color: orange; font-weight: bold;");
            } finally {
                setIsLoading(false);
            }

            // Always try to process queue on start
            try {
                const remaining = await api.processQueue();
                setPendingActions(remaining || 0);
            } catch (err) {
                setPendingActions(api.getQueueLength());
            }
        };

        loadFromServer();
    }, []); // Run once on mount

    // Poll for unread messages (Only if online)
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        let previousCount = 0;

        const checkUnread = async () => {
            if (!navigator.onLine) return;
            try {
                const msgs = await api.getAllMessages();
                const count = msgs.filter((m: any) => m.sender === 'PARENT' && !m.is_read).length;

                if (count > previousCount) {
                    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                    audio.volume = 0.5;
                    audio.play().catch(e => console.log('Audio play failed', e));

                    if ('Notification' in window && Notification.permission === 'granted') {
                        new Notification('Nuevo Mensaje de Padre', {
                            body: `Tienes ${count} mensajes sin leer.`,
                            icon: '/logo escuela.png'
                        });
                    }
                }
                previousCount = count;
                setUnreadCount(count);
            } catch (e) {
                // Silent error on poll fail 
            }
        };

        checkUnread();
        const interval = setInterval(checkUnread, 10000);
        return () => clearInterval(interval);
    }, []);

    // NOTE: Caching is now automatic via useEffect above.
    // Sync via api.ts happens in the handlers below.

    // Student CRUD Operations
    const handleAddStudent = (studentData: Omit<Student, 'id' | 'attendance' | 'behaviorPoints' | 'assignmentsCompleted' | 'totalAssignments' | 'participationCount' | 'grades' | 'completedAssignmentIds' | 'annualFeePaid'> & { id?: string }) => {
        const newStudent: Student = {
            ...studentData,
            id: studentData.id || `2024${Math.floor(100000 + Math.random() * 900000)}`,
            attendance: {},
            behaviorPoints: 0,
            assignmentsCompleted: 0,
            completedAssignmentIds: [],
            totalAssignments: assignments.length,
            participationCount: 0,
            grades: [],
            annualFeePaid: false
        };
        setStudents(prev => [...prev, newStudent]);
        // Send to Server
        api.saveStudent(newStudent).catch(err => {
            console.log("Acción encolada para sincronización manual.");
            setPendingActions(api.getQueueLength());
        });
    };

    const handleImportStudents = (newStudentsData: Partial<Student>[], defaultGroup?: string) => {
        setStudents(prev => {
            const updatedStudents = [...prev];

            newStudentsData.forEach(data => {
                const normalizedCurp = data.curp?.toUpperCase().trim();
                const normalizedName = data.name?.toUpperCase().trim();

                // Find existing student by CURP (priority) or Name
                const existingIndex = updatedStudents.findIndex(s =>
                    (normalizedCurp && s.curp === normalizedCurp) ||
                    (normalizedName && s.name === normalizedName)
                );

                if (existingIndex >= 0) {
                    // UPDATE existing student
                    const existing = updatedStudents[existingIndex];
                    const mergedStudent = {
                        ...existing,
                        ...data, // Overwrite with new data
                        id: existing.id, // Preserve ID
                        // Merge grades if provided
                        grades: data.grades && data.grades.length > 0 ? data.grades : existing.grades
                    } as Student;

                    updatedStudents[existingIndex] = mergedStudent;
                    api.saveStudent(mergedStudent).catch(console.error);
                } else {
                    // CREATE new student
                    const newStudent: Student = {
                        id: data.id || `2024${Math.floor(100000 + Math.random() * 900000)}`,
                        curp: normalizedCurp || '',
                        name: normalizedName || 'SIN NOMBRE',
                        sex: (data.sex === 'MUJER' ? 'MUJER' : 'HOMBRE'),
                        birthDate: data.birthDate || '',
                        birthPlace: data.birthPlace || '',
                        enrollmentDate: new Date().toISOString().split('T')[0],
                        status: 'INSCRITO',
                        repeater: false,
                        bap: 'NINGUNA',
                        usaer: false,
                        avatar: `https://picsum.photos/100/100?random=${Math.floor(Math.random() * 1000)}`,
                        guardianName: data.guardianName || '',
                        guardianPhone: data.guardianPhone || '',
                        attendance: {},
                        behaviorPoints: 0,
                        assignmentsCompleted: 0,
                        completedAssignmentIds: [],
                        totalAssignments: assignments.length,
                        participationCount: 0,
                        grades: [],
                        annualFeePaid: false,
                        ...data,
                        group: data.group || defaultGroup || schoolConfig.gradeGroup || '4 A'
                    } as Student;

                    updatedStudents.push(newStudent);
                    api.saveStudent(newStudent).catch(console.error);
                }
            });

            return updatedStudents;
        });
    };

    const handleEditStudent = (id: string, updatedData: Partial<Student>) => {
        setStudents(prev => {
            const next = prev.map(s => s.id === id ? { ...s, ...updatedData } as Student : s);
            saveToCache('SIRILA_CACHE_STUDENTS', next); // Immediate save
            const updatedStudent = next.find(s => s.id === id);
            if (updatedStudent) api.saveStudent(updatedStudent).catch(() => setPendingActions(api.getQueueLength()));
            return next;
        });
    };

    const handleDeleteStudent = (id: string) => {
        setStudents(prev => {
            const next = prev.filter(s => s.id !== id);
            saveToCache('SIRILA_CACHE_STUDENTS', next); // Immediate save
            api.deleteStudent(id).catch(() => setPendingActions(api.getQueueLength()));
            return next;
        });
    };

    const handleAttendanceUpdate = (studentId: string, status: AttendanceStatus, date?: string) => {
        const targetDate = date || new Date().toISOString().split('T')[0];
        let updatedStudent: Student | null = null;

        setStudents(prev => prev.map(s => {
            if (s.id === studentId) {
                const newAttendance = { ...s.attendance };
                if (status === AttendanceStatus.NONE) {
                    delete newAttendance[targetDate];
                } else {
                    newAttendance[targetDate] = status;
                }

                updatedStudent = {
                    ...s,
                    attendance: newAttendance
                };
                return updatedStudent;
            }
            return s;
        }));

        if (updatedStudent) api.saveStudent(updatedStudent);
    };

    const handleBehaviorLog = (studentId: string, type: 'POSITIVE' | 'NEGATIVE' | 'USAER_OBSERVATION' | 'USAER_MEETING' | 'USAER_ACCOMMODATION' | 'USAER_SUGGESTION', description: string) => {
        const points = type === 'POSITIVE' ? 1 : type === 'NEGATIVE' ? -1 : 0;

        const newLog: BehaviorLog = {
            id: Date.now().toString(),
            studentId,
            studentName: students.find(s => s.id === studentId)?.name || 'Desconocido',
            type,
            description,
            date: new Date().toISOString(),
            points
        };
        setBehaviorLogs(prev => [...prev, newLog]);
        api.saveBehaviorLog(newLog);

        // Only update points on student if it's strictly positive/negative behavior, not USAER notes
        if (points !== 0) {
            let updatedStudent: Student | null = null;
            setStudents(prev => prev.map(s => {
                if (s.id === studentId) {
                    updatedStudent = {
                        ...s,
                        behaviorPoints: s.behaviorPoints + points
                    };
                    return updatedStudent;
                }
                return s;
            }));

            if (updatedStudent) api.saveStudent(updatedStudent);
        }
    };

    const handleDeleteBehaviorLog = async (id: string) => {
        setBehaviorLogs(prev => prev.filter(log => log.id !== id));
        try {
            await api.deleteBehaviorLog(id);
        } catch (e) {
            console.error("Failed to delete behavior log:", e);
            alert("Error al eliminar del servidor: " + (e instanceof Error ? e.message : String(e)));
        }
    };

    const handleUpdateBehaviorLog = (id: string, updatedData: Partial<BehaviorLog>) => {
        const updatedLog = { ...behaviorLogs.find(l => l.id === id), ...updatedData } as BehaviorLog;
        setBehaviorLogs(behaviorLogs.map(l => l.id === id ? updatedLog : l));
        api.saveBehaviorLog(updatedLog).catch(err => console.error("Error updating log DB", err));
    };

    // Activity/Assignment Logic
    const handleToggleAssignment = (studentId: string, assignmentId: string, score?: number) => {
        let updatedStudent: Student | null = null;
        setStudents(prev => prev.map(student => {
            if (student.id === studentId) {
                const isCompleted = student.completedAssignmentIds?.includes(assignmentId);
                let newCompletedIds = [];
                let newResults = { ...(student.assignmentResults || {}) };

                if (isCompleted && score === undefined) {
                    // Normal toggle OFF
                    newCompletedIds = student.completedAssignmentIds.filter(id => id !== assignmentId);
                    // We keep the result for history unless explicity removed? Usually keep it.
                } else {
                    // Toggle ON or Updating Score
                    newCompletedIds = [...new Set([...(student.completedAssignmentIds || []), assignmentId])];
                    if (score !== undefined) {
                        newResults[assignmentId] = score;
                    }
                }

                updatedStudent = {
                    ...student,
                    completedAssignmentIds: newCompletedIds,
                    assignmentResults: newResults,
                    assignmentsCompleted: newCompletedIds.length,
                    totalAssignments: assignments.length
                };
                return updatedStudent;
            }
            return student;
        }));

        if (updatedStudent) api.saveStudent(updatedStudent);
    };

    const handleAddAssignment = (assignmentData: Partial<Assignment>) => {
        const newAssignment: Assignment = {
            id: `A${Date.now()}`,
            title: assignmentData.title || 'Nueva Tarea',
            dueDate: assignmentData.dueDate || new Date().toISOString().split('T')[0],
            completedStudentIds: [],
            type: assignmentData.type || 'TASK',
            interactiveData: assignmentData.interactiveData,
            isVisibleInParentsPortal: assignmentData.isVisibleInParentsPortal ?? true,
            targetGroup: assignmentData.targetGroup // Fixed: Persist privacy group
        };
        const newAssignmentList = [...assignments, newAssignment];
        setAssignments(newAssignmentList);
        api.saveAssignment(newAssignment);

        // Update student totals
        setStudents(prev => prev.map(s => {
            const updated = { ...s, totalAssignments: newAssignmentList.length };
            api.saveStudent(updated); // Sync to DB
            return updated;
        }));
    };

    const handleUpdateAssignment = (id: string, updatedData: Partial<Assignment>) => {
        const updatedAssignment = { ...assignments.find(a => a.id === id), ...updatedData } as Assignment;
        setAssignments(assignments.map(a => a.id === id ? updatedAssignment : a));
        api.saveAssignment(updatedAssignment);
    };

    const handleDeleteAssignment = async (id: string) => {
        const previousAssignments = [...assignments];
        const newAssignmentList = assignments.filter(a => a.id !== id);

        // Optimistic Update
        setAssignments(newAssignmentList);

        // Update student totals (Optimistic)
        const previousStudents = [...students];
        setStudents(prev => prev.map(s => ({ ...s, totalAssignments: newAssignmentList.length })));

        try {
            await api.deleteAssignment(id);
            // Also sync student totals to DB
            const updatedStudents = students.map(s => ({ ...s, totalAssignments: newAssignmentList.length }));
            // We can batch save or just let it be. But to be safe, we should save the affected students.
            // Actually, saving all students is heavy. 
            // Ideally the backend should handle this derivation.
            // But for now, let's stick to the existing logic but inside try block.
            updatedStudents.forEach(s => api.saveStudent(s));
        } catch (error: any) {
            console.error("Failed to delete assignment:", error);
            alert("Error al eliminar la actividad: " + (error.message || "Error desconocido"));
            // Revert State
            setAssignments(previousAssignments);
            setStudents(previousStudents);
        }
    };

    // Event CRUD Logic
    const handleAddEvent = (eventData: Omit<SchoolEvent, 'id'>) => {
        const newEvent: SchoolEvent = {
            ...eventData,
            id: `E${Date.now()}`
        };
        setEvents([...events, newEvent]);
        api.saveEvent(newEvent);
    };

    const handleEditEvent = (id: string, updatedData: Partial<SchoolEvent>) => {
        const updatedEvent = { ...events.find(e => e.id === id), ...updatedData } as SchoolEvent;
        setEvents(events.map(e => e.id === id ? updatedEvent : e));
        api.saveEvent(updatedEvent);
    };

    const handleDeleteEvent = (id: string) => {
        setEvents(events.filter(e => e.id !== id));
        api.deleteEvent(id);
    };

    // Finance Logic
    const handleUpdateStudentFee = (studentId: string, paid: boolean) => {
        let updatedStudent: Student | null = null;
        setStudents(prev => prev.map(s => {
            if (s.id === studentId) {
                updatedStudent = { ...s, annualFeePaid: paid };
                return updatedStudent;
            }
            return s;
        }));
        if (updatedStudent) api.saveStudent(updatedStudent);
    };

    const handleAddFinanceEvent = (eventData: Omit<FinanceEvent, 'id' | 'contributions'>) => {
        const newEvent: FinanceEvent = {
            ...eventData,
            id: `FE${Date.now()}`,
            contributions: {}
        };
        setFinanceEvents([...financeEvents, newEvent]);
        api.saveFinanceEvent(newEvent);
    };

    const handleDeleteFinanceEvent = (id: string) => {
        setFinanceEvents(financeEvents.filter(e => e.id !== id));
        api.deleteFinanceEvent(id);
    };

    const handleUpdateContribution = (eventId: string, studentId: string, amount: number) => {
        let updatedEvent: FinanceEvent | null = null;
        setFinanceEvents(prev => prev.map(e => {
            if (e.id === eventId) {
                updatedEvent = {
                    ...e,
                    contributions: {
                        ...e.contributions,
                        [studentId]: amount
                    }
                };
                return updatedEvent;
            }
            return e;
        }));
        if (updatedEvent) api.saveFinanceEvent(updatedEvent);
    };

    // Staff Task Logic
    const handleAddStaffTask = (taskData: Omit<StaffTask, 'id' | 'createdAt'>) => {
        const newTask: StaffTask = {
            ...taskData,
            id: `T${Date.now()}`,
            createdAt: new Date().toISOString()
        };
        setStaffTasks([...staffTasks, newTask]);
        api.saveStaffTask(newTask);
    };

    const handleEditStaffTask = (id: string, updatedData: Partial<StaffTask>) => {
        const updatedTask = { ...staffTasks.find(t => t.id === id), ...updatedData } as StaffTask;
        setStaffTasks(staffTasks.map(t => t.id === id ? updatedTask : t));
        api.saveStaffTask(updatedTask);
    };

    const handleDeleteStaffTask = (id: string) => {
        setStaffTasks(staffTasks.filter(t => t.id !== id));
        api.deleteStaffTask(id);
    };

    const handleCompleteStaffTask = (taskId: string, staffId: string) => {
        const task = staffTasks.find(t => t.id === taskId);
        if (!task) return;

        // Add staffId to completedBy array if not already present
        const completedBy = task.completedBy || [];
        if (!completedBy.includes(staffId)) {
            completedBy.push(staffId);
        }

        // Update task status if all required staff completed
        const allStaff = task.assignedTo === 'ALL' || task.assignedTo === 'DOCENTES'
            ? schoolConfig.staff?.length || 0
            : 1;

        const updatedStatus = (completedBy.length >= allStaff ? 'COMPLETED' : 'PENDING') as 'COMPLETED' | 'PENDING' | 'LATE';

        const updatedTask: StaffTask = { ...task, completedBy, status: updatedStatus };
        setStaffTasks(staffTasks.map(t => t.id === taskId ? updatedTask : t));
        api.saveStaffTask(updatedTask);
    };

    // Data Export/Import Logic (Still useful for backup JSONs)
    const handleExportData = () => {
        const data = {
            students,
            assignments,
            behaviorLogs,
            events,
            schoolConfig,
            financeEvents,
            version: '1.0',
            timestamp: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `sirila_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleImportData = (file: File) => {
        // Threshold: 1MB. If larger, images are likely involved, risking a React render crash.
        const IS_LARGE_FILE = file.size > 1 * 1024 * 1024;

        if (IS_LARGE_FILE) {
            const proceed = confirm(`⚠️ Archivo Pesado Detectado (${(file.size / 1024 / 1024).toFixed(2)} MB)\n\nIntentar mostrar estos datos en pantalla podría congelar tu navegador (pantalla blanca).\n\n¿Deseas enviarlos DIRECTAMENTE al servidor de base de datos? (Recomendado)\n\n[Aceptar] = Subir directo y recargar (Seguro)\n[Cancelar] = Intentar mostrar en pantalla (Riesgoso)`);

            if (proceed) {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        alert("Iniciando carga segura en segundo plano... Por favor espere y NO cierre esta ventana hasta ver el mensaje de éxito.");
                        const content = e.target?.result as string;
                        const data = JSON.parse(content);

                        // Send directly to API avoiding React State (DOM) update
                        await api.syncAll(data);

                        alert("✅ ¡Éxito! Los datos han sido restaurados directamente en la base de datos MySQL.\n\nLa página se recargará ahora.");
                        window.location.reload();
                    } catch (err: any) {
                        console.error(err);
                        alert("Error en la subida directa: " + err.message);
                    }
                };
                reader.readAsText(file);
                return; // Exit here, do not do standard logic
            }
        }

        // Standard Logic for small files
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                let data;
                try {
                    data = JSON.parse(content);
                } catch (jsonError) {
                    alert("Error crítico: El archivo seleccionado no es un JSON válido o está corrupto.");
                    console.error("JSON Parse Error:", jsonError);
                    return;
                }

                // Basic Validation
                if (!data.students && !data.schoolConfig && !data.assignments) {
                    alert("Error: El archivo no parece contener datos válidos de Sirila (faltan estudiantes o configuración).");
                    return;
                }

                if (data.students && Array.isArray(data.students)) setStudents(data.students);
                if (data.assignments && Array.isArray(data.assignments)) setAssignments(data.assignments);
                if (data.behaviorLogs && Array.isArray(data.behaviorLogs)) setBehaviorLogs(data.behaviorLogs);
                if (data.events && Array.isArray(data.events)) setEvents(data.events);
                if (data.schoolConfig) setSchoolConfig(data.schoolConfig);
                if (data.financeEvents && Array.isArray(data.financeEvents)) setFinanceEvents(data.financeEvents);

                setNeedsSync(true);

                alert('Datos cargados en memoria (Modo Seguro).\n\nAhora ve al botón verde "Sincronizar con MySQL" para guardarlos.');

            } catch (error: any) {
                console.error('Import error:', error);
                alert('Error al procesar el archivo: ' + error.message);
            }
        };
        reader.onerror = () => {
            alert("Error al leer el archivo del sistema.");
        };
        reader.readAsText(file);
    };

    const handleSyncToDB = async () => {
        if (!confirm('Esta acción iniciará una migración SECUENCIAL (paso a paso) de todos tus datos al servidor.\n\nEsto evitará errores de conexión, pero puede tomar unos minutos.\n\nMantén esta ventana abierta. ¿Continuar?')) return;

        let errores = [];
        let successCount = 0;

        try {
            // 1. CONFIG
            console.log("Guardando Configuración...");
            try {
                await api.saveConfig(schoolConfig);
                successCount++;
            } catch (e: any) {
                console.error("Error Config:", e);
                errores.push("Configuración: " + e.message);
            }

            // 2. EVENTS
            console.log("Guardando Eventos...");
            for (const item of events) {
                try { await api.saveEvent(item); successCount++; } catch (e) { errores.push(`Evento ${item.title}: Error`); }
            }

            // 3. ASSIGNMENTS
            console.log("Guardando Tareas...");
            for (const item of assignments) {
                try { await api.saveAssignment(item); successCount++; } catch (e) { errores.push(`Tarea ${item.title}: Error`); }
            }

            // 4. BEHAVIOR
            console.log("Guardando Conducta...");
            for (const item of behaviorLogs) {
                try { await api.saveBehaviorLog(item); successCount++; } catch (e) { errores.push(`Log Conducta: Error`); }
            }

            // 5. FINANCE
            console.log("Guardando Finanzas...");
            for (const item of financeEvents) {
                try { await api.saveFinanceEvent(item); successCount++; } catch (e) { errores.push(`Finanza ${item.title}: Error`); }
            }

            // 6. STUDENTS (The heavy part)
            console.log("Guardando Estudiantes...");
            for (const [index, student] of students.entries()) {
                try {
                    console.log(`Subiendo estudiante ${index + 1}/${students.length}: ${student.name}`);
                    await api.saveStudent(student);
                    successCount++;
                } catch (e: any) {
                    console.error(`Fallo al guardar estudiante ${student.name}`, e);
                    errores.push(`Estudiante ${student.name}: ${e.message}`);
                }
            }

            let msg = `¡Proceso Finalizado!\n\nElementos guardados: ${successCount}`;
            if (errores.length > 0) {
                msg += `\n\nHubo ${errores.length} errores:\n` + errores.slice(0, 5).join('\n') + (errores.length > 5 ? '\n...' : '');
            } else {
                msg += `\n\nTodo se guardó correctamente en la base de datos MySQL.`;
            }

            alert(msg);
            window.location.reload();

        } catch (error: any) {
            console.error("Error general:", error);
            alert('Error inesperado en el proceso de migración: ' + error.message);
        }
    };



    const handleSetSchoolConfig = (newConfig: SchoolConfig) => {
        setSchoolConfig(newConfig);
        saveToCache('SIRILA_CACHE_CONFIG', newConfig);
        api.saveConfig(newConfig).catch(err => {
            console.log("Configuración guardada localmente (pendiente de servidor)");
            setPendingActions(api.getQueueLength());
        });
    };

    const handleAddBook = (book: Book) => {
        setBooks(prev => {
            const next = [...prev, book];
            saveToCache('SIRILA_CACHE_BOOKS', next);
            api.saveBook(book).catch(() => setPendingActions(api.getQueueLength()));
            return next;
        });
    };

    const handleUpdateBook = (book: Book) => {
        setBooks(prev => {
            const next = prev.map(b => b.id === book.id ? book : b);
            saveToCache('SIRILA_CACHE_BOOKS', next);
            api.saveBook(book).catch(() => setPendingActions(api.getQueueLength()));
            return next;
        });
    };

    const handleDeleteBook = (id: string) => {
        setBooks(prev => {
            const next = prev.filter(b => b.id !== id);
            saveToCache('SIRILA_CACHE_BOOKS', next);
            api.deleteBook(id).catch(() => setPendingActions(api.getQueueLength()));
            return next;
        });
    };

    return {
        students,
        assignments,
        behaviorLogs,
        events,
        schoolConfig,
        setSchoolConfig: handleSetSchoolConfig,
        financeEvents,
        unreadCount,
        setUnreadCount,
        handleAddStudent,
        handleImportStudents,
        handleEditStudent,
        handleDeleteStudent,
        handleAttendanceUpdate,
        handleBehaviorLog,
        handleUpdateBehaviorLog,
        handleDeleteBehaviorLog,
        handleToggleAssignment,
        handleAddAssignment,
        handleUpdateAssignment,
        handleDeleteAssignment,
        handleAddEvent,
        handleEditEvent,
        handleDeleteEvent,
        handleUpdateStudentFee,
        handleAddFinanceEvent,
        handleDeleteFinanceEvent,
        handleUpdateContribution,
        handleExportData,
        handleImportData,
        handleSyncToDB,
        recoverLocalData,
        staffTasks,
        handleAddStaffTask,
        handleEditStaffTask,
        handleDeleteStaffTask,
        handleCompleteStaffTask,
        needsSync, // State indicating migration is needed
        pendingActions,
        books,
        handleAddBook,
        handleUpdateBook,
        handleDeleteBook,
        isLoading
    };
};
