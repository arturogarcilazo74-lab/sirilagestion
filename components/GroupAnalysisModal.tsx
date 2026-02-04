import React from 'react';
import { Student } from '../types';
import { X, AlertTriangle, FileText, User, HelpingHand, ListChecks } from 'lucide-react';

interface GroupAnalysisModalProps {
    students: Student[];
    onClose: () => void;
    onViewReport: (student: Student) => void;
    groupName: string;
    teacherName?: string;
}

const GroupAnalysisModal: React.FC<GroupAnalysisModalProps> = ({
    students,
    onClose,
    onViewReport,
    groupName,
    teacherName
}) => {
    // Logic to separate students
    const riskStudents = students.filter(s => s.behaviorPoints < 0);

    const needStudents = students.filter(s => s.usaer || (s.bap && s.bap !== 'NINGUNA'));

    // Logic for Academic Alert (Low Attendance or Low Homework)
    const academicRiskStudents = students.filter(s => {
        const absences = Object.values(s.attendance || {}).filter(status => status === 'Ausente').length;

        // Low Homework: Less than 60% completion if there are assignments
        const homeworkRate = s.totalAssignments > 0
            ? (s.assignmentsCompleted / s.totalAssignments)
            : 1; // Default to 1 (100%) if no assignments exists to avoid flagging new students

        return absences > 5 || homeworkRate < 0.6;
    });

    const cleanStudents = students.filter(s => {
        const isRisk = riskStudents.includes(s);
        const isAcademicRisk = academicRiskStudents.includes(s);
        return !isRisk && !isAcademicRisk;
    });

    const sortedCleanStudents = [...cleanStudents].sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-slideUp">

                {/* Header */}
                <div className="bg-white px-8 py-6 border-b border-slate-100 flex justify-between items-center sticky top-0 z-10">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-2xl font-extrabold text-slate-800 uppercase tracking-tight">ANÁLISIS: {groupName}</h3>
                            {teacherName && (
                                <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-xs font-bold border border-indigo-100">
                                    {teacherName}
                                </span>
                            )}
                        </div>
                        <p className="text-slate-500 text-sm font-medium">Resumen detallado del rendimiento y alertas del grupo.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/50 space-y-8">

                    {/* Main Grid: Risks & Needs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                        {/* 1. Risk Alerts (Behavior) */}
                        <div className="bg-white rounded-2xl p-5 border border-red-100 shadow-sm relative overflow-hidden flex flex-col h-64 md:h-80">
                            <div className="absolute top-0 left-0 w-1 h-full bg-red-400"></div>
                            <h4 className="flex items-center gap-2 font-bold text-red-700 mb-4 text-sm uppercase tracking-wide">
                                <AlertTriangle size={18} className="fill-red-100" /> Alerta de Conducta ({riskStudents.length})
                            </h4>

                            <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar p-1">
                                {riskStudents.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                        <span className="text-3xl mb-2 opacity-50">😊</span>
                                        <p className="italic text-xs text-center">Sin alertas de conducta.</p>
                                    </div>
                                ) : (
                                    riskStudents.map(student => (
                                        <div key={student.id} className="flex items-center justify-between p-2 bg-red-50/50 rounded-lg border border-red-50 hover:bg-red-50 transition-colors group">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <img src={student.avatar} className="w-8 h-8 rounded-full object-cover border border-red-100 flex-shrink-0" alt={student.name} />
                                                <div className="min-w-0">
                                                    <p className="font-bold text-slate-800 text-xs truncate w-full">{student.name}</p>
                                                    <span className="inline-block bg-red-100 text-red-600 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-red-200 mt-0.5">
                                                        {student.behaviorPoints} ptos
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => onViewReport(student)}
                                                className="opacity-0 group-hover:opacity-100 flex-shrink-0 px-2 py-1 bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 rounded text-[10px] font-bold transition-all shadow-sm"
                                            >
                                                Ver Expediente
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* 2. Academic Alerts (Attendance & Homework) */}
                        <div className="bg-white rounded-2xl p-5 border border-orange-100 shadow-sm relative overflow-hidden flex flex-col h-64 md:h-80">
                            <div className="absolute top-0 left-0 w-1 h-full bg-orange-400"></div>
                            <h4 className="flex items-center gap-2 font-bold text-orange-700 mb-4 text-sm uppercase tracking-wide">
                                <AlertTriangle size={18} className="fill-orange-100" /> Rezago Académico ({academicRiskStudents.length})
                            </h4>

                            <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar p-1">
                                {academicRiskStudents.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                        <span className="text-3xl mb-2 opacity-50">⭐</span>
                                        <p className="italic text-xs text-center">Excelente desempeño general.</p>
                                    </div>
                                ) : (
                                    academicRiskStudents.map(student => {
                                        const absences = Object.values(student.attendance || {}).filter(status => status === 'Ausente').length;
                                        const hwRate = student.totalAssignments > 0
                                            ? Math.round((student.assignmentsCompleted / student.totalAssignments) * 100)
                                            : 100;

                                        return (
                                            <div key={student.id} className="flex items-center justify-between p-2 bg-orange-50/50 rounded-lg border border-orange-50 hover:bg-orange-50 transition-colors group">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <div className="w-8 h-8 rounded-full bg-orange-100 flex-shrink-0 flex items-center justify-center text-orange-600 font-bold text-[10px] border border-orange-200">
                                                        {student.name.substring(0, 1)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-slate-800 text-xs truncate">{student.name}</p>
                                                        <div className="flex gap-1 flex-wrap mt-0.5">
                                                            {absences > 5 && (
                                                                <span className="bg-red-100 text-red-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-red-200">
                                                                    {absences} Faltas
                                                                </span>
                                                            )}
                                                            {hwRate < 60 && (
                                                                <span className="bg-yellow-100 text-yellow-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-yellow-200">
                                                                    {hwRate}% Tareas
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => onViewReport(student)}
                                                    className="opacity-0 group-hover:opacity-100 flex-shrink-0 px-2 py-1 bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 rounded text-[10px] font-bold transition-all shadow-sm"
                                                >
                                                    Ver Expediente
                                                </button>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>

                        {/* 3. Needs (BAP/USAER) */}
                        <div className="bg-white rounded-2xl p-5 border border-blue-100 shadow-sm relative overflow-hidden flex flex-col h-64 md:h-80">
                            <div className="absolute top-0 left-0 w-1 h-full bg-blue-400"></div>
                            <h4 className="flex items-center gap-2 font-bold text-blue-700 mb-4 text-sm uppercase tracking-wide">
                                <HelpingHand size={18} className="fill-blue-100" /> BAP / USAER ({needStudents.length})
                            </h4>

                            <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar p-1">
                                {needStudents.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                        <span className="text-3xl mb-2 opacity-50">📝</span>
                                        <p className="italic text-xs text-center">Sin alumnos BAP/USAER.</p>
                                    </div>
                                ) : (
                                    needStudents.map(student => (
                                        <div key={student.id} className="flex items-center justify-between p-2 bg-blue-50/50 rounded-lg border border-blue-50 hover:bg-blue-50 transition-colors group">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 flex-shrink-0 flex items-center justify-center text-blue-600 font-bold text-[10px] ring-2 ring-white shadow-sm">
                                                    {student.name.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-slate-800 text-xs truncate">{student.name}</p>
                                                    <div className="flex gap-1 mt-0.5">
                                                        {student.usaer && <span className="bg-purple-100 text-purple-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-purple-200">USAER</span>}
                                                        {student.bap !== 'NINGUNA' && <span className="bg-slate-100 text-slate-600 text-[9px] font-bold px-1.5 py-0.5 rounded border border-slate-200 uppercase truncate max-w-[80px]">{student.bap}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => onViewReport(student)}
                                                className="opacity-0 group-hover:opacity-100 flex-shrink-0 px-2 py-1 bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 rounded text-[10px] font-bold transition-all shadow-sm"
                                            >
                                                Ver Expediente
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                    </div>

                    {/* 4. No Alerts List (Green) */}
                    <div className="bg-white rounded-2xl p-6 border border-emerald-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-400"></div>
                        <h4 className="flex items-center gap-2 font-bold text-emerald-700 mb-4 text-base border-b border-emerald-50 pb-2">
                            <ListChecks size={20} className="text-emerald-500" /> Alumnos Sin Alertas ({sortedCleanStudents.length})
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {sortedCleanStudents.map((student, idx) => (
                                <div key={student.id} className="group flex items-center justify-between p-2 rounded-lg hover:bg-emerald-50 border border-transparent hover:border-emerald-100 transition-all cursor-default">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <span className="text-xs font-bold text-emerald-300 w-5">{idx + 1}.</span>
                                        <p className="text-sm font-medium text-slate-600 truncate group-hover:text-emerald-900 transition-colors">
                                            {student.name}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => onViewReport(student)}
                                        className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-1 bg-white border border-emerald-200 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded text-[10px] font-bold transition-all shadow-sm"
                                        title="Ver Expediente Completo"
                                    >
                                        <FileText size={12} />
                                        Ver Expediente
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export { GroupAnalysisModal };
