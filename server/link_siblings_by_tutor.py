import openpyxl
import mysql.connector
import os
import json
import re

# Load environment configuration
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
    'host': config.get('DB_HOST', 'localhost'),
    'user': config.get('DB_USER', 'root'),
    'password': config.get('DB_PASSWORD', ''),
    'database': config.get('DB_NAME', 'sirila_db'),
    'port': int(config.get('DB_PORT', 3306)),
}

# Connect to database
print("Connecting to database...")
conn = mysql.connector.connect(**db_config)
cursor = conn.cursor(dictionary=True)

# Fetch all current students
print("Fetching current students...")
cursor.execute("SELECT id, curp, name, annual_fee_paid, data_json FROM students")
db_students = cursor.fetchall()
print(f"Loaded {len(db_students)} students from database.")

# Parse Excel file
excel_path = r"c:\Users\lapomiguel\Desktop\aula 4to\sirilagestion2\Plantilla_Alumnos_Tutores.xlsx"
print(f"Loading Excel file from {excel_path}...")
wb = openpyxl.load_workbook(excel_path, data_only=True)
sheet = wb.active

excel_rows = []
header = None
for row_idx, row in enumerate(sheet.iter_rows(values_only=True)):
    if row_idx == 0:
        header = [str(c).strip() for c in row]
        continue
    if any(row):
        row_dict = dict(zip(header, row))
        excel_rows.append(row_dict)

print(f"Loaded {len(excel_rows)} rows from Excel.")

# Helpers for matching names
def clean_string(s):
    if not s:
        return ""
    # Remove accents and special characters, keep alphanumeric
    s = s.upper().strip()
    s = re.sub(r'[ÁÄÂÀ]', 'A', s)
    s = re.sub(r'[ÉËÊÈ]', 'E', s)
    s = re.sub(r'[ÍÏÎÌ]', 'I', s)
    s = re.sub(r'[ÓÖÔÒ]', 'O', s)
    s = re.sub(r'[ÚÜÛÙ]', 'U', s)
    s = re.sub(r'[Ñ]', 'N', s)
    return re.sub(r'[^A-Z0-9]', '', s)

# Create index of Excel rows
excel_by_curp = {}
excel_by_clean_name = {}

for row in excel_rows:
    curp = str(row.get('CURP') or '').strip().upper()
    if curp:
        excel_by_curp[curp] = row
    
    first_name = str(row.get('Nombre') or '').strip()
    last_name = str(row.get('Apellidos') or '').strip()
    full_name = f"{first_name} {last_name}"
    clean_name = clean_string(full_name)
    if clean_name:
        excel_by_clean_name[clean_name] = row

# Match database students to Excel rows
matched_students = []
unmatched_students = []

for db_s in db_students:
    db_curp = str(db_s.get('curp') or '').strip().upper()
    db_name = str(db_s.get('name') or '').strip()
    db_clean_name = clean_string(db_name)
    
    matched_row = None
    if db_curp and db_curp in excel_by_curp:
        matched_row = excel_by_curp[db_curp]
    elif db_clean_name and db_clean_name in excel_by_clean_name:
        matched_row = excel_by_clean_name[db_clean_name]
        
    if matched_row:
        # Extract Tutor name as group key
        t_name = str(matched_row.get('Nombre Tutor') or '').strip()
        t_apellidos = str(matched_row.get('Apellidos Tutor') or '').strip()
        tutor_key = clean_string(f"{t_name} {t_apellidos}")
        
        # Fallback to phone if tutor name is empty but phone exists
        if not tutor_key:
            tutor_key = clean_string(str(matched_row.get('Telefono Tutor') or ''))
            
        if tutor_key:
            matched_students.append({
                'db': db_s,
                'excel': matched_row,
                'tutor_key': tutor_key,
                'tutor_name': f"{t_name} {t_apellidos}".strip()
            })
        else:
            unmatched_students.append(db_s)
    else:
        unmatched_students.append(db_s)

print(f"Matched {len(matched_students)} students to tutors. {len(unmatched_students)} students could not be matched.")

# Group by tutor key
tutor_groups = {}
for item in matched_students:
    key = item['tutor_key']
    if key not in tutor_groups:
        tutor_groups[key] = []
    tutor_groups[key].append(item)

# Find sibling groups (tutor groups with more than 1 student)
sibling_groups = {k: v for k, v in tutor_groups.items() if len(v) > 1}
print(f"Found {len(sibling_groups)} families/sibling groups.")

updated_count = 0

for key, group in sibling_groups.items():
    print(f"\nFamily of tutor '{group[0]['tutor_name']}':")
    for item in group:
        print(f"  - {item['db']['name']} (ID: {item['db']['id']}, CURP: {item['db']['curp']})")
        
    # Check if anyone in this family has paid
    has_paid = False
    payment_status = 'PENDIENTE'
    payment_abono = 0
    payment_total = 350
    
    # Check direct column and JSON contents for best payment data
    for item in group:
        db_s = item['db']
        if db_s['annual_fee_paid']:
            has_paid = True
            payment_status = 'PAGADO'
            payment_abono = 350
            
        data = {}
        if db_s['data_json']:
            try:
                data = json.loads(db_s['data_json']) if isinstance(db_s['data_json'], str) else db_s['data_json']
            except:
                pass
                
        if data.get('annualFeePaid') or data.get('annualFeeStatus') == 'PAGADO':
            has_paid = True
            payment_status = 'PAGADO'
            payment_abono = data.get('annualFeeTotal') or data.get('annualFeeAbono') or 350
        elif data.get('annualFeeStatus') == 'PARCIAL':
            payment_status = 'PARCIAL'
            payment_abono = max(payment_abono, data.get('annualFeeAbono') or 0)
            
        payment_total = data.get('annualFeeTotal') or payment_total

    # Update each student in the group
    student_ids = [item['db']['id'] for item in group]
    
    for item in group:
        db_s = item['db']
        other_siblings = [sib for sib in group if sib['db']['id'] != db_s['id']]
        other_sibling_ids = [sib['db']['id'] for sib in other_siblings]
        first_sib = other_siblings[0]['db']
        
        # Parse existing JSON data
        data = {}
        if db_s['data_json']:
            try:
                data = json.loads(db_s['data_json']) if isinstance(db_s['data_json'], str) else db_s['data_json']
            except:
                pass
                
        # Parse first sibling's data to get their group/grade
        first_sib_data = {}
        if first_sib['data_json']:
            try:
                first_sib_data = json.loads(first_sib['data_json']) if isinstance(first_sib['data_json'], str) else first_sib['data_json']
            except:
                pass
                
        # Set sibling fields
        data['tieneHermanos'] = True
        data['siblingIds'] = other_sibling_ids
        data['siblingId'] = other_sibling_ids[0]
        data['siblingName'] = first_sib['name']
        data['siblingGrade'] = first_sib_data.get('group') or first_sib_data.get('classroom') or ''
        
        # Synchronize payment fields
        data['annualFeePaid'] = has_paid
        data['annualFeeStatus'] = payment_status
        data['annualFeeAbono'] = payment_abono
        data['annualFeeTotal'] = payment_total
        
        # Re-serialize
        updated_json = json.dumps(data, ensure_ascii=False)
        db_paid_val = 1 if has_paid else 0
        
        # Update database
        cursor.execute(
            "UPDATE students SET annual_fee_paid = %s, data_json = %s WHERE id = %s",
            (db_paid_val, updated_json, db_s['id'])
        )
        updated_count += 1

# Commit changes
conn.commit()
cursor.close()
conn.close()

print(f"\nDone! Linked and updated {updated_count} sibling students in the database.")
