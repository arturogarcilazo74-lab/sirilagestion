import { Student, Assignment, SchoolEvent, BehaviorLog, FinanceEvent, SchoolConfig, StaffTask, Book } from '../types';

// --- CONFIGURATION ---
const GET_BASE_URL = () => {
    // Check if we have a stored preference
    let stored = localStorage.getItem('SIRILA_SERVER_URL');

    // INTELLIGENT OVERRIDE:
    // If we are on a remote device (e.g. tunnel, public IP) but the stored URL is 'localhost',
    // it is definitely wrong (leftover from testing). We must ignore it.
    const isRemote = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    if (isRemote && stored && (stored.includes('localhost') || stored.includes('127.0.0.1'))) {
        console.warn('Ignoring invalid localhost configuration on remote device');
        stored = null;
    }

    // If running as file:// (Electron), we must use absolute URL
    if (window.location.protocol === 'file:') {
        return stored || 'http://localhost:3001/api';
    }

    // For all web access (localhost, LAN, tunnel URL), use relative path
    // This allows the tunnel to proxy correctly without CORS/Mixed-Content issues
    return stored || '/api';
};

// --- OFFLINE QUEUE SYSTEM ---
const OFFLINE_QUEUE_KEY = 'SIRILA_OFFLINE_QUEUE';

const addToQueue = (endpoint: string, method: string, body: any) => {
    try {
        const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');

        // Prevent infinite growth
        if (queue.length > 200) {
            console.warn("Offline queue too large. Dropping oldest items.");
            queue.shift();
        }

        // AUTO-CORRECTION: Ensure we strictly store relative paths for new items
        // This prevents the 'double prefix' bug from happening in the future
        let safeEndpoint = endpoint;
        if (safeEndpoint.startsWith('http')) {
            // Strip domain
            safeEndpoint = safeEndpoint.replace(/^https?:\/\/[^\/]+/, '');
        }
        if (safeEndpoint.startsWith('/api')) {
            // Strip /api prefix if present (we add it back dynamically)
            safeEndpoint = safeEndpoint.substring(4);
        }

        queue.push({ endpoint: safeEndpoint, method, body, timestamp: Date.now() });
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
        console.log(`Action queued for offline sync: ${method} ${safeEndpoint}`);
    } catch (e) {
        console.error("CRITICAL: Failed to add to offline queue (Quota exceeded?)", e);
        try {
            localStorage.removeItem('SIRILA_CACHE_STUDENTS');
            localStorage.removeItem('SIRILA_CACHE_BOOKS');
        } catch (inner) { }
    }
};

const clearQueue = () => {
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
};

const API_URL = GET_BASE_URL(); // Initial load

