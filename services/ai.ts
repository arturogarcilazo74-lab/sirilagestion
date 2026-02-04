import { Student } from "../types";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY || '';

// Helper to handle model fallbacks using direct REST API
const generateWithFallback = async (input: string | any[], config?: any): Promise<string> => {
  const trimmedKey = apiKey.trim();
  if (!trimmedKey) throw new Error("API Key not found");

  let modelsToTry = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-1.0-pro",
    "gemini-pro"
  ];

  // 1. Dynamic Discovery: Try to fetch available models for this key
  try {
    const listResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${trimmedKey}`
    );

    if (listResponse.ok) {
      const data = await listResponse.json();
      if (data.models) {
        // Filter for models that support generateContent
        const availableModels = data.models
          .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
          .map((m: any) => m.name.replace('models/', '')); // Remove 'models/' prefix

        if (availableModels.length > 0) {
          console.log("Found available models:", availableModels);
          // Prioritize flash/pro models if available, otherwise use whatever is there
          modelsToTry = [
            ...availableModels.filter((m: string) => m.includes('flash')),
            ...availableModels.filter((m: string) => m.includes('pro') && !m.includes('vision')), // Avoid vision-only if possible
            ...availableModels
          ];
          // Remove duplicates
          modelsToTry = [...new Set(modelsToTry)];
        }
      }
    }
  } catch (e) {
    console.warn("Failed to list models, falling back to hardcoded list", e);
  }

  const errors: string[] = [];

  // Construct parts based on input type
  const parts = Array.isArray(input) ? input : [{ text: input }];

  for (const model of modelsToTry) {
    try {
      // If sending images (inline_data), skip models that might not support it if we knew (but 1.5 flash/pro do).
      // gemini-pro (1.0) is text only usually, gemini-pro-vision is for images. 
      // 1.5 models are multimodal. 
      // If input has images and we are on a text-only model, it might fail.

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${trimmedKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: parts
            }],
            generationConfig: config || {}
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (text) return text;

    } catch (e: any) {
      console.warn(`Model ${model} failed:`, e.message || e);
      errors.push(`${model}: ${e.message || e}`);
    }
  }

  throw new Error(`Error de IA. Modelos probados: ${modelsToTry.join(', ')}. Detalles: ${errors.join(' | ')}. Verifica tu API Key.`);
};

export const generateSmartTeams = async (students: Student[], teamCount: number): Promise<{ teams: { name: string, members: string[] }[] }> => {
  const studentData = students.map(s => ({
    name: s.name,
    behavior: s.behaviorPoints,
    performance: (s.grades || []).reduce((acc, g: any) => acc + (typeof g === 'number' ? g : (Number(g.lenguajes || 0) + Number(g.saberes || 0) + Number(g.etica || 0) + Number(g.humano || 0)) / 4), 0) / ((s.grades || []).length || 1)
  }));

  const prompt = `Divide a los estudiantes en ${teamCount} equipos equilibrados basados en su rendimiento y conducta.
    Mezcla estudiantes de alto rendimiento con otros que requieren apoyo para equilibrar.
    Genera nombres creativos para los equipos en ESPAÑOL (Ej. 'Los invencibles', 'Exploradores', etc).
    Devuelve SOLO JSON válido con esta estructura: {"teams": [{"name": "Nombre Equipo", "members": ["Nombre Alumno"]}]}.
    Estudiantes: ${JSON.stringify(studentData)}`;

  const config = {
    responseMimeType: "application/json"
  };

  try {
    const text = await generateWithFallback(prompt, config);
    // Clean up potential markdown code blocks if present
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("Error generating smart teams:", e);
    throw e;
  }
};

export const analyzeClassPerformance = async (students: Student[]): Promise<string> => {
  const summary = students.map(s => ({
    name: s.name,
    avgGrade: (s.grades || []).reduce((acc, g: any) => acc + (typeof g === 'number' ? g : (Number(g.lenguajes || 0) + Number(g.saberes || 0) + Number(g.etica || 0) + Number(g.humano || 0)) / 4), 0) / ((s.grades || []).length || 1),
    attendanceRate: Object.values(s.attendance || {}).filter(x => x === 'Presente').length,
    behavior: s.behaviorPoints
  }));

  const prompt = `Analiza los datos de este grupo escolar y genera un resumen breve y motivador de 3 oraciones en ESPAÑOL para el docente, sugiriendo en qué enfocarse la próxima semana. Datos: ${JSON.stringify(summary)}`;

  try {
    return await generateWithFallback(prompt);
  } catch (e) {
    console.error("Error analyzing performance:", e);
    return "No se pudo generar el análisis.";
  }
}

export const generateDocumentContent = async (type: 'INCIDENCIA' | 'CITATORIO' | 'FICHA_DESCRIPTIVA' | 'PLANEACION' | 'ACTA_HECHOS' | 'PERMISO_SALIDA' | 'AUTORIZACION_EVENTO' | 'PRESENTACION_RESULTADOS' | 'OBSERVACIONES_BOLETA', data: any): Promise<string> => {
  if (!apiKey) {
    console.error("API Key is missing");
    return "Error: API Key no configurada. Verifica tu archivo .env.local";
  }

  let prompt = "";
  if (type === 'INCIDENCIA') {
    prompt = `Genera un reporte de incidencia escolar formal y empático basado en la Nueva Escuela Mexicana.
    Escuela: ${data.schoolName}
    Estudiante: ${data.studentName}
    Tutor: ${data.guardianName}
    Incidente: ${data.incidentDetails}
    Fecha: ${data.date}
    Contexto: Generar un texto narrativo detallado que describa lo sucedido, evitando juicios de valor y enfocándose en los hechos y acuerdos. Mencionar que se informa al tutor.
    IMPORTANTE: Devuelve SOLAMENTE el contenido del documento, sin saludos iniciales ni comentarios finales como 'Aquí tienes el reporte'.`;
  } else if (type === 'CITATORIO') {
    prompt = `Redacta un citatorio escolar formal para padres de familia.
    Escuela: ${data.schoolName}
    Dirigido a: C. ${data.guardianName} (Tutor de ${data.studentName})
    Motivo: ${data.reason}
    Fecha y Hora de la cita: ${data.dateTime}
    Tono: Respetuoso, colaborativo, enfocado en el bienestar del alumno (NEM).
    IMPORTANTE: Devuelve SOLAMENTE el contenido del documento, sin saludos iniciales ni comentarios finales.`;
  } else if (type === 'FICHA_DESCRIPTIVA') {
    prompt = `Crea una Ficha Descriptiva del alumno basada en la Nueva Escuela Mexicana.
    Estudiante: ${data.studentName}
    Promedio Actual: ${data.average}
    Porcentaje Asistencia: ${data.attendanceRate}%
    Puntos de Conducta: ${data.behaviorPoints}
    Barreras de Aprendizaje (BAP): ${data.bap || 'Ninguna reportada'}
    Palabras Clave / Enfoque sugerido: ${data.keywords || 'Generar basadas en el perfil'}
    
    Instrucciones:
    1. Analiza los datos cuantitativos (promedio, asistencia, conducta) para redactar las Fortalezas y Áreas de Mejora.
    2. Incluye una sección explícita de "Palabras Clave" que definan el estilo de aprendizaje o personalidad del alumno.
    3. Redacta recomendaciones pedagógicas concretas.
    4. Estructura: Texto continuo y organizado, tono profesional y empático.`;
  } else if (type === 'PLANEACION') {
    prompt = `Desarrolla una Planeación Didáctica breve para una clase de ${data.subject} sobre el tema "${data.topic}".
    Grado: 4to Primaria.
    Enfoque: Nueva Escuela Mexicana (Humanista, Comunitario).
    Incluir: Inicio, Desarrollo, Cierre y una adaptación específica para alumnos con BAP (Barreras para el Aprendizaje y la Participación).
    ${data.contextContent ? `\n    CONSIDERAR LOS SIGUIENTES LINEAMIENTOS/RECURSOS ADJUNTOS:\n    "${data.contextContent}"\n    Asegúrate de que la planeación cumpla estrictamente con estos puntos.` : ''}
    IMPORTANTE: Devuelve SOLAMENTE el contenido del documento, sin saludos iniciales ni comentarios finales.`;
  } else if (type === 'ACTA_HECHOS') {
    prompt = `Redacta un Acta de Hechos formal y objetiva.
    Escuela: ${data.schoolName}
    Estudiante(s) involucrado(s): ${data.studentName}
    Tutor(es): ${data.guardianName}
    Fecha y Hora del incidente: ${data.dateTime || data.date}
    Lugar: ${data.location || 'Instalaciones de la escuela'}
    Descripción de los hechos: ${data.incidentDetails}
    
    Estructura requerida:
    1. Encabezado con lugar, fecha y hora.
    2. Narración cronológica y objetiva de los hechos (sin juicios de valor).
    3. Mención de los involucrados.
    4. Cierre formal para firmas de: Docente (${data.teacherName}), Director, Padre/Tutor (${data.guardianName}) y Testigos.
    IMPORTANTE: Devuelve SOLAMENTE el contenido del documento, sin saludos iniciales ni comentarios finales.`;
  } else if (type === 'PERMISO_SALIDA') {
    prompt = `Redacta un Permiso de Salida Escolar (Pase de Salida).
    Escuela: ${data.schoolName}
    Estudiante: ${data.studentName}
    Solicitado por: ${data.guardianName} (Tutor)
    Fecha y Hora de salida: ${data.dateTime}
    Motivo: ${data.reason}
    Persona autorizada para recoger al alumno: ${data.authorizedPerson}
    
    El documento debe ser breve, formal y dejar claro que la escuela se deslinda de responsabilidad una vez el alumno es entregado a la persona autorizada. Incluir espacio para firma de conformidad del padre/tutor (${data.guardianName}).
    IMPORTANTE: Devuelve SOLAMENTE el contenido del documento, sin saludos iniciales ni comentarios finales.`;
  } else if (type === 'AUTORIZACION_EVENTO') {
    prompt = `Redacta una Carta de Autorización para Asistencia a Evento Escolar.
    Escuela: ${data.schoolName}
    Yo, ${data.guardianName}, padre/tutor del alumno(a) ${data.studentName}, AUTORIZO su asistencia al siguiente evento:
    Evento: ${data.eventName}
    Lugar del evento: ${data.eventLocation}
    Fecha y Hora: ${data.dateTime}
    Transporte: ${data.transport || 'Por cuenta propia'}
    Costo: ${data.cost || 'Sin costo'}
    
    El documento debe ser formal, dirigido al Director(a) de la escuela.
    Debe expresar claramente que el padre/tutor autoriza la participación y conoce los detalles.
    Incluir cláusula de responsabilidad y espacios para:
    1. Datos de contacto de emergencia.
    2. Firma del Padre/Tutor: ${data.guardianName}.
    IMPORTANTE: Devuelve SOLAMENTE el contenido del documento, sin saludos iniciales ni comentarios finales.`;
  } else if (type === 'PRESENTACION_RESULTADOS') {
    prompt = `Genera un GUIÓN y RESUMEN EJECUTIVO para una reunión de padres de familia (Junta Bimestral).
    Escuela: ${data.schoolName}
    Docente: ${data.teacherName}
    Fecha: ${data.date}
    
    DATOS DEL GRUPO:
    - Promedio General del Grupo: ${data.groupAverage}
    - Asistencia Promedio: ${data.groupAttendance}%
    - Total Alumnos en Riesgo: ${data.atRiskCount}
    - Total Tareas Entregadas: ${data.assignmentsCount}
    
    INSTRUCCIONES:
    Genera un documento estructurado en los siguientes puntos para ser leído o presentado a los padres:
    1. **Bienvenida**: Frase empática y objetivo de la reunión.
    2. **Logros Principales**: Destaca lo positivo del promedio (${data.groupAverage}) y la participación.
    3. **Áreas de Oportunidad**: Menciona con tacto la asistencia (${data.groupAttendance}%) y cumplimiento de tareas si es bajo.
    4. **Plan de Trabajo**: 3 recomendaciones generales para que los padres apoyen en casa.
    5. **Avisos Generales**: Espacio para fechas importantes.
    6. **Cierre**: Agradecimiento y frase motivacional sobre educación (NEM).

    IMPORTANTE: Usa un tono profesional, motivador y claro. Formato listo para imprimir y leer.`;
  } else if (type === 'OBSERVACIONES_BOLETA') {
    prompt = `Genera las OBSERVACIONES Y SUGERENCIAS SOBRE LOS APRENDIZAJES para la boleta de calificaciones (Nueva Escuela Mexicana) por Campo Formativo.
    Estudiante: ${data.studentName}
    Promedio General: ${data.average}
    Comportamiento/Conducta: ${data.behaviorPoints} puntos (positivo es bueno, negativo es malo)
    ${data.keywords ? `Enfoque particular/Palabras clave: ${data.keywords}` : ''}
    
    Instrucciones:
    Para CADA UNO de los 4 Campos Formativos, redacta un párrafo breve (máximo 40 palabras por campo) que sea personalizado para este alumno, combinando una observación de su desempeño y una sugerencia de mejora.
    
    Campos a cubrir:
    1. Lenguajes
    2. Saberes y Pensamiento Científico
    3. Ética, Naturaleza y Sociedades
    4. De lo Humano y lo Comunitario
    
    Formato de Salida Requerido:
    **Lenguajes:** [Texto de observación y sugerencia]
    
    **Saberes y Pensamiento Científico:** [Texto de observación y sugerencia]
    
    **Ética, Naturaleza y Sociedades:** [Texto de observación y sugerencia]
    
    **De lo Humano y lo Comunitario:** [Texto de observación y sugerencia]
    
    IMPORTANTE: No incluyas saludos, ni introducciones. Solo los 4 bloques de texto. Sé empático y constructivo.`;
  }

  try {
    return await generateWithFallback(prompt);
  } catch (e: any) {
    console.error("Gemini API Error in generateDocumentContent:", e);
    return `Error al generar documento: ${e.message || e}`;
  }
};

export const generateActivityAdaptation = async (topic: string, bapType: string): Promise<string> => {
  if (!apiKey) return "API Key requerida para adaptar actividades.";

  const prompt = `Actúa como un experto en educación inclusiva y la Nueva Escuela Mexicana.
  Genera una adaptación curricular para una actividad sobre el tema: "${topic}".
  Dirigido a un alumno con la siguiente Barrera para el Aprendizaje (BAP) o condición: "${bapType}".
  
  La respuesta debe incluir:
  1. Ajuste en la instrucción (cómo explicar).
  2. Ajuste en el material (qué recursos usar).
  3. Ajuste en la evaluación (cómo medir el logro).
  
  Mantén un tono profesional y práctico.`;

  try {
    return await generateWithFallback(prompt);
  } catch (e: any) {
    console.error("Gemini API Error in generateActivityAdaptation:", e);
    return `Error al generar adaptación: ${e.message || e}`;
  }
};

export const generateExam = async (topic: string, count: number, type: string): Promise<string> => {
  if (!apiKey) return "API Key requerida para generar exámenes.";

  const prompt = `Actúa como un experto docente de primaria (4to grado).
  Genera un examen formal sobre el tema: "${topic}".
  Cantidad de preguntas: ${count}.
  Tipo de preguntas: "${type}".
  
  Instrucciones de formato:
  1. Título del Examen y espacio para nombre del alumno y fecha.
  2. Instrucciones claras para el alumno.
  3. Las preguntas numeradas.
  4. Si es Opción Múltiple, las opciones deben ser a), b), c).
  5. AL FINAL del documento, incluye una sección separada llamada "CLAVE DE RESPUESTAS" con las respuestas correctas.
  
  Tono: Académico pero apropiado para niños de 9-10 años.`;

  try {
    return await generateWithFallback(prompt);
  } catch (e: any) {
    console.error("Gemini API Error in generateExam:", e);
    return `Error al generar examen: ${e.message || e}`;
  }
};

export const generateRiskPlan = async (studentName: string, riskReason: string, guardianName: string): Promise<string> => {
  if (!apiKey) return "API Key requerida.";

  const prompt = `Actúa como un psicopedagogo experto o un docente muy experimentado.
  Redacta un mensaje de 'Citatorio Urgente' o 'Reporte de Riesgo' para el padre de familia de ${studentName} (${guardianName}).
  
  Situación de Riesgo detectada: ${riskReason}
  
  Objetivo del mensaje:
  1. Informar la situación con datos claros pero con tacto.
  2. Expresar preocupación genuina por el desempeño del alumno.
  3. Solicitar una reunión urgente o compromiso inmediato.
  4. Proponer 2 o 3 acciones concretas que pueden hacer en casa.
  
  Tono: Serio pero colaborativo, enfocado en solución (Nueva Escuela Mexicana). NO agresivo.
  Formato: Cuerpo del mensaje listo para enviar por chat o correo.`;

  try {
    return await generateWithFallback(prompt);
  } catch (e: any) {
    console.error("Gemini API Error:", e);
    return "Error al generar el plan de intervención.";
  }
};

export const generateInteractiveQuiz = async (topic: string, count: number): Promise<string> => {
  if (!apiKey) return "API Key requerida.";

  const prompt = `Genera un cuestionario de opción múltiple con ${count} preguntas sobre el tema: "${topic}".
  Nivel: Primaria (4to grado).
  Formato ESTRICTO JSON:
  [
    {
      "text": "Texto de la pregunta",
      "options": ["Opción A", "Opción B", "Opción C"],
      "correctIndex": 0 // Índice de la respuesta correcta (0, 1 o 2)
    }
  ]
  No incluyas markdown, solo el JSON puro.`;

  try {
    const text = await generateWithFallback(prompt, { responseMimeType: "application/json" });
    // Clean up potential markdown code blocks if present
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return cleanText;
  } catch (e: any) {
    console.error("Error generating quiz:", e);
    throw new Error(`Error al generar cuestionario: ${e.message}`);
  }
};

export const generateInteractiveQuizFromContext = async (context: string, images: string[], count: number): Promise<string> => {
  if (!apiKey) return "API Key requerida.";

  const parts: any[] = [];

  if (context.trim()) {
    parts.push({ text: `Contexto/Contenido para generar el cuestionario:\n${context}\n\n` });
  }

  images.forEach(base64Data => {
    // Assuming base64Data is just the raw base64 string, not data URI
    // If it's a data URI (data:image/png;base64,...), we need to extract the part after comma
    const cleanBase64 = base64Data.includes('base64,') ? base64Data.split('base64,')[1] : base64Data;
    parts.push({
      inline_data: {
        mime_type: "image/jpeg", // Defaulting to jpeg, but generic handling might be needed if png
        data: cleanBase64
      }
    });
  });

  const promptText = `Genera un cuestionario de opción múltiple con ${count} preguntas BASADO EXTRICTAMENTE en el contenido (texto o imágenes) proporcionado arriba.
  Nivel: Primaria (4to grado).
  Si el contenido es una imagen, analiza la imagen y haz preguntas sobre ella.
  Formato ESTRICTO JSON VÁLIDO (RFC 8259):
  [
    {
      "text": "Texto de la pregunta",
      "options": ["Opción A", "Opción B", "Opción C"],
      "correctIndex": 0
    }
  ]
  IMPORTANTE: 
  - NO pongas comas al final del último elemento de una lista o objeto (trailing commas).
  - NO incluyas comentarios // dentro del JSON.
  - Asegura que todas las propiedades estén entre comillas dobles.
  - Devuelve SOLO el JSON, sin texto antes ni después.`;

  parts.push({ text: promptText });

  try {
    const text = await generateWithFallback(parts, { responseMimeType: "application/json" });
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return cleanText;
  } catch (e: any) {
    console.error("Error generating quiz from context:", e);
    throw new Error(`Error al generar cuestionario desde archivo: ${e.message} `);
  }
};


export const gradeInteractiveWorksheet = async (imageUrl: string, title: string, gradingCriteria?: string): Promise<{ score: number, feedback: string }> => {
  if (!apiKey) throw new Error("API Key requerida.");

  const cleanBase64 = imageUrl.includes('base64,') ? imageUrl.split('base64,')[1] : imageUrl;

  const criteriaText = gradingCriteria ? `\n\nCRITERIOS DE EVALUACIÓN DEL DOCENTE(Úsalos como guía estricta): \n${gradingCriteria} ` : '';

  const parts = [
    {
      text: `Compórtate como un maestro de primaria amable pero riguroso.
    Tienes que calificar esta Ficha de Trabajo realizada por un alumno.
    Título de la actividad: "${title}".${criteriaText}
    
    Analiza la imagen adjunta.Identifica lo que el alumno escribió, dibujó o marcó.
    Determina si las respuestas son correctas según el contexto visible de la ficha y los criterios del docente.
    
    Devuelve un JSON ESTRICTO con:
  - score: Un número entero del 0 al 10.
    - feedback: Un comentario breve(máximo 2 oraciones) motivando al alumno y explicando qué falló o felicitándolo.
    
    Ejemplo JSON:
  { "score": 8, "feedback": "¡Muy bien! Acertaste casi todo, solo revisa la suma final." } ` },
    {
      inline_data: {
        mime_type: "image/jpeg",
        data: cleanBase64
      }
    }
  ];

  try {
    const text = await generateWithFallback(parts, { responseMimeType: "application/json" });
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (e: any) {
    console.error("Error grading worksheet:", e);
    // Fallback if AI fails to grade
    return { score: 10, feedback: "Tarea recibida. (No se pudo calificar automáticamente, consulta a tu docente)" };
  }
};

export const generateWorksheetSVG = async (topic: string, type: string, extraInstructions?: string): Promise<string> => {
  if (!apiKey) throw new Error("API Key requerida.");

  let typeInstructions = "";
  if (type === 'WORD_SEARCH') {
    typeInstructions = `GENERA UNA SOPA DE LETRAS (WORD SEARCH) totalmente funcional y resuelta en SVG.
    1. Grid de letras claras (al menos 10x10).
    2. Palabras ocultas relacionadas con el tema: "${topic}".
    3. Lista de palabras a encontrar visualmente a un lado o abajo.`;
  } else if (type === 'PUZZLE') {
    typeInstructions = `GENERA UN ROMPECABEZAS (JIGSAW PUZZLE) VISUAL en SVG sobre "${topic}".
    1. IMPORTANTE: Genera una imagen vectorial simple pero detallada sobre el tema "${topic}" (ej. un paisaje, animal o escena).
    2. Divide esta escena en piezas o dibuja líneas de corte.`;
  } else if (type === 'CUSTOM') {
    typeInstructions = `GENERA UNA FICHA DE TRABAJO PERSONALIZADA sobre: "${topic}".
      INSTRUCCIONES ADICIONALES DEL USUARIO: ${extraInstructions}
      Crea una actividad didáctica visual adecuada para 4to de primaria basada en estas instrucciones.`;
  } else {
    // Default or other legacy types
    typeInstructions = `GENERA UNA FICHA EDUCATIVA sobre "${topic}" de tipo ${type}.`;
  }


  // Force using a creative model if possible, defaulting to standard fallback
  const prompt = `Actúa como un diseñador gráfico educativo y desarrollador web experto.
  
  Tu tarea es generar el CÓDIGO SVG COMPLETO Y VÁLIDO para una ficha de trabajo escolar lista para imprimir (Nivel 4to Primaria).
  
  TIPO: ${type}
  TEMA: ${topic}
  
  INSTRUCCIONES DE DISEÑO:
  ${typeInstructions}
  
  REGLAS TÉCNICAS ESTRICTAS:
  1. El output debe ser ÚNICAMENTE el código SVG. Sin explicaciones, sin markdown (no \`\`\`xml), sin texto antes ni después.
  2. Dimensiones: width="800" height="1100" viewBox="0 0 800 1100".
  3. Fondo: <rect width="100%" height="100%" fill="white" />
  4. Usa colores simples y de alto contraste (negro, gris, azul oscuro) para líneas y texto.
  5. Asegúrate de cerrar todas las etiquetas correctamente.
  
  ¡Genera el SVG ahora!`;

  try {
    // We intentionally don't force a model in the fallback function arguments to let it auto-discover properly,
    // BUT usually 1.5-flash is best for code generation speed/cost.
    const text = await generateWithFallback([{ text: prompt }]);

    // Aggressive cleanup to extract SVG
    let cleaned = text.trim();
    // Remove markdown code blocks if present despite instructions
    if (cleaned.startsWith('```')) {
      const firstLineBreak = cleaned.indexOf('\n');
      if (firstLineBreak !== -1) cleaned = cleaned.substring(firstLineBreak + 1);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.substring(0, cleaned.length - 3);
    }

    const start = cleaned.indexOf('<svg');
    const end = cleaned.lastIndexOf('</svg>') + 6;

    if (start === -1 || end === -1) {
      console.error("AI Response not SVG:", text);
      throw new Error("La IA no generó un código SVG válido. Intenta con otro tema.");
    }

    return cleaned.substring(start, end);
  } catch (e: any) {
    console.error("Error generating worksheet SVG:", e);
    throw new Error(`Error al generar ficha SVG: ${e.message}`);
  }
};

