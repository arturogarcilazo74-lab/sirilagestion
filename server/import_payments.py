import openpyxl
import mysql.connector
import os
import json

env_path = r"c:\Users\lapomiguel\Desktop\aula 4to\sirilagestion2\server\.env"
config = {}
if os.path.exists(env_path):
    with open(env_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#'):
                key, val = line.split('=', 1)
                config[key.strip()] = val.strip()

db_config = {
    'host': config.get('DB_HOST'),
    'user': config.get('DB_USER'),
    'password': config.get('DB_PASSWORD'),
    'database': config.get('DB_NAME'),
    'port': int(config.get('DB_PORT', 3306)),
}

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

# Connect to DB
conn = mysql.connector.connect(**db_config)
cursor = conn.cursor(dictionary=True)

# Fetch current students to map
cursor.execute("SELECT id, curp, name, guardian_name, guardian_phone, annual_fee_paid, data_json FROM students")
db_students = cursor.fetchall()
curp_to_db = {s['curp'].strip().upper(): s for s in db_students if s['curp']}

stats = {
    'total_excel': len(excel_rows),
    'matched': 0,
    'fee_paid': 0,
    'fee_partial': 0,
    'fee_unpaid': 0,
    'tutor_name_updated': 0,
    'tutor_phone_updated': 0,
    'omitted': 0
}

# We will skip these unmatched students as indicated by user ("ya no estan en la escuela")
omitted_curps = {'CAGL190927HSLSMCA6', 'QUBJ161201MSLNLSA0', 'ROBI160614MBCDDTA9'}

for er in excel_rows:
    curp = str(er.get('curp') or '').strip().upper()
    if curp in omitted_curps:
        stats['omitted'] += 1
        continue
        
    if curp not in curp_to_db:
        # Check if matched by Name if CURP differs slightly (spelling)
        name_to_db = {s['name'].strip().upper(): s for s in db_students if s['name']}
        name = str(er.get('nombre_estudiante') or '').strip().upper()
        if name in name_to_db:
            db_student = name_to_db[name]
        else:
            print(f"Skipping unmatched student: {er.get('nombre_estudiante')} ({curp})")
            continue
    else:
        db_student = curp_to_db[curp]
        
    stats['matched'] += 1
    
    # Check if paid / partial
    estatus = str(er.get('estatus') or '').strip().upper()
    abono = er.get(' abono ')
    if abono is None:
        abono = er.get('abono') # handle both keys if space differs
    if abono is None:
        # search keys manually
        for k, v in er.items():
            if 'abono' in k.lower():
                abono = v
                break
                
    monto_total = er.get('monto_total') or 350
    
    if abono is None:
        abono = 0
        
    # Sibling check
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
    
    # Resolve status
    if is_paid:
        fee_status = 'PAGADO'
        stats['fee_paid'] += 1
    elif estatus == 'PARCIAL' or (0 < f_abono < f_monto):
        fee_status = 'PARCIAL'
        stats['fee_partial'] += 1
    else:
        fee_status = 'PENDIENTE'
        stats['fee_unpaid'] += 1
    
    # Tutor Name
    tutor_name_excel = str(er.get('nombre_tutor') or '').strip()
    current_tutor_name = db_student.get('guardian_name') or ''
    update_tutor_name = False
    
    # Update only if empty or N/A
    if tutor_name_excel and tutor_name_excel.upper() != 'N/A':
        if not current_tutor_name or current_tutor_name.upper() in ['', 'N/A', 'NONE', 'NULL']:
            update_tutor_name = True
            stats['tutor_name_updated'] += 1
            
    # Tutor Phone
    tutor_phone_excel = str(er.get('numero_telefono_tutor') or '').strip()
    current_tutor_phone = db_student.get('guardian_phone') or ''
    update_tutor_phone = False
    
    if tutor_phone_excel and tutor_phone_excel.upper() != 'N/A':
        if not current_tutor_phone or current_tutor_phone.upper() in ['', 'N/A', 'NONE', 'NULL']:
            update_tutor_phone = True
            stats['tutor_phone_updated'] += 1

    # Load and update data_json
    data_json_str = db_student.get('data_json') or '{}'
    try:
        if isinstance(data_json_str, str):
            student_data = json.loads(data_json_str)
        else:
            student_data = data_json_str or {}
    except Exception:
        student_data = {}
        
    # Apply updates
    student_data['annualFeePaid'] = is_paid
    student_data['annualFeeStatus'] = fee_status
    student_data['annualFeeAbono'] = f_abono
    student_data['annualFeeTotal'] = f_monto
    student_data['tieneHermanos'] = has_siblings
    if grado_hermano:
        student_data['siblingGrade'] = str(grado_hermano)
        
    final_tutor_name = tutor_name_excel if update_tutor_name else current_tutor_name
    final_tutor_phone = tutor_phone_excel if update_tutor_phone else current_tutor_phone
    
    student_data['guardianName'] = final_tutor_name
    student_data['guardianPhone'] = final_tutor_phone
    
    # Save back to database
    cursor.execute("""
        UPDATE students
        SET annual_fee_paid = %s,
            guardian_name = %s,
            guardian_phone = %s,
            data_json = %s
        WHERE id = %s
    """, (
        1 if is_paid else 0,
        final_tutor_name,
        final_tutor_phone,
        json.dumps(student_data),
        db_student['id']
    ))

conn.commit()
cursor.close()
conn.close()

# Now sync with server/database.json if it exists
json_db_path = r"c:\Users\lapomiguel\Desktop\aula 4to\sirilagestion2\server\database.json"
if os.path.exists(json_db_path):
    print("Syncing changes to database.json fallback storage...")
    with open(json_db_path, 'r', encoding='utf-8') as f:
        db_data = json.load(f)
        
    updated_students = []
    for s in db_data.get('students', []):
        curp = str(s.get('curp') or '').strip().upper()
        # Find in excel
        excel_match = None
        for er in excel_rows:
            e_curp = str(er.get('curp') or '').strip().upper()
            if e_curp == curp:
                excel_match = er
                break
                
        if excel_match and curp not in omitted_curps:
            # Check paid / partial
            estatus = str(excel_match.get('estatus') or '').strip().upper()
            abono = excel_match.get(' abono ')
            if abono is None:
                abono = excel_match.get('abono')
            if abono is None:
                for k, v in excel_match.items():
                    if 'abono' in k.lower():
                        abono = v
                        break
            monto_total = excel_match.get('monto_total') or 350
            if abono is None:
                abono = 0
                
            tiene_hermanos = excel_match.get('tiene_hermanos')
            grado_hermano = excel_match.get('grado_hermano')
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
            
            s['annualFeePaid'] = is_paid
            s['annualFeeStatus'] = fee_status
            s['annualFeeAbono'] = f_abono
            s['annualFeeTotal'] = f_monto
            s['tieneHermanos'] = has_siblings
            if grado_hermano:
                s['siblingGrade'] = str(grado_hermano)
            
            # Tutor Name
            tutor_name_excel = str(excel_match.get('nombre_tutor') or '').strip()
            current_tutor_name = s.get('guardianName') or ''
            if tutor_name_excel and tutor_name_excel.upper() != 'N/A':
                if not current_tutor_name or current_tutor_name.upper() in ['', 'N/A', 'NONE', 'NULL']:
                    s['guardianName'] = tutor_name_excel
                    
            # Tutor Phone
            tutor_phone_excel = str(excel_match.get('numero_telefono_tutor') or '').strip()
            current_tutor_phone = s.get('guardianPhone') or ''
            if tutor_phone_excel and tutor_phone_excel.upper() != 'N/A':
                if not current_tutor_phone or current_tutor_phone.upper() in ['', 'N/A', 'NONE', 'NULL']:
                    s['guardianPhone'] = tutor_phone_excel
                    
        updated_students.append(s)
        
    db_data['students'] = updated_students
    with open(json_db_path, 'w', encoding='utf-8') as f:
        json.dump(db_data, f, indent=2, ensure_ascii=False)
    print("Fallback database.json updated successfully.")

print("\n--- IMPORT SUMMARY ---")
for k, v in stats.items():
    print(f"{k.replace('_', ' ').title()}: {v}")
