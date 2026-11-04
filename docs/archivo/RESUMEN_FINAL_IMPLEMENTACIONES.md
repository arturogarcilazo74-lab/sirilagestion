## ✅ IMPLEMENTACIONES COMPLETADAS

### 1. ✏️ Editar/Eliminar Tareas - ✅ LISTO
- Botones agregados en cada tarjeta
- Usa el modal existente para editar
- Confirmación antes de eliminar

---

## 🚀 PARA IMPLEMENTAR MANUALMENTE

### 2. 🚨 Sección de Incidencias de Conducta

**Buscar en DirectorView.tsx la línea ~1248 (Shortcut Grid)**
**Agregar ANTES de ese comentario:**

```tsx
{/* Behavior Incidents Section */}
<div className="col-span-full mt-8">
  <h3 className="text-lg font-bold text-slate-500 mb-4 uppercase tracking-wider flex items-center gap-2">
    <AlertTriangle size={18} />
    Incidencias de Conducta Recientes
  </h3>
  
  {(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentIncidents = behaviorLogs
      .filter((log: any) => {
        const logDate = new Date(log.date);
        return log.type === 'NEGATIVE' && logDate >= sevenDaysAgo;
      })
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
    
    if (recentIncidents.length === 0) {
      return (
        <div className="text-center py-12 bg-green-50 rounded-xl border-2 border-green-200">
          <CheckCircle2 size={48} className="mx-auto mb-4 text-green-500" />
          <p className="text-green-700 font-bold">Sin incidencias reportadas en los últimos 7 días</p>
          <p className="text-green-600 text-sm mt-2">¡Excelente comportamiento general!</p>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {recentIncidents.map((incident: any) => {
          const student = students.find((s: Student) => s.id === incident.studentId);
          const teacher = schoolConfig.staff?.find((s: any) => s.id === incident.reportedBy) || 
                         { name: schoolConfig.teacherName };
          
          return (
            <div
              key={incident.id}
              className="bg-white border-l-4 border-red-500 rounded-lg p-4 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertTriangle size={20} className="text-red-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">{student?.name || 'Alumno Desconocido'}</h4>
                    <p className="text-xs text-slate-500">
                      {student?.group || 'Sin grupo'} • {new Date(incident.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">
                  -{incident.points} pts
                </span>
              </div>
              
              <p className="text-sm text-slate-700 mb-3">{incident.description}</p>
              
              <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
                <span className="flex items-center gap-1">
                  <User size={12} />
                  Reportado por: {teacher.name}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  })()}
</div>
```

---

### 3. 📊 Análisis de Grupo (click en tarjetas)

**PASO A: Agregar estado (línea ~23, cerca de otros useState):**
```tsx
const [selectedGroupAnalysis, setSelectedGroupAnalysis] = useState<any>(null);
```

**PASO B: Hacer tarjetas clickeables (buscar línea ~1015 donde hace map de grupos):**

Cambiar:
```tsx
<div key={groupName} className="glass-card...">
```

Por:
```tsx
<div
  key={groupName}
  onClick={() => setSelectedGroupAnalysis({ groupName, stats, groupStudents: students.filter((s: Student) => s.group === groupName) })}
  className="glass-card p-6 rounded-2xl hover:shadow-xl transition-all cursor-pointer hover:-translate-y-1"
>
```

**PASO C: Agregar modal DESPUÉS del cierre de activeTab === 'DASHBOARD' (línea ~1250):**