export const generateNEMPlanning = async (context: string, images: string[]): Promise<string> => {
  if (!apiKey) return "API Key requerida.";

  const parts: any[] = [];

  const promptText = `
  Rol: Eres un Especialista Docente de la Nueva Escuela Mexicana (NEM) con maestría en Diseño Curricular y Educación Inclusiva. Tu objetivo es transformar los contenidos de los libros de texto de la NEM en experiencias de aprendizaje prácticas, divertidas y accesibles para todos los alumnos de primaria (1.º a 6.º).

  Tarea Principal: A partir de los archivos PDF o textos de los libros de la NEM que el usuario te proporcione, debes generar:
  1. Planeaciones Didácticas: Basadas en los proyectos y contenidos de los libros, alineadas a los 4 Campos Formativos y los 7 Ejes Articuladores.
  2. Actividades Prácticas: Diseñar dinámicas lúdicas que saquen el aprendizaje del libro y lo lleven a la acción (juegos, experimentos, debates, retos).
  3. Adecuaciones Curriculares (Inclusión): Diseñar versiones simplificadas o con apoyos visuales/concretos para alumnos con Barreras para el Aprendizaje y la Participación (BAP) o ritmo de aprendizaje lento.
  4. Proyectos: Desarrollar la metodología de Proyectos (ABP, STEM, Aprendizaje Servicio) sugerida por la NEM, pero con un enfoque creativo.

  Instrucciones de Procesamiento:
  - Analiza primero el índice y la secuencia del proyecto seleccionado (si se proporciona en el contexto).
  - Asegúrate de que las actividades no sean solo de "leer y contestar", sino de "hacer y crear".
  - Genera estrategias didácticas específicas para el docente.

  Estructura OBLIGATORIA de respuesta (Usa Markdown):

  # Nombre del Proyecto / Tema: [Título atractivo]

  **Referencia al Libro de Texto:** [Nombre del libro y páginas analizadas si es visible]

  **Vinculación NEM:** 
  - Campo Formativo:
  - Ejes Articuladores:
  - PDA (Procesos de Desarrollo de Aprendizaje):

  ---

  ## Secuencia de Actividades y Estrategia Didáctica

  ### 1. Inicio (Despertar el interés)
  [Actividad detonante, preguntas generadoras o juego inicial]

  ### 2. Desarrollo (Manos a la obra)
  [Actividad principal práctica. Experimentos, creación, investigación activa]

  ### 3. Cierre (Reflexión y producto)
  [Socialización, producto final, reflexión grupal]

  ---

  ## Sección de Inclusión (Adecuaciones Curriculares)
  *Instrucciones específicas para alumnos con aprendizaje lento o BAP:*
  [Estrategias concretas, materiales adaptados, simplificación de instrucciones]

  ---

  ## Recursos y Materiales
  [Lista priorizando materiales reciclados o de bajo costo]

  ## Evaluación Formativa
  [Sugerencias de instrumentos: rúbricas sencillas, listas de cotejo, diarios de clase]

  ---

  Tono y Estilo: Profesional, motivador, creativo y enfocado en la pedagogía crítica de la NEM. Evita tecnicismos innecesarios, sé directo y práctico.
  `;

  if (context.trim()) {
    parts.push({ text: `CONTEXTO / CONTENIDO DEL LIBRO DE TEXTO:\n${context}\n\n` });
  }

  images.forEach(base64Data => {
    const cleanBase64 = base64Data.includes('base64,') ? base64Data.split('base64,')[1] : base64Data;
    parts.push({
      inline_data: {
        mime_type: "image/jpeg",
        data: cleanBase64
      }
    });
  });

  parts.push({ text: promptText });

  try {
    return await generateWithFallback(parts);
  } catch (e: any) {
    console.error("Error generating NEM planning:", e);
    return `Error al generar la planeación: ${e.message}`;
  }
};
