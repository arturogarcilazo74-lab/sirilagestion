import { Student } from "../types";

// Helper to get API Key dynamically
const getApiKey = () => {
    return (
        localStorage.getItem('VITE_GEMINI_API_KEY') ||
        import.meta.env.VITE_GEMINI_API_KEY ||
        import.meta.env.VITE_API_KEY ||
        ''
    ).trim();
};

// Helper to convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.includes('base64,') ? result.split('base64,')[1] : result;
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

// Helper to handle model fallbacks using direct REST API
const generateWithFallback = async (input: string | any[], config?: any): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error("No se encontró la API Key de Gemini. Puedes configurarla en Ajustes o en el modal de creación de actividades.");
    }

  // Robust model list - PRIORITIZING PRO MODELS for better quality
  let modelsToTry = [
    "gemini-2.0-pro",
    "gemini-1.5-pro",
    "gemini-1.0-pro",
    "gemini-2.0-flash",
    "gemini-1.5-flash"
  ];

  // 1. Dynamic Discovery
  try {
    const listResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );

    if (listResponse.ok) {
      const data = await listResponse.json();
      if (data.models) {
        const availableModels = data.models
          .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
          .map((m: any) => m.name.replace('models/', ''));

        if (availableModels.length > 0) {
          console.log("AI Discovery: Modelos encontrados:", availableModels);
          // PRIORIDAD: Modelos PRO primero (mejor calidad para generación de actividades)
          const preferred = [
            ...availableModels.filter((m: string) => m.includes('2.0-pro')),
            ...availableModels.filter((m: string) => m.includes('1.5-pro')),
            ...availableModels.filter((m: string) => m.includes('1.0-pro')),
            ...availableModels.filter((m: string) => m.includes('2.0-flash')),
            ...availableModels.filter((m: string) => m.includes('1.5-flash')),
            ...availableModels
          ];
          modelsToTry = [...new Set(preferred)];
        }
      }
    } else {
      const errData = await listResponse.json().catch(() => ({}));
      console.warn("AI Discovery: API Key parece no ser válida o no tiene acceso a la lista de modelos.", errData);
    }
  } catch (e) {
    console.warn("AI Discovery: Error de red al descubrir modelos.", e);
  }

  const errors: string[] = [];
  const parts = Array.isArray(input) ? input : [{ text: input }];

  for (const model of modelsToTry) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: parts }],
            generationConfig: config || {}
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        console.log(`✅ AI: Generado con éxito usando ${model}`);
        return text;
      }
    } catch (e: any) {
      console.warn(`❌ AI: Falló el modelo ${model}:`, e.message || e);
      errors.push(`${model}: ${e.message || e}`);
    }
  }

  throw new Error(`Error de IA central: ${errors.join(' | ')}`);
};

export const generateSmartTeams = async (students: Student[], teamCount: number): Promise<{ teams: { name: string, members: string[] }[] }> => {
  const studentData = students.map(s => ({
    name: s.name,
    behavior: s.behaviorPoints,
    performance: (s.grades || []).reduce((acc, g: any) => acc + ((Number(g.lenguajes || 0) + Number(g.saberes || 0) + Number(g.etica || 0) + Number(g.humano || 0)) / 4), 0) / (s.grades?.length || 1)
  }));

  const prompt = `Equipos equilibrados: ${JSON.stringify(studentData)}. Divide en ${teamCount} equipos. JSON: {"teams": [{"name": "", "members": []}]}`;

  try {
    const text = await generateWithFallback(prompt, { responseMimeType: "application/json" });
    const cleanText = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("Teams Error:", e);
    throw e;
  }
};

export const analyzeClassPerformance = async (students: Student[]): Promise<string> => {
  const summary = students.map(s => ({ name: s.name, behavior: s.behaviorPoints }));
  const prompt = `Analiza brevemente (3 frases) este grupo: ${JSON.stringify(summary)}`;
  try {
    return await generateWithFallback(prompt);
  } catch (e) {
    return "Análisis no disponible.";
  }
};

