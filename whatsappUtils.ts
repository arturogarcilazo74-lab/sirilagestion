
/**
 * Utility to send messages via WhatsApp using wa.me links.
 * Primarily designed for the Mexican context (+52).
 */
export const sendWhatsAppMessage = (phone: string, message: string) => {
    if (!phone) {
        console.warn("No phone number provided for WhatsApp message.");
        return;
    }

    // Remove all non-numeric characters
    const cleanPhone = phone.replace(/\D/g, '');

    // Logic for Mexico (+52): If 10 digits, add 52.
    let finalPhone = cleanPhone;
    if (cleanPhone.length === 10) {
        finalPhone = `52${cleanPhone}`;
    } else if (cleanPhone.length === 12 && cleanPhone.startsWith('52')) {
        // Already has 52
    } else if (cleanPhone.length === 13 && cleanPhone.startsWith('+52')) {
        finalPhone = cleanPhone.substring(1);
    }

    const encodedMsg = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${finalPhone}?text=${encodedMsg}`;

    window.open(whatsappUrl, '_blank');
};

/**
 * Generates a template message for attendance.
 */
export const getAttendanceMessage = (studentName: string, status: string, date: string) => {
    const dateStr = new Date(date).toLocaleDateString('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });

    if (status === 'Ausente') {
        return `*AVISO DE ASISTENCIA*\n\nHola, le informamos que su hijo(a) *${studentName}* no asistió a clases hoy ${dateStr}. ¿Sucedió algún imprevisto? Saludos.`;
    } else if (status === 'Retardo') {
        return `*AVISO DE ASISTENCIA*\n\nHola, le informamos que su hijo(a) *${studentName}* llegó tarde a la escuela hoy ${dateStr}. Favor de ser puntual para no afectar su aprendizaje. Saludos.`;
    }

    return `*AVISO DE ASISTENCIA*\n\nHola, le informamos sobre la asistencia de *${studentName}* el día ${dateStr}: ${status}.`;
};

/**
 * Template for Events
 */
export const getEventMessage = (title: string, date: string, description?: string) => {
    return `*AVISO DE EVENTO ESCOLAR*\n\n📢 *${title}*\n📅 Fecha: ${date}\n\n${description || ''}\n\nFavor de estar atentos. Saludos.`;
};

/**
 * Template for Tasks/Assignments
 */
export const getTaskMessage = (title: string, dueDate: string, description?: string) => {
    return `*NUEVA TAREA / ACTIVIDAD*\n\n📝 *${title}*\n📅 Fecha de entrega: ${dueDate}\n\n${description || ''}\n\nPuedes ver más detalles en el Portal de Padres.`;
};

/**
 * Template for Chat Replies
 */
export const getChatReplyMessage = (senderRole: string, message: string) => {
    const role = senderRole === 'DIRECTOR' ? 'la Dirección' : 'su Maestro(a)';
    return `*MENSAJE DE ${role.toUpperCase()}*\n\n${message}\n\nPara responder, por favor use el Portal de Padres o este medio.`;
};

/**
 * Template for Director to Staff
 */
export const getStaffNoticeMessage = (title: string, message: string) => {
    return `*AVISO DE DIRECCIÓN (PERSONAL)*\n\n📌 *${title}*\n\n${message}`;
};
