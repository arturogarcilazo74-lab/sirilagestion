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
cursor.execute("SELECT id, curp, name, guardian_name, guardian_phone, annual_fee_paid, data_json FROM students")
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

# Helpers for cleaning and comparing strings
def clean_string(s):
    if not s:
        return ""
    s = s.upper().strip()
    s = re.sub(r'[ÁÄÂÀ]', 'A', s)
    s = re.sub(r'[ÉËÊÈ]', 'E', s)
    s = re.sub(r'[ÍÏÎÌ]', 'I', s)
    s = re.sub(r'[ÓÖÔÒ]', 'O', s)
    s = re.sub(r'[ÚÜÛÙ]', 'U', s)
    s = re.sub(r'[Ñ]', 'N', s)
    return s

def get_words(name):
    cleaned = clean_string(name)
    cleaned = re.sub(r'[^A-Z\s]', '', cleaned)
    return set(cleaned.split())

# Map database students to Excel rows using name matching (word intersection)
matched_students = []
unmatched_students = []

for db_s in db_students:
    db_name = db_s['name']
    db_words = get_words(db_name)
    
    best_match_row = None
    best_overlap_ratio = 0.0
    
    for row in excel_rows:
        ex_name = f"{row.get('Nombre')} {row.get('Apellidos')}"
        ex_words = get_words(ex_name)
        
        # Calculate Jaccard similarity/overlap of words
        intersection = db_words.intersection(ex_words)
        union = db_words.union(ex_words)
        
        if union:
            ratio = len(intersection) / len(union)
            if ratio > best_overlap_ratio:
                best_overlap_ratio = ratio
                best_match_row = row
                
    # We require a very high similarity (e.g. at least 60% of the words overlap)
    # to avoid false positives.
    if best_match_row and best_overlap_ratio >= 0.6:
        t_name = str(best_match_row.get('Nombre Tutor') or '').strip()
        t_apellidos = str(best_match_row.get('Apellidos Tutor') or '').strip()
        tutor_name_full = f"{t_name} {t_apellidos}".strip()
        tutor_key = clean_string(tutor_name_full)
        
        if tutor_key:
            matched_students.append({
                'db': db_s,
                'excel': best_match_row,
                'tutor_key': tutor_key,
                'tutor_name': tutor_name_full
            })
        else:
            unmatched_students.append(db_s)
    else:
        unmatched_students.append(db_s)

print(f"Name-matched {len(matched_students)} students to Excel tutors. {len(unmatched_students)} unmatched.")

# Group by tutor key
tutor_groups = {}
for item in matched_students:
    key = item['tutor_key']
    if key not in tutor_groups:
        tutor_groups[key] = []
    tutor_groups[key].append(item)

# Fallback: Group remaining unmatched students by their database guardian_name
db_guardian_groups = {}
for db_s in unmatched_students:
    g_name = clean_string(db_s.get('guardian_name') or '')
    # Skip generic or empty guardian names
    if g_name and len(g_name.split()) >= 2:
        if g_name not in db_guardian_groups:
            db_guardian_groups[g_name] = []
        db_guardian_groups[g_name].append(db_s)

# Combine the groupings into a single unified sibling mapping
final_sibling_groups = []

# Add Excel-based sibling groups
for key, group in tutor_groups.items():
    if len(group) > 1:
        final_sibling_groups.append({
            'source': 'EXCEL',
            'tutor_name': group[0]['tutor_name'],
            'students': [item['db'] for item in group]
        })

# Add DB guardian name-based sibling groups (if not already matched elsewhere)
matched_db_ids = set()
for group in final_sibling_groups:
    for s in group['students']:
        matched_db_ids.add(s['id'])

for g_name, s_list in db_guardian_groups.items():
    if len(s_list) > 1:
        # Filter out students already matched via Excel
        unmatched_s_list = [s for s in s_list if s['id'] not in matched_db_ids]
        if len(unmatched_s_list) > 1:
            final_sibling_groups.append({
                'source': 'DB_GUARDIAN',
                'tutor_name': s_list[0]['guardian_name'],
                'students': unmatched_s_list
            })

print(f"Total families/sibling groups found: {len(final_sibling_groups)}")

# First, reset ALL students' sibling relations so we clean up any old bad matches
print("Resetting old sibling connections...")
for db_s in db_students:
    data = {}
    if db_s['data_json']:
        try:
            data = json.loads(db_s['data_json']) if isinstance(db_s['data_json'], str) else db_s['data_json']
        except:
            pass
    
    # Remove sibling keys
    data['tieneHermanos'] = False
    data['siblingId'] = ''
    data['siblingName'] = ''
    data['siblingGrade'] = ''
    data['siblingIds'] = []
    
    updated_json = json.dumps(data, ensure_ascii=False)
    cursor.execute(
        "UPDATE students SET data_json = %s WHERE id = %s",
        (updated_json, db_s['id'])
    )

# Now, write the correct sibling connections and sync payments
updated_count = 0

for group in final_sibling_groups:
    students_in_group = group['students']
    print(f"\nSibling Group via {group['source']} under '{group['tutor_name']}':")
    for s in students_in_group:
        print(f"  - {s['name']} (ID: {s['id']}, CURP: {s['curp']})")
        
    # Check if anyone in this family has paid
    has_paid = False
    payment_status = 'PENDIENTE'
    payment_abono = 0
    payment_total = 350
    
    for s in students_in_group:
        if s['annual_fee_paid']:
            has_paid = True
            payment_status = 'PAGADO'
            payment_abono = 350
            
        data = {}
        if s['data_json']:
            try:
                data = json.loads(s['data_json']) if isinstance(s['data_json'], str) else s['data_json']
            except:
                pass
                
        if data.get('annualFeePaid') or data.get('annualFeeStatus') == 'PAGADO':
            has_paid = True
            payment_status = 'PAGADO'
            payment_abono = data.get('annualFeeTotal') or data.get('annualFeeAbono') or 350
        elif data.get('annualFeeStatus') == 'PARCIAL':
            if payment_status != 'PAGADO':
                payment_status = 'PARCIAL'
            payment_abono = max(payment_abono, data.get('annualFeeAbono') or 0)
            
        payment_total = data.get('annualFeeTotal') or payment_total

    # Update each student in the sibling group
    for s in students_in_group:
        other_siblings = [sib for sib in students_in_group if sib['id'] != s['id']]
        other_sibling_ids = [sib['id'] for sib in other_siblings]
        first_sib = other_siblings[0]
        
        # Parse existing JSON data
        data = {}
        if s['data_json']:
            try:
                data = json.loads(s['data_json']) if isinstance(s['data_json'], str) else s['data_json']
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
            (db_paid_val, updated_json, s['id'])
        )
        updated_count += 1

# Commit changes
conn.commit()
cursor.close()
conn.close()

print(f"\nDone! Successfully matched and updated {updated_count} sibling students in the database.")
