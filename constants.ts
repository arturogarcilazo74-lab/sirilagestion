import { Assignment, SchoolConfig, SchoolEvent, Student } from './types';

export const DB_KEYS = {
    STUDENTS: 'SIRILA_DB_STUDENTS',
    ASSIGNMENTS: 'SIRILA_DB_ASSIGNMENTS',
    EVENTS: 'SIRILA_DB_EVENTS',
    LOGS: 'SIRILA_DB_LOGS',
    CONFIG: 'SIRILA_DB_CONFIG',
    FINANCE: 'SIRILA_DB_FINANCE'
};

export const MOCK_ASSIGNMENTS: Assignment[] = [
    { id: 'A1', title: 'Ensayo de Historia', dueDate: '2023-10-15', completedStudentIds: [] },
    { id: 'A2', title: 'Ejercicios de Matemáticas', dueDate: '2023-10-18', completedStudentIds: [] },
    { id: 'A3', title: 'Proyecto de Ciencias', dueDate: '2023-10-25', completedStudentIds: [] },
];

export const MOCK_EVENTS: SchoolEvent[] = [
    { id: 'E1', title: 'Examen de Matemáticas', date: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString().split('T')[0], type: 'EXAM', description: 'Evaluación parcial bloque 2' },
    { id: 'E2', title: 'Junta de Padres', date: new Date(new Date().setDate(new Date().getDate() + 5)).toISOString().split('T')[0], type: 'MEETING', description: 'Entrega de boletas' },
    { id: 'E3', title: 'Suspensión de Labores', date: new Date(new Date().setDate(new Date().getDate() + 10)).toISOString().split('T')[0], type: 'HOLIDAY', description: 'Consejo Técnico' },
    { id: 'E4', title: 'Festival de Primavera', date: new Date(new Date().setDate(new Date().getDate() + 15)).toISOString().split('T')[0], type: 'ACTIVITY', description: 'Todos los grados' },
];

