import openpyxl
import json
import urllib.request
import os

# Excel path
excel_path = r"c:\Users\lapomiguel\Desktop\aula 4to\sirilagestion2\docs\pagos de cuotas escolares 2025-2026.xlsx"
wb = openpyxl.load_workbook(excel_path, data_only=True)
sheet = wb['cuotas']

excel_rows = []
header = None
for row_idx, row in enumerate(sheet.iter_rows(values_only=True)):
    if row_idx == 0:
        header = [str(c).strip() for c in row]
        continue
    if any(row):
        row_dict = dict(zip(header, row))
        # Ensure we have a valid CURP and student name (skip headers / summary rows)
        if row_dict.get('curp') and row_dict.get('nombre_estudiante') and row_dict['id_alumno'] is not None:
            excel_rows.append(row_dict)

print(f"Loaded {len(excel_rows)} student rows from Excel.")

# Format payload
payments = []
omitted_curps = {'CAGL190927HSLSMCA6', 'QUBJ161201MSLNLSA0', 'ROBI160614MBCDDTA9'}

for er in excel_rows:
    curp = str(er.get('curp') or '').strip().upper()
    if curp in omitted_curps:
        continue

    estatus = str(er.get('estatus') or '').strip().upper()
    abono = er.get(' abono ')
    if abono is None:
        abono = er.get('abono')
    if abono is None:
        for k, v in er.items():
            if 'abono' in k.lower():
                abono = v
                break
    monto_total = er.get('monto_total') or 350
    if abono is None:
        abono = 0

    tiene_hermanos = er.get('tiene_hermanos')
    grado_hermano = er.get('grado_hermano')
    has_siblings = bool(tiene_hermanos and int(tiene_hermanos) == 1)

    try:
        f_abono = float(abono)
        f_monto = float(monto_total)
    except Exception:
        f_abono = 0.0
        f_monto = 350.0

    is_paid = (estatus == 'PAGADO' or f_abono >= f_monto)

    if is_paid:
        fee_status = 'PAGADO'
    elif estatus == 'PARCIAL' or (0 < f_abono < f_monto):
        fee_status = 'PARCIAL'
    else:
        fee_status = 'PENDIENTE'

    payments.append({
        'curp': curp,
        'name': str(er.get('nombre_estudiante') or '').strip().upper(),
        'annualFeePaid': is_paid,
        'annualFeeStatus': fee_status,
        'annualFeeAbono': f_abono,
        'annualFeeTotal': f_monto,
        'tieneHermanos': has_siblings,
        'siblingGrade': str(grado_hermano) if grado_hermano else '',
        'guardianName': str(er.get('nombre_tutor') or '').strip(),
        'guardianPhone': str(er.get('numero_telefono_tutor') or '').strip()
    })

# Send to Hostinger API
url = "https://sirila.losdeotayvista.com/sirila-v1/import-payments-data"
payload = {'payments': payments}

req = urllib.request.Request(
    url,
    data=json.dumps(payload).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)

try:
    print(f"Sending payments to {url}...")
    with urllib.request.urlopen(req) as response:
        res_data = response.read().decode('utf-8')
        print("Response:", res_data)
except Exception as e:
    print("Error:", e)
