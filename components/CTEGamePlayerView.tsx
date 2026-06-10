import React, { useState } from 'react';
import {
    Gamepad2, Play, Trophy, CheckCircle2, XCircle,
    ChevronRight, RotateCcw, Star, Zap, Clock, Award
} from 'lucide-react';
import { CTEGame, CTEGameResult, StaffMember } from '../types';

interface CTEGamePlayerViewProps {
    games: CTEGame[];
    results: CTEGameResult[];
    currentUser: StaffMember;
    onSaveResult: (result: CTEGameResult) => void;
}

export const CTEGamePlayerView: React.FC<CTEGamePlayerViewProps> = ({
    games,
    results,
    currentUser,
    onSaveResult
}) => {
    const [activeGame, setActiveGame] = useState<CTEGame | null>(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
    const [showResult, setShowResult] = useState(false);
    const [gameCompleted, setGameCompleted] = useState(false);
    const [finalScore, setFinalScore] = useState(0);
    const [finalCorrect, setFinalCorrect] = useState(0);

    const isDirector = currentUser.role === 'Director' || currentUser.role === 'PRINCIPAL' || currentUser.group === 'Dirección';

    const myAssignedGames = games.filter(game => {
        if (isDirector) return true;
        if (!game.assignedTo) return true;
        if (game.assignedTo === 'ALL') return true;
        if (Array.isArray(game.assignedTo)) {
            return game.assignedTo.includes(currentUser.id);
        }
        return false;
    });

    const myCompletedGameIds = new Set(
        results.filter(r => r.staffId === currentUser.id).map(r => r.gameId)
    );

    const getMyResult = (gameId: string) =>
        results.find(r => r.gameId === gameId && r.staffId === currentUser.id);

    const startGame = (game: CTEGame) => {
        setActiveGame(game);
        setCurrentQuestionIndex(0);
        setSelectedAnswers({});
        setShowResult(false);
        setGameCompleted(false);
    };

    const selectAnswer = (questionId: string, answerIndex: number) => {
        if (showResult) return;
        setSelectedAnswers(prev => ({ ...prev, [questionId]: answerIndex }));
    };

    const confirmAndNext = () => {
        if (!activeGame) return;
        const currentQ = activeGame.questions[currentQuestionIndex];
        if (selectedAnswers[currentQ.id] === undefined) return;

        setShowResult(true);

        setTimeout(() => {
            if (currentQuestionIndex < activeGame.questions.length - 1) {
                setCurrentQuestionIndex(prev => prev + 1);
                setShowResult(false);
            } else {
                finishGame();
            }
        }, 1500);
    };

    const finishGame = () => {
        if (!activeGame) return;

        let correct = 0;
        activeGame.questions.forEach(q => {
            if (selectedAnswers[q.id] === q.correctIndex) correct++;
        });

        const score = Math.round((correct / activeGame.questions.length) * 100);
        setFinalScore(score);
        setFinalCorrect(correct);
        setGameCompleted(true);

        const result: CTEGameResult = {
            id: `${activeGame.id}-${currentUser.id}`,
            gameId: activeGame.id,
            staffId: currentUser.id,
            staffName: currentUser.name,
            answers: selectedAnswers,
            score,
            totalQuestions: activeGame.questions.length,
            correctAnswers: correct,
            completedAt: new Date().toISOString()
        };
        onSaveResult(result);
    };

    const closeGame = () => {
        setActiveGame(null);
        setGameCompleted(false);
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-emerald-600';
        if (score >= 60) return 'text-amber-600';
        return 'text-red-600';
    };

    const getScoreEmoji = (score: number) => {
        if (score === 100) return '🏆';
        if (score >= 80) return '⭐';
        if (score >= 60) return '👍';
        return '💪';
    };

    // Active game modal
    if (activeGame) {
        const currentQ = activeGame.questions[currentQuestionIndex];
        const isCorrect = showResult && selectedAnswers[currentQ.id] === currentQ.correctIndex;
        const isWrong = showResult && selectedAnswers[currentQ.id] !== undefined && !isCorrect;

        return (
            <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-gradient-to-br from-violet-900 to-indigo-900 animate-fadeIn">
                <div className="w-full max-w-2xl">
                    {!gameCompleted ? (
                        <div className="space-y-6">
                            {/* Header */}
                            <div className="flex justify-between items-center">
                                <span className="text-violet-300 text-sm font-bold">
                                    {currentQuestionIndex + 1} / {activeGame.questions.length}
                                </span>
                                <div className="flex gap-1">
                                    {activeGame.questions.map((_, i) => (
                                        <div
                                            key={i}
                                            className={`w-3 h-3 rounded-full ${
                                                i < currentQuestionIndex ? 'bg-emerald-400' :
                                                i === currentQuestionIndex ? 'bg-white' : 'bg-white/20'
                                            }`}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Question Card */}
                            <div className="bg-white rounded-2xl p-8 shadow-2xl">
                                <h3 className="text-xl font-bold text-slate-800 mb-6">{currentQ.text}</h3>

                                {currentQ.options && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {currentQ.options.map((opt, i) => {
                                            const isSelected = selectedAnswers[currentQ.id] === i;
                                            const isRightAnswer = i === currentQ.correctIndex;
                                            let btnClass = 'border-2 border-slate-200 bg-slate-50 text-slate-700 hover:border-violet-400 hover:bg-violet-50';
                                            if (showResult) {
                                                if (isRightAnswer) btnClass = 'border-2 border-emerald-500 bg-emerald-50 text-emerald-700';
                                                else if (isSelected && !isRightAnswer) btnClass = 'border-2 border-red-500 bg-red-50 text-red-700';
                                                else btnClass = 'border-2 border-slate-200 bg-slate-50 text-slate-400';
                                            } else if (isSelected) {
                                                btnClass = 'border-2 border-violet-500 bg-violet-50 text-violet-700 ring-2 ring-violet-200';
                                            }
                                            return (
                                                <button
                                                    key={i}
                                                    onClick={() => selectAnswer(currentQ.id, i)}
                                                    disabled={showResult}
                                                    className={`p-4 rounded-xl font-bold text-left transition-all ${btnClass}`}
                                                >
                                                    <span className="inline-block w-8 h-8 rounded-full bg-current/10 text-center leading-8 mr-2 text-sm">
                                                        {String.fromCharCode(65 + i)}
                                                    </span>
                                                    {opt}
                                                    {showResult && isRightAnswer && <CheckCircle2 size={20} className="inline ml-2 text-emerald-600" />}
                                                    {showResult && isSelected && !isRightAnswer && <XCircle size={20} className="inline ml-2 text-red-600" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex justify-center">
                                {!showResult ? (
                                    <button
                                        onClick={confirmAndNext}
                                        disabled={selectedAnswers[currentQ.id] === undefined}
                                        className="bg-white text-violet-700 px-8 py-3 rounded-xl font-black text-lg hover:bg-violet-50 disabled:opacity-40 transition-all shadow-lg"
                                    >
                                        Confirmar
                                    </button>
                                ) : (
                                    <div className={`text-2xl font-black ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {isCorrect ? '¡Correcto! 🎉' : `Incorrecto — Era: ${currentQ.options?.[currentQ.correctIndex || 0]}`}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* Results */
                        <div className="text-center space-y-6">
                            <div className="text-7xl">{getScoreEmoji(finalScore)}</div>
                            <h2 className="text-4xl font-black text-white">¡Juego Completado!</h2>

                            <div className="bg-white/10 rounded-2xl p-8 backdrop-blur-sm max-w-md mx-auto space-y-4">
                                <div className={`text-6xl font-black ${getScoreColor(finalScore)}`}>
                                    {finalScore}%
                                </div>
                                <p className="text-violet-200">
                                    {finalCorrect} de {activeGame.questions.length} respuestas correctas
                                </p>

                                <div className="grid grid-cols-3 gap-3 pt-4">
                                    {activeGame.questions.map((q, i) => {
                                        const wasCorrect = selectedAnswers[q.id] === q.correctIndex;
                                        return (
                                            <div
                                                key={i}
                                                className={`p-2 rounded-lg text-center ${
                                                    wasCorrect ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                                                }`}
                                            >
                                                {wasCorrect ? <CheckCircle2 size={20} className="mx-auto" /> : <XCircle size={20} className="mx-auto" />}
                                                <span className="text-xs font-bold block mt-1">#{i + 1}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex justify-center gap-4">
                                <button
                                    onClick={closeGame}
                                    className="bg-white text-violet-700 px-8 py-3 rounded-xl font-black text-lg hover:bg-violet-50 transition-all shadow-lg"
                                >
                                    Volver a la Lista
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Main view - game list
    return (
        <div className="animate-fadeIn space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Actividades de Consejo Técnico</h2>
                <p className="text-sm text-slate-500">Juegos y trivias asignadas por la dirección</p>
            </div>

            {games.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
                    <Gamepad2 size={48} className="mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-bold text-slate-600">No hay juegos creados aún</h3>
                    <p className="text-sm text-slate-400 mt-1">La dirección debe crear y asignar juegos desde el módulo de Consejo Técnico</p>
                    <p className="text-xs text-slate-300 mt-3">Si acabas de crear un juego, espera unos segundos y recarga la página</p>
                </div>
            ) : myAssignedGames.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
                    <Gamepad2 size={48} className="mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-bold text-slate-600">Hay {games.length} juego(s) creado(s)</h3>
                    <p className="text-sm text-slate-400 mt-1">Pero no tienes juegos asignados. Contacta a la dirección.</p>
                    <p className="text-xs text-slate-300 mt-3">Tu usuario: {currentUser.name} (ID: {currentUser.id})</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {myAssignedGames.map(game => {
                        const isCompleted = myCompletedGameIds.has(game.id);
                        const myResult = getMyResult(game.id);

                        return (
                            <div
                                key={game.id}
                                className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                                    isCompleted
                                        ? 'border-emerald-200 ring-1 ring-emerald-100'
                                        : 'border-slate-100 hover:shadow-lg hover:-translate-y-1'
                                }`}
                            >
                                <div className={`h-24 flex items-center justify-center ${
                                    isCompleted
                                        ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                                        : 'bg-gradient-to-br from-violet-500 to-indigo-600'
                                }`}>
                                    {isCompleted ? (
                                        <div className="text-center text-white">
                                            <Award size={32} className="mx-auto" />
                                            <span className="text-xs font-bold">{myResult?.score}%</span>
                                        </div>
                                    ) : (
                                        <Zap size={32} className="text-white/50" />
                                    )}
                                </div>

                                <div className="p-5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                            isCompleted
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-amber-100 text-amber-700'
                                        }`}>
                                            {isCompleted ? 'COMPLETADO' : 'PENDIENTE'}
                                        </span>
                                        <span className="text-xs text-slate-400">{game.questions.length} preguntas</span>
                                    </div>
                                    <h3 className="font-bold text-slate-800 mb-2">{game.title}</h3>

                                    {isCompleted && myResult && (
                                        <div className="mt-2 flex items-center gap-2 text-sm">
                                            <span className={`font-bold ${getScoreColor(myResult.score)}`}>
                                                {myResult.correctAnswers}/{myResult.totalQuestions} correctas
                                            </span>
                                            <span className="text-slate-400">
                                                • {new Date(myResult.completedAt).toLocaleDateString('es-MX')}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="border-t border-slate-100 p-3">
                                    {isCompleted ? (
                                        <button
                                            onClick={() => startGame(game)}
                                            className="w-full bg-slate-100 text-slate-600 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <RotateCcw size={14} /> Jugar de Nuevo
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => startGame(game)}
                                            className="w-full bg-violet-600 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-violet-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-violet-200"
                                        >
                                            <Play size={14} /> Comenzar
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Historial de resultados */}
            {results.filter(r => r.staffId === currentUser.id).length > 0 && (
                <div className="mt-8">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Mi Historial</h3>
                    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="text-left p-3 font-bold text-slate-500 uppercase text-xs">Juego</th>
                                        <th className="text-center p-3 font-bold text-slate-500 uppercase text-xs">Aciertos</th>
                                        <th className="text-center p-3 font-bold text-slate-500 uppercase text-xs">Puntaje</th>
                                        <th className="text-center p-3 font-bold text-slate-500 uppercase text-xs">Fecha</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {results
                                        .filter(r => r.staffId === currentUser.id)
                                        .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
                                        .map(r => {
                                            const game = games.find(g => g.id === r.gameId);
                                            return (
                                                <tr key={r.id} className="border-b border-slate-50">
                                                    <td className="p-3 font-medium text-slate-800">{game?.title || 'Juego eliminado'}</td>
                                                    <td className="p-3 text-center font-bold">{r.correctAnswers}/{r.totalQuestions}</td>
                                                    <td className={`p-3 text-center font-bold ${getScoreColor(r.score)}`}>{r.score}%</td>
                                                    <td className="p-3 text-center text-slate-400">{new Date(r.completedAt).toLocaleDateString('es-MX')}</td>
                                                </tr>
                                            );
                                        })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
