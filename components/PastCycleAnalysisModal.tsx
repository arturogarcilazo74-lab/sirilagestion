import React, { useState, useEffect } from 'react';
import { History, X, AlertTriangle, TrendingUp, TrendingDown, BookOpen, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../services/api';

interface PastCycleAnalysisModalProps {
    groupName: string;
    onClose: () => void;
}

export const PastCycleAnalysisModal: React.FC<PastCycleAnalysisModalProps> = ({ groupName, onClose }) => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const res = await api.getGroupHistory(groupName);
                if (res) {
                    setData(res);
                } else {
                    setError('No se encontraron antecedentes para este grupo en el ciclo anterior.');
                }
            } catch (err: any) {
                setError(err.message || 'Error al cargar los antecedentes.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [groupName]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-slideUp">
                {/* Header */}
                <div className="bg-slate-800 px-8 py-6 flex justify-between items-center sticky top-0 z-10 text-white">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                                <History className="w-5 h-5 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold font-outfit">Análisis del Ciclo Anterior</h2>
                        </div>
                        <p className="text-slate-300 text-sm ml-13">Antecedentes del actual {groupName}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2.5 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 overflow-y-auto bg-slate-50 flex-1">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                            <p className="text-slate-500 font-medium">Recopilando datos del ciclo anterior...</p>
                        </div>
                    ) : error ? (
                        <div className="bg-red-50 text-red-600 p-6 rounded-2xl flex items-center gap-4">
                            <AlertCircle className="w-8 h-8" />
                            <p className="font-medium">{error}</p>
                        </div>
                    ) : data ? (
                        <div className="space-y-6">
                            
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-blue-500" />
                                    Resumen Académico (Promedio: {data.academicAverage})
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                                        <div className="flex items-center gap-2 mb-2">
                                            <TrendingUp className="w-5 h-5 text-green-600" />
                                            <span className="font-bold text-green-800">Fortalezas</span>
                                        </div>
                                        <p className="text-sm text-green-700">{data.strengths}</p>
                                    </div>
                                    <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                                        <div className="flex items-center gap-2 mb-2">
                                            <TrendingDown className="w-5 h-5 text-orange-600" />
                                            <span className="font-bold text-orange-800">Áreas de Oportunidad</span>
                                        </div>
                                        <p className="text-sm text-orange-700">{data.opportunities}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-purple-500" />
                                    Antecedentes de Comportamiento
                                </h3>
                                <p className="text-slate-600 mb-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    {data.behaviorSummary}
                                </p>
                                <div className="flex gap-4">
                                    <div className="flex-1 bg-blue-50 p-4 rounded-xl text-center">
                                        <span className="block text-2xl font-bold text-blue-600">{data.positiveLogs}</span>
                                        <span className="text-xs text-blue-800 uppercase tracking-wider font-semibold">Reportes Positivos</span>
                                    </div>
                                    <div className="flex-1 bg-red-50 p-4 rounded-xl text-center">
                                        <span className="block text-2xl font-bold text-red-600">{data.negativeLogs}</span>
                                        <span className="text-xs text-red-800 uppercase tracking-wider font-semibold">Reportes Negativos</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 text-center text-sm text-blue-700">
                                <p>Este análisis se generó automáticamente con base en los datos de estos alumnos cuando cursaban <strong>{data.pastGroup}</strong> durante el ciclo 2025-2026.</p>
                            </div>

                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
};
