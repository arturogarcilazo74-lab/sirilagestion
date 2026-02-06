import React, { useState } from 'react';
import { Book as BookIcon, Search, Plus, User, Calendar, BookOpen, CheckCircle, Clock, ArrowLeft, Trash2, Filter, Upload, ExternalLink, GraduationCap } from 'lucide-react';
import { Student, Book } from '../types';

interface LibraryViewProps {
    students: Student[];
    books: Book[];
    onBack: () => void;
    onAddBook: (book: Book) => void;
    onUpdateBook: (book: Book) => void;
    onDeleteBook: (id: string) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({ students, books, onBack, onAddBook, onUpdateBook, onDeleteBook }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'CATALOG' | 'LOANS'>('CATALOG');
    const [selectedGrade, setSelectedGrade] = useState<string>('TODOS');
    const [showAddModal, setShowAddModal] = useState(false);

    // New Book Form State
    const [newBook, setNewBook] = useState<Partial<Book>>({
        title: '',
        author: '',
        grade: 'TODOS',
        category: 'Libro de Texto',
        status: 'AVAILABLE',
        cover: '',
        fileUrl: ''
    });

    const [isUploading, setIsUploading] = useState(false);

    const grades = ['TODOS', '1ro', '2do', '3ro', '4to', '5to', '6to', 'GLOBAL'];

    const filteredBooks = books.filter(book => {
        const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            book.author.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesGrade = selectedGrade === 'TODOS' || book.grade === selectedGrade;
        return matchesSearch && matchesGrade;
    });

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'cover' | 'fileUrl') => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target?.result as string;
            setNewBook(prev => ({ ...prev, [field]: base64 }));
            setIsUploading(false);
        };
        reader.onerror = () => {
            console.error("Error reading file");
            setIsUploading(false);
        };
        reader.readAsDataURL(file);
    };

    const openBook = (fileUrl: string | undefined) => {
        if (!fileUrl) return;

        // If it's already a URL, just open it
        if (fileUrl.startsWith('http')) {
            window.open(fileUrl, '_blank');
            return;
        }

        // Handle data URI (base64)
        try {
            const parts = fileUrl.split(';base64,');
            if (parts.length !== 2) {
                // Not a standard data URI, try direct opening as fallback
                window.open(fileUrl, '_blank');
                return;
            }

            const contentType = parts[0].split(':')[1];
            const raw = window.atob(parts[1]);
            const rawLength = raw.length;
            const uInt8Array = new Uint8Array(rawLength);

            for (let i = 0; i < rawLength; ++i) {
                uInt8Array[i] = raw.charCodeAt(i);
            }

            const blob = new Blob([uInt8Array], { type: contentType });
            const url = URL.createObjectURL(blob);

            const newWindow = window.open(url, '_blank');
            if (!newWindow) {
                alert("El navegador bloqueó la apertura de la ventana emergente. Por favor, permite las ventanas emergentes para este sitio.");
            }
        } catch (error) {
            console.error("Error opening book blob:", error);
            // Final fallback
            window.open(fileUrl, '_blank');
        }
    };

    const handleSubmitBook = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newBook.title) return;

        const bookToAdd: Book = {
            ...newBook as Book,
            id: `book-${Date.now()}`,
            status: 'AVAILABLE'
        };

        onAddBook(bookToAdd);
        setShowAddModal(false);
        setNewBook({
            title: '',
            author: '',
            grade: 'TODOS',
            category: 'Libro de Texto',
            status: 'AVAILABLE',
            cover: '',
            fileUrl: ''
        });
    };

    return (
        <div className="p-6 md:p-8 space-y-8 min-h-screen bg-slate-50/50 pb-24 overflow-y-auto">

            <button
                onClick={onBack}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-bold mb-4"
            >
                <ArrowLeft size={20} /> Volver al Inicio
            </button>

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <span className="p-3 bg-amber-100 text-amber-600 rounded-2xl" role="img" aria-label="Icono de Biblioteca">
                            <BookIcon size={32} />
                        </span>
                        Biblioteca Escolar
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">Acervo bibliográfico y Libros de Texto Gratuitos</p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('CATALOG')}
                        className={`px-4 py-2 rounded-xl font-bold transition-all ${activeTab === 'CATALOG' ? 'bg-amber-500 text-white shadow-lg shadow-amber-200' : 'bg-white text-slate-500 hover:bg-amber-50'}`}
                    >
                        Catálogo
                    </button>
                    <button
                        onClick={() => setActiveTab('LOANS')}
                        className={`px-4 py-2 rounded-xl font-bold transition-all ${activeTab === 'LOANS' ? 'bg-amber-500 text-white shadow-lg shadow-amber-200' : 'bg-white text-slate-500 hover:bg-amber-50'}`}
                    >
                        Préstamos
                    </button>
                </div>
            </div>

            {activeTab === 'CATALOG' && (
                <>
                    {/* Filters & Search */}
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} aria-hidden="true" title="Buscar" />
                            <input
                                type="text"
                                placeholder="Buscar libros, autores o temas..."
                                className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-amber-400 font-medium shadow-sm transition-all text-lg"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                aria-label="Buscar en catálogo de biblioteca"
                            />
                        </div>

                        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                            {grades.map(grade => (
                                <button
                                    key={grade}
                                    onClick={() => setSelectedGrade(grade)}
                                    className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-all border ${selectedGrade === grade ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-500 border-slate-200 hover:border-amber-400'}`}
                                >
                                    {grade}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center justify-center gap-2 bg-amber-500 text-white px-6 py-4 rounded-2xl font-bold hover:bg-amber-600 transition-all shadow-xl shadow-amber-200 active:scale-95"
                        >
                            <Plus size={20} />
                            Subir Libro
                        </button>
                    </div>

                    {/* Book Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                        {filteredBooks.map(book => (
                            <div key={book.id} className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-xl transition-all border border-slate-100 group flex flex-col h-full relative overflow-hidden">
                                <div className={`absolute top-4 right-4 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider z-10 shadow-sm
                                    ${book.grade === 'GLOBAL' ? 'bg-purple-500 text-white' : 'bg-slate-800 text-white'}`}>
                                    {book.grade}
                                </div>

                                <div className="w-full aspect-[2/3] bg-slate-100 rounded-xl mb-4 overflow-hidden shadow-inner relative group-hover:shadow-md transition-all">
                                    {book.cover ? (
                                        <img src={book.cover} alt={book.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                                            <BookIcon size={48} strokeWidth={1} />
                                            <span className="text-[10px] font-bold mt-2 uppercase tracking-tight">Sin Portada</span>
                                        </div>
                                    )}

                                    {book.fileUrl && (
                                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button
                                                onClick={() => { if (book.fileUrl) openBook(book.fileUrl); }}
                                                className="bg-white text-slate-900 p-3 rounded-full hover:scale-110 transition-transform shadow-lg"
                                                title="Abrir Libro"
                                            >
                                                <ExternalLink size={24} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 flex flex-col">
                                    <h3 className="font-bold text-slate-800 leading-tight mb- line-clamp-2" title={book.title}>{book.title}</h3>
                                    <p className="text-sm text-slate-500 font-medium mb-auto">{book.author || 'Autor Desconocido'}</p>

                                    <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{book.category}</span>
                                        <button
                                            onClick={() => {
                                                if (confirm('¿Eliminar este libro de la biblioteca?')) onDeleteBook(book.id);
                                            }}
                                            className="text-red-400 hover:text-red-600 transition-colors p-1"
                                            aria-label="Eliminar libro"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {filteredBooks.length === 0 && (
                            <div className="col-span-full py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                                <BookIcon size={64} strokeWidth={1} className="mb-4 opacity-20" />
                                <p className="text-xl font-bold">No se encontraron libros</p>
                                <p className="text-sm">Intenta otra búsqueda o sube un nuevo material.</p>
                            </div>
                        )}
                    </div>
                </>
            )}

            {activeTab === 'LOANS' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Libro</th>
                                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Estudiante</th>
                                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Fecha Entrega</th>
                                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {books.filter(b => b.status !== 'AVAILABLE').map(book => {
                                const student = students.find(s => s.id === book.borrowedBy);
                                return (
                                    <tr key={book.id} className="hover:bg-slate-50">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3" title={book.title} aria-label={`Detalles de ${book.title}`}>
                                                {book.cover ? (
                                                    <img src={book.cover} className="w-8 h-12 object-cover rounded shadow-sm" alt={book.title} title={book.title} />
                                                ) : <div className="w-8 h-12 bg-slate-100 rounded flex items-center justify-center text-slate-300" role="img" aria-label="Libro sin portada" title="Libro sin portada"><BookIcon size={16} /></div>}
                                                <span className="font-bold text-slate-700">{book.title}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {student ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-slate-200 overflow-hidden">
                                                        <img
                                                            src={student.avatar === "PENDING_LOAD" ? `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=random` : (student.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=random`)}
                                                            className="w-full h-full object-cover"
                                                            alt={`Avatar de ${student.name}`}
                                                        />
                                                    </div>
                                                    <span className="text-sm font-medium text-slate-600">{student.name}</span>
                                                </div>
                                            ) : <span className="text-slate-400 italic">Desconocido</span>}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                                                <Calendar size={16} className="text-slate-400" />
                                                {book.dueDate}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold
                                                ${book.status === 'OVERDUE' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {book.status === 'OVERDUE' ? <Clock size={14} /> : <BookOpen size={14} />}
                                                {book.status === 'OVERDUE' ? 'Vencido' : 'En Préstamo'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                            {books.filter(b => b.status !== 'AVAILABLE').length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-12 text-center text-slate-400 font-medium">No hay préstamos activos en este momento.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add Book Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl relative overflow-hidden animate-slideUp">
                        <div className="bg-slate-900 p-6 flex justify-between items-center">
                            <h2 className="text-white font-bold text-xl flex items-center gap-2">
                                <Plus size={24} className="text-amber-400" />
                                Subir Nuevo Libro
                            </h2>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white transition-colors">
                                &times;
                            </button>
                        </div>

                        <form onSubmit={handleSubmitBook} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Título del Libro</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                                        placeholder="Ej: Libro de Texto Geografía"
                                        value={newBook.title}
                                        onChange={e => setNewBook({ ...newBook, title: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Autor / Editorial</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                                        placeholder="Ej: SEP / NEM"
                                        value={newBook.author}
                                        onChange={e => setNewBook({ ...newBook, author: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Grado Escolar</label>
                                    <select
                                        className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-amber-500 font-bold appearance-none"
                                        value={newBook.grade}
                                        onChange={e => setNewBook({ ...newBook, grade: e.target.value })}
                                        aria-label="Seleccionar grado escolar"
                                    >
                                        {grades.map(g => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Categoría</label>
                                    <select
                                        className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-amber-500 font-bold appearance-none"
                                        value={newBook.category}
                                        onChange={e => setNewBook({ ...newBook, category: e.target.value })}
                                        aria-label="Seleccionar categoría"
                                    >
                                        <option value="Libro de Texto">Libro de Texto</option>
                                        <option value="Ficción">Ficción</option>
                                        <option value="Enciclopedia">Enciclopedia</option>
                                        <option value="Ciencias">Ciencias</option>
                                        <option value="Historia">Historia</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Portada (Opcional)</label>
                                    <div className="relative h-32 bg-slate-100 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden hover:bg-slate-50 transition-colors">
                                        {newBook.cover ? (
                                            <img src={newBook.cover} className="w-full h-full object-cover" />
                                        ) : (
                                            <>
                                                <Upload size={24} className="text-slate-300 mb-2" />
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">Subir Imagen</span>
                                            </>
                                        )}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            onChange={e => handleFileUpload(e, 'cover')}
                                            aria-label="Subir imagen de portada"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Archivo de Libro (PDF)</label>
                                    <div className="relative h-32 bg-slate-100 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden hover:bg-slate-50 transition-colors">
                                        {newBook.fileUrl ? (
                                            <div className="flex flex-col items-center p-2 text-center text-emerald-600">
                                                <CheckCircle size={32} />
                                                <span className="text-[10px] font-bold uppercase mt-2">Archivo Preparado</span>
                                            </div>
                                        ) : (
                                            <>
                                                <BookIcon size={24} className="text-slate-300 mb-2" />
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">Subir PDF</span>
                                            </>
                                        )}
                                        <input
                                            type="file"
                                            accept=".pdf"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            onChange={e => handleFileUpload(e, 'fileUrl')}
                                            aria-label="Subir archivo PDF del libro"
                                        />
                                    </div>
                                </div>
                            </div>

                            <p className="text-[10px] text-slate-400 italic">Nota: Los archivos se guardan localmente en el dispositivo y se sincronizan con el servidor.</p>

                            <button
                                type="submit"
                                disabled={isUploading}
                                className={`w-full py-4 rounded-2xl font-black text-lg shadow-xl transition-all active:scale-[0.98] ${isUploading
                                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                                    : 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-200'
                                    }`}
                            >
                                {isUploading ? 'PROCESANDO ARCHIVO...' : 'GUARDAR EN BIBLIOTECA'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
