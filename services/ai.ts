import { Student } from "../types";

// Helper to get API Key dynamically
const getApiKey = () => (import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY || '').trim();

// Helper to handle model fallbacks using direct REST API
const generateWithFallback = async (input: string | any[], config?: any): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("No se encontró la API Key de Gemini. Si estás en la Nube (Render), asegúrate de haber agregado VITE_GEMINI_API_KEY en la pestaña Environment y que el valor empiece con 'AIza...'. Nota: Render requiere un nuevo Deploy manual para aplicar cambios en variables VITE_.");
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
    prompt = `Ficha Descriptiva NEM de ${data.studentName}. Promedio: ${data.average}, Asistencia: ${data.attendanceRate}%, Conducta: ${data.behaviorPoints}, BAP: ${data.bap}. Fortalezas y áreas de mejora.`;
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
  const prompt = `Cuestionario 4to grado sobre ${topic}. ${count} preguntas. JSON format: [{"text": "", "options": [], "correctIndex": 0}].`;
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
  parts.push({ text: `Genera ${count} preguntas de opción múltiple basadas en este contenido. JSON format: [{"text": "", "options": [], "correctIndex": 0}]` });

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

RESPONDE CON UN OBJETO JSON con esta estructura EXACTA:
{
  "svg": "CÓDIGO SVG COMPLETO COMO STRING (sin saltos de línea reales, usa espacios)",
  "interactiveZones": [
    {
      "id": "zona1",
      "type": "TEXT_INPUT",
      "x": 10,
      "y": 20,
      "width": 60,
      "height": 5,
      "correctAnswer": "respuesta",
      "points": 1
    }
  ],
  "draggableItems": []
}

═══════════════════════════════════════════════════════════════════
ESPECIFICACIONES PARA EL SVG (campo "svg"):
═══════════════════════════════════════════════════════════════════

El SVG debe ser UN STRING DE UNA SOLA LÍNEA. Usa espacios en lugar de saltos de línea.

ESTRUCTURA OBLIGATORIA:
<svg width="1200" height="1600" viewBox="0 0 1200 1600" xmlns="http://www.w3.org/2000/svg"> <rect width="1200" height="1600" fill="#FFFFFF"/> <text x="600" y="100" font-size="48" font-weight="bold" text-anchor="middle" fill="#2563EB">${topic}</text> <text x="600" y="180" font-size="28" text-anchor="middle" fill="#64748B">INSTRUCCIONES CLARAS</text> [CONTENIDO PRINCIPAL AQUÍ] <text x="600" y="1520" font-size="18" text-anchor="middle" fill="#94A3B8">4to Grado</text> </svg>

REGLAS DE DISEÑO ESTRICTAS:

1. LAYOUT VERTICAL:
   - Título: y=100 (48px)
   - Instrucciones: y=180 (28px)
   - Contenido: y=250 a y=1400
   - MÁXIMO 6 preguntas/elementos
   - Separación entre elementos: 180px

2. MÁRGENES:
   - Izquierda: x=120
   - Derecha: x=1080
   - Centrado: x=600

3. TAMAÑOS DE FUENTE:
   - Título: 48px
   - Subtítulos/Preguntas: 36px
   - Texto normal: 28px
   - NUNCA usar fuente menor a 24px

4. ELEMENTOS POR TIPO:
${type.toLowerCase().includes('sopa') ? `
   SOPA DE LETRAS:
   - Grid 8x8 (más legible que 10x10)
   - Cada letra: 32px, bold
   - Espaciado: 55px entre letras
   - Posición del grid: x=250, y=300
   - Lista de palabras a buscar: x=800, y=300, una por línea (32px entre cada una)
` : type.toLowerCase().includes('crucigrama') ? `
   CRUCIGRAMA:
   - Casillas: 50x50px (grandes y legibles)
   - Números de pista: 18px
   - Grid centrado en x=600
   - Pistas abajo del grid (28px)
` : `
   PREGUNTAS/EJERCICIOS:
   - Máximo 6 preguntas
   - Cada pregunta:
     * Número en círculo (radius=25, fill="#3B82F6")
     * Texto de pregunta: 32px, x=200
     * Caja de respuesta: rect (800x60px, stroke="#CBD5E1", stroke-width="3", fill="none")
   - Espaciado vertical: 180px entre cada pregunta
   - Primera pregunta: y=300
`}

5. COLORES:
   - Fondo: #FFFFFF (blanco)
   - Título: #2563EB (azul)
   - Texto principal: #334155 (gris oscuro)
   - Texto secundario: #64748B (gris medio)
   - Bordes/cajas: #CBD5E1 (gris claro)
   - Acentos: #3B82F6 (azul brillante)

═══════════════════════════════════════════════════════════════════
ESPECIFICACIONES PARA interactiveZones:
═══════════════════════════════════════════════════════════════════

Las coordenadas x, y, width, height son PORCENTAJES (0-100) relativos al SVG.

Tipos disponibles:
- "TEXT_INPUT": para escribir respuestas
- "SELECTABLE": para seleccionar (ej. letras en sopa de letras)
- "DROP_ZONE": para arrastrar elementos
- "MATCH_SOURCE" / "MATCH_TARGET": para unir con líneas

IMPORTANTE: 
- Las zonas deben coincidir EXACTAMENTE con los elementos dibujados en el SVG
- Máximo 20 zonas interactivas
- Para sopas de letras: crea una zona SELECTABLE por cada letra de las palabras correctas

VALIDA ANTES DE RESPONDER:
[ ] El SVG es un string de una sola línea
[ ] Tiene fondo blanco sólido
[ ] El texto más pequeño es 24px
[ ] Máximo 6 elementos principales
[ ] Las zonas coinciden con las posiciones del SVG
[ ] Todo está dentro de los márgenes (x: 120-1080)

RESPONDE SOLO CON EL JSON. NO agregues texto antes ni después.`;

  try {
    const text = await generateWithFallback(prompt, { responseMimeType: "application/json" });

    // Clean up common AI formatting issues
    let cleaned = text.replace(/```json|```/g, '').trim();

    // Try parsing the JSON
    let data;
    try {
      data = JSON.parse(cleaned);
    } catch (parseError) {
      console.warn("First JSON parse failed, attempting cleanup...", parseError);
      // Remove potential problematic newlines inside strings
      cleaned = cleaned.replace(/\n/g, ' ');
      data = JSON.parse(cleaned);
    }

    // Validate required fields
    if (!data.svg) throw new Error("El campo 'svg' es obligatorio");
    if (!data.interactiveZones) throw new Error("El campo 'interactiveZones' es obligatorio");

    const finalSvg = data.svg.trim();

    // Validate it's actually SVG
    if (!finalSvg.includes('<svg')) throw new Error("El campo 'svg' no contiene código SVG válido");

    // Client-side Base64 Encoding
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
    throw new Error(`Complete Worksheet Error: ${e.message}`);
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