export const MOCK_STUDENTS: Student[] = [
    {
        id: '20210002951',
        curp: 'AUCD160731HSLNNYA1',
        name: 'ANGULO CONTRERAS DYLAN ROBERTO',
        sex: 'HOMBRE',
        birthDate: '2016-07-31',
        birthPlace: 'SINALOA',
        enrollmentDate: '2022-08-28',
        status: 'INSCRITO',
        repeater: false,
        bap: 'DSA',
        usaer: true,
        avatar: 'https://picsum.photos/100/100?random=1',
        guardianName: 'Maria García',
        guardianPhone: '687-180-8295',
        attendance: {},
        behaviorPoints: 5,
        assignmentsCompleted: 3,
        completedAssignmentIds: ['A1', 'A2', 'A3'],
        totalAssignments: 3,
        participationCount: 3,
        grades: [
            { lenguajes: 8.8, saberes: 9.2, etica: 9.0, humano: 8.5 },
            { lenguajes: 9.5, saberes: 9.8, etica: 9.2, humano: 9.0 }
        ],
        annualFeePaid: true
    },
    {
        id: '20210002952',
        curp: 'LOCR160215HDFRRY02',
        name: 'LOPEZ CASTRO CARLOS',
        sex: 'HOMBRE',
        birthDate: '2016-02-15',
        birthPlace: 'CIUDAD DE MEXICO',
        enrollmentDate: '2022-08-28',
        status: 'INSCRITO',
        repeater: false,
        bap: 'NINGUNA',
        usaer: false,
        avatar: 'https://picsum.photos/100/100?random=2',
        guardianName: 'Juan López',
        guardianPhone: '555-0102',
        attendance: {},
        behaviorPoints: 2,
        assignmentsCompleted: 2,
        completedAssignmentIds: ['A1', 'A2'],
        totalAssignments: 3,
        participationCount: 1,
        grades: [
            { lenguajes: 6.5, saberes: 7.2, etica: 7.0, humano: 7.5 },
            { lenguajes: 8.0, saberes: 7.8, etica: 7.5, humano: 7.0 }
        ],
        annualFeePaid: false
    },
    {
        id: '20210002953',
        curp: 'MAMS160520MGRRNS03',
        name: 'MARTINEZ SOFIA',
        sex: 'MUJER',
        birthDate: '2016-05-20',
        birthPlace: 'GUERRERO',
        enrollmentDate: '2022-08-28',
        status: 'INSCRITO',
        repeater: true,
        bap: 'LENGUAJE',
        usaer: true,
        avatar: 'https://picsum.photos/100/100?random=3',
        guardianName: 'Pedro Martinez',
        guardianPhone: '555-0103',
        attendance: {},
        behaviorPoints: -1,
        assignmentsCompleted: 1,
        completedAssignmentIds: ['A1'],
        totalAssignments: 3,
        participationCount: 0,
        grades: [
            { lenguajes: 5.5, saberes: 6.2, etica: 6.0, humano: 6.5 },
            { lenguajes: 5.5, saberes: 5.8, etica: 6.0, humano: 5.5 }
        ],
        annualFeePaid: false
    },
    {
        id: '20210002954',
        curp: 'AAML160910HMXRRZ04',
        name: 'ANGEL MIGUEL',
        sex: 'HOMBRE',
        birthDate: '2016-09-10',
        birthPlace: 'MEXICO',
        enrollmentDate: '2022-08-28',
        status: 'INSCRITO',
        repeater: false,
        bap: 'NINGUNA',
        usaer: false,
        avatar: 'https://picsum.photos/100/100?random=4',
        guardianName: 'Luisa Ángel',
        guardianPhone: '555-0104',
        attendance: {},
        behaviorPoints: 8,
        assignmentsCompleted: 3,
        completedAssignmentIds: ['A1', 'A2', 'A3'],
        totalAssignments: 3,
        participationCount: 5,
        grades: [
            { lenguajes: 9.2, saberes: 9.4, etica: 9.5, humano: 10 },
            { lenguajes: 9.8, saberes: 9.9, etica: 9.6, humano: 9.7 }
        ],
        annualFeePaid: true
    },
    {
        id: '20210002955',
        curp: 'RUVL161105MJCLLR05',
        name: 'RUIZ VALENTINA',
        sex: 'MUJER',
        birthDate: '2016-11-05',
        birthPlace: 'JALISCO',
        enrollmentDate: '2022-08-28',
        status: 'INSCRITO',
        repeater: false,
        bap: 'NINGUNA',
        usaer: false,
        avatar: 'https://picsum.photos/100/100?random=5',
        guardianName: 'Roberto Ruiz',
        guardianPhone: '555-0105',
        attendance: {},
        behaviorPoints: 0,
        assignmentsCompleted: 2,
        completedAssignmentIds: ['A2', 'A3'],
        totalAssignments: 3,
        participationCount: 2,
        grades: [
            { lenguajes: 7.5, saberes: 7.8, etica: 8.0, humano: 8.2 },
            { lenguajes: 7.8, saberes: 8.0, etica: 8.5, humano: 8.0 }
        ],
        annualFeePaid: true
    },
    {
        id: '20210002956',
        curp: 'TODL160130HPLRRM06',
        name: 'TORRES DIEGO',
        sex: 'HOMBRE',
        birthDate: '2016-01-30',
        birthPlace: 'PUEBLA',
        enrollmentDate: '2022-08-28',
        status: 'INSCRITO',
        repeater: false,
        bap: 'NINGUNA',
        usaer: false,
        avatar: 'https://picsum.photos/100/100?random=6',
        guardianName: 'Elena Torres',
        guardianPhone: '555-0106',
        attendance: {},
        behaviorPoints: 3,
        assignmentsCompleted: 1,
        completedAssignmentIds: ['A3'],
        totalAssignments: 3,
        participationCount: 2,
        grades: [
            { lenguajes: 8.0, saberes: 8.2, etica: 8.5, humano: 8.8 },
            { lenguajes: 8.4, saberes: 8.6, etica: 8.8, humano: 8.5 }
        ],
        annualFeePaid: false
    },
];

export const DEFAULT_CONFIG: SchoolConfig = {
    teacherName: 'Profe. Rodriguez',
    teacherEmail: 'docente@escuela.edu.mx',
    teacherAvatar: 'https://picsum.photos/200/200?random=99',
    schoolName: 'Escuela Primaria Jaime Nunó',
    schoolLogo: '',
    cct: '25DPR0867D',
    zone: '025',
    sector: 'IX',
    gradeGroup: '5° Grado - A',
    schedule: '13:00 - 18:00 hrs',
    location: 'Guasave, Sinaloa',
    schoolYear: '2024-2025',
    directorName: 'Profr. Director General'
};
