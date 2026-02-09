
export enum AttendanceStatus {
  PRESENT = 'Presente',
  ABSENT = 'Ausente',
  LATE = 'Retardo',
  EXCUSED = 'Justificado',
  NONE = 'Ninguno'
}

export interface Student {
  id: string; // CLAVE ALUMNO
  curp: string;
  name: string;
  sex: 'HOMBRE' | 'MUJER';
  birthDate: string; // NACIMIENTO
  birthPlace: string; // NACIMIENTO_1 (Estado)
  group?: string; // e.g. "4to A" - Optional for backward compatibility, defaults to SchoolConfig.gradeGroup

  // Datos Escolares / Estado
  enrollmentDate: string; // ALTA
  status: 'INSCRITO' | 'BAJA' | 'TRASLADO';
  repeater: boolean; // REPETIDOR

  // Apoyos
  bap: string; // BAP (Barreras Aprendizaje) - Texto descriptivo o "NINGUNA"
  usaer: boolean; // USAER

  // Contacto
  avatar: string; // URL
  guardianName: string;
  guardianPhone: string;
  address?: string; // Domicilio
  guardianOccupation?: string; // Ocupación del Padre/Tutor

  // Métricas Sistema
  attendance: Record<string, AttendanceStatus>; // date YYYY-MM-DD -> Status
  behaviorPoints: number; // Positive or negative
  assignmentsCompleted: number;
  completedAssignmentIds: string[]; // List of IDs of completed assignments
  assignmentResults?: Record<string, number>; // assignmentId -> score (0-10)
  totalAssignments: number;
  participationCount: number;
  grades: TrimesterGrade[]; // Array of exactly 3 trimesters (indices 0, 1, 2)
  annualFeePaid: boolean; // Cuota Anual
  eventFeePaid?: boolean; // Cooperación Eventos (Generico)
  examFeePaid?: boolean; // Exámenes (Generico)
}

export interface TrimesterGrade {
  lenguajes: number;
  saberes: number;
  etica: number;
  humano: number;
}

export interface BehaviorLog {
  id: string;
  studentId: string;
  studentName: string;
  type: 'POSITIVE' | 'NEGATIVE' | 'USAER_OBSERVATION' | 'USAER_MEETING' | 'USAER_ACCOMMODATION' | 'USAER_SUGGESTION';
  description: string;
  date: string;
  points: number;
}

export interface InteractiveQuestion {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  points: number;
}


export interface DraggableItem {
  id: string;
  type: 'TEXT' | 'IMAGE';
  content: string; // Text content or Image Base64/URL
  initialX?: number; // Optional initial position (tray is default otherwise)
  initialY?: number;
  width?: number; // Optional specific width
}

export interface InteractiveZone {
  id: string;
  type: 'TEXT_INPUT' | 'DROP_ZONE' | 'SELECTABLE' | 'MATCH_SOURCE' | 'MATCH_TARGET';
  x: number; // %
  y: number; // %
  width: number; // %
  height: number; // %
  correctAnswer?: string; // For text/drop
  isCorrect?: boolean; // For SELECTABLE (multi-select correct items)
  matchId?: string; // For MATCH_SOURCE/TARGET pairs
  points: number;
}

export interface WorksheetData {
  type: 'WORKSHEET';
  imageUrl: string;
  gradingCriteria?: string;
  minScoreToPass?: number;
  answerKeyPoints?: { x: number, y: number }[]; // Legacy
  interactiveZones?: InteractiveZone[]; // NEW: Defined areas
  draggableItems?: DraggableItem[];
  videoUrl?: string;
}

export interface HtmlGameData {
  type: 'HTML_GAME';
  htmlContent: string;
  gameType?: 'MULTIPLICATION' | 'OTHER';
}

export type InteractiveData =
  | { type: 'QUIZ'; questions: InteractiveQuestion[]; minScoreToPass?: number; videoUrl?: string; forTeacherOnly?: boolean; }
  | WorksheetData
  | HtmlGameData;

export interface Assignment {
  id: string;
  title: string;
  dueDate: string;
  completedStudentIds: string[]; // Keep for redundancy/fast lookup if needed
  description?: string;
  type?: 'TASK' | 'INTERACTIVE';
  interactiveData?: InteractiveData;
  isVisibleInParentsPortal?: boolean;
  targetGroup?: string; // NEW: To filter assignments by teacher group
  assignmentType?: 'STANDARD' | 'NEM_EVALUATION'; // To distinguish normal quizzes from teacher-only evaluations
}

export interface FinanceEvent {
  id: string;
  title: string;
  date: string;
  totalCost: number;
  costPerStudent?: number; // Optional, can be calculated or fixed
  contributions: Record<string, number>; // studentId -> amount paid
  category?: 'EVENT' | 'EXAM';
  targetGroup?: string; // NEW: To segregate finances by group
}

export interface SchoolEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  type: 'EXAM' | 'MEETING' | 'HOLIDAY' | 'ACTIVITY';
  description?: string;
  targetGroup?: string; // 'GLOBAL' (Director) or specific group id/name
  assignedTo?: string[] | 'ALL'; // List of Student IDs or 'ALL'
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  group: string; // e.g. "4to A", "Inglés", "Dirección"
  pin?: string; // Optional simple password
  avatar?: string;
  email?: string;
  phone?: string;
}

export interface SchoolConfig {
  teacherName: string;
  teacherEmail?: string;
  teacherAvatar: string;
  schoolName: string;
  schoolLogo: string;
  cct: string;
  zone: string;
  sector: string;
  gradeGroup: string;
  schedule: string;
  location: string;
  schoolYear?: string; // e.g. "2024-2025"
  directorName?: string;
  staff?: StaffMember[]; // List of teachers/staff
}

export interface Notification {
  id: string;
  studentId?: string; // If undefined, applies to all
  title: string;
  message: string;
  date: string;
  isRead: boolean;
  type: 'INFO' | 'ALERT' | 'EVENT';
}

export type ViewState = 'LANDING' | 'DASHBOARD' | 'ATTENDANCE' | 'STUDENTS' | 'TOOLS' | 'BEHAVIOR' | 'ACTIVITIES' | 'HOMEWORK_QR' | 'FINANCE' | 'DOCUMENTS' | 'SETTINGS' | 'PARENTS_PORTAL' | 'COMMUNICATIONS' | 'DIRECTOR' | 'USAER' | 'LIBRARY' | 'LITERACY';

export interface StaffTask {
  id: string;
  title: string;
  description?: string;
  assignedTo: string; // 'ALL', 'DOCENTES', or specific Staff ID
  type: 'COMMISSION' | 'DOCUMENTATION' | 'ACTIVITY';
  dueDate: string; // YYYY-MM-DD
  status: 'PENDING' | 'COMPLETED' | 'LATE';
  completedBy?: string[]; // List of Staff IDs who completed the task (for Group tasks)
  evidenceUrl?: string; // Optional link
  createdAt: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  cover?: string;
  fileUrl?: string; // URL to the actual PDF/Book file
  grade?: string; // e.g. "4to", "Global"
  category: string; // e.g. "Texto", "Ficción", "Ciencia"
  status: 'AVAILABLE' | 'BORROWED' | 'OVERDUE';
  borrowedBy?: string; // Student ID
  dueDate?: string;
}
