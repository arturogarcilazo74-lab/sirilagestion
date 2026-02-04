# 🚀 IMPLEMENTACIONES PENDIENTES - DASHBOARD DE DIRECCIÓN

## 1. ✏️ MODIFICAR Y ELIMINAR TAREAS

### Ubicación: `DirectorView.tsx` - Sección de Seguimiento de Tareas

**Agregar botones de acción en cada tarjeta de tarea (línea ~1145-1150):**

```tsx
// DENTRO DEL <div className="flex items-start justify-between gap-4">
// DESPUÉS DEL título de la tarea, AGREGAR:

<div className="flex items-center gap-2">
  <button
    onClick={() => {
      // Abrir modal de edición
      setEditingTaskId(task.id);
      setTaskFormData({
        title: task.title,
        description: task.description || '',
        assignedTo: task.assignedTo,
        type: task.type,
        dueDate: task.dueDate
      });
      setShowTaskModal(true);
    }}
    className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded transition-colors"
    title="Editar tarea"
  >
    <Edit2 size={14} />
  </button>
  
  <button
    onClick={() => {
      if (window.confirm('¿Eliminar esta tarea? Esta acción no se puede deshacer.')) {
        handleDeleteStaffTask(task.id);
      }
    }}
    className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded transition-colors"
    title="Eliminar tarea"
  >
    <Trash2 size={14} />
  </button>
</div>
```

**Importar iconos en la parte superior del archivo:**
```tsx
import { ..., Edit2, Trash2 } from 'lucide-react';
```

---

## 2. 🚨 SECCIÓN DE CONDUCTA - VER INCIDENCIAS

### Ubicación: `DirectorView.tsx` - Dashboard (después de Seguimiento de Tareas)

**Agregar ANTES de la sección de "Shortcut Grid" (línea ~1197):**

```tsx
{/* Behavior Incidents Section */}
<div className="col-span-full mt-8">
  <h3 className="text-lg font-bold text-slate-500 mb-4 uppercase tracking-wider flex items-center gap-2">
    <AlertTriangle size={18} />
    Incidencias de Conducta Recientes
  </h3>
  
  {(() => {
    // Get incidents from last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentIncidents = behaviorLogs
      .filter((log: any) => {
        const logDate = new Date(log.date);
        return log.type === 'NEGATIVE' && logDate >= sevenDaysAgo;
      })
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10); // Solo últimas 10
    
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
          const student = students.find((s: any) => s.id === incident.studentId);
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
              
              <p className="text-sm text-slate-700 mb-3 line-clamp-2">{incident.description}</p>
              
              <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
                <span className="flex items-center gap-1">
                  <User size={12} />
                  Reportado por: {teacher.name}
                </span>
                <button
                  onClick={() => {
                    // Navegar a la vista de conducta con filtro del estudiante
                    setActiveTab('STUDENTS');
                    // O mejor, crear una vista de detalle:
                    alert(`Detalles completos:\n\nAlumno: ${student?.name}\nGrupo: ${student?.group}\nFecha: ${new Date(incident.date).toLocaleString()}\nDescripción: ${incident.description}\nReportado por: ${teacher.name}\nPuntos: -${incident.points}`);
                  }}
                  className="text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Ver detalles →
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  })()}
</div>
```

**Importar iconos necesarios:**
```tsx
import { ..., AlertTriangle, User } from 'lucide-react';
```

---

## 3. 📊 ANÁLISIS DE GRUPO AL HACER CLICK EN TARJETAS

### Ubicación: `DirectorView.tsx` - Tarjetas de estadísticas por grupo

**Modificar la sección de Group Statistics (línea ~1000-1060):**

**PASO 1: Agregar estado para modal:**
```tsx
// Al inicio del componente DirectorView (cerca de línea 23)
const [selectedGroupAnalysis, setSelectedGroupAnalysis] = useState<any>(null);
```

**PASO 2: Hacer las tarjetas clickeables:**
```tsx
// En el map de grupos (línea ~1015), cambiar el div principal por:
<div
  key={groupName}
  onClick={() => setSelectedGroupAnalysis({ groupName, stats })}
  className="glass-card p-6 rounded-2xl hover:shadow-xl transition-all cursor-pointer hover:-translate-y-1"
>
  {/* ...contenido existente de la tarjeta... */}
</div>
```

**PASO 3: Agregar modal de análisis (DESPUÉS del cierre de {activeTab === 'DASHBOARD'}):**

