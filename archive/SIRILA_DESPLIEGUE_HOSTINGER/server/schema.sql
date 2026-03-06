CREATE TABLE IF NOT EXISTS students (
    id VARCHAR(50) PRIMARY KEY,
    curp VARCHAR(20),
    name VARCHAR(100) NOT NULL,
    sex VARCHAR(10),
    birth_date DATE,
    birth_place VARCHAR(100),
    enrollment_date DATE,
    status VARCHAR(20) DEFAULT 'INSCRITO',
    repeater BOOLEAN DEFAULT FALSE,
    bap VARCHAR(255) DEFAULT 'NINGUNA',
    usaer BOOLEAN DEFAULT FALSE,
    avatar LONGTEXT,
    guardian_name VARCHAR(100),
    guardian_phone VARCHAR(20),
    behavior_points INT DEFAULT 0,
    annual_fee_paid BOOLEAN DEFAULT FALSE,
    data_json JSON
);

CREATE TABLE IF NOT EXISTS attendance (
    student_id VARCHAR(50),
    date DATE,
    status VARCHAR(20),
    PRIMARY KEY (student_id, date),
    FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS behavior_logs (
    id VARCHAR(50) PRIMARY KEY,
    student_id VARCHAR(50),
    type VARCHAR(20),
    description TEXT,
    date DATETIME,
    data_json JSON,
    FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS assignments (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(100),
    due_date DATE,
    data_json JSON
);

CREATE TABLE IF NOT EXISTS student_assignments (
    assignment_id VARCHAR(50),
    student_id VARCHAR(50),
    PRIMARY KEY (assignment_id, student_id),
    FOREIGN KEY (assignment_id) REFERENCES assignments (id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS events (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(100),
    date DATE,
    type VARCHAR(20),
    description TEXT,
    data_json JSON
);

CREATE TABLE IF NOT EXISTS finance_events (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(100),
    date DATE,
    total_cost DECIMAL(10, 2),
    cost_per_student DECIMAL(10, 2),
    category VARCHAR(20),
    data_json JSON
);

CREATE TABLE IF NOT EXISTS finance_contributions (
    finance_event_id VARCHAR(50),
    student_id VARCHAR(50),
    amount DECIMAL(10, 2),
    PRIMARY KEY (finance_event_id, student_id),
    FOREIGN KEY (finance_event_id) REFERENCES finance_events (id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS school_config (
    config_key VARCHAR(50) PRIMARY KEY,
    config_value LONGTEXT
);

CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(50) PRIMARY KEY,
    student_id VARCHAR(50), -- NULL if global
    title VARCHAR(100),
    message TEXT,
    date DATETIME,
    is_read BOOLEAN DEFAULT FALSE,
    type VARCHAR(20) DEFAULT 'INFO', -- INFO, ALERT, EVENT
    FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE
);

-- We can derive parent access from students table (e.g. using CURP as password initially),
-- but this table helps track specific parent app settings or credentials if they change.
CREATE TABLE IF NOT EXISTS parent_users (
    student_id VARCHAR(50) PRIMARY KEY,
    password_hash VARCHAR(255), -- For now we might just check CURP
    last_login DATETIME,
    fcm_token VARCHAR(255), -- For future push notifications
    FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS parent_messages (
    id VARCHAR(50) PRIMARY KEY,
    student_id VARCHAR(50),
    message TEXT,
    date DATETIME,
    is_read BOOLEAN DEFAULT FALSE,
    sender VARCHAR(10) DEFAULT 'PARENT', -- PARENT or TEACHER (for replies)
    FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS staff_tasks (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_to VARCHAR(100),
    type VARCHAR(50),
    due_date DATE,
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_json JSON
);

CREATE TABLE IF NOT EXISTS books (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(100),
    grade VARCHAR(20),
    category VARCHAR(50),
    data_json JSON
);