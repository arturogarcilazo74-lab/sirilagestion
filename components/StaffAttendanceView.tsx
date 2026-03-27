import React, { useState, useRef } from 'react';
import {
    Users, Printer, Plus, Trash2, Edit2, Check, X,
    FileText, Download, ChevronDown, ChevronUp, Building2
} from 'lucide-react';
import { SchoolConfig, StaffMember, StaffAttendanceRecord } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface StaffAttendanceViewProps {
    schoolConfig: SchoolConfig;
    records: StaffAttendanceRecord[];
    onSaveRecord: (record: StaffAttendanceRecord) => void;
    onDeleteRecord: (id: string) => void;
}

export const StaffAttendanceView: React.FC<StaffAttendanceViewProps> = ({
    schoolConfig,
    records,
    onSaveRecord,
    onDeleteRecord
}) => {
    const staff: StaffMember[] = schoolConfig.staff || [];
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingRecord, setEditingRecord] = useState<StaffAttendanceRecord | null>(null);
    const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);
    const printRef = useRef<HTMLDivElement>(null);

    const [newTitle, setNewTitle] = useState('');
    const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
    const [newAttendees, setNewAttendees] = useState<Record<string, 'PRESENTE' | 'AUSENTE' | 'RETARDO' | 'JUSTIFICADO' | ''>>({});
    const [newNotes, setNewNotes] = useState('');

    const resetForm = () => {
        setNewTitle('');
        setNewDate(new Date().toISOString().split('T')[0]);
        setNewAttendees({});
        setNewNotes('');
        setShowCreateForm(false);
        setEditingRecord(null);
    };

    const startEdit = (record: StaffAttendanceRecord) => {
        setEditingRecord(record);
        setNewTitle(record.title);
        setNewDate(record.date);
        setNewAttendees(record.attendees as any);
        setNewNotes(record.notes || '');
        setShowCreateForm(true);
    };

    const handleSave = () => {
        if (!newTitle.trim()) {
            alert('El título es obligatorio');
            return;
        }

        const filteredAttendees: Record<string, 'PRESENTE' | 'AUSENTE' | 'RETARDO' | 'JUSTIFICADO'> = {};
        Object.entries(newAttendees).forEach(([key, val]) => {
            if (val) filteredAttendees[key] = val as any;
        });

        const record: StaffAttendanceRecord = {
            id: editingRecord?.id || Date.now().toString(),
            title: newTitle.trim(),
            date: newDate,
            attendees: filteredAttendees,
            notes: newNotes.trim() || undefined,
            createdAt: editingRecord?.createdAt || new Date().toISOString()
        };

        onSaveRecord(record);
        resetForm();
    };

    const toggleAttendeeStatus = (staffId: string) => {
        const current = newAttendees[staffId] || '';
        const cycle: Record<string, 'PRESENTE' | 'AUSENTE' | 'RETARDO' | 'JUSTIFICADO' | ''> = {
            '': 'PRESENTE',
            'PRESENTE': 'AUSENTE',
            'AUSENTE': 'RETARDO',
            'RETARDO': 'JUSTIFICADO',
            'JUSTIFICADO': ''
        };
        setNewAttendees(prev => ({ ...prev, [staffId]: cycle[current] }));
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PRESENTE': return 'bg-emerald-100 text-emerald-700 border-emerald-300';
            case 'AUSENTE': return 'bg-red-100 text-red-700 border-red-300';
            case 'RETARDO': return 'bg-amber-100 text-amber-700 border-amber-300';
            case 'JUSTIFICADO': return 'bg-blue-100 text-blue-700 border-blue-300';
            default: return 'bg-slate-100 text-slate-500 border-slate-300';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'PRESENTE': return '✓';
            case 'AUSENTE': return '✗';
            case 'RETARDO': return '⏱';
            case 'JUSTIFICADO': return 'J';
            default: return '—';
        }
    };

    const generatePDF = (record: StaffAttendanceRecord) => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;

        if (schoolConfig.schoolLogo && schoolConfig.schoolLogo.startsWith('data:')) {
            try {
                const fmt = schoolConfig.schoolLogo.includes('image/png') ? 'PNG' : 'JPEG';
                doc.addImage(schoolConfig.schoolLogo, fmt, 20, 12, 22, 22);
            } catch (e) { }
        }

        doc.setFontSize(12);
        doc.setTextColor(79, 70, 229);
        doc.setFont('helvetica', 'bold');
        doc.text(schoolConfig.schoolName.toUpperCase(), pageWidth / 2, 18, { align: 'center' });

        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'normal');
        doc.text(`CCT: ${schoolConfig.cct} | Zona: ${schoolConfig.zone} | Sector: ${schoolConfig.sector}`, pageWidth / 2, 23, { align: 'center' });
        doc.text(schoolConfig.location || '', pageWidth / 2, 27, { align: 'center' });

        doc.setDrawColor(79, 70, 229);
        doc.setLineWidth(0.5);
        doc.line(20, 30, pageWidth - 20, 30);

        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.text(record.title, pageWidth / 2, 40, { align: 'center' });

        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'normal');
        doc.text(`Fecha: ${new Date(record.date + 'T00:00:00').toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, pageWidth / 2, 46, { align: 'center' });

        const sortedStaff = [...staff].sort((a, b) => {
            const roleOrder: Record<string, number> = { 'PRINCIPAL': 0, 'Director': 1, 'Docente': 2 };
            return (roleOrder[a.role] ?? 5) - (roleOrder[b.role] ?? 5);
        });

        const tableData = sortedStaff.map((s, idx) => {
            const status = record.attendees[s.id] || '';
            return [
                (idx + 1).toString(),
                s.name,
                s.role,
                s.group || '—',
                status || 'SIN REGISTRO',
                ''
            ];
        });

        autoTable(doc, {
            startY: 52,
            head: [['#', 'Nombre del Personal', 'Cargo', 'Grupo/Área', 'Asistencia', 'Firma']],
            body: tableData,
            theme: 'grid',
            headStyles: {
                fillColor: [79, 70, 229],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 9
            },
            bodyStyles: {
                fontSize: 9,
                cellPadding: 4
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 10 },
                1: { cellWidth: 55 },
                2: { cellWidth: 25 },
                3: { cellWidth: 30 },
                4: { halign: 'center', cellWidth: 28 },
                5: { cellWidth: 35 }
            },
            didParseCell: (data: any) => {
                if (data.section === 'body' && data.column.index === 4) {
                    const val = data.cell.raw;
                    if (val === 'PRESENTE') {
                        data.cell.styles.textColor = [16, 185, 129];
                        data.cell.styles.fontStyle = 'bold';
                    } else if (val === 'AUSENTE') {
                        data.cell.styles.textColor = [239, 68, 68];
                        data.cell.styles.fontStyle = 'bold';
                    } else if (val === 'RETARDO') {
                        data.cell.styles.textColor = [245, 158, 11];
                        data.cell.styles.fontStyle = 'bold';
                    } else if (val === 'JUSTIFICADO') {
                        data.cell.styles.textColor = [59, 130, 246];
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            }
        });

        const finalY = (doc as any).lastAutoTable.finalY + 10;
        const presentCount = Object.values(record.attendees).filter(v => v === 'PRESENTE').length;
        const absentCount = Object.values(record.attendees).filter(v => v === 'AUSENTE').length;
        const lateCount = Object.values(record.attendees).filter(v => v === 'RETARDO').length;
        const excusedCount = Object.values(record.attendees).filter(v => v === 'JUSTIFICADO').length;

        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.text('Resumen:', 20, finalY);
        doc.setFont('helvetica', 'normal');
        doc.text(`Presentes: ${presentCount} | Ausentes: ${absentCount} | Retardos: ${lateCount} | Justificados: ${excusedCount}`, 20, finalY + 5);

        if (record.notes) {
            doc.setFont('helvetica', 'bold');
            doc.text('Observaciones:', 20, finalY + 14);
            doc.setFont('helvetica', 'normal');
            const lines = doc.splitTextToSize(record.notes, pageWidth - 40);
            doc.text(lines, 20, finalY + 19);
        }

        const sigY = Math.max(finalY + 40, 240);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 41, 59);

        doc.line(30, sigY, 80, sigY);
        doc.text('Elaboró', 55, sigY + 5, { align: 'center' });

        doc.line(pageWidth - 80, sigY, pageWidth - 30, sigY);
        doc.text('Vo. Bo. Director(a)', pageWidth - 55, sigY + 5, { align: 'center' });

        doc.save(`${record.title.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s]/g, '').replace(/\s+/g, '_')}.pdf`);
    };

    const getStats = (record: StaffAttendanceRecord) => {
        const total = staff.length;
        const present = Object.values(record.attendees).filter(v => v === 'PRESENTE').length;
        const absent = Object.values(record.attendees).filter(v => v === 'AUSENTE').length;
        const late = Object.values(record.attendees).filter(v => v === 'RETARDO').length;
        const excused = Object.values(record.attendees).filter(v => v === 'JUSTIFICADO').length;
        return { total, present, absent, late, excused };
    };

    return (
        <div className="animate-fadeIn space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Listas de Asistencia del Personal</h2>
                    <p className="text-sm text-slate-500">Genera listas de asistencia para reuniones, CTE y eventos</p>
                </div>
                <button
                    onClick={() => setShowCreateForm(true)}
                    className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                >
                    <Plus size={18} />
                    Nueva Lista
                </button>
            </div>

            {showCreateForm && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="bg-indigo-600 p-5 text-white flex justify-between items-center">
                            <h3 className="text-lg font-bold">
                                {editingRecord ? 'Editar Lista de Asistencia' : 'Nueva Lista de Asistencia'}
                            </h3>
                            <button onClick={resetForm} className="text-white/80 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Título de la Lista</label>
                                    <input
                                        type="text"
                                        value={newTitle}
                                        onChange={e => setNewTitle(e.target.value)}
                                        placeholder="Ej: Consejo Técnico Escolar - 1ra Sesión"
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Fecha</label>
                                    <input
                                        type="date"
                                        value={newDate}
                                        onChange={e => setNewDate(e.target.value)}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Personal (clic para cambiar estado)</label>
                                {staff.length === 0 ? (
                                    <p className="text-sm text-slate-400 italic">No hay personal registrado. Agregue personal en "Directorio Personal".</p>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {staff.map(s => {
                                            const status = newAttendees[s.id] || '';
                                            return (
                                                <button
                                                    key={s.id}
                                                    onClick={() => toggleAttendeeStatus(s.id)}
                                                    className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all text-left ${getStatusColor(status)}`}
                                                >
                                                    <div>
                                                        <span className="font-bold text-sm">{s.name}</span>
                                                        <span className="text-xs ml-2 opacity-70">{s.role} - {s.group}</span>
                                                    </div>
                                                    <span className="text-lg font-bold w-8 text-center">
                                                        {getStatusLabel(status)}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Observaciones</label>
                                <textarea
                                    value={newNotes}
                                    onChange={e => setNewNotes(e.target.value)}
                                    rows={2}
                                    placeholder="Notas adicionales..."
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-200 flex justify-end gap-3 bg-slate-50">
                            <button onClick={resetForm} className="px-5 py-2 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors">
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2"
                            >
                                <Check size={16} />
                                {editingRecord ? 'Guardar Cambios' : 'Crear Lista'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {records.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
                    <FileText size={48} className="mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-bold text-slate-600">No hay listas de asistencia</h3>
                    <p className="text-sm text-slate-400 mt-1">Crea tu primera lista para reuniones o sesiones CTE</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(record => {
                        const stats = getStats(record);
                        const isExpanded = expandedRecordId === record.id;

                        return (
                            <div key={record.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                <div
                                    className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors"
                                    onClick={() => setExpandedRecordId(isExpanded ? null : record.id)}
                                >
                                    <div className="flex-1">
                                        <h3 className="font-bold text-slate-800">{record.title}</h3>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {new Date(record.date + 'T00:00:00').toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-3 flex-wrap">
                                        <div className="flex gap-2 text-xs">
                                            <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-bold">{stats.present} P</span>
                                            <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 font-bold">{stats.absent} A</span>
                                            <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-bold">{stats.late} R</span>
                                            <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-bold">{stats.excused} J</span>
                                        </div>

                                        <button
                                            onClick={e => { e.stopPropagation(); generatePDF(record); }}
                                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                            title="Descargar PDF"
                                        >
                                            <Download size={18} />
                                        </button>
                                        <button
                                            onClick={e => { e.stopPropagation(); startEdit(record); }}
                                            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                                            title="Editar"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={e => {
                                                e.stopPropagation();
                                                if (confirm('¿Eliminar esta lista?')) onDeleteRecord(record.id);
                                            }}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Eliminar"
                                        >
                                            <Trash2 size={18} />
                                        </button>

                                        {isExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="border-t border-slate-100 p-5 bg-slate-50/50 animate-fadeIn">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                            {staff.map(s => {
                                                const status = record.attendees[s.id];
                                                return (
                                                    <div key={s.id} className={`flex items-center justify-between p-3 rounded-lg border ${status ? getStatusColor(status) : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                                                        <div>
                                                            <span className="font-semibold text-sm">{s.name}</span>
                                                            <span className="text-xs ml-2 opacity-70">{s.role}</span>
                                                        </div>
                                                        <span className="font-bold text-sm">{status || '—'}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        {record.notes && (
                                            <div className="mt-4 p-3 bg-white rounded-lg border border-slate-200">
                                                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Observaciones</p>
                                                <p className="text-sm text-slate-700">{record.notes}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