export const generateDocumentContent = async (type: string, data: any): Promise<string> => {
  let prompt = "";
  if (type === 'INCIDENCIA') {
    prompt = `Reporte de incidencia escolar. Escuela: ${data.schoolName}, Alumno: ${data.studentName}, Detalles: ${data.incidentDetails}. NEM: texto formal, hechos reales, acuerdos.`;
  } else if (type === 'CITATORIO') {
    prompt = `Citatorio escolar formal. Escuela: ${data.schoolName}, Tutor de ${data.studentName}. Motivo: ${data.reason}. Fecha: ${data.dateTime}.`;
  } else if (type === 'FICHA_DESCRIPTIVA') {
    prompt = `Actúa como un Especialista Docente de la Nueva Escuela Mexicana (NEM) en México.
Diseña una Ficha Descriptiva Individual de un Alumno de forma muy completa y profesional.

DATOS DEL ALUMNO:
- Nombre: ${data.studentName}
- Promedio General: ${data.average}
- Asistencia: ${data.attendanceRate}%
- Puntos de Conducta: ${data.behaviorPoints}
- BAP/USAER: ${data.bap}
- Docente: ${data.teacherName}
- Escuela: ${data.schoolName}
${data.keywords ? `- Enfoque/Palabras Clave: ${data.keywords}` : ''}
${data.contextContent ? `- Contexto adicional: ${data.contextContent}` : ''}

ESTRUCTURA DE LA FICHA DESCRIPTIVA INDIVIDUAL (Formato Markdown rico, profesional y formal):

1. PORTADA Y DATOS DE IDENTIFICACIÓN:
   - Nombre de la escuela, CCT, Zona Escolar, Grado y Grupo, Nombre del Docente, Alumno y Ciclo Escolar.

2. FORTALEZAS DETECTADAS:
   - Describir de forma positiva y objetiva las habilidades académicas, socioemocionales, de comunicación y de participación del alumno.

3. ÁREAS DE MEJORA Y OPORTUNIDADES:
   - Identificar de manera formativa las áreas del aprendizaje o de conducta que requieren atención o reforzamiento.

4. RECOMENDACIONES PEDAGÓGICAS PARA EL DOCENTE DEL SIGUIENTE CICLO:
   - Sugerencias metodológicas, adaptaciones o estrategias para apoyar su aprendizaje el próximo año.

5. RECOMENDACIONES PARA EL TRABAJO EN CASA (CON LA FAMILIA):
   - Acciones concretas y sencillas que los padres pueden realizar en casa para coadyuvar en su desarrollo.

6. AJUSTES RAZONABLES (Sólo si tiene BAP o USAER):
   - Adecuaciones específicas para superar sus barreras de aprendizaje.

7. FIRMAS:
   - Espacios para firma del Docente de Grupo, Director(a) y del Padre/Tutor.

Usa un tono formal, empático, formativo y estructurado en Markdown limpio y legible.`;
  } else if (type === 'FICHA_DESCRIPTIVA_GRUPO') {
    prompt = `Actúa como un Especialista Docente de la Nueva Escuela Mexicana (NEM) en México.
Diseña una Ficha Descriptiva Grupal del grupo de alumnos de forma muy completa, profesional y formal.

DATOS GENERALES:
- Escuela: ${data.schoolName}
- Docente: ${data.teacherName}
- Grupo: ${data.groupName}
- Ciclo Escolar: ${data.schoolYear}

ESTADÍSTICAS DEL GRUPO:
- Promedio General del Grupo: ${data.groupAverage}
- Porcentaje de Asistencia Promedio: ${data.groupAttendance}%
- Total de alumnos: ${data.totalStudents} (Hombres: ${data.totalBoys}, Mujeres: ${data.totalGirls})
- Alumnos en alerta por Rezago Académico: ${data.atRiskCount}
- Alumnos con Alerta de Conducta: ${data.conductRiskCount}
- Alumnos con apoyo USAER/BAP: ${data.bapCount}

DETALLES DE ALUMNOS EN ALERTA O CON BAP (Para contextualizar el análisis grupal):
${JSON.stringify(data.specialStudents, null, 2)}

ESTRUCTURA DE LA FICHA DESCRIPTIVA GRUPAL (Formato Markdown rico, profesional y formal):

1. PORTADA Y DATOS DE IDENTIFICACIÓN:
   - Nombre de la escuela, CCT, Zona Escolar, Grado y Grupo, Nombre del Docente y Ciclo Escolar.

2. ANÁLISIS DE FORTALEZAS DEL GRUPO:
   - Áreas académicas fuertes, participación, habilidades socioemocionales destacadas de forma general.

3. ÁREAS DE MEJORA Y OPORTUNIDADES DEL GRUPO:
   - Campos formativos que requieren atención prioritaria (Lenguajes, Saberes y Pensamiento Científico, Ética Naturaleza y Sociedades, De lo Humano y lo Comunitario).
   - Desafíos comunes detectados en tareas, asistencia o conducta.

4. RECOMENDACIONES GENERALES Y ESTRATEGIAS PEDAGÓGICAS PARA EL PRÓXIMO CICLO:
   - Sugerencias concretas y prácticas para el docente que reciba a este grupo el próximo ciclo.
   - Estrategias de intervención grupal.

5. ACCIONES DE INCLUSIÓN Y AJUSTES RAZONABLES SUGERIDOS (BAP/USAER):
   - Recomendaciones generales para atender la diversidad del grupo.

6. FIRMAS DE AUTORIZACIÓN:
   - Espacio para firma del Docente de Grupo y Director(a).
   
Usa un tono formal, analítico, empático y estructurado en Markdown limpio y legible.`;
  } else if (type === 'PLANEACION') {
    prompt = `Planeación Didáctica 4to Primaria. Tema: ${data.topic}, Materia: ${data.subject}. NEM Comunitario. Inicio, Desarrollo, Cierre y Adecuación BAP. ${data.contextContent ? `Contexto: ${data.contextContent}` : ''}`;
  } else if (type === 'ACTA_HECHOS') {
    prompt = `Acta de Hechos formal. Escuela: ${data.schoolName}, Involucrado: ${data.studentName}, Incidente: ${data.incidentDetails}, Fecha: ${data.dateTime || data.date}, Lugar: ${data.location}. Estructura formal para firmas.`;
  } else if (type === 'PERMISO_SALIDA') {
    prompt = `Permiso/Pase de salida. Alumno: ${data.studentName}, Sale con: ${data.authorizedPerson}, Motivo: ${data.reason}, Fecha: ${data.dateTime}.`;
  } else if (type === 'AUTORIZACION_EVENTO') {
    prompt = `Carta de autorización para evento: ${data.eventName}. Alumno: ${data.studentName}, Lugar: ${data.eventLocation}, Fecha: ${data.dateTime}. Firma padre: ${data.guardianName}.`;
  } else if (type === 'PRESENTACION_RESULTADOS') {
    prompt = `Guion para junta de padres. Escuela: ${data.schoolName}. Datos grupo: Promedio ${data.groupAverage}, Asistencia ${data.groupAttendance}%, Riesgo ${data.atRiskCount}. Puntos: Bienvenida, Logros, Oportunidades, Plan, Cierre. Tono NEM.`;
  } else if (type === 'OBSERVACIONES_BOLETA') {
    prompt = `Observaciones boleta NEM para ${data.studentName}. Campos: Lenguajes, Saberes, Ética, Humano. Breve (40 palabras cada uno).`;
  } else if (type === 'PLAN_REZAGO') {
    prompt = `Actúa como un Especialista Docente de la Nueva Escuela Mexicana (NEM) en México.
Diseña un Plan de Trabajo de Intervención Educativa para atender el rezago escolar del grupo.

DATOS GENERALES:
- Escuela: ${data.schoolName}
- Docente: ${data.teacherName}
- Periodo de Aplicación: Del 22 al 30 de junio de 2026 (7 días hábiles de clases: lunes 22, martes 23, miércoles 24, jueves 25, viernes 26, lunes 29, martes 30 de junio)
- Enfoque / Campos Formativos priorizados: ${data.subject || 'Lenguajes y Saberes y Pensamiento Científico'}
- Temas priorizados: ${data.topic || 'Comprensión lectora, operaciones básicas y cálculo mental'}

ALUMNOS EN SITUACIÓN DE REZAGO ACADÉMICO / ALERTA:
${JSON.stringify(data.laggingStudents, null, 2)}

ESTRUCTURA DEL PLAN DE INTERVENCIÓN (Formato Markdown rico, profesional y formal):

1. PORTADA Y DATOS DE IDENTIFICACIÓN:
   - Nombre de la escuela, CCT, Zona Escolar, Grado y Grupo, Nombre del Docente y Ciclo Escolar.

2. JUSTIFICACIÓN Y DIAGNÓSTICO DEL GRUPO:
   - Describe brevemente la situación de rezago del grupo, fundamentado en los datos de los alumnos en alerta (menciona nombres de los alumnos en rezago y sus principales debilidades/desafíos en tareas, asistencia o conducta de forma resumida).
   - Justifica la intervención en este periodo final de junio.

3. PROPÓSITOS Y METAS PEDAGÓGICAS:
   - Objetivos medibles para los alumnos en rezago.

4. CRONOGRAMA DE ACTIVIDADES DIARIAS (Del 22 al 30 de junio - Detallado día por día):
   - Genera actividades diarias específicas y muy dinámicas enfocadas en consolidar los aprendizajes prioritarios (lectura comprensiva, producción de textos, cálculo mental, operaciones básicas y problemas razonados).
   - Para cada día de clases (lunes 22 al martes 30 de junio de 2026, excluyendo fin de semana), detalla:
     * Inicio (Actividad de activación o lúdica - 15 min)
     * Desarrollo (Actividad central con andamiaje pedagógico y hojas de trabajo - 35 min)
     * Cierre (Evaluación formativa rápida o reflexión - 10 min)
   - Debe incluir cronograma para:
     - Lunes 22 de junio
     - Martes 23 de junio
     - Miércoles 24 de junio
     - Jueves 25 de junio
     - Viernes 26 de junio
     - Lunes 29 de junio
     - Martes 30 de junio

5. ESTRATEGIAS DE INCLUSIÓN Y AJUSTES RAZONABLES (BAP/USAER):
   - Adecuaciones curriculares específicas basadas en los alumnos con BAP o USAER de la lista.

6. EVALUACIÓN FORMATIVA Y SEGUIMIENTO:
   - Criterios e instrumentos de evaluación formativa recomendados.

7. FIRMAS DE AUTORIZACIÓN:
   - Espacios para firmas de: Docente de Grupo, Director(a) de la Escuela, y Maestro(a) de Apoyo USAER.

Usa un tono formal, empático y estructurado en Markdown limpio y legible.`;
  }

  try {
    return await generateWithFallback(prompt);
  } catch (e: any) {
    console.error("Doc Error:", e);
    return `Error al generar: ${e.message}`;
  }
};

