import React, { useState, useRef } from 'react';
import {
    Presentation, Plus, Trash2, Edit2, ChevronLeft, ChevronRight,
    FileText, Link, Image, Download, Play, X, Check, Upload,
    GripVertical, Type, ListChecks, PartyPopper, Building2, Printer,
    Sparkles, Loader2, FileUp, Brain
} from 'lucide-react';
import { CTEPresentation, CTESlide, CTEDocument, SchoolConfig } from '../types';
import { generateCTEPresentation } from '../services/ai';
import jsPDF from 'jspdf';

interface CTEPresentationViewProps {
    schoolConfig: SchoolConfig;
    presentations: CTEPresentation[];
    onSavePresentation: (pres: CTEPresentation) => void;
    onDeletePresentation: (id: string) => void;
}

const SLIDE_TEMPLATES: { type: CTESlide['type']; label: string; icon: React.ReactNode; defaultTitle: string; defaultContent: string }[] = [
    { type: 'TITLE', label: 'Portada', icon: <Presentation size={16} />, defaultTitle: 'Consejo Técnico Escolar', defaultContent: 'Sesión [Número] - [Fecha]' },
    { type: 'AGENDA', label: 'Agenda', icon: <ListChecks size={16} />, defaultTitle: 'Agenda del Día', defaultContent: '1. Bienvenida\n2. Revisión de acuerdos anteriores\n3. Tema central\n4. Actividades\n5. Acuerdos y cierre' },
    { type: 'CONTENT', label: 'Contenido', icon: <Type size={16} />, defaultTitle: 'Desarrollo del Tema', defaultContent: 'Escribe aquí el contenido del tema a tratar...' },
    { type: 'ACTIVITY', label: 'Actividad', icon: <Play size={16} />, defaultTitle: 'Actividad', defaultContent: 'Descripción de la actividad a realizar con el colectivo docente...' },
    { type: 'CLOSING', label: 'Cierre', icon: <PartyPopper size={16} />, defaultTitle: 'Acuerdos y Cierre', defaultContent: 'Acuerdos:\n- \n\nPróxima sesión: [Fecha]' },
];

