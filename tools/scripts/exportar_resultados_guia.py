"""Exporta a Excel los resultados de una actividad HTML de la plataforma.

Genera una hoja con una fila por alumno y una columna por reactivo, con
1 = respuesta correcta y 0 = incorrecta (celda vacía = sin entregar).

Uso:
    python tools/scripts/exportar_resultados_guia.py [assignmentId] [salida.xlsx]

Sin argumentos exporta la guía de estudio del primer periodo de 6° A.
"""
import json
import sys
import urllib.request
from datetime import datetime

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

BASE = "https://sirila.losdeotayvista.com/sirila-v1"
DEFAULT_ASSIGNMENT = "A1794393049336"
DEFAULT_OUT = r"C:\Users\lapomiguel\Documents\6to_grado_26\resultados_guia_estudio_6A.xlsx"

FIELD_PREFIX = {"Lenguajes": "L", "Saberes": "S", "Etica": "E", "Humano": "H"}
FIELD_LABEL = {
    "Lenguajes": "Lenguajes",
    "Saberes": "Saberes",
    "Etica": "Ética",
    "Humano": "De lo Humano",
}
# Reactivos por campo: los de Saberes llevan además tres casos especiales.
FIELD_IDS = {
    "L": [f"L{i}" for i in range(1, 16)],
    "S": [f"S{i}" for i in range(1, 11)] + ["SN1", "SN2", "SN3"],
    "E": [f"E{i}" for i in range(1, 11)],
    "H": [f"H{i}" for i in range(1, 8)],
}


def get(path):
    with urllib.request.urlopen(f"{BASE}{path}", timeout=120) as response:
        return json.loads(response.read().decode("utf-8"))


def normalize(value):
    return "".join(str(value or "").split()).upper()


def main():
    assignment_id = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_ASSIGNMENT
    out = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_OUT

    state = get("/full-state")
    assignment = get(f"/assignments/{assignment_id}")

    enabled = assignment.get("enabledFields") or ["Lenguajes", "Saberes", "Etica", "Humano"]
    target = normalize(assignment.get("targetGroup") or "GLOBAL")

    students = [
        s for s in state.get("students", [])
        if s.get("status") != "BAJA" and (target in ("GLOBAL", "TODOS") or normalize(s.get("group")) == target)
    ]
    students.sort(key=lambda s: (s.get("name") or "").upper())

    questions = []
    for field in enabled:
        prefix = FIELD_PREFIX.get(field)
        if prefix:
            questions.extend(FIELD_IDS[prefix])

    wb = Workbook()
    ws = wb.active
    ws.title = "Resultados"

    thin = Side(style="thin", color="D9D9D9")
    border = Border(left=thin, right=thin, top=thin, bottom=thin)
    header_fill = PatternFill("solid", fgColor="4F46E5")
    header_font = Font(bold=True, color="FFFFFF", size=9)
    green, red, muted = Font(color="047857", bold=True), Font(color="B91C1C", bold=True), Font(color="9CA3AF")

    titulo = ws.cell(row=1, column=1, value=f"Resultados de «{assignment.get('title')}» — {assignment.get('targetGroup')}")
    titulo.font = Font(bold=True, size=14, color="1F2937")
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=min(10, 7 + len(questions)))

    nota = ws.cell(
        row=2, column=1,
        value="1 = respuesta correcta · 0 = incorrecta · celda vacía = sin entregar. "
              f"Generado el {datetime.now().strftime('%d/%m/%Y %H:%M')}.",
    )
    nota.font = Font(size=9, italic=True, color="6B7280")
    ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=min(10, 7 + len(questions)))

    headers = ["No.", "Alumno", "Estatus", "Calificación", "Aciertos", "Total", "Intento anterior"] + questions
    headers += [f"% {FIELD_LABEL.get(f, f)}" for f in enabled if f in FIELD_PREFIX]

    HEADER_ROW = 3
    for index, text in enumerate(headers, start=1):
        cell = ws.cell(row=HEADER_ROW, column=index, value=text)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = border
    ws.row_dimensions[HEADER_ROW].height = 30

    for offset, student in enumerate(students, start=HEADER_ROW + 1):
        result = (student.get("assignmentResults") or {}).get(assignment_id)
        items = (student.get("assignmentItemResults") or {}).get(assignment_id) or {}
        areas = (student.get("assignmentAreaResults") or {}).get(assignment_id) or {}
        history = (student.get("assignmentHistory") or {}).get(assignment_id) or []
        delivered = result is not None
        hits = sum(1 for k in questions if items.get(k) == 1)
        total = sum(1 for k in questions if k in items)

        ws.cell(row=offset, column=1, value=offset - HEADER_ROW).alignment = Alignment(horizontal="center")
        ws.cell(row=offset, column=2, value=student.get("name"))
        status = ws.cell(row=offset, column=3, value="Entregado" if delivered else "Sin entregar")
        status.font = Font(color="047857", bold=True) if delivered else muted
        ws.cell(row=offset, column=4, value=result if delivered else None)
        ws.cell(row=offset, column=5, value=hits if delivered else None)
        ws.cell(row=offset, column=6, value=total if delivered else None)
        ws.cell(row=offset, column=7, value=history[-1].get("score") if history else None)
        for col in range(3, 8):
            ws.cell(row=offset, column=col).alignment = Alignment(horizontal="center")

        col = 8
        for key in questions:
            value = items.get(key)
            cell = ws.cell(row=offset, column=col, value=value if value in (0, 1) else None)
            cell.alignment = Alignment(horizontal="center")
            if value == 1:
                cell.font = green
            elif value == 0:
                cell.font = red
            col += 1

        for field in enabled:
            if field not in FIELD_PREFIX:
                continue
            ws.cell(row=offset, column=col, value=areas.get(field)).alignment = Alignment(horizontal="center")
            col += 1

        for c in range(1, len(headers) + 1):
            ws.cell(row=offset, column=c).border = border

    ws.freeze_panes = ws.cell(row=HEADER_ROW + 1, column=3)
    ws.auto_filter.ref = f"A{HEADER_ROW}:{get_column_letter(len(headers))}{HEADER_ROW + len(students)}"

    ws.column_dimensions["A"].width = 5
    ws.column_dimensions["B"].width = 34
    ws.column_dimensions["C"].width = 13
    for letter in ("D", "E", "F", "G"):
        ws.column_dimensions[letter].width = 11
    for index in range(8, 8 + len(questions) + len([f for f in enabled if f in FIELD_PREFIX])):
        ws.column_dimensions[get_column_letter(index)].width = 6

    summary = wb.create_sheet("Por campo")
    summary.append(["Alumno"] + [FIELD_LABEL.get(f, f) for f in enabled if f in FIELD_PREFIX])
    for cell in summary[1]:
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center")
    for student in students:
        areas = (student.get("assignmentAreaResults") or {}).get(assignment_id) or {}
        summary.append([student.get("name")] + [areas.get(f) for f in enabled if f in FIELD_PREFIX])
    summary.column_dimensions["A"].width = 34
    for index in range(2, 2 + len([f for f in enabled if f in FIELD_PREFIX])):
        summary.column_dimensions[get_column_letter(index)].width = 16

    wb.save(out)
    entregados = sum(1 for s in students if (s.get("assignmentResults") or {}).get(assignment_id) is not None)
    print(f"Excel generado: {out}")
    print(f"alumnos: {len(students)} | reactivos: {len(questions)} | entregados: {entregados}")


if __name__ == "__main__":
    main()
