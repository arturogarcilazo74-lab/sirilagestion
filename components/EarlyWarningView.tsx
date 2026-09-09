import React from 'react';
import { AlertCircle, Sparkles } from 'lucide-react';
import { Student, Assignment } from '../types';

interface EarlyWarningProps {
  students: Student[];
  assignments: Assignment[];
  store: any;
}

export const EarlyWarningView: React.FC<EarlyWarningProps> = ({ students, assignments, store }) => {
  const atRiskStudents = students.filter(s => {
    const totalAssignments = assignments.length;
    const uniqueCompletedIds = [...new Set(s.completedAssignmentIds || [])];
    const relevantCompletedIds = uniqueCompletedIds.filter(id => assignments.some(a => a.id === id));
    const completedCount = Math.min(totalAssignments, relevantCompletedIds.length);
    const assignmentRate = totalAssignments > 0 ? (completedCount / totalAssignments) : 1;
    const attendanceRate = Object.values(s.attendance || {}).length > 0
      ? Object.values(s.attendance || {}).filter(st => st === 'Presente').length / Object.values(s.attendance || {}).length
      : 1;

    return assignmentRate < 0.5 || s.behaviorPoints < 0 || attendanceRate < 0.8;
  });

  if (atRiskStudents.length === 0) {
    return (
      <div className="p-8 h-full overflow-y-auto custom-scrollbar animate-fadeIn">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <AlertCircle className="text-emerald-500" /> Alertas Tempranas
        </h2>
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-6 rounded-2xl flex flex-col items-center justify-center text-center">
            <AlertCircle size={48} className="text-emerald-500 mb-4 opacity-50" />
            <h3 className="font-bold text-xl mb-2">¡Todo en orden!</h3>
            <p>No se han detectado estudiantes con riesgo académico o conductual en este momento.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 h-full overflow-y-auto custom-scrollbar animate-fadeIn">
      <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <AlertCircle className="text-red-500" /> Alertas Tempranas
      </h2>

      <div className="bg-red-50 border border-red-100 rounded-2xl p-6 animate-fadeIn">
        <h3 className="flex items-center gap-2 font-bold text-red-700 text-lg mb-4">
          <AlertCircle size={24} />
          Alerta Temprana de Riesgo Detectada ({atRiskStudents.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {atRiskStudents.map(s => {
            const totalAssignments = assignments.length;
            const uniqueCompletedIds = [...new Set(s.completedAssignmentIds || [])];
            const relevantCompletedIds = uniqueCompletedIds.filter(id => assignments.some(a => a.id === id));
            const completedCount = Math.min(totalAssignments, relevantCompletedIds.length);
            const assignmentRate = totalAssignments > 0 ? (completedCount / totalAssignments) : 1;
            const attendanceRate = Object.values(s.attendance || {}).length > 0
               ? Object.values(s.attendance || {}).filter(st => st === 'Presente').length / Object.values(s.attendance || {}).length
               : 1;

            let reasons = [];
            if (assignmentRate < 0.5) reasons.push("Bajo cumplimiento");
            if (s.behaviorPoints < 0) reasons.push("Conducta");
            if (attendanceRate < 0.8) reasons.push("Inasistencias");

            return (
              <div key={s.id} className="bg-white p-4 rounded-xl shadow-sm border border-red-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-sm text-slate-700 leading-tight pr-2">{s.name}</span>
                    <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full shrink-0">RIESGO</span>
                  </div>
                  <ul className="text-xs text-red-500 mb-4 list-disc pl-4 space-y-1">
                    {reasons.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
                <button
                  onClick={() => {
                    store?.setAiContext({
                      type: 'STUDENT_RISK_PLAN',
                      data: { student: s, reasons, assignments }
                    });
                    store?.setAiChatOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
                >
                  <Sparkles size={14} /> Plan IA
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
