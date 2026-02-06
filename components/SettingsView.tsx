import React, { useState, useRef } from 'react';
import { SchoolConfig } from '../types';
import { Save, User, School, MapPin, Clock, Upload, Building2, BookOpen, Hash, Mail, CheckCircle2, Phone, Users, Plus, Trash2, Edit2, Shield, Globe } from 'lucide-react';

interface SettingsViewProps {
  config: SchoolConfig;
  onSave: (newConfig: SchoolConfig) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onSyncToDB: () => void;
  onRecover: () => void;
  directorMode?: boolean;
  staffMode?: boolean;
  currentStaffId?: string;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ config, onSave, onExport, onImport, onSyncToDB, onRecover, directorMode = false, staffMode = false, currentStaffId }) => {
  const [formData, setFormData] = useState<SchoolConfig>(config);
  const [isSaved, setIsSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const teacherAvatarInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  // Staff Management State
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [staffForm, setStaffForm] = useState({
    name: '',
    role: 'Docente',
    group: '',
    pin: '',
    email: '',
    phone: ''
  });

  const handleOpenStaffModal = (staff: any = null) => {
    if (staff) {
      setEditingStaffId(staff.id);
      setStaffForm({
        name: staff.name,
        role: staff.role,
        group: staff.group || '',
        pin: staff.pin || '',
        email: staff.email || '',
        phone: staff.phone || ''
      });
    } else {
      setEditingStaffId(null);
      setStaffForm({ name: '', role: 'Docente', group: '', pin: '', email: '', phone: '' });
    }
    setShowStaffModal(true);
  };

  const handleSaveStaffMember = (e: React.FormEvent) => {
    e.preventDefault();
    const currentStaffList = formData.staff || [];
    let updatedList;

    if (editingStaffId) {
      updatedList = currentStaffList.map(s => s.id === editingStaffId ? { ...s, ...staffForm } : s);
    } else {
      const newStaff = {
        id: Date.now().toString(), // Simple ID generation
        ...staffForm,
        avatar: `https://ui-avatars.com/api/?name=${staffForm.name}&background=random`
      };
      updatedList = [...currentStaffList, newStaff];
    }

    setFormData(prev => ({ ...prev, staff: updatedList }));
    setShowStaffModal(false);
    setIsSaved(false); // Mark as unsaved so user knows to click "Guardar Configuración"
  };

  const handleDeleteStaff = (id: string) => {
    if (window.confirm('¿Eliminar este miembro del personal?')) {
      const updatedList = (formData.staff || []).filter(s => s.id !== id);
      setFormData(prev => ({ ...prev, staff: updatedList }));
      setIsSaved(false);
    }
  };

  const isStaff = staffMode && currentStaffId;
  const currentStaffMember = isStaff ? (formData.staff || []).find(s => s.id === currentStaffId) : null;

  const handleChange = (field: keyof SchoolConfig, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsSaved(false);
  };

  const handleStaffChange = (field: string, value: string) => {
    const updatedStaff = (formData.staff || []).map(s =>
      s.id === currentStaffId ? { ...s, [field]: value } : s
    );
    setFormData(prev => ({ ...prev, staff: updatedStaff }));
    setIsSaved(false);
  };


  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, schoolLogo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTeacherAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (isStaff) {
          handleStaffChange('avatar', result);
        } else {
          setFormData(prev => ({ ...prev, teacherAvatar: result }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Configuración</h2>
          <p className="text-slate-500 font-medium">
            {directorMode ? 'Datos institucionales y parámetros del sistema' : 'Datos del docente, institución y parámetros generales'}
          </p>
        </div>
        {isSaved && (
          <div className="bg-green-100 text-green-700 px-4 py-2 rounded-xl font-bold animate-pulse border border-green-200 flex items-center gap-2 shadow-sm">
            <CheckCircle2 size={20} />
            ¡Cambios guardados correctamente!
          </div>
        )}
      </header>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Column: Teacher/Director & Logo */}
        <div className="space-y-6 lg:col-span-1">
          {/* Profile */}
          <div className="glass-card p-6 rounded-2xl">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <User className="text-indigo-600" size={20} />
              {isStaff ? 'Mi Perfil' : (directorMode ? 'Perfil del Director(a)' : 'Perfil del Docente')}
            </h3>

            <div className="flex flex-col items-center mb-6">
              <div
                className="w-32 h-32 rounded-full bg-slate-100 mb-4 overflow-hidden border-4 border-white shadow-lg relative group cursor-pointer"
                onClick={() => teacherAvatarInputRef.current?.click()}
              >
                <img src={isStaff ? (currentStaffMember?.avatar || 'https://via.placeholder.com/150') : formData.teacherAvatar} alt="Avatar" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Upload className="text-white w-8 h-8" />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => teacherAvatarInputRef.current?.click()}
                  className="text-xs text-indigo-600 font-bold hover:text-indigo-800 transition-colors"
                >
                  Subir Foto
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => {
                    const url = `https://ui-avatars.com/api/?name=${isStaff ? currentStaffMember?.name : formData.teacherName}&background=random`;
                    if (isStaff) handleStaffChange('avatar', url);
                    else handleChange('teacherAvatar', url);
                  }}
                  className="text-xs text-slate-500 font-medium hover:text-slate-700 transition-colors"
                >
                  Generar Random
                </button>
              </div>
              <input
                type="file"
                ref={teacherAvatarInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleTeacherAvatarUpload}
              />
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  value={isStaff ? (currentStaffMember?.name || '') : formData.teacherName}
                  onChange={e => isStaff ? handleStaffChange('name', e.target.value) : handleChange('teacherName', e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80 text-slate-900 font-medium"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                  <input
                    type="email"
                    value={isStaff ? (currentStaffMember?.email || '') : (formData.teacherEmail || '')}
                    onChange={e => isStaff ? handleStaffChange('email', e.target.value) : handleChange('teacherEmail', e.target.value)}
                    className="w-full pl-10 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80 text-slate-900 font-medium"
                    placeholder="contacto@escuela.edu"
                  />
                </div>
              </div>

              {isStaff && (
                <>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Teléfono</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                      <input
                        type="tel"
                        value={currentStaffMember?.phone || ''}
                        onChange={e => handleStaffChange('phone', e.target.value)}
                        className="w-full pl-10 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80 text-slate-900 font-medium"
                        placeholder="55 1234 5678"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">PIN de Acceso</label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                      <input
                        type="password"
                        value={currentStaffMember?.pin || ''}
                        onChange={e => handleStaffChange('pin', e.target.value)}
                        className="w-full pl-10 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80 text-slate-900 font-medium tracking-widest"
                        placeholder="PIN (4 dígitos)"
                        maxLength={4}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* School Logo */}
          <div className="glass-card p-6 rounded-2xl">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Building2 className="text-indigo-600" size={20} />
              Logo Institucional
            </h3>

            <div
              className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-slate-50/50 hover:bg-indigo-50/50 hover:border-indigo-300 transition-all cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              {formData.schoolLogo ? (
                <div className="relative w-full h-32 mb-2 group-hover:scale-105 transition-transform">
                  <img src={formData.schoolLogo} alt="Logo Escuela" className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-3 group-hover:bg-indigo-100 transition-colors">
                  <Upload className="w-8 h-8 text-slate-400 group-hover:text-indigo-500" />
                </div>
              )}
              <p className="text-sm text-slate-700 font-bold">Click para subir logo</p>
              <p className="text-xs text-slate-400 mt-1">PNG, JPG (Max 2MB)</p>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
              />
            </div>
          </div>
        </div>

        {/* Right Column: School Details */}
        {!isStaff && (
          <div className="space-y-6 lg:col-span-2">
            <div className="glass-card p-8 rounded-2xl">
              <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-200/60 pb-4 text-lg">
                <School className="text-indigo-600" size={24} />
                Datos de la Escuela
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1">Nombre de la Escuela</label>
                  <div className="relative">
                    <School className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                    <input
                      type="text"
                      value={formData.schoolName}
                      onChange={e => handleChange('schoolName', e.target.value)}
                      className="w-full pl-10 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80 text-slate-900 font-medium"
                      placeholder="Ej. Esc. Primaria Benito Juárez"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">C.C.T.</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                    <input
                      type="text"
                      value={formData.cct}
                      onChange={e => handleChange('cct', e.target.value)}
                      className="w-full pl-10 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80 text-slate-900 font-medium"
                      placeholder="Ej. 09DPR1234Z"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Zona Escolar</label>
                  <input
                    type="text"
                    value={formData.zone}
                    onChange={e => handleChange('zone', e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80 text-slate-900 font-medium"
                    placeholder="Ej. Zona 15"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Sector</label>
                  <input
                    type="text"
                    value={formData.sector}
                    onChange={e => handleChange('sector', e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80 text-slate-900 font-medium"
                    placeholder="Ej. Sector 03"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Ciclo Escolar</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                    <input
                      type="text"
                      value={formData.schoolYear || ''}
                      onChange={e => handleChange('schoolYear', e.target.value)}
                      className="w-full pl-10 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80 text-slate-900 font-medium"
                      placeholder="Ej. 2024-2025"
                    />
                  </div>
                </div>

                {!directorMode && (
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Grado y Grupo</label>
                    <div className="relative">
                      <BookOpen className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                      <input
                        type="text"
                        value={formData.gradeGroup}
                        onChange={e => handleChange('gradeGroup', e.target.value)}
                        className="w-full pl-10 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80 text-slate-900 font-medium"
                        placeholder="Ej. 3° B"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Nombre del Director(a) (Firma Oficios)</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                    <input
                      type="text"
                      value={formData.directorName || ''}
                      onChange={e => handleChange('directorName', e.target.value)}
                      className="w-full pl-10 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80 text-slate-900 font-medium"
                      placeholder="Ej. Profr. Juan Pérez"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card p-8 rounded-2xl">
              <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-200/60 pb-4 text-lg">
                <MapPin className="text-indigo-600" size={24} />
                Ubicación y Horario
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1">Lugar / Dirección</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                    <input
                      type="text"
                      value={formData.location}
                      onChange={e => handleChange('location', e.target.value)}
                      className="w-full pl-10 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80 text-slate-900 font-medium"
                      placeholder="Ej. Av. Reforma 123, Centro"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1">Horario Escolar</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                    <input
                      type="text"
                      value={formData.schedule}
                      onChange={e => handleChange('schedule', e.target.value)}
                      className="w-full pl-10 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/80 text-slate-900 font-medium"
                      placeholder="Ej. Lunes a Viernes de 8:00 AM a 1:00 PM"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card p-8 rounded-2xl border-l-4 border-indigo-500">
              <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-200/60 pb-4 text-lg">
                <Upload className="text-indigo-600" size={24} />
                Copia de Seguridad y Restauración
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <h4 className="font-bold text-slate-700">Exportar Datos</h4>
                  <p className="text-xs text-slate-500 mb-2">Descarga un archivo con toda la información de alumnos, tareas y asistencias.</p>
                  <button
                    type="button"
                    onClick={onExport}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl font-bold hover:bg-indigo-100 transition-all active:scale-95"
                  >
                    <Save size={18} />
                    Descargar Respaldo (JSON)
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  <h4 className="font-bold text-slate-700">Restaurar Datos</h4>
                  <p className="text-xs text-slate-500 mb-2">Carga un archivo de respaldo previamente descargado. ¡Cuidado! Esto sobrescribirá los datos actuales.</p>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('ADVERTENCIA: Al restaurar un respaldo se reemplazarán todos los datos actuales. ¿Deseas continuar?')) {
                        backupInputRef.current?.click();
                      }
                    }}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-bold hover:bg-slate-100 transition-all active:scale-95"
                  >
                    <Upload size={18} />
                    Cargar Respaldo
                  </button>
                  <input
                    type="file"
                    accept=".json"
                    ref={backupInputRef}
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        onImport(e.target.files[0]);
                        e.target.value = ''; // Reset
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="glass-card p-8 rounded-2xl border-l-4 border-emerald-500 mt-6">
              <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-200/60 pb-4 text-lg">
                <Building2 className="text-emerald-600" size={24} />
                Migración a Base de Datos (MySQL)
              </h3>
              <div className="flex flex-col gap-4">
                <p className="text-sm text-slate-600">
                  Si tienes el servidor de base de datos activado (XAMPP + Node Server), puedes enviar toda tu información actual para que quede almacenada de forma segura en MySQL.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('¿Estás seguro de enviar toda la información actual a la base de datos SQL? Esto actualizará los registros existentes.')) {
                      onSyncToDB();
                    }
                  }}
                  className="flex items-center justify-center gap-2 w-full py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-95"
                >
                  <div className="flex flex-col items-center">
                    <span className="flex items-center gap-2"><Upload size={20} /> Sincronizar con MySQL</span>
                    <span className="text-[10px] opacity-80 font-normal">Guardar estado actual en Base de Datos</span>
                  </div>
                </button>
              </div>
            </div>

            <div className="glass-card p-8 rounded-2xl border-l-4 border-amber-500 mt-6 bg-amber-50/30">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-200/60 pb-4 text-lg">
                <Clock className="text-amber-600" size={24} />
                Recuperación de Emergencia (Datos Antiguos)
              </h3>
              <div className="flex flex-col gap-4">
                <p className="text-sm text-slate-600">
                  Utiliza esta opción ÚNICAMENTE si tus datos desaparecieron al actualizar el sistema y necesitas recuperarlos de la memoria local del navegador (LocalStorage) para luego guardarlos en MySQL.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("¿Deseas buscar y cargar datos antiguos guardados en este navegador? \n\nSi aceptas, se cargarán en pantalla y DEBERÁS presionar 'Sincronizar con MySQL' arriba para guardarlos definitivamente.")) {
                      onRecover();
                    }
                  }}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-all shadow-lg shadow-amber-200 active:scale-95"
                >
                  <span className="flex items-center gap-2"><Clock size={20} /> Recuperar LocalStorage Antiguo</span>
                </button>
              </div>
            </div>

            {/* Staff Management Section */}
            <div className="glass-card p-8 rounded-2xl border-l-4 border-blue-500 mt-6">
              <div className="flex justify-between items-center border-b border-slate-200/60 pb-4 mb-6">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                  <Users className="text-blue-600" size={24} />
                  Gestión del Personal Docente y Administrativo
                </h3>
                <button
                  type="button"
                  onClick={() => handleOpenStaffModal()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-bold transition-colors"
                >
                  <Plus size={18} /> Agregar
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-xs font-bold text-slate-500 uppercase border-b border-slate-200">
                      <th className="p-3">Nombre</th>
                      <th className="p-3">Rol</th>
                      <th className="p-3">Grupo/Cargo</th>
                      <th className="p-3 text-right">PIN</th>
                      <th className="p-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(!formData.staff || formData.staff.length === 0) ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400">
                          No hay personal extra registrado.
                        </td>
                      </tr>
                    ) : (
                      formData.staff.map(staff => (
                        <tr key={staff.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
                                <img src={staff.avatar || `https://ui-avatars.com/api/?name=${staff.name}&background=random`} alt={staff.name} className="w-full h-full object-cover" />
                              </div>
                              <div className="font-bold text-slate-700 text-sm">{staff.name}</div>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase
                              ${staff.role === 'Director' ? 'bg-purple-100 text-purple-700' :
                                staff.role === 'USAER' ? 'bg-blue-100 text-blue-700' :
                                  staff.role === 'Docente' ? 'bg-green-100 text-green-700' :
                                    'bg-slate-100 text-slate-600'}`}>
                              {staff.role}
                            </span>
                          </td>
                          <td className="p-3 text-sm text-slate-600">{staff.group || '-'}</td>
                          <td className="p-3 text-right font-mono text-xs text-slate-500 tracking-widest">{staff.pin || '----'}</td>
                          <td className="p-3 text-right">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button type="button" onClick={() => handleOpenStaffModal(staff)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg">
                                <Edit2 size={16} />
                              </button>
                              <button type="button" onClick={() => handleDeleteStaff(staff.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal for Staff Editing */}
            {showStaffModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 text-left">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slideUp">
                  <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">{editingStaffId ? 'Editar Personal' : 'Nuevo Personal'}</h3>
                    <button type="button" onClick={() => setShowStaffModal(false)} className="text-slate-400 hover:text-slate-600"><Plus size={24} className="rotate-45" /></button>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre Completo</label>
                      <input
                        type="text"
                        value={staffForm.name}
                        onChange={e => setStaffForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-medium"
                        placeholder="Ej. Profr. Luis Hernández"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Rol</label>
                        <select
                          value={staffForm.role}
                          onChange={e => setStaffForm(prev => ({ ...prev, role: e.target.value }))}
                          className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-medium bg-white"
                        >
                          <option value="Docente">Docente</option>
                          <option value="Director">Director</option>
                          <option value="USAER">USAER</option>
                          <option value="Administrativo">Administrativo</option>
                          <option value="Intendencia">Intendencia</option>
                          <option value="Especialista">Especialista</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">PIN Acceso (4 dígitos)</label>
                        <input
                          type="text"
                          maxLength={4}
                          value={staffForm.pin}
                          onChange={e => setStaffForm(prev => ({ ...prev, pin: e.target.value }))}
                          className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-medium tracking-widest text-center"
                          placeholder="0000"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Grupo / Cargo / Área</label>
                      <input
                        type="text"
                        value={staffForm.group}
                        onChange={e => setStaffForm(prev => ({ ...prev, group: e.target.value }))}
                        className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-medium"
                        placeholder="Ej. 4° B, Inglés, USAER, Dirección..."
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Para docentes frente a grupo, especificar grado y grupo (ej. 4° A). Para USAER escribir "USAER".</p>
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveStaffMember}
                      disabled={!staffForm.name}
                      className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all mt-2 disabled:opacity-50"
                    >
                      {editingStaffId ? 'Actualizar Información' : 'Registrar Personal'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Maintenance / Troubleshooting Section */}
        <div className="glass-card p-8 rounded-2xl border-l-4 border-slate-400 mt-6 bg-slate-50/50 lg:col-span-full">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-200/60 pb-4 text-lg">
            <Shield className="text-slate-600" size={24} />
            Mantenimiento y Solución de Problemas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <h4 className="font-bold text-slate-700">Actualización Forzada</h4>
              <p className="text-sm text-slate-500 mb-2">
                Si instalaste la App en el celular y no ves los cambios recientes o los datos actualizados, usa este botón para limpiar el caché y descargar la versión más nueva del servidor.
              </p>
              <button
                type="button"
                onClick={async () => {
                  if (!confirm('Esta acción borrará el caché del navegador y forzará la descarga de la versión más reciente. ¿Continuar?')) return;

                  // Unregister Service Workers
                  if ('serviceWorker' in navigator) {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    for (let reg of registrations) await reg.unregister();
                  }

                  // Clear Caches
                  if ('caches' in window) {
                    const keys = await caches.keys();
                    for (let key of keys) await caches.delete(key);
                  }

                  // Force Reload
                  window.location.reload();
                }}
                className="flex items-center justify-center gap-2 w-full py-3 bg-red-50 text-red-600 border border-red-200 rounded-xl font-bold hover:bg-red-100 transition-all active:scale-95"
              >
                <Clock size={18} />
                Limpiar Caché y Actualizar App
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <h4 className="font-bold text-slate-700">Cola de Sincronización</h4>
              <p className="text-sm text-slate-500 mb-2">
                Si ves errores de "Memoria Llena" (QuotaExceeded), puede ser que tengas muchas acciones pendientes de subir al servidor.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (confirm('¿Deseas borrar las acciones pendientes? Esto evitará que se suban los cambios realizados mientras estabas desconectado, pero liberará memoria.')) {
                    import('../services/api').then(m => {
                      m.api.clearQueue();
                      alert('Cola de sincronización borrada.');
                      window.location.reload();
                    });
                  }
                }}
                className="flex items-center justify-center gap-2 w-full py-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl font-bold hover:bg-amber-100 transition-all active:scale-95"
              >
                <Trash2 size={18} />
                Borrar Acciones Pendientes
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <h4 className="font-bold text-slate-700">Modo de Depuración</h4>
              <p className="text-sm text-slate-500 mb-2">
                ID del Servidor: <span className="font-mono bg-slate-200 px-1 rounded">{window.location.hostname}</span>
                <br />
                Estado: <span className="text-green-600 font-bold">Conectado</span>
              </p>
            </div>

            <div className="flex flex-col gap-2 md:col-span-2 border-t border-slate-200 pt-4 mt-2">
              <h4 className="font-bold text-slate-700 flex items-center gap-2">
                <Globe className="text-indigo-500" size={18} />
                Conexión del Servidor (API)
              </h4>
              <p className="text-xs text-slate-500 mb-2">
                Si estás migrando a la nube, pega aquí tu URL de Render (ej. https://tuescuela.onrender.com).
                Deja esto <strong>vacío</strong> para detectar automáticamente.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="serverUrlInput"
                  placeholder={window.location.origin}
                  defaultValue={localStorage.getItem('SIRILA_SERVER_URL') || ''}
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={() => {
                    const input = document.getElementById('serverUrlInput') as HTMLInputElement;
                    let val = input.value.trim();
                    if (val) {
                      // Remove trailing slash and /api if present
                      val = val.replace(/\/$/, "").replace(/\/api$/, "");
                      // Add /api normalization handled by api.ts, but let's save base
                      if (!val.startsWith('http')) val = 'https://' + val;
                      // Just save the base, api.ts handles /api appending if needed or does it?
                      // api.ts does: if (!cleanUrl.endsWith('/api')) cleanUrl += '/api';
                      // So we should save it WITHOUT /api if we want to be clean, but let's follow api.ts convention
                      if (!val.endsWith('/api')) val += '/api';

                      localStorage.setItem('SIRILA_SERVER_URL', val);
                      alert(`Conexión actualizada a: ${val}\n\nLa aplicación se reiniciará.`);
                    } else {
                      localStorage.removeItem('SIRILA_SERVER_URL');
                      alert('Configuración de servidor restablecida a "Automático".');
                    }
                    window.location.reload();
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 whitespace-nowrap"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 lg:col-span-full">
          <button
            type="submit"
            className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95 text-lg"
          >
            <Save size={24} />
            Guardar Configuración
          </button>
        </div>
      </form >
    </div >
  );
};