export const generateActivityAdaptation = async (topic: string, bapType: string): Promise<string> => {
  const prompt = `Adaptación inclusiva (NEM) para tema "${topic}" y BAP "${bapType}". Incluir: Instrucción, Material, Evaluación.`;
  try { return await generateWithFallback(prompt); } catch (e: any) { return `Error: ${e.message}`; }
};

export const generateExam = async (topic: string, count: number, type: string): Promise<string> => {
  const prompt = `Examen 4to grado. Tema: ${topic}, Preguntas: ${count}, Tipo: ${type}. Incluir instrucciones y CLAVE DE RESPUESTAS al final.`;
  try { return await generateWithFallback(prompt); } catch (e: any) { return `Error: ${e.message}`; }
};

export const generateRiskPlan = async (studentName: string, riskReason: string, guardianName: string): Promise<string> => {
  const prompt = `Plan de intervención/Riesgo. Estudiante ${studentName}, Tutor ${guardianName}. Motivo: ${riskReason}. Tono NEM colaborativo.`;
  try { return await generateWithFallback(prompt); } catch (e: any) { return "Error al generar plan."; }
};

export const generateInteractiveQuiz = async (topic: string, count: number): Promise<string> => {
  const prompt = `Cuestionario 4to grado sobre ${topic}. ${count} preguntas. JSON format: [{"text": "", "options": [], "correctIndex": 0, "category": "Lenguajes|Saberes|Etica|Humano"}]. Clasifica cada pregunta en uno de esos 4 campos formativos de la NEM.`;
  try {
    const text = await generateWithFallback(prompt, { responseMimeType: "application/json" });
    return text.replace(/```json|```/g, '').trim();
  } catch (e: any) { throw new Error(`Quiz Error: ${e.message}`); }
};