```tsx
{/* Group Analysis Modal */}
{selectedGroupAnalysis && (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
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
      
      <div className="p-6 space-y-6">
        {/* Estadísticas Generales */}
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
        
        {/* Alertas Tempranas */}
        <div className="bg-red-50 border-l-4 border-red-500 rounded-r-xl p-6">
          <h3 className="font-bold text-red-800 mb-4 flex items-center gap-2">
            <AlertTriangle size={20} />
            🚨 Alertas Tempranas
          </h3>
          {(() => {
            const groupStudents = students.filter((s: Student) => s.group === selectedGroupAnalysis.groupName);
            const alerts = [];
            
            groupStudents.forEach((student: Student) => {
              // Bajo rendimiento
              if (selectedGroupAnalysis.stats.avgGrade < 7) {
                alerts.push({
                  type: 'RENDIMIENTO',
                  message: `Promedio grupal bajo (${selectedGroupAnalysis.stats.avgGrade.toFixed(1)})`,
                  severity: 'high'
                });
              }
              
              // Conducta negativa
              if (student.behaviorPoints < -10) {
                alerts.push({
                  type: 'CONDUCTA',
                  message: `${student.name}: Conducta crítica (${student.behaviorPoints} pts)`,
                  severity: 'high'
                });
              }
              
              // Tareas pendientes
              const completionRate = student.totalAssignments > 0 
                ? (student.assignmentsCompleted / student.totalAssignments) 
                : 1;
              if (completionRate < 0.5) {
                alerts.push({
                  type: 'TAREAS',
                  message: `${student.name}: Bajo cumplimiento de tareas (${(completionRate * 100).toFixed(0)}%)`,
                  severity: 'medium'
                });
              }
            });
            
            if (alerts.length === 0) {
              return <p className="text-green-700 font-medium">✓ No hay alertas críticas para este grupo</p>;
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
                  <p className="text-sm text-slate-500 italic">... y {alerts.length - 5} alertas más</p>
                )}
              </div>
            );
          })()}
        </div>
        
        {/* Resumen del Grupo */}
        <div className="bg-slate-50 p-6 rounded-xl">
          <h3 className="font-bold text-slate-800 mb-4">📝 Resumen de Situación</h3>
          {(() => {
            const groupStudents = students.filter((s: Student) => s.group === selectedGroupAnalysis.groupName);
            const criticalStudents = groupStudents.filter((s: Student) => {
              const completionRate = s.totalAssignments > 0 ? (s.assignmentsCompleted / s.totalAssignments) : 1;
              return s.behaviorPoints < -5 || completionRate < 0.5;
            });
            
            return (
              <div className="space-y-3 text-sm text-slate-700">
                <p>
                  <strong>Rendimiento General:</strong> {
                    selectedGroupAnalysis.stats.avgGrade >= 8 ? '🟢 Excelente' :
                    selectedGroupAnalysis.stats.avgGrade >= 7 ? '🟡 Bueno' :
                    selectedGroupAnalysis.stats.avgGrade >= 6 ? '🟠 Regular' : '🔴 Requiere Atención'
                  } (Promedio: {selectedGroupAnalysis.stats.avgGrade.toFixed(1)})
                </p>
                
                <p>
                  <strong>Conducta:</strong> {
                    criticalStudents.length === 0 ? '🟢 Sin incidencias mayores' :
                    criticalStudents.length <= 2 ? `🟡 ${criticalStudents.length} alumno(s) requieren seguimiento` :
                    `🔴 ${criticalStudents.length} alumnos requieren intervención`
                  }
                </p>
                
                <p>
                  <strong>Recomendaciones:</strong>
                </p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  {selectedGroupAnalysis.stats.avgGrade < 7 && (
                    <li>Implementar sesiones de reforzamiento académico</li>
                  )}
                  {criticalStudents.length > 0 && (
                    <li>Agendar reuniones con tutores de {criticalStudents.length} alumno(s)</li>
                  )}
                  {selectedGroupAnalysis.stats.bap > 0 && (
                    <li>Coordinar apoyo con USAER para {selectedGroupAnalysis.stats.bap} alumno(s)</li>
                  )}
                  <li>Continuar monitoreo semanal del grupo</li>
                </ul>
              </div>
            );
          })()}
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

## 📦 RESUMEN DE CAMBIOS

### Archivos a Modificar:

1. **`DirectorView.tsx`**
   - Agregar botones Editar/Eliminar en tareas
   - Agregar sección de Incidencias de Conducta
   - Hacer tarjetas de grupos clickeables
   - Agregar modal de Análisis de Grupo

### Imports Necesarios:
```tsx
import { ..., Edit2, Trash2, AlertTriangle, User, X } from 'lucide-react';
```

### Estados Nuevos:
```tsx
const [selectedGroupAnalysis, setSelectedGroupAnalysis] = useState<any>(null);
```

---

## ✅ ORDEN DE IMPLEMENTACIÓN SUGERIDO:

1. Primero: Modificar/Eliminar Tareas (más simple)
2. Segundo: Sección de Conducta (mediana complejidad)
3. Tercero: Análisis de Grupo (más complejo)

---

¿Quieres que implemente alguna de estas directamente o prefieres hacerlas tú con esta guía?