export const api = {
    // Sync the queue when connection is restored
    processQueue: async () => {
        const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
        if (queue.length === 0) return 0;

        console.log(`Processing ${queue.length} queued offline actions...`);
        const remainingQueue = [];
        const currentBase = GET_BASE_URL();

        for (const item of queue) {
            try {
                // ROBUST URL RECONSTRUCTION
                // We need to handle legacy items that might have absolute URLs or '/api' prefixes
                let relativePath = item.endpoint;

                // 1. Strip Domain if present
                if (relativePath.startsWith('http')) {
                    relativePath = relativePath.replace(/^https?:\/\/[^\/]+/, '');
                }

                // 2. Strip '/api' prefix if present
                // This ensures we have a clean path like '/assignments' or '/students'
                if (relativePath.startsWith('/api')) {
                    relativePath = relativePath.substring(4);
                }

                // 3. Ensure it starts with /
                if (!relativePath.startsWith('/')) {
                    relativePath = '/' + relativePath;
                }

                // 4. Construct final URL
                // currentBase is usually '/api' or 'http://localhost:3001/api'
                // relativePath is '/assignments'
                // Result: '/api/assignments' -> CORRECT
                const finalUrl = `${currentBase}${relativePath}`;

                const res = await fetch(finalUrl, {
                    method: item.method,
                    headers: { 'Content-Type': 'application/json' },
                    body: item.body ? JSON.stringify(item.body) : null
                });

                if (!res.ok) {
                    // Special Handling for 404 (Resource not found)
                    // If we try to delete something that doesn't exist, we should probably just drop it
                    if (res.status === 404 && item.method === 'DELETE') {
                        console.warn(`Dropping 404 DELETE item: ${item.endpoint}`);
                        continue; // Don't add to remainingQueue
                    }
                    // Special Handling for 409 (Conflict/Duplicate)
                    if (res.status === 409) {
                        console.warn(`Dropping 409 Conflict item: ${item.endpoint}`);
                        continue;
                    }

                    throw new Error(`Server error: ${res.status}`);
                }
            } catch (e) {
                console.error(`Failed to sync item: ${item.endpoint}`, e);
                remainingQueue.push(item);
            }
        }

        try {
            localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remainingQueue));
        } catch (e) {
            console.error("Failed to update queue storage after processing", e);
        }

        if (remainingQueue.length === 0) {
            console.log("Offline queue completely synced!");
        }
        return remainingQueue.length;
    },

    clearQueue: () => {
        localStorage.removeItem(OFFLINE_QUEUE_KEY);
    },

    getQueueLength: () => {
        try {
            return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]').length;
        } catch (e) { return 0; }
    },

    // Helper to change URL (called from Settings)
    setServerUrl: (url: string) => {
        try {
            let cleanUrl = url.replace(/\/$/, ""); // Remove trailing slash
            if (!cleanUrl.endsWith('/api')) cleanUrl += '/api';
            localStorage.setItem('SIRILA_SERVER_URL', cleanUrl);
            window.location.reload();
        } catch (e) {
            alert("No se pudo guardar la URL del servidor. Memoria del navegador llena.");
        }
    },

    // Check if DB is empty / Alive Check
    checkStatus: async () => {
        const res = await fetch(`${API_URL}/full-state?_t=${Date.now()}`);
        if (!res.ok) throw new Error('Network error');
        return await res.json();
    },

    // Perform full migration/sync
    syncAll: async (data: {
        students: Student[],
        assignments: Assignment[],
        events: SchoolEvent[],
        behaviorLogs: BehaviorLog[],
        financeEvents: FinanceEvent[],
        schoolConfig: SchoolConfig,
        books: Book[]
    }) => {
        try {
            const res = await fetch(`${API_URL}/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) {
                const text = await res.text();
                try {
                    const json = JSON.parse(text);
                    throw new Error(json.error || `Server error: ${res.status}`);
                } catch (e) {
                    throw new Error(`Server error (${res.status}): ${text.slice(0, 100)}`);
                }
            }
            return await res.json();
        } catch (error: any) {
            console.error("Sync API Error:", error);
            return { success: false, error: error.message };
        }
    },

    // --- Granular CRUD with Offline Support ---
    saveStudent: async (student: Student) => {
        try {
            const res = await fetch(`${API_URL}/students`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(student)
            });
            if (!res.ok) throw new Error('Server unreachable');
        } catch (e) {
            addToQueue(`/students`, 'POST', student);
        }
    },

    getAssignments: async () => {
        const res = await fetch(`${API_URL}/assignments`);
        if (!res.ok) throw new Error('Failed to fetch assignments');
        return await res.json();
    },

    deleteStudent: async (id: string) => {
        try {
            const res = await fetch(`${API_URL}/students/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Server unreachable');
        } catch (e) {
            addToQueue(`/students/${id}`, 'DELETE', null);
        }
    },

    saveAssignment: async (assignment: Assignment) => {
        try {
            await fetch(`${API_URL}/assignments`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(assignment)
            });
        } catch (e) {
            addToQueue(`/assignments`, 'POST', assignment);
        }
    },

    deleteAssignment: async (id: string) => {
        try {
            const res = await fetch(`${API_URL}/assignments/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error(`Status ${res.status}`);
        } catch (e) {
            addToQueue(`/assignments/${id}`, 'DELETE', null);
        }
    },

    saveEvent: async (event: SchoolEvent) => {
        try {
            await fetch(`${API_URL}/events`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(event)
            });
        } catch (e) {
            addToQueue(`/events`, 'POST', event);
        }
    },

    deleteEvent: async (id: string) => {
        try {
            await fetch(`${API_URL}/events/${id}`, { method: 'DELETE' });
        } catch (e) {
            addToQueue(`/events/${id}`, 'DELETE', null);
        }
    },

    saveBehaviorLog: async (log: BehaviorLog) => {
        try {
            await fetch(`${API_URL}/behavior`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(log)
            });
        } catch (e) {
            addToQueue(`/behavior`, 'POST', log);
        }
    },

    deleteBehaviorLog: async (id: string) => {
        try {
            await fetch(`${API_URL}/behavior/${id}`, { method: 'DELETE' });
        } catch (e) {
            addToQueue(`/behavior/${id}`, 'DELETE', null);
        }
    },

    getStudentBehaviorLogs: async (studentId: string) => {
        const res = await fetch(`${API_URL}/behavior/student/${studentId}`);
        if (!res.ok) throw new Error('Failed to fetch behavior logs');
        return await res.json();
    },

    saveFinanceEvent: async (event: FinanceEvent) => {
        try {
            await fetch(`${API_URL}/finance`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(event)
            });
        } catch (e) {
            addToQueue(`/finance`, 'POST', event);
        }
    },

    deleteFinanceEvent: async (id: string) => {
        try {
            await fetch(`${API_URL}/finance/${id}`, { method: 'DELETE' });
        } catch (e) {
            addToQueue(`/finance/${id}`, 'DELETE', null);
        }
    },

    saveConfig: async (config: SchoolConfig) => {
        try {
            await fetch(`${API_URL}/config`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config)
            });
        } catch (e) {
            addToQueue(`/config`, 'POST', config);
        }
    },

    // --- PARENT PORTAL ---
    parentLogin: async (loginId: string) => {
        const res = await fetch(`${API_URL}/parent/login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ loginId })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Login failed');
        }
        return await res.json();
    },

    getEvents: async () => {
        const res = await fetch(`${API_URL}/events`);
        if (!res.ok) throw new Error('Failed to fetch events');
        return await res.json();
    },

    getNotifications: async (studentId?: string) => {
        const query = studentId ? `?studentId=${studentId}` : '';
        const res = await fetch(`${API_URL}/notifications${query}`);
        if (!res.ok) throw new Error('Failed to fetch notifications');
        return await res.json();
    },

    saveNotification: async (notification: any) => {
        try {
            await fetch(`${API_URL}/notifications`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(notification)
            });
        } catch (e) {
            addToQueue(`/notifications`, 'POST', notification);
        }
    },

    markNotificationRead: async (id: string) => {
        try {
            await fetch(`${API_URL}/notifications/${id}/read`, { method: 'PUT' });
        } catch (e) {
            addToQueue(`/notifications/${id}/read`, 'PUT', null);
        }
    },

    deleteNotification: async (id: string) => {
        try {
            await fetch(`${API_URL}/notifications/${id}`, { method: 'DELETE' });
        } catch (e) {
            addToQueue(`/notifications/${id}`, 'DELETE', null);
        }
    },

    // --- STAFF TASKS ---
    saveStaffTask: async (task: StaffTask) => {
        try {
            await fetch(`${API_URL}/staff-tasks`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(task)
            });
        } catch (e) {
            addToQueue(`/staff-tasks`, 'POST', task);
        }
    },

    deleteStaffTask: async (id: string) => {
        try {
            await fetch(`${API_URL}/staff-tasks/${id}`, { method: 'DELETE' });
        } catch (e) {
            addToQueue(`/staff-tasks/${id}`, 'DELETE', null);
        }
    },

    getParentMessages: async (studentId: string) => {
        const res = await fetch(`${API_URL}/parent/messages?studentId=${studentId}`);
        return await res.json();
    },

    sendParentMessage: async (studentId: string, message: string, sender: 'PARENT' | 'TEACHER' | 'DIRECTOR') => {
        try {
            await fetch(`${API_URL}/parent/messages`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentId, message, sender })
            });
        } catch (e) {
            addToQueue(`/parent/messages`, 'POST', { studentId, message, sender });
        }
    },

    getAllMessages: async () => {
        const res = await fetch(`${API_URL}/parent/all-messages`);
        return await res.json();
    },

    markParentMessagesRead: async (studentId: string) => {
        try {
            await fetch(`${API_URL}/parent/messages/read`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentId })
            });
        } catch (e) {
            addToQueue(`/parent/messages/read`, 'PUT', { studentId });
        }
    },

    deleteThread: async (studentId: string) => {
        try {
            await fetch(`${API_URL}/parent/messages/${studentId}`, { method: 'DELETE' });
        } catch (e) {
            addToQueue(`/parent/messages/${studentId}`, 'DELETE', null);
        }
    },

    saveBook: async (book: Book) => {
        try {
            const res = await fetch(`${API_URL}/books`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(book)
            });
            if (!res.ok) throw new Error('Server unreachable');
        } catch (e) {
            addToQueue(`/books`, 'POST', book);
        }
    },

    deleteBook: async (id: string) => {
        try {
            const res = await fetch(`${API_URL}/books/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Server unreachable');
        } catch (e) {
            addToQueue(`/books/${id}`, 'DELETE', null);
        }
    },

    getAvatars: async () => {
        const res = await fetch(`${API_URL}/students/avatars`);
        if (!res.ok) throw new Error('Failed to fetch avatars');
        return await res.json();
    },

    getAssignmentById: async (id: string) => {
        const res = await fetch(`${API_URL}/assignments/${id}`);
        if (!res.ok) throw new Error('Failed to fetch assignment details');
        return await res.json();
    }
};