export const generateInteractiveQuizFromContext = async (context: string, images: string[], count: number): Promise<string> => {
  const parts: any[] = [];
  if (context.trim()) parts.push({ text: `Contexto:\n${context}` });
  images.forEach(img => {
    const clean = img.includes('base64,') ? img.split('base64,')[1] : img;
    parts.push({ inline_data: { mime_type: "image/jpeg", data: clean } });
  });
  parts.push({ text: `Genera ${count} preguntas de opción múltiple basadas en este contenido. JSON format: [{"text": "", "options": [], "correctIndex": 0, "category": "Lenguajes|Saberes|Etica|Humano"}]. Clasifica cada pregunta en uno de esos 4 campos formativos de la NEM.` });

  try {
    const text = await generateWithFallback(parts, { responseMimeType: "application/json" });
    return text.replace(/```json|```/g, '').trim();
  } catch (e: any) { throw new Error(`Context Quiz Error: ${e.message}`); }
};

export const gradeInteractiveWorksheet = async (imageUrl: string, title: string, gradingCriteria?: string): Promise<{ score: number, feedback: string }> => {
  const clean = imageUrl.includes('base64,') ? imageUrl.split('base64,')[1] : imageUrl;
  const parts = [
    { text: `Califica esta ficha "${title}". ${gradingCriteria ? `Criterios: ${gradingCriteria}` : ''}. JSON: {"score": 0-10, "feedback": ""}` },
    { inline_data: { mime_type: "image/jpeg", data: clean } }
  ];
  try {
    const text = await generateWithFallback(parts, { responseMimeType: "application/json" });
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch (e: any) { return { score: 10, feedback: "Tarea recibida." }; }
};

export const generateWorksheetSVG = async (topic: string, type: string, extraInstructions?: string): Promise<string> => {
  const prompt = `SVG Worksheet for 4th Grade. Topic: ${topic}, Type: ${type}. ${extraInstructions || ''}. Output ONLY valid <svg> code, 1200x1600. NO markdown. Ensure ample spacing between elements. Use readable font sizes (approx 20px-24px). Avoid text overlapping lines or boxes.`;
  try {
    const text = await generateWithFallback(prompt);
    let cleaned = text.trim();
    if (cleaned.startsWith('```')) {
      const breakIdx = cleaned.indexOf('\n');
      if (breakIdx !== -1) cleaned = cleaned.substring(breakIdx + 1);
    }
    cleaned = cleaned.replace(/```/g, '').trim();
    const start = cleaned.indexOf('<svg');
    const end = cleaned.lastIndexOf('</svg>') + 6;
    if (start === -1) throw new Error("No SVG generated");
    return cleaned.substring(start, end);
  } catch (e: any) { throw new Error(`SVG Error: ${e.message}`); }
};

export const generateCompleteWorksheet = async (topic: string, type: string, extraInstructions?: string): Promise<{ svg: string, svgBase64?: string, zones: any[], draggables: any[] }> => {
  const prompt = `Eres un diseñador educativo experto. Genera una ficha interactiva para 4to Grado de Primaria.

TEMA: ${topic}
TIPO DE ACTIVIDAD: ${type}
${extraInstructions ? `INSTRUCCIONES ADICIONALES: ${extraInstructions}` : ''}

IMPORTANTE: Responde con DOS BLOQUES DE CÓDIGO SEPARADOS.
1. Un bloque 'xml' o 'svg' con el código SVG visual.
2. Un bloque 'json' con la configuración de las zonas interactivas.

BLOQUE 1: CÓDIGO SVG
<svg width="1200" height="1600" viewBox="0 0 1200 1600" xmlns="http://www.w3.org/2000/svg">
  <!-- Fondo blanco, título, instrucciones y contenido educativo visual GRANDE y CLARO -->
</svg>

BLOQUE 2: DATOS INTERACTIVOS (JSON)
{
  "interactiveZones": [
    {
      "id": "zona1",
      "type": "TEXT_INPUT",
      "x": 10, "y": 20, "width": 60, "height": 5,
      "correctAnswer": "respuesta", "points": 1
    }
  ],
  "draggableItems": []
}

═══════════════════════════════════════════════════════════════════
REGLAS DE DISEÑO DE SVG (Bloque 1):
═══════════════════════════════════════════════════════════════════
1. LAYOUT VERTICAL: Título (y=100), Instrucciones (y=180), Contenido (y=250-1400).
2. COLORES: Fondo #FFFFFF, Título #2563EB, Texto #334155.
3. FUENTES: Mínimo 24px. Usa fuentes sans-serif estándar.
4. CONTENIDO:
   ${type.toLowerCase().includes('sopa') ? '- Crea una GRILA de letras 10x10. Usa <text> individuales bien espaciados.' : ''}
   ${type.toLowerCase().includes('crucigrama') ? '- Usa <rect> blancos con borde negro para las casillas y números pequeños.' : ''}
   ${!type.toLowerCase().includes('sopa') && !type.toLowerCase().includes('crucigrama') ? '- Crea cuadros, líneas o espacios claros donde el alumno deba interactuar.' : ''}

═══════════════════════════════════════════════════════════════════
REGLAS PARA DATOS INTERACTIVOS (Bloque 2):
═══════════════════════════════════════════════════════════════════
- Las coordenadas (x, y, width, height) son PORCENTAJES (0-100) relativos al SVG.
- Tipos: "TEXT_INPUT", "SELECTABLE", "DROP_ZONE", "MATCH_SOURCE", "MATCH_TARGET".
- Ajusta las zonas perfectamente sobre los espacios dibujados en el SVG.
`;

  try {
    // Intentionally mixed content prompt, no JSON enforcement
    const text = await generateWithFallback(prompt);

    // 1. Extract SVG
    const svgMatch = text.match(/```(?:xml|svg)([\s\S]*?)```/) || text.match(/<svg[\s\S]*?<\/svg>/);
    let finalSvg = "";

    if (svgMatch) {
      finalSvg = svgMatch[1] ? svgMatch[1].trim() : svgMatch[0].trim();
    } else {
      const start = text.indexOf('<svg');
      const end = text.lastIndexOf('</svg>');
      if (start !== -1 && end !== -1) {
        finalSvg = text.substring(start, end + 6);
      }
    }

    if (!finalSvg || !finalSvg.includes('<svg')) {
      throw new Error("No se pudo generar el código SVG visual.");
    }

    // 2. Extract JSON
    let data = { interactiveZones: [], draggableItems: [] };
    const jsonMatch = text.match(/```json([\s\S]*?)```/);

    if (jsonMatch) {
      try {
        // Remove any trailing comments or weirdness
        const cleanJson = jsonMatch[1].trim().replace(/\/\/.*$/gm, '');
        data = JSON.parse(cleanJson);
      } catch (e) {
        console.warn("JSON parse error, trying safe clean");
      }
    } else {
      // Fallback look for object
      const startJson = text.lastIndexOf('{');
      const endJson = text.lastIndexOf('}');
      if (startJson !== -1) {
        try {
          data = JSON.parse(text.substring(startJson, endJson + 1));
        } catch (e) { }
      }
    }

    // 3. Encode SVG
    const encodedSvg = typeof window !== 'undefined'
      ? window.btoa(unescape(encodeURIComponent(finalSvg)))
      : Buffer.from(finalSvg).toString('base64');

    return {
      svg: finalSvg,
      svgBase64: encodedSvg,
      zones: data.interactiveZones || [],
      draggables: data.draggableItems || []
    };

  } catch (e: any) {
    console.error("AI Worksheet Generation Error:", e);
    throw new Error(`Error en generación: ${e.message}`);
  }
};

export const autoDetectWorksheetZones = async (imageUrl: string, title?: string): Promise<{ zones: any[], draggables: any[] }> => {
  const clean = imageUrl.includes('base64,') ? imageUrl.split('base64,')[1] : imageUrl;
  const prompt = `Actúa como un experto en OCR y UX Educativa.
Analiza la IMAGEN de esta ficha de trabajo${title ? ` titulada "${title}"` : ''}.
Identifica todos los espacios donde un alumno debería:
1. Escribir texto (TEXT_INPUT).
2. Arrastrar una etiqueta (DROP_ZONE).
3. Seleccionar una opción (SELECTABLE).
4. Unir con una línea (MATCH_SOURCE / MATCH_TARGET).

DEBES responder ÚNICAMENTE con un JSON:
{
  "zones": [
    {
      "id": "uído_único",
      "type": "TEXT_INPUT" | "DROP_ZONE" | "SELECTABLE" | "MATCH_SOURCE" | "MATCH_TARGET",
      "x": %_horizontal, "y": %_vertical, "width": %_ancho, "height": %_alto,
      "correctAnswer": "...", "matchId": "...", "points": 1
    }
  ],
  "draggables": [
    { "id": "...", "content": "..." }
  ]
}
Importante: Las coordenadas (x, y, width, height) deben ser porcentajes (0-100) relativos a la imagen.
Analiza con cuidado las líneas, cuadros y espacios en blanco.`;

  const parts = [
    { text: prompt },
    { inline_data: { mime_type: "image/jpeg", data: clean } }
  ];

  try {
    const text = await generateWithFallback(parts, { responseMimeType: "application/json" });
    const cleaned = text.replace(/```json|```/g, '').trim();
    const data = JSON.parse(cleaned);
    return {
      zones: data.zones || [],
      draggables: data.draggables || []
    };
  } catch (e: any) {
    throw new Error(`Auto-detect Error: ${e.message}`);
  }
};

export const generateNEMPlanning = async (context: string, images: string[]): Promise<string> => {
  const parts: any[] = [];
  if (context.trim()) parts.push({ text: `Libro/Contexto:\n${context}` });
  images.forEach(img => {
    const clean = img.includes('base64,') ? img.split('base64,')[1] : img;
    parts.push({ inline_data: { mime_type: "image/jpeg", data: clean } });
  });
  parts.push({ text: `Rol: Especialista Docente NEM. Genera: 1. Planeación (Inicio, Desarrollo, Cierre), 2. Inclusión (Adecuaciones curricular), 3. Recursos, 4. Evaluación Formativa. Formato Markdown rico.` });

  try { return await generateWithFallback(parts); } catch (e: any) { return `Error: ${e.message}`; }
};

export const generateHtmlGame = async (topic: string, description: string): Promise<string> => {
  const prompt = `Actúa como un desarrollador de juegos web experto. Genera un juego HTML5 completo en un solo archivo para niños de 4to grado.
  TEMA: ${topic}
  DESCRIPCIÓN: ${description}

  REQUISITOS DE ESTILO (OBLIGATORIO):
  1. Usa Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>
  2. Fuente 'Quicksand' y 'Fredoka One' de Google Fonts.
  3. Fondo de pantalla: linear-gradient(135deg, #667eea 0%, #764ba2 100%).
  4. Contenedor principal: clase 'game-card' con fondo blanco (rgba(255,255,255,0.95)), bordes redondeados (2rem), sombra suave. usa max-width: 500px;
  5. Botones de opciones: grandes, bordes redondeados, feedback visual al hacer click (colores verde/rojo).
  6. Iconografía: FontAwesome via CDN.
  7. Debe ser RESPONSIVE y verse bien en móviles.
  8. Incluye una animación divertida (ej. rebote) para un personaje o icono.

  LÓGICA DEL JUEGO Y CALIFICACIÓN (CRÍTICO):
  1. Pantalla de Inicio con título y botón "Jugar".
  2. Pantalla de Juego con preguntas/desafíos.
  3. Sistema de Vidas o Tiempo.
  4. Pantalla de Final:
     - Muestra el puntaje.
     - Botón "Jugar de nuevo".
  5. **IMPORTANTE PARA CALIFICAR:**
     Cuando el juego termine (ya sea por ganar o perder), DEBES ejecutar AUTOMÁTICAMENTE el siguiente código JavaScript para guardar la calificación en el sistema escolar:
     \`window.parent.postMessage({ type: 'GAME_COMPLETE', score: PUNTAJE_OBTENIDO, maxScore: PUNTAJE_MAXIMO_POSIBLE }, '*');\`
     * Asegúrate de calcular el puntaje final sobre 100 si es posible, o envía el puntaje bruto.

  Responde ÚNICAMENTE con el código HTML completo, empezando por <!DOCTYPE html>. No incluyas markdown.`;

  try {
    const text = await generateWithFallback(prompt);
    // Cleanup markdown
    const start = text.indexOf('<!DOCTYPE html>');
    const end = text.lastIndexOf('</html>');

    if (start !== -1 && end !== -1) {
      return text.substring(start, end + 7);
    }

    // Fallback regex
    const match = text.match(/```html([\s\S]*?)```/) || text.match(/```([\s\S]*?)```/);
    if (match) {
      const content = match[1].trim();
      if (content.startsWith('<!DOCTYPE')) return content;
    }

    return text.trim();
  } catch (e: any) {
    throw new Error(`Game Error: ${e.message}`);
  }
};

export const generateStudentAnalysis = async (
  studentName: string,
  studentData: {
    grades: { trimester: number; lenguajes: number; saberes: number; etica: number; humano: number; promedio: number }[];
    attendance: { presentes: number; faltas: number; retardos: number };
    behavior: { puntos: number; positivos: number; negativos: number; incidentes: string[] };
    tareas: { completadas: number; total: number; porcentaje: number };
    bap: string;
    usaer: boolean;
    repetidor: boolean;
    promedioGeneral: number;
  }
): Promise<string> => {
  const prompt = `Eres un pedagogo experto en el modelo NEM (Nueva Escuela Mexicana) de primaria en México. Genera un análisis integral y personalizado del siguiente alumno para entregar a los padres de familia.

DATOS DEL ALUMNO: ${studentName}

CALIFICACIONES POR TRIMESTRE (escala 5-10, campos formativos NEM):
${studentData.grades.map(g => `  Trimestre ${g.trimester}: Lenguajes=${g.lenguajes}, Saberes y P.C.=${g.saberes}, Ética Nat. y Soc.=${g.etica}, De lo Humano=${g.humano}, Promedio=${g.promedio}`).join('\n')}
Promedio General: ${studentData.promedioGeneral}

ASISTENCIA:
  Asistencias: ${studentData.attendance.presentes}, Faltas: ${studentData.attendance.faltas}, Retardos: ${studentData.attendance.retardos}

CONDUCTA:
  Puntos acumulados: ${studentData.behavior.puntos} (${studentData.behavior.positivos} positivos, ${studentData.behavior.negativos} negativos)
  ${studentData.behavior.incidentes.length > 0 ? 'Incidentes recientes: ' + studentData.behavior.incidentes.join('; ') : 'Sin incidentes registrados'}

TAREAS:
  Completadas: ${studentData.tareas.completadas} de ${studentData.tareas.total} (${studentData.tareas.porcentaje}%)

NECESIDADES EDUCATIVAS:
  ${studentData.usaer ? 'Recibe apoyo USAER' : 'Sin apoyo USAER'}
  ${studentData.bap !== 'NINGUNA' ? 'BAP: ' + studentData.bap : 'Sin BAP identificada'}
  ${studentData.repetidor ? 'Es alumno repetidor' : 'No es repetidor'}

INSTRUCCIONES:
Genera un análisis pedagógico completo en ESPAÑOL con estas secciones claramente separadas:

1. RESUMEN EJECUTIVO: Descripción general del desempeño del alumno en 2-3 líneas.

2. ANÁLISIS ACADÉMICO POR CAMPO FORMATIVO:
- Lenguajes: fortalezas y áreas de oportunidad basadas en sus calificaciones
- Saberes y Pensamiento Científico: análisis específico
- Ética, Naturaleza y Sociedades: análisis específico  
- De lo Humano y lo Comunitario: análisis específico
- Identifica la materia más fuerte y la que necesita mayor atención

3. ANÁLISIS DE ASISTENCIA: Evalúa el impacto de su asistencia en su aprendizaje.

4. ANÁLISIS DE CONDUCTA: Evalúa su comportamiento, participación y convivencia escolar.

5. ANÁLISIS DE CUMPLIMIENTO: Evalúa su responsabilidad con las tareas y actividades.

6. OBSERVACIONES ESPECIALES: Menciona cualquier necesidad educativa especial (USAER, BAP, repetidor) y cómo se está atendiendo.

7. SUGERENCIAS PARA LA FAMILIA: 3-4 recomendaciones concretas y prácticas que los padres pueden implementar en casa para apoyar el aprendizaje.

8. METAS PARA EL SIGUIENTE PERIODO: 2-3 objetivos específicos y medibles para el alumno.

Usa tono profesional pero empático. Sé específico con los datos del alumno, no genérico. Cada sugerencia debe estar vinculada a los datos presentados.`;

  try {
    return await generateWithFallback(prompt, { maxOutputTokens: 2048 });
  } catch (e: any) {
    console.error("Error generando análisis del alumno:", e);
    return `No se pudo generar el análisis con IA. Error: ${e.message}`;
  }
};

// --- Generación de Presentaciones CTE con IA ---
export const generateCTEPresentation = async (
  topic: string,
  files: File[],
  slideCount: number = 7
): Promise<{ slides: { title: string; content: string; type: string }[] }> => {
  const parts: any[] = [];

  if (topic.trim()) {
    parts.push({ text: `TEMA/DESCRIPCIÓN DE LA SESIÓN CTE:\n${topic}` });
  }

  for (const file of files) {
    try {
      if (file.type.startsWith('image/')) {
        const base64 = await fileToBase64(file);
        parts.push({ inline_data: { mime_type: file.type, data: base64 } });
      } else if (file.type === 'application/pdf' || file.type === 'text/plain' || file.name.endsWith('.txt')) {
        const text = await file.text();
        parts.push({ text: `DOCUMENTO ADJUNTO (${file.name}):\n${text.substring(0, 15000)}` });
      }
    } catch (e) {
      console.warn(`No se pudo procesar el archivo ${file.name}:`, e);
    }
  }

  parts.push({ text: `
INSTRUCCIONES:
Genera una presentación para una sesión de Consejo Técnico Escolar (CTE) en una primaria pública de México bajo el modelo NEM (Nueva Escuela Mexicana).
Genera entre ${slideCount} y ${Math.max(slideCount, 10)} diapositivas.

ESTRUCTURA OBLIGATORIA DE LA PRESENTACIÓN:
1. PORTADA: Título de la sesión, nombre de la escuela, fecha
2. AGENDA: Lista de puntos a tratar
3. CONTENIDO: Varias diapositivas con el desarrollo del tema principal
4. ACTIVIDAD: Una dinámica o actividad para el colectivo docente
5. ACUERDOS: Compromisos y próximos pasos

RESPONDE ÚNICAMENTE CON ESTE JSON (sin markdown, sin \`\`\`):
{
  "slides": [
    { "title": "Título de la diapositiva", "content": "Contenido completo de la diapositiva con viñetas y puntos clave", "type": "TITLE" }
  ]
}

Tipos válidos: TITLE, AGENDA, CONTENT, ACTIVITY, CLOSING
Usa lenguaje profesional pero accesible para docentes de primaria.` });

  try {
    const text = await generateWithFallback(parts, { responseMimeType: "application/json", maxOutputTokens: 4096 });
    const cleaned = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e: any) {
    console.error("Error generando presentación CTE:", e);
    throw new Error(`Error al generar presentación: ${e.message}`);
  }
};

// --- Generación de Juegos CTE con IA ---
export const generateCTEGameQuestions = async (
  topic: string,
  files: File[],
  questionCount: number = 5,
  gameType: string = 'TRIVIA'
): Promise<{ questions: { text: string; options: string[]; correctIndex: number }[] }> => {
  const parts: any[] = [];

  if (topic.trim()) {
    parts.push({ text: `TEMA/DESCRIPCIÓN DEL JUEGO CTE:\n${topic}` });
  }

  for (const file of files) {
    try {
      if (file.type.startsWith('image/')) {
        const base64 = await fileToBase64(file);
        parts.push({ inline_data: { mime_type: file.type, data: base64 } });
      } else if (file.type === 'application/pdf' || file.type === 'text/plain' || file.name.endsWith('.txt')) {
        const text = await file.text();
        parts.push({ text: `DOCUMENTO ADJUNTO (${file.name}):\n${text.substring(0, 15000)}` });
      }
    } catch (e) {
      console.warn(`No se pudo procesar el archivo ${file.name}:`, e);
    }
  }

  parts.push({ text: `
INSTRUCCIONES:
Genera ${questionCount} preguntas para un juego interactivo tipo ${gameType} dirigido a DOCENTES de primaria durante una sesión de Consejo Técnico Escolar (CTE).

El juego debe estar basado en:
- El tema/descripción proporcionada
- Los documentos adjuntos (si los hay)
- Temáticas relevantes para docentes de primaria NEM (Nueva Escuela Mexicana)

${gameType === 'TRIVIA' ? `
Cada pregunta debe tener 4 opciones de respuesta, donde UNA sola sea correcta.
Asegúrate de que las preguntas sean variadas en dificultad (fáciles, intermedias y desafiantes).
` : gameType === 'SURVEY' ? `
Genera preguntas tipo encuesta/de opinión sobre el tema. Las opciones deben reflejar diferentes posturas o grados de acuerdo.
` : `
Genera preguntas abiertas que fomenten la reflexión y discusión entre docentes.
`}

RESPONDE ÚNICAMENTE CON ESTE JSON (sin markdown, sin \`\`\`):
{
  "questions": [
    { "text": "Pregunta", "options": ["Opción A", "Opción B", "Opción C", "Opción D"], "correctIndex": 0 }
  ]
}

Las preguntas deben ser claras, precisas y estar directamente relacionadas con el contenido proporcionado.` });

  try {
    const text = await generateWithFallback(parts, { responseMimeType: "application/json", maxOutputTokens: 4096 });
    const cleaned = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e: any) {
    console.error("Error generando juego CTE:", e);
    throw new Error(`Error al generar juego: ${e.message}`);
  }
};

// --- Extraer texto de archivos para contexto ---
export const extractTextFromFiles = async (files: File[]): Promise<string> => {
  const texts: string[] = [];
  for (const file of files) {
    try {
      if (file.type === 'application/pdf') {
        // Para PDFs, intentamos leer el texto directamente
        // Nota: esto funciona para PDFs con texto seleccionable
        try {
          const text = await file.text();
          if (text.length > 50 && !text.startsWith('%PDF')) {
            texts.push(`--- ${file.name} ---\n${text.substring(0, 10000)}`);
          } else {
            texts.push(`--- ${file.name} ---\n[Archivo PDF cargado - se enviará como imagen para análisis]`);
          }
        } catch {
          texts.push(`--- ${file.name} ---\n[PDF cargado para análisis visual]`);
        }
      } else if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        const text = await file.text();
        texts.push(`--- ${file.name} ---\n${text.substring(0, 10000)}`);
      } else if (file.type.startsWith('image/')) {
        texts.push(`--- ${file.name} ---\n[Imagen cargada para análisis visual]`);
      } else {
        texts.push(`--- ${file.name} ---\n[Archivo cargado: ${file.type}]`);
      }
    } catch (e) {
      texts.push(`--- ${file.name} ---\n[Error al leer archivo]`);
    }
  }
  return texts.join('\n\n');
};
