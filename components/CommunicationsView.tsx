import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Student, Notification } from '../types';
import { Send, Users, AlertTriangle, Info, Calendar, History, Trash2, CheckCircle, Search, MessageCircle, User } from 'lucide-react';
import { sendWhatsAppMessage, getEventMessage, getChatReplyMessage, getStaffNoticeMessage } from '../whatsappUtils';

interface CommunicationsViewProps {
    students: Student[];
    directorMode?: boolean;
    staffList?: any[];
}

export const CommunicationsView: React.FC<CommunicationsViewProps> = ({ students, directorMode = false, staffList = [] }) => {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [type, setType] = useState<'INFO' | 'ALERT' | 'EVENT'>('INFO');
    const [targetStudentId, setTargetStudentId] = useState<string>(''); // Empty = All, or STAFF_ID
    const [isSending, setIsSending] = useState(false);
    const [history, setHistory] = useState<Notification[]>([]);

    // Inbox State
    const [viewMode, setViewMode] = useState<'NOTIFICATIONS' | 'INBOX' | 'STAFF_CHAT'>(directorMode ? 'NOTIFICATIONS' : 'INBOX');
    const [inboxMessages, setInboxMessages] = useState<any[]>([]);
    const [selectedThread, setSelectedThread] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');

    // Pre-calculate threads
    const allThreads = Array.isArray(inboxMessages) ? inboxMessages.reduce((acc: any, msg: any) => {
        if (!acc[msg.student_id]) acc[msg.student_id] = [];
        acc[msg.student_id].push(msg);
        return acc;
    }, {}) : {};

    // Filter threads based on context
    const parentThreads = Object.keys(allThreads)
        .filter(id => !id.startsWith('STAFF_'))
        .reduce((obj: any, key) => { obj[key] = allThreads[key]; return obj; }, {});

    const staffThreads = Object.keys(allThreads)
        .filter(id => id.startsWith('STAFF_'))
        .reduce((obj: any, key) => { obj[key] = allThreads[key]; return obj; }, {});

    const activeThreads = viewMode === 'STAFF_CHAT' ? staffThreads : parentThreads;

    useEffect(() => {
        loadHistory();
        // Load messages for everyone to enable staff chat
        loadAllMessages();

        const interval = setInterval(() => {
            loadAllMessages();
        }, 10000);

        return () => clearInterval(interval);
    }, [directorMode, students]); // Add students dependency

    const loadHistory = async () => {
        try {
            const notifs = await api.getNotifications();
            // Filter notifications: Only show those relevant to the visible students
            // (i.e. Global ones OR specific to one of my students)
            // But wait, "Global" notifications (studentId=null) might be from Director.
            // If I am a teacher, I should see Global notifications sent by Director? 
            // OR checks if *I* sent them?
            // The "History" is "Sent History". A teacher should only see what THEY sent? 
            // The API doesn't seem to store "SenderID". 
            // If the user complaint is about seeing OTHER teacher's communications:
            // We should filter where `studentId` is in `students` list.
            // If `studentId` is null (Global), it's harder. Maybe we assume Global is for Director only?
            // Or we check if the teacher is the creator. (Missing field).
            // For now, let's filter by Student ID matching `students`.
            const studentIds = students.map(s => s.id);
            const filtered = notifs.filter((n: Notification) => !n.studentId || studentIds.includes(n.studentId));
            setHistory(filtered);
        } catch (e) {
            console.error("Error loading history", e);
        }
    };

    const loadAllMessages = async () => {
        try {
            const allMsgs = await api.getAllMessages();
            if (Array.isArray(allMsgs)) {
                // Filter messages: Only show messages involving MY students
                const studentIds = students.map(s => s.id);
                // Also include STAFF messages if I am staff? 
                // The View passes `students` which are 4A students.
                // If I am 1B teacher, I have 1B students.
                // Messages from 4A parent (studentId = 4A_Student) should NOT appear.
                const filtered = allMsgs.filter(m => {
                    // Always show Staff Chat messages
                    if (m.student_id && m.student_id.startsWith('STAFF_')) return true;
                    // Show parent messages only if student is in my list
                    return studentIds.includes(m.student_id);
                });
                setInboxMessages(filtered);
            } else {
                setInboxMessages([]);
            }
        } catch (e) {
            console.error("Inbox load failed", e);
            setInboxMessages([]);
        }
    };

    const handleSend = async () => {
        // ... (Notification sending logic remains same) ...
        if (!title.trim() || !message.trim()) {
            alert("Por favor completa el título y el mensaje.");
            return;
        }

        setIsSending(true);
        try {
            const newNotif = {
                id: Date.now().toString(),
                studentId: targetStudentId || undefined,
                title,
                message,
                date: new Date().toISOString(),
                type
            };

            await api.saveNotification(newNotif);

            setTitle('');
            setMessage('');
            setTargetStudentId('');
            setType('INFO');

            alert('Notificación enviada con éxito');
            loadHistory();

            // AUTOMATIC WHATSAPP TRIGGER
            // If it's a specific student, send to them. If it's "All", we can only do traditional for now (wa.me doesn't support broadcast)
            if (targetStudentId) {
                const student = students.find(s => s.id === targetStudentId);
                if (student) {
                    let waMsg = '';
                    if (type === 'EVENT') {
                        waMsg = getEventMessage(title, new Date().toLocaleDateString(), message);
                    } else if (targetStudentId.startsWith('STAFF_')) {
                        waMsg = getStaffNoticeMessage(title, message);
                    } else {
                        waMsg = `*${title.toUpperCase()}*\n\n${message}`;
                    }
                    sendWhatsAppMessage(student.guardianPhone, waMsg);
                }
            }
        } catch (error) {
            console.error(error);
            alert('Error al enviar');
        } finally {
            setIsSending(false);
        }
    };

    // Unified reply handler
    const handleSendReply = async (customThreadId?: string) => {
        const threadId = customThreadId || selectedThread;
        if (!replyText.trim() || !threadId) return;

        // Determine sender role
        const senderRole = directorMode ? 'DIRECTOR' : 'TEACHER'; // Or 'STAFF' if we had login

        try {
            // We reuse api.sendParentMessage but with the STAFF ID
            await api.sendParentMessage(threadId, replyText, senderRole);

            // AUTOMATIC WHATSAPP TRIGGER for Chat
            if (threadId.startsWith('STAFF_')) {
                // To Director/Staff
                const staffId = threadId.replace('STAFF_', '');
                const staff = staffList.find(s => s.id === staffId);
                if (staff?.phone) {
                    sendWhatsAppMessage(staff.phone, getStaffNoticeMessage("Respuesta de Chat", replyText));
                }
            } else {
                // To Parent
                const parent = students.find(s => s.id === threadId);
                if (parent?.guardianPhone) {
                    sendWhatsAppMessage(parent.guardianPhone, getChatReplyMessage(senderRole, replyText));
                }
            }

            setReplyText('');
            loadAllMessages();
        } catch (e) { console.error(e); }
    };

    const getTargetName = (id: string) => {
        if (id.startsWith('STAFF_')) {
            if (id === 'STAFF_MAIN') return "Docente Titular";
            if (id === 'STAFF_ALL') return "Sala de Maestros (Todos)";
            const staffId = id.replace('STAFF_', '');
            const staffMember = staffList.find(s => s.id === staffId);
            return staffMember ? `${staffMember.name} (${staffMember.role})` : "Personal";
        }
        return students.find(s => s.id === id)?.name || "Desconocido";
    };

    const startStaffChat = (staffId: string) => {
        const threadId = `STAFF_${staffId}`;
        setSelectedThread(threadId);
        setViewMode('STAFF_CHAT');
    };

    return (
        <div className="space-y-6 animate-fadeIn pb-10 h-[calc(100vh-100px)] flex flex-col">
            <header className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Centro de Comunicaciones</h2>
                    <p className="text-slate-500 font-medium">{directorMode ? "Portal de Dirección" : "Gestión de Avisos y Mensajes"}</p>
                </div>
                <div className="flex bg-slate-200 p-1 rounded-xl overflow-x-auto max-w-full">
                    {!directorMode && (
                        <button onClick={() => setViewMode('INBOX')} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${viewMode === 'INBOX' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                            Buzón Padres
                        </button>
                    )}
                    <button onClick={() => setViewMode('NOTIFICATIONS')} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${viewMode === 'NOTIFICATIONS' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                        {directorMode ? 'Boletines Oficiales' : 'Enviar Avisos'}
                    </button>
                    <button onClick={() => setViewMode('STAFF_CHAT')} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${viewMode === 'STAFF_CHAT' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                        {directorMode ? 'Chat con Personal' : 'Chat Dirección'}
                    </button>
                </div>
            </header>

            {(viewMode === 'INBOX' || viewMode === 'STAFF_CHAT') ? (
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 h-full overflow-hidden">
                    {/* Thread List */}
                    <div className={`glass-card rounded-2xl overflow-hidden flex flex-col border border-slate-200 bg-white ${selectedThread ? 'hidden lg:flex' : 'flex'}`}>
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-700">{viewMode === 'STAFF_CHAT' ? 'Personal' : 'Conversaciones'}</h3>
                            {viewMode === 'STAFF_CHAT' && directorMode && (
                                // New Chat Button for Director
                                <div className="relative group">
                                    <button className="text-xs bg-indigo-100 text-indigo-600 px-2 py-1 rounded font-bold hover:bg-indigo-200">+ Nuevo</button>
                                    <div className="hidden group-hover:block absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 shadow-xl rounded-xl z-50 overflow-hidden">
                                        <button onClick={() => startStaffChat('MAIN')} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs font-bold text-slate-700 border-b border-slate-50">Docente Titular</button>
                                        {staffList.map(s => (
                                            <button key={s.id} onClick={() => startStaffChat(s.id)} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs text-slate-600 truncate">
                                                {s.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {viewMode === 'STAFF_CHAT' && !directorMode && (
                                <button onClick={() => startStaffChat('MAIN')} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-bold">Contactar</button>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {Object.keys(activeThreads).length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-sm">No hay conversaciones activas.</div>
                            ) : (
                                Object.keys(activeThreads).map(threadId => {
                                    const threadName = getTargetName(threadId);
                                    const threadMsgs = activeThreads[threadId];
                                    const lastMsg = threadMsgs[threadMsgs.length - 1];
                                    // Logic for unread badges could be added here

                                    return (
                                        <button
                                            key={threadId}
                                            onClick={() => setSelectedThread(threadId)}
                                            className={`w-full p-4 text-left border-b border-slate-50 hover:bg-slate-50 transition-colors ${selectedThread === threadId ? 'bg-indigo-50 border-indigo-100' : ''}`}
                                        >
                                            <div className="flex justify-between mb-1">
                                                <span className="font-bold text-slate-800 text-sm truncate max-w-[150px]">{threadName}</span>
                                                <span className="text-[10px] text-slate-400 whitespace-nowrap">{lastMsg && new Date(lastMsg.date).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-xs text-slate-500 truncate">{lastMsg?.message || '...'}</p>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div className={`lg:col-span-2 glass-card rounded-2xl overflow-hidden flex flex-col border border-slate-200 bg-white relative ${!selectedThread ? 'hidden lg:flex' : 'flex'}`}>
                        {selectedThread ? (
                            <>
                                <div className="p-4 border-b border-slate-100 bg-white flex items-center justify-between shadow-sm z-10">
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => setSelectedThread(null)} className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
                                        </button>
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                                            {viewMode === 'STAFF_CHAT' ? <User size={20} /> : <Users size={20} />}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-slate-800 leading-tight">
                                                {getTargetName(selectedThread)}
                                            </h3>
                                            <span className="text-xs text-slate-500 block">{viewMode === 'STAFF_CHAT' ? 'Comunicación Interna' : 'Chat con Padres'}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            if (confirm('¿Estás seguro de que quieres eliminar TODA la conversación? Esta acción no se puede deshacer.')) {
                                                try {
                                                    await api.deleteThread(selectedThread);
                                                    setSelectedThread(null);
                                                    loadAllMessages();
                                                } catch (e) {
                                                    console.error("Failed to delete thread", e);
                                                }
                                            }
                                        }}
                                        className="text-slate-400 hover:text-red-500 p-2 hover:bg-slate-50 rounded-lg transition-colors"
                                        title="Eliminar conversación completa"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50 custom-scrollbar">
                                    {(activeThreads[selectedThread] || []).map((msg: any) => (
                                        <div key={msg.id} className={`flex ${msg.sender === 'PARENT' ? 'justify-start' : 'justify-end'}`}>
                                            <div className={`max-w-[85%] sm:max-w-[70%] p-3 px-4 rounded-2xl text-sm shadow-sm ${msg.sender === 'PARENT'
                                                ? 'bg-white border border-slate-200 text-slate-700 rounded-bl-none'
                                                : msg.sender === 'DIRECTOR'
                                                    ? 'bg-indigo-600 text-white rounded-br-none'
                                                    : 'bg-indigo-500 text-white rounded-br-none'}`}>

                                                {/* Label sender for staff chat context to avoid confusion */}
                                                {(viewMode === 'STAFF_CHAT' && msg.sender !== 'PARENT') && (
                                                    <span className="block text-[9px] font-bold uppercase opacity-70 mb-1">{msg.sender === 'DIRECTOR' ? 'Dirección' : 'Docente'}</span>
                                                )}

                                                <p>{msg.message}</p>
                                                <span className={`block text-[10px] mt-1 text-right opacity-80`}>
                                                    {new Date(msg.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-4 bg-white border-t border-slate-100 flex gap-2">
                                    <input
                                        type="text"
                                        value={replyText}
                                        onChange={e => setReplyText(e.target.value)}
                                        onKeyPress={e => e.key === 'Enter' && handleSendReply()}
                                        placeholder="Escribe una respuesta..."
                                        className="flex-1 bg-slate-100 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                    />
                                    <button
                                        onClick={() => handleSendReply()}
                                        className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors shadow-lg shadow-indigo-200"
                                    >
                                        <Send size={20} />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-8 text-center">
                                <MessageCircle size={64} className="mb-4 opacity-20" />
                                <p className="text-lg font-medium text-slate-400">Selecciona una conversación</p>
                                <p className="text-sm">Elige un contacto de la lista para ver los mensajes.</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Compose Panel */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="glass-card p-6 rounded-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 relative z-10">
                                <Send size={20} className="text-indigo-600" />
                                Redactar Mensaje
                            </h3>

                            <div className="space-y-4 relative z-10">
                                {/* Target Selector */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Destinatario</label>
                                    <div className="relative">
                                        <select
                                            value={targetStudentId}
                                            onChange={(e) => setTargetStudentId(e.target.value)}
                                            className="w-full p-3 pl-10 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80 appearance-none"
                                        >
                                            <option value="">📢 Todos los Padres (Aviso General)</option>
                                            <optgroup label="Alumnos Específicos">
                                                {students.map(s => (
                                                    <option key={s.id} value={s.id}>{s.name}</option>
                                                ))}
                                            </optgroup>
                                        </select>
                                        <Users className="absolute left-3 top-3.5 text-slate-400" size={18} />
                                    </div>
                                </div>

                                {/* Type Selector */}
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        onClick={() => setType('INFO')}
                                        className={`p-2 rounded-lg border text-xs font-bold flex flex-col items-center gap-1 transition-all ${type === 'INFO' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-slate-200 text-slate-400 hover:bg-slate-50'}`}
                                    >
                                        <Info size={16} /> Info
                                    </button>
                                    <button
                                        onClick={() => setType('ALERT')}
                                        className={`p-2 rounded-lg border text-xs font-bold flex flex-col items-center gap-1 transition-all ${type === 'ALERT' ? 'bg-red-50 border-red-200 text-red-600' : 'border-slate-200 text-slate-400 hover:bg-slate-50'}`}
                                    >
                                        <AlertTriangle size={16} /> Urgente
                                    </button>
                                    <button
                                        onClick={() => setType('EVENT')}
                                        className={`p-2 rounded-lg border text-xs font-bold flex flex-col items-center gap-1 transition-all ${type === 'EVENT' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'border-slate-200 text-slate-400 hover:bg-slate-50'}`}
                                    >
                                        <Calendar size={16} /> Evento
                                    </button>
                                </div>

                                {/* Title */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Título</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Ej. Suspensión de clases, Recordatorio de cuota..."
                                        className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80"
                                    />
                                </div>

                                {/* Message */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mensaje</label>
                                    <textarea
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder="Escribe el contenido del aviso aquí..."
                                        className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80 h-32 resize-none"
                                    />
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={handleSend}
                                        disabled={isSending}
                                        className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
                                    >
                                        {isSending ? 'Enviando...' : <><Send size={18} /> Enviar</>}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!message.trim()) { alert("Escribe un mensaje primero."); return; }
                                            if (targetStudentId) {
                                                const student = students.find(s => s.id === targetStudentId);
                                                if (student) sendWhatsAppMessage(student.guardianPhone, `*${title}*\n\n${message}`);
                                            } else {
                                                alert("Para enviar por WhatsApp debe seleccionar un alumno específico o copiar el mensaje manualmente.");
                                            }
                                        }}
                                        className="p-3 bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-lg shadow-green-100 transition-all active:scale-95 flex items-center justify-center"
                                        title="Enviar por WhatsApp"
                                    >
                                        <MessageCircle size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* History Panel */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="glass-card p-6 rounded-2xl h-full flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <History size={20} className="text-slate-400" />
                                    Historial de Enviados
                                </h3>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar max-h-[600px]">
                                {history.length === 0 ? (
                                    <div className="text-center py-20 text-slate-400">
                                        <Send size={48} className="mx-auto mb-4 opacity-20" />
                                        <p>No hay notificaciones enviadas recientemente.</p>
                                    </div>
                                ) : (
                                    history.map(notif => (
                                        <div key={notif.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative group">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider
                                                    ${notif.type === 'ALERT' ? 'bg-red-100 text-red-600' :
                                                            notif.type === 'EVENT' ? 'bg-emerald-100 text-emerald-600' :
                                                                'bg-blue-100 text-blue-600'}`}>
                                                        {notif.type}
                                                    </span>
                                                    <span className="text-xs text-slate-400">• {new Date(notif.date).toLocaleDateString()} {new Date(notif.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {notif.studentId && (
                                                        <button
                                                            onClick={() => {
                                                                const student = students.find(s => s.id === notif.studentId);
                                                                if (student) sendWhatsAppMessage(student.guardianPhone, `*${notif.title}*\n\n${notif.message}`);
                                                            }}
                                                            className="text-slate-300 hover:text-green-500 transition-colors p-1"
                                                            title="Reenviar por WhatsApp"
                                                        >
                                                            <MessageCircle size={16} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            if (confirm('¿Eliminar esta notificación?')) {
                                                                try {
                                                                    await api.deleteNotification(notif.id);
                                                                    loadHistory();
                                                                } catch (e) {
                                                                    console.error(e);
                                                                }
                                                            }
                                                        }}
                                                        className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                                        title="Eliminar notificación"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>

                                            <h4 className="font-bold text-slate-800 mb-1">{notif.title}</h4>
                                            <p className="text-sm text-slate-600 mb-2 leading-relaxed">{notif.message}</p>

                                            <div className="pt-2 border-t border-slate-50 flex items-center gap-2">
                                                <Users size={14} className="text-slate-400" />
                                                <span className="text-xs font-bold text-slate-500">
                                                    Enviado a: <span className="text-indigo-600">{getTargetName(notif.studentId || '')}</span>
                                                </span>
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