```tsx
{/* Group Analysis Modal */}
{selectedGroupAnalysis && (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fadeIn">
    <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
      {/* Header */}
      <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white rounded-t-2xl flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Análisis de Grupo {selectedGroupAnalysis.groupName}</h2>
          <p className="text-indigo-100 text-sm">Diagnóstico y Alertas Tempranas</p>
        </div>
        <button
          onClick={() => setSelectedGroupAnalysis(null)}
          className="p-2 hover:bg-white/20 rounded-lg transition-colors"
        >
          <X size={24} />
        </button>
      </div>
      
      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Estadísticas */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
            <div className="text-3xl font-bold text-indigo-600">{selectedGroupAnalysis.stats.total}</div>
            <div className="text-xs uppercase text-slate-500 font-bold">Total Alumnos</div>
          </div>
          <div className="bg-green-50 p-4 rounded-xl border border-green-100">
            <div className="text-3xl font-bold text-green-600">
              {selectedGroupAnalysis.stats.total > 0 
                ? ((selectedGroupAnalysis.stats.goodPerformers / selectedGroupAnalysis.stats.total) * 100).toFixed(0) 
                : 0}%
            </div>
            <div className="text-xs uppercase text-slate-500 font-bold">Alto Rendimiento</div>
          </div>
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
            <div className="text-3xl font-bold text-amber-600">{selectedGroupAnalysis.stats.bap || 0}</div>
            <div className="text-xs uppercase text-slate-500 font-bold">Con BAP/USAER</div>
          </div>
        </div>
        
        {/* Alertas */}
        <div className="bg-red-50 border-l-4 border-red-500 rounded-r-xl p-6">
          <h3 className="font-bold text-red-800 mb-4 flex items-center gap-2">
            <AlertTriangle size={20} />
            🚨 Alertas Tempranas
          </h3>
          {(() => {
            const alerts: any[] = [];
            
            if (selectedGroupAnalysis.stats.avgGrade < 7) {
              alerts.push({
                type: 'RENDIMIENTO',
                message: `Promedio grupal bajo (${selectedGroupAnalysis.stats.avgGrade.toFixed(1)})`,
                severity: 'high'
              });
            }
            
            selectedGroupAnalysis.groupStudents.forEach((student: Student) => {
              if (student.behaviorPoints < -10) {
                alerts.push({
                  type: 'CONDUCTA',
                  message: `${student.name}: Conducta crítica (${student.behaviorPoints} pts)`,
                  severity: 'high'
                });
              }
              
              const completionRate = student.totalAssignments > 0 
                ? (student.assignmentsCompleted / student.totalAssignments) 
                : 1;
              if (completionRate < 0.5) {
                alerts.push({
                  type: 'TAREAS',
                  message: `${student.name}: Bajo cumplimiento (${(completionRate * 100).toFixed(0)}%)`,
                  severity: 'medium'
                });
              }
            });
            
            if (alerts.length === 0) {
              return <p className="text-green-700 font-medium">✓ No hay alertas críticas</p>;
            }
            
            return (
              <div className="space-y-2">
                {alerts.slice(0, 5).map((alert, idx) => (
                  <div key={idx} className={`p-3 rounded-lg ${
                    alert.severity === 'high' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    <span className="font-bold">[{alert.type}]</span> {alert.message}
                  </div>
                ))}
                {alerts.length > 5 && (
                  <p className="text-sm text-slate-500 italic">... y {alerts.length - 5} más</p>
                )}
              </div>
            );
          })()}
        </div>
        
        {/* Resumen */}
        <div className="bg-slate-50 p-6 rounded-xl">
          <h3 className="font-bold text-slate-800 mb-4">📝 Resumen y Recomendaciones</h3>
          <div className="space-y-3 text-sm text-slate-700">
            <p>
              <strong>Rendimiento:</strong> {
                selectedGroupAnalysis.stats.avgGrade >= 8 ? '🟢 Excelente' :
                selectedGroupAnalysis.stats.avgGrade >= 7 ? '🟡 Bueno' :
                '🔴 Requiere Atención'
              } (Promedio: {selectedGroupAnalysis.stats.avgGrade.toFixed(1)})
            </p>
            
            <p><strong>Recomendaciones:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              {selectedGroupAnalysis.stats.avgGrade < 7 && (
                <li>Implementar reforzamiento académico</li>
              )}
              {selectedGroupAnalysis.stats.bap > 0 && (
                <li>Coordinar apoyo USAER para {selectedGroupAnalysis.stats.bap} alumno(s)</li>
              )}
              <li>Continuar monitoreo semanal</li>
            </ul>
          </div>
        </div>
        
        <button
          onClick={() => setSelectedGroupAnalysis(null)}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors"
        >
          Cerrar Análisis
        </button>
      </div>
    </div>
  </div>
)}
```

---

## ✅ RESUMEN FINAL

### COMPLETADO:
1. ✏️ **Editar/Eliminar Tareas** - ✅ Compilado y funcionando

### FALTAN (aplicar manualmente):
2. 🚨 **Sección de Incidencias** - Copiar código arriba
3. 📊 **Análisis de Grupo** - 3 pasos simples

Luego ejecuta: `npm run build`
