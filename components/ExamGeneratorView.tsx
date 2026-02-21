import React, { useState, useEffect } from 'react';
import { Assignment } from '../types';
import { generateExam, generateInteractiveQuiz } from '../services/ai';
import { api } from '../services/api';
import { FileText, Sparkles, Plus, Trash2, Printer, Download, BookOpen, CheckCircle, ChevronRight, AlertCircle, Loader2, Send } from 'lucide-react';

interface ExamGeneratorViewProps {
    assignments: Assignment[];
}

export const ExamGeneratorView: React.FC<ExamGeneratorViewProps> = ({ assignments }) => {
    const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
    const [customTopics, setCustomTopics] = useState<string[]>([]);
    const [newTopic, setNewTopic] = useState('');
    const [examType, setExamType] = useState<'EXAM' | 'GUIDE'>('EXAM');
    const [reactivesPerSubject, setReactivesPerSubject] = useState(10);
    const [maxAttempts, setMaxAttempts] = useState(1);
    const [generatedContent, setGeneratedContent] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSending, setIsSending] = useState(false);

    // Extract unique topics from assignments
    // We'll use assignment titles as topics
    const registeredTopics = Array.from(new Set(assignments.map(a => a.title))).sort();

    const handleToggleTopic = (topic: string) => {
        if (selectedTopics.includes(topic)) {
            setSelectedTopics(selectedTopics.filter(t => t !== topic));
        } else {
            setSelectedTopics([...selectedTopics, topic]);
        }
    };

    const handleAddCustomTopic = () => {
        if (newTopic.trim() && !customTopics.includes(newTopic.trim())) {
            setCustomTopics([...customTopics, newTopic.trim()]);
            setSelectedTopics([...selectedTopics, newTopic.trim()]);
            setNewTopic('');
        }
    };

    const handleRemoveCustomTopic = (topic: string) => {
        setCustomTopics(customTopics.filter(t => t !== topic));
        setSelectedTopics(selectedTopics.filter(t => t !== topic));
    };

    const handleGenerate = async () => {
        if (selectedTopics.length === 0) {
            alert("Por favor selecciona al menos un tema.");
            return;
        }

        setIsGenerating(true);
        setGeneratedContent(null);

        try {
            const allTopics = selectedTopics.join(", ");
            const typeLabel = examType === 'EXAM' ? 'Examen' : 'Guía de Estudios';

            // We'll make a more detailed prompt for multiple subjects/topics
            const result = await generateExam(
                allTopics,
                reactivesPerSubject * selectedTopics.length,
                `NEM 4to Grado. Formato: ${typeLabel}. Generar exactamente ${reactivesPerSubject} reactivos por cada uno de los siguientes temas: ${allTopics}. Dividir por secciones claramente marcadas.`
            );

            setGeneratedContent(result);
        } catch (error) {
            console.error("Error generating exam:", error);
            setGeneratedContent("Hubo un error al generar el contenido. Por favor intenta de nuevo.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSendToPortal = async () => {
        if (selectedTopics.length === 0) {
            alert("Selecciona temas para el examen interactivo.");
            return;
        }

        setIsSending(true);
        try {
            const allTopics = selectedTopics.join(", ");
            const jsonQuestions = await generateInteractiveQuiz(allTopics, reactivesPerSubject * selectedTopics.length);
            const questions = JSON.parse(jsonQuestions);

            const newExam: Assignment = {
                id: `exam-${Date.now()}`,
                title: `Examen: ${selectedTopics.slice(0, 2).join(', ')}${selectedTopics.length > 2 ? '...' : ''}`,
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 week default
                completedStudentIds: [],
                type: 'INTERACTIVE',
                interactiveData: {
                    type: 'QUIZ',
                    questions: questions,
                    minScoreToPass: 6
                },
                isVisibleInParentsPortal: true,
                maxAttempts: maxAttempts,
                instructions: "Responde cuidadosamente cada pregunta. Tienes un límite de intentos configurado por tu maestro.",
                assignmentType: 'NEM_EVALUATION'
            };

            await api.saveAssignment(newExam);

            // Send notification to all parents
            await api.saveNotification({
                id: `notif-exam-${Date.now()}`,
                title: "Nuevo Examen Disponible",
                message: `Se ha publicado un nuevo examen interactivo: ${newExam.title}.`,
                date: new Date().toISOString(),
                isRead: false,
                type: 'ALERT'
            });

            alert("¡Examen enviado con éxito al Portal de Padres!");
        } catch (error) {
            console.error("Error sending to portal:", error);
            alert("Hubo un error al crear el examen interactivo.");
        } finally {
            setIsSending(false);
        }
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (printWindow && generatedContent) {
            printWindow.document.write(`
        <html>
          <head>
            <title>${examType === 'EXAM' ? 'Examen' : 'Guía de Estudio'}</title>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; line-height: 1.6; }
              header { text-align: center; border-bottom: 2px solid #333; margin-bottom: 30px; padding-bottom: 10px; }
              h1 { margin: 0; color: #1a365d; }
              .meta { display: flex; justify-content: space-between; margin-bottom: 20px; font-weight: bold; }
              .content { white-space: pre-wrap; font-size: 14pt; }
              @media print {
                body { padding: 0; }
                button { display: none; }
              }
            </style>
          </head>
          <body>
            <header>
              <h1>${examType === 'EXAM' ? 'EXAMEN DE EVALUACIÓN' : 'GUÍA DE ESTUDIO'}</h1>
              <p>4to Grado - Primaria</p>
            </header>
            <div class="meta">
              <span>Alumno: ________________________________________________</span>
              <span>Fecha: ____/____/____</span>
            </div>
            <div class="content">${generatedContent}</div>
          </body>
        </html>
      `);
            printWindow.document.close();
            printWindow.print();
        }
    };

    return (
        <div className="space-y-8 animate-fadeIn pb-10">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                            <FileText size={28} />
                        </div>
                        Generador de Exámenes y Guías
                    </h2>
                    <p className="text-slate-500 font-medium mt-1">Crea evaluaciones personalizadas usando los temas de tus actividades</p>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto">
                    <button
                        onClick={() => setExamType('EXAM')}
                        className={`flex-1 md:flex-none px-6 py-2 rounded-lg font-bold text-sm transition-all ${examType === 'EXAM' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Modo Examen
                    </button>
                    <button
                        onClick={() => setExamType('GUIDE')}
                        className={`flex-1 md:flex-none px-6 py-2 rounded-lg font-bold text-sm transition-all ${examType === 'GUIDE' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Modo Guía
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Selection Sidebar */}
                <div className="lg:col-span-4 space-y-6">
                    <section className="glass-card p-6 rounded-3xl border border-white/50 shadow-xl overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                            <BookOpen size={120} />
                        </div>

                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <CheckCircle className="text-emerald-500" size={20} />
                            Temas de Actividades
                        </h3>

                        <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar space-y-2 mb-6">
                            {registeredTopics.length > 0 ? (
                                registeredTopics.map(topic => (
                                    <label
                                        key={topic}
                                        className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer group ${selectedTopics.includes(topic) ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 hover:border-slate-200 bg-white'}`}
                                    >
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={selectedTopics.includes(topic)}
                                            onChange={() => handleToggleTopic(topic)}
                                        />
                                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${selectedTopics.includes(topic) ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 group-hover:border-slate-400'}`}>
                                            {selectedTopics.includes(topic) && <ChevronRight size={14} className="text-white" />}
                                        </div>
                                        <span className={`text-sm font-semibold truncate ${selectedTopics.includes(topic) ? 'text-indigo-900' : 'text-slate-600'}`}>{topic}</span>
                                    </label>
                                ))
                            ) : (
                                <div className="text-center py-8 text-slate-400">
                                    <AlertCircle size={32} className="mx-auto mb-2 opacity-20" />
                                    <p className="text-xs">No hay actividades registradas aún.</p>
                                </div>
                            )}
                        </div>

                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Plus className="text-indigo-500" size={20} />
                            Agregar Otros Temas
                        </h3>

                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newTopic}
                                    onChange={(e) => setNewTopic(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddCustomTopic()}
                                    placeholder="Ej. Ciclo del agua..."
                                    className="flex-1 p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm text-sm"
                                />
                                <button
                                    onClick={handleAddCustomTopic}
                                    className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all active:scale-95 shadow-md shadow-indigo-100"
                                    aria-label="Agregar tema"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {customTopics.map(topic => (
                                    <div key={topic} className="flex items-center gap-2 bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full text-xs font-bold border border-indigo-200 animate-scaleIn">
                                        {topic}
                                        <button
                                            onClick={() => handleRemoveCustomTopic(topic)}
                                            className="hover:text-red-500 transition-colors"
                                            aria-label={`Eliminar tema ${topic}`}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-100 space-y-4">
                            <div>
                                <label htmlFor="reactives-range" className="block text-sm font-bold text-slate-700 mb-2">Reactivos por tema</label>
                                <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                    <input
                                        id="reactives-range"
                                        type="range"
                                        min="5"
                                        max="20"
                                        value={reactivesPerSubject}
                                        onChange={(e) => setReactivesPerSubject(Number(e.target.value))}
                                        className="flex-1 accent-indigo-600"
                                    />
                                    <span className="w-10 text-center font-black text-indigo-600">{reactivesPerSubject}</span>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="attempts-range" className="block text-sm font-bold text-slate-700 mb-2">Intentos permitidos (Portal)</label>
                                <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                    <input
                                        id="attempts-range"
                                        type="range"
                                        min="1"
                                        max="10"
                                        value={maxAttempts}
                                        onChange={(e) => setMaxAttempts(Number(e.target.value))}
                                        className="flex-1 accent-emerald-600"
                                    />
                                    <span className="w-10 text-center font-black text-emerald-600">{maxAttempts}</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 mt-6">
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating || isSending || selectedTopics.length === 0}
                                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-indigo-200 hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 group"
                            >
                                {isGenerating ? <Loader2 size={24} className="animate-spin" /> : <Sparkles size={24} className="group-hover:rotate-12 transition-transform" />}
                                {isGenerating ? 'Generando...' : `Generar ${examType === 'EXAM' ? 'Examen' : 'Guía'}`}
                            </button>

                            <button
                                onClick={handleSendToPortal}
                                disabled={isGenerating || isSending || selectedTopics.length === 0}
                                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-emerald-200 hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 group"
                            >
                                {isSending ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                                {isSending ? 'Enviando...' : 'Enviar al Portal de Padres'}
                            </button>
                        </div>
                    </section>
                </div>

                {/* Content Preview */}
                <div className="lg:col-span-8 flex flex-col min-h-[600px]">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2">
                            Vista Previa (Para Imprimir)
                            {generatedContent && (
                                <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">Listo</span>
                            )}
                        </h3>

                        {generatedContent && (
                            <div className="flex gap-2">
                                <button
                                    onClick={handlePrint}
                                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
                                >
                                    <Printer size={18} />
                                    Imprimir
                                </button>
                                <button
                                    onClick={() => {
                                        const element = document.createElement("a");
                                        const file = new Blob([generatedContent], { type: 'text/plain' });
                                        element.href = URL.createObjectURL(file);
                                        element.download = `${examType === 'EXAM' ? 'Examen' : 'Guia'}_4to.txt`;
                                        document.body.appendChild(element);
                                        element.click();
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all active:scale-95 shadow-md shadow-indigo-100"
                                >
                                    <Download size={18} />
                                    Descargar
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 glass-card rounded-3xl border border-slate-200 overflow-hidden bg-white shadow-inner flex flex-col">
                        {generatedContent ? (
                            <div className="p-8 md:p-12 overflow-y-auto custom-scrollbar prose prose-slate max-w-none">
                                <div className="whitespace-pre-wrap font-serif text-lg leading-relaxed text-slate-800">
                                    {generatedContent}
                                </div>
                            </div>
                        ) : isGenerating ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400">
                                <Loader2 size={64} className="animate-spin text-indigo-300 mb-6" />
                                <h4 className="text-xl font-bold text-slate-700 mb-2">Diseñando tu {examType === 'EXAM' ? 'Examen' : 'Guía'}</h4>
                                <p className="max-w-md">Nuestra IA está analizando los temas seleccionados y redactando reactivos acordes al grado escolar...</p>
                            </div>
                        ) : isSending ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400">
                                <Loader2 size={64} className="animate-spin text-emerald-300 mb-6" />
                                <h4 className="text-xl font-bold text-slate-700 mb-2">Creando Versión Interactiva</h4>
                                <p className="max-w-md">Estamos preparando las preguntas, opciones y claves de respuesta para que los alumnos puedan responder en el Portal de Padres...</p>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400 border-2 border-dashed border-slate-100 m-4 rounded-2xl">
                                <div className="bg-slate-50 p-6 rounded-full mb-6">
                                    <Sparkles size={64} className="opacity-20" />
                                </div>
                                <h4 className="text-xl font-bold text-slate-700 mb-2">No se ha generado contenido</h4>
                                <p className="max-w-md">Selecciona los temas en el panel de la izquierda y presiona "Generar" para la versión impresa o "Enviar al Portal" para la versión interactiva.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