export const CTEPresentationView: React.FC<CTEPresentationViewProps> = ({
    schoolConfig,
    presentations,
    onSavePresentation,
    onDeletePresentation
}) => {
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingPres, setEditingPres] = useState<CTEPresentation | null>(null);
    const [presentingMode, setPresentingMode] = useState<CTEPresentation | null>(null);
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [previewPres, setPreviewPres] = useState<CTEPresentation | null>(null);

    const [newTitle, setNewTitle] = useState('');
    const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
    const [newSlides, setNewSlides] = useState<CTESlide[]>([]);
    const [newDocuments, setNewDocuments] = useState<CTEDocument[]>([]);
    const [editingSlideId, setEditingSlideId] = useState<string | null>(null);
    const [docUrl, setDocUrl] = useState('');
    const [docName, setDocName] = useState('');
    const [docType, setDocType] = useState<'PDF' | 'IMAGE' | 'LINK'>('LINK');

    // AI Generation state
    const [aiTopic, setAiTopic] = useState('');
    const [aiFiles, setAiFiles] = useState<File[]>([]);
    const [aiSlideCount, setAiSlideCount] = useState(7);
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiError, setAiError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetForm = () => {
        setNewTitle('');
        setNewDate(new Date().toISOString().split('T')[0]);
        setNewSlides([]);
        setNewDocuments([]);
        setEditingSlideId(null);
        setShowCreateForm(false);
        setEditingPres(null);
        setDocUrl('');
        setDocName('');
        setAiTopic('');
        setAiFiles([]);
        setAiSlideCount(7);
        setIsGenerating(false);
        setAiError('');
    };

    const startEdit = (pres: CTEPresentation) => {
        setEditingPres(pres);
        setNewTitle(pres.title);
        setNewDate(pres.date);
        setNewSlides([...pres.slides]);
        setNewDocuments([...pres.documents]);
        setShowCreateForm(true);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        setAiFiles(prev => [...prev, ...files]);
    };

    const removeFile = (idx: number) => {
        setAiFiles(prev => prev.filter((_, i) => i !== idx));
    };

    const generateWithAI = async () => {
        if (!aiTopic.trim() && aiFiles.length === 0) {
            setAiError('Escribe un tema o sube al menos un documento');
            return;
        }
        setIsGenerating(true);
        setAiError('');
        try {
            const result = await generateCTEPresentation(aiTopic, aiFiles, aiSlideCount);
            if (result.slides && result.slides.length > 0) {
                const slides: CTESlide[] = result.slides.map((s, i) => ({
                    id: `ai-${Date.now()}-${i}`,
                    title: s.title,
                    content: s.content,
                    type: (s.type as CTESlide['type']) || 'CONTENT',
                    order: i
                }));
                setNewSlides(slides);
                if (!newTitle.trim() && slides[0]) {
                    const titleSlide = slides.find(s => s.type === 'TITLE');
                    if (titleSlide) setNewTitle(titleSlide.title);
                }
            } else {
                setAiError('La IA no generó diapositivas. Intenta con una descripción más detallada.');
            }
        } catch (e: any) {
            setAiError(e.message || 'Error al generar con IA');
        } finally {
            setIsGenerating(false);
        }
    };

    const addSlide = (templateIdx: number) => {
        const template = SLIDE_TEMPLATES[templateIdx];
        const slide: CTESlide = {
            id: Date.now().toString(),
            title: template.defaultTitle,
            content: template.defaultContent,
            type: template.type,
            order: newSlides.length
        };
        setNewSlides(prev => [...prev, slide]);
    };

    const updateSlide = (id: string, field: 'title' | 'content', value: string) => {
        setNewSlides(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const removeSlide = (id: string) => {
        setNewSlides(prev => prev.filter(s => s.id !== id).map((s, i) => ({ ...s, order: i })));
    };

    const moveSlide = (id: string, direction: 'up' | 'down') => {
        setNewSlides(prev => {
            const idx = prev.findIndex(s => s.id === id);
            if (idx < 0) return prev;
            const newIdx = direction === 'up' ? idx - 1 : idx + 1;
            if (newIdx < 0 || newIdx >= prev.length) return prev;
            const copy = [...prev];
            [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
            return copy.map((s, i) => ({ ...s, order: i }));
        });
    };

    const addDocument = () => {
        if (!docUrl.trim() || !docName.trim()) return;
        const doc: CTEDocument = {
            id: Date.now().toString(),
            name: docName.trim(),
            type: docType,
            url: docUrl.trim(),
            addedAt: new Date().toISOString()
        };
        setNewDocuments(prev => [...prev, doc]);
        setDocUrl('');
        setDocName('');
    };

    const handleSave = () => {
        if (!newTitle.trim() || newSlides.length === 0) {
            alert('Agrega un título y al menos una diapositiva');
            return;
        }
        const pres: CTEPresentation = {
            id: editingPres?.id || Date.now().toString(),
            title: newTitle.trim(),
            date: newDate,
            slides: newSlides,
            documents: newDocuments,
            createdAt: editingPres?.createdAt || new Date().toISOString()
        };
        onSavePresentation(pres);
        resetForm();
    };

    const generatePDF = (pres: CTEPresentation) => {
        const doc = new jsPDF('landscape');
        const pageW = doc.internal.pageSize.width;
        const pageH = doc.internal.pageSize.height;

        pres.slides.forEach((slide, idx) => {
            if (idx > 0) doc.addPage();

            doc.setFillColor(79, 70, 229);
            doc.rect(0, 0, pageW, pageH, 'F');

            doc.setFillColor(255, 255, 255);
            doc.roundedRect(15, 10, pageW - 30, pageH - 20, 5, 5, 'F');

            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139);
            doc.text(schoolConfig.schoolName.toUpperCase(), 25, 22);

            doc.setFontSize(8);
            doc.text(`${pres.title} — ${new Date(pres.date + 'T00:00:00').toLocaleDateString('es-MX')}`, pageW - 25, 22, { align: 'right' });

            doc.setDrawColor(79, 70, 229);
            doc.setLineWidth(0.3);
            doc.line(25, 26, pageW - 25, 26);

            doc.setFontSize(22);
            doc.setTextColor(30, 41, 59);
            doc.setFont('helvetica', 'bold');
            const titleLines = doc.splitTextToSize(slide.title, pageW - 50);
            doc.text(titleLines, 25, 45);

            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(71, 85, 105);
            const contentLines = doc.splitTextToSize(slide.content, pageW - 50);
            doc.text(contentLines, 25, 65);

            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text(`${idx + 1} / ${pres.slides.length}`, pageW / 2, pageH - 10, { align: 'center' });
        });

        doc.save(`${pres.title.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s]/g, '').replace(/\s+/g, '_')}_Presentacion.pdf`);
    };

    const getSlideTypeColor = (type: CTESlide['type']) => {
        switch (type) {
            case 'TITLE': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
            case 'AGENDA': return 'bg-teal-100 text-teal-700 border-teal-200';
            case 'CONTENT': return 'bg-slate-100 text-slate-700 border-slate-200';
            case 'ACTIVITY': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'CLOSING': return 'bg-rose-100 text-rose-700 border-rose-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (!presentingMode) return;
        if (e.key === 'ArrowRight' || e.key === ' ') {
            e.preventDefault();
            setCurrentSlideIndex(prev => Math.min(prev + 1, presentingMode.slides.length - 1));
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            setCurrentSlideIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Escape') {
            setPresentingMode(null);
        }
    };

    React.useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [presentingMode]);

    return (
        <div className="animate-fadeIn space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Presentaciones CTE</h2>
                    <p className="text-sm text-slate-500">Crea presentaciones para sesiones de Consejo Técnico con documentos adjuntos</p>
                </div>
                <button
                    onClick={() => setShowCreateForm(true)}
                    className="bg-teal-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-teal-700 transition-colors shadow-lg shadow-teal-200"
                >
                    <Plus size={18} />
                    Nueva Presentación
                </button>
            </div>

            {showCreateForm && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="bg-teal-600 p-5 text-white flex justify-between items-center shrink-0">
                            <h3 className="text-lg font-bold">
                                {editingPres ? 'Editar Presentación' : 'Nueva Presentación'}
                            </h3>
                            <button onClick={resetForm} className="text-white/80 hover:text-white"><X size={20} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            <div className="p-6 space-y-5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Título de la Presentación</label>
                                        <input
                                            type="text"
                                            value={newTitle}
                                            onChange={e => setNewTitle(e.target.value)}
                                            placeholder="Ej: CTE - 1ra Sesión Ordinaria"
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha</label>
                                        <input
                                            type="date"
                                            value={newDate}
                                            onChange={e => setNewDate(e.target.value)}
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                        />
                                    </div>
                                </div>

                                {!editingPres && (
                                    <div className="border-2 border-dashed border-purple-300 rounded-xl p-5 bg-gradient-to-br from-purple-50 to-indigo-50">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Sparkles size={20} className="text-purple-600" />
                                            <h4 className="font-bold text-purple-800">Generar con Inteligencia Artificial</h4>
                                        </div>
                                        <p className="text-xs text-purple-600 mb-4">Sube documentos o describe el tema y la IA creará la presentación completa para tu sesión CTE.</p>

                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-1">Tema o descripción de la sesión</label>
                                                <textarea
                                                    value={aiTopic}
                                                    onChange={e => setAiTopic(e.target.value)}
                                                    rows={3}
                                                    placeholder="Ej: Sesión CTE sobre evaluación formativa NEM. Analizar los avances del Plan de Mejora Escolar 2025-2026. Revisar estrategias de atención a alumnos con BAP..."
                                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-1">Subir documentos (PDF, imágenes, texto)</label>
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    multiple
                                                    accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.webp"
                                                    onChange={handleFileSelect}
                                                    className="hidden"
                                                />
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="w-full border-2 border-dashed border-slate-300 rounded-lg py-3 text-sm text-slate-500 hover:border-purple-400 hover:text-purple-600 transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <FileUp size={16} /> Seleccionar archivos
                                                </button>
                                                {aiFiles.length > 0 && (
                                                    <div className="mt-2 space-y-1">
                                                        {aiFiles.map((file, idx) => (
                                                            <div key={idx} className="flex items-center justify-between bg-white rounded-lg px-3 py-1.5 border border-slate-200">
                                                                <span className="text-xs text-slate-600 truncate flex-1">
                                                                    {file.type.startsWith('image/') ? <Image size={12} className="inline mr-1 text-blue-500" /> : <FileText size={12} className="inline mr-1 text-red-500" />}
                                                                    {file.name}
                                                                </span>
                                                                <button onClick={() => removeFile(idx)} className="text-red-400 hover:text-red-600 ml-2"><X size={14} /></button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <label className="text-xs font-bold text-slate-600">Diapositivas:</label>
                                                <input
                                                    type="number"
                                                    min={5}
                                                    max={15}
                                                    value={aiSlideCount}
                                                    onChange={e => setAiSlideCount(Number(e.target.value))}
                                                    className="w-20 border border-slate-300 rounded-lg px-2 py-1.5 text-sm text-center"
                                                />
                                            </div>

                                            {aiError && (
                                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">{aiError}</div>
                                            )}

                                            <button
                                                onClick={generateWithAI}
                                                disabled={isGenerating || (!aiTopic.trim() && aiFiles.length === 0)}
                                                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-xl font-bold text-sm hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-200"
                                            >
                                                {isGenerating ? (
                                                    <><Loader2 size={16} className="animate-spin" /> Generando presentación...</>
                                                ) : (
                                                    <><Brain size={16} /> Generar Presentación con IA</>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Agregar Diapositiva Manualmente</label>
                                    <div className="flex flex-wrap gap-2">
                                        {SLIDE_TEMPLATES.map((tmpl, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => addSlide(idx)}
                                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700 transition-all"
                                            >
                                                {tmpl.icon} {tmpl.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {newSlides.length > 0 && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Diapositivas ({newSlides.length})</label>
                                        <div className="space-y-3">
                                            {newSlides.map((slide, idx) => (
                                                <div key={slide.id} className={`rounded-xl border-2 p-4 ${editingSlideId === slide.id ? 'border-teal-400 bg-teal-50/50' : 'border-slate-200 bg-white'}`}>
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                                                            <span className={`text-xs px-2 py-0.5 rounded-full border font-bold ${getSlideTypeColor(slide.type)}`}>
                                                                {SLIDE_TEMPLATES.find(t => t.type === slide.type)?.label || slide.type}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <button onClick={() => moveSlide(slide.id, 'up')} disabled={idx === 0} className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"><ChevronLeft size={14} /></button>
                                                            <button onClick={() => moveSlide(slide.id, 'down')} disabled={idx === newSlides.length - 1} className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"><ChevronRight size={14} /></button>
                                                            <button onClick={() => setEditingSlideId(editingSlideId === slide.id ? null : slide.id)} className="p-1 text-slate-400 hover:text-teal-600"><Edit2 size={14} /></button>
                                                            <button onClick={() => removeSlide(slide.id)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={14} /></button>
                                                        </div>
                                                    </div>

                                                    {editingSlideId === slide.id ? (
                                                        <div className="space-y-2">
                                                            <input
                                                                type="text"
                                                                value={slide.title}
                                                                onChange={e => updateSlide(slide.id, 'title', e.target.value)}
                                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-teal-500"
                                                                placeholder="Título de la diapositiva"
                                                            />
                                                            <textarea
                                                                value={slide.content}
                                                                onChange={e => updateSlide(slide.id, 'content', e.target.value)}
                                                                rows={4}
                                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500"
                                                                placeholder="Contenido..."
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <h4 className="font-bold text-slate-800 text-sm">{slide.title}</h4>
                                                            <p className="text-xs text-slate-500 mt-1 line-clamp-2 whitespace-pre-line">{slide.content}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Documentos Adjuntos</label>
                                    <div className="flex gap-2 mb-3">
                                        <select
                                            value={docType}
                                            onChange={e => setDocType(e.target.value as any)}
                                            className="border border-slate-300 rounded-lg px-2 py-2 text-sm"
                                        >
                                            <option value="LINK">Enlace</option>
                                            <option value="PDF">PDF</option>
                                            <option value="IMAGE">Imagen</option>
                                        </select>
                                        <input
                                            type="text"
                                            value={docName}
                                            onChange={e => setDocName(e.target.value)}
                                            placeholder="Nombre del documento"
                                            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                        />
                                        <input
                                            type="text"
                                            value={docUrl}
                                            onChange={e => setDocUrl(e.target.value)}
                                            placeholder="URL del documento"
                                            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                        />
                                        <button
                                            onClick={addDocument}
                                            disabled={!docUrl.trim() || !docName.trim()}
                                            className="bg-teal-100 text-teal-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-teal-200 disabled:opacity-50"
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                    {newDocuments.length > 0 && (
                                        <div className="space-y-2">
                                            {newDocuments.map(doc => (
                                                <div key={doc.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-slate-200">
                                                    <div className="flex items-center gap-2">
                                                        {doc.type === 'PDF' ? <FileText size={16} className="text-red-500" /> :
                                                            doc.type === 'IMAGE' ? <Image size={16} className="text-blue-500" /> :
                                                                <Link size={16} className="text-teal-500" />}
                                                        <span className="text-sm font-medium text-slate-700">{doc.name}</span>
                                                    </div>
                                                    <button onClick={() => setNewDocuments(prev => prev.filter(d => d.id !== doc.id))} className="text-red-400 hover:text-red-600">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-200 flex justify-end gap-3 bg-slate-50 shrink-0">
                            <button onClick={resetForm} className="px-5 py-2 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors">Cancelar</button>
                            <button
                                onClick={handleSave}
                                disabled={!newTitle.trim() || newSlides.length === 0}
                                className="bg-teal-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-teal-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                            >
                                <Check size={16} /> {editingPres ? 'Guardar Cambios' : 'Crear Presentación'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {presentingMode && (
                <div className="fixed inset-0 z-[130] bg-slate-900 flex flex-col animate-fadeIn">
                    <div className="absolute top-4 right-4 z-10 flex items-center gap-3">
                        <span className="text-white/60 text-sm font-bold">
                            {currentSlideIndex + 1} / {presentingMode.slides.length}
                        </span>
                        <button
                            onClick={() => setPresentingMode(null)}
                            className="bg-white/10 text-white p-2 rounded-lg hover:bg-white/20"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 flex items-center justify-center p-8">
                        <div
                            className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full aspect-video p-12 flex flex-col justify-center relative"
                            onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const x = e.clientX - rect.left;
                                if (x > rect.width / 2) {
                                    setCurrentSlideIndex(prev => Math.min(prev + 1, presentingMode.slides.length - 1));
                                } else {
                                    setCurrentSlideIndex(prev => Math.max(prev - 1, 0));
                                }
                            }}
                        >
                            <div className="absolute top-6 left-8 text-xs text-slate-400 font-bold uppercase">
                                {schoolConfig.schoolName}
                            </div>
                            <div className="absolute top-6 right-8 text-xs text-slate-400">
                                {new Date(presentingMode.date + 'T00:00:00').toLocaleDateString('es-MX')}
                            </div>

                            {(() => {
                                const slide = presentingMode.slides[currentSlideIndex];
                                if (!slide) return null;
                                return (
                                    <div className="text-center">
                                        <h2 className={`font-bold text-slate-800 mb-8 ${slide.type === 'TITLE' ? 'text-5xl' : 'text-3xl'}`}>
                                            {slide.title}
                                        </h2>
                                        <div className="text-slate-600 text-xl leading-relaxed whitespace-pre-line max-w-3xl mx-auto">
                                            {slide.content}
                                        </div>
                                    </div>
                                );
                            })()}

                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs text-slate-300">
                                {currentSlideIndex + 1} / {presentingMode.slides.length}
                            </div>
                        </div>
                    </div>

                    <div className="p-4 flex justify-center gap-4">
                        <button
                            onClick={() => setCurrentSlideIndex(prev => Math.max(prev - 1, 0))}
                            disabled={currentSlideIndex === 0}
                            className="bg-white/10 text-white p-3 rounded-xl hover:bg-white/20 disabled:opacity-30"
                        >
                            <ChevronLeft size={24} />
                        </button>
                        <button
                            onClick={() => setCurrentSlideIndex(prev => Math.min(prev + 1, presentingMode.slides.length - 1))}
                            disabled={currentSlideIndex === presentingMode.slides.length - 1}
                            className="bg-white/10 text-white p-3 rounded-xl hover:bg-white/20 disabled:opacity-30"
                        >
                            <ChevronRight size={24} />
                        </button>
                    </div>
                </div>
            )}

            {presentations.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
                    <Presentation size={48} className="mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-bold text-slate-600">No hay presentaciones</h3>
                    <p className="text-sm text-slate-400 mt-1">Crea presentaciones para tus sesiones de Consejo Técnico Escolar</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {presentations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(pres => (
                        <div key={pres.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-lg transition-all group">
                            <div className="h-32 bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center relative overflow-hidden">
                                <Presentation size={48} className="text-white/30" />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <button
                                        onClick={() => { setPresentingMode(pres); setCurrentSlideIndex(0); }}
                                        className="bg-white text-teal-700 px-4 py-2 rounded-lg font-bold text-sm shadow-lg"
                                    >
                                        <Play size={16} className="inline mr-1" /> Presentar
                                    </button>
                                </div>
                            </div>
                            <div className="p-5">
                                <h3 className="font-bold text-slate-800 mb-1">{pres.title}</h3>
                                <p className="text-xs text-slate-400">
                                    {new Date(pres.date + 'T00:00:00').toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                                <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
                                    <span>{pres.slides.length} diapositivas</span>
                                    <span>•</span>
                                    <span>{pres.documents.length} docs</span>
                                </div>
                            </div>
                            <div className="border-t border-slate-100 p-3 flex gap-2">
                                <button
                                    onClick={() => startEdit(pres)}
                                    className="flex-1 bg-teal-50 text-teal-700 py-2 rounded-lg text-sm font-bold hover:bg-teal-100 transition-colors flex items-center justify-center gap-1"
                                >
                                    <Edit2 size={14} /> Editar
                                </button>
                                <button
                                    onClick={() => generatePDF(pres)}
                                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                    title="Descargar PDF"
                                >
                                    <Download size={16} />
                                </button>
                                <button
                                    onClick={() => { if (confirm('¿Eliminar esta presentación?')) onDeletePresentation(pres.id); }}
                                    className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
