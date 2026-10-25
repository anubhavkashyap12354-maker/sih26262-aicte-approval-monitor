-- ==============================================================
-- AICTE Approval Workflow Automation & Compliance Monitoring
-- Problem ID: SIH26262
-- PostgreSQL Initialization & Seeding Script
-- ==============================================================

-- Drop existing tables if re-initializing
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS leases_and_documents CASCADE;
DROP TABLE IF EXISTS undertakings CASCADE;
DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS institutions CASCADE;
DROP TYPE IF EXISTS region_enum CASCADE;

-- 1. Create Enum for Region
CREATE TYPE region_enum AS ENUM ('North', 'South', 'East', 'West');

-- 2. Institutions Table
CREATE TABLE institutions (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    region region_enum NOT NULL
);

-- 3. Applications Table
CREATE TABLE applications (
    id VARCHAR(50) PRIMARY KEY,
    institution_id VARCHAR(50) NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    route_type VARCHAR(10) NOT NULL, -- S, SE, ES, E, SES
    current_stage_index INTEGER DEFAULT 0 NOT NULL,
    age_in_days INTEGER DEFAULT 0 NOT NULL,
    evc_timeline_status INTEGER DEFAULT 0 NOT NULL
);

-- 4. Undertakings Table
CREATE TABLE undertakings (
    id SERIAL PRIMARY KEY,
    institution_id VARCHAR(50) NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    condition_text TEXT NOT NULL,
    due_days INTEGER NOT NULL,
    status INTEGER DEFAULT 0 NOT NULL -- 0=Pending, 1=Submitted, 2=Verified
);

-- 5. Leases and Documents Table
CREATE TABLE leases_and_documents (
    id SERIAL PRIMARY KEY,
    institution_id VARCHAR(50) NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    document_type VARCHAR(255) NOT NULL,
    expiry_days INTEGER NOT NULL,
    status INTEGER DEFAULT 0 NOT NULL -- 0=Pending/Expired, 1=Submitted, 2=Renewed
);

-- 6. Audit Logs Table
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    timestamp VARCHAR(50) NOT NULL,
    actor VARCHAR(100) NOT NULL,
    event_description TEXT NOT NULL
);

-- ==============================================================
-- INITIAL MOCK DATA SEEDING
-- ==============================================================

-- Seed Institutions
INSERT INTO institutions (id, name, region) VALUES
('INST-2611', 'Nandi Institute of Technology', 'South'),
('INST-2612', 'Rajmata College of Engineering', 'West'),
('INST-2613', 'Himalaya Polytechnic', 'North'),
('INST-2614', 'Kaveri School of Management', 'South'),
('INST-2615', 'Gangetic Institute of Pharmacy', 'East'),
('INST-2616', 'Thar Technical Campus', 'North'),
('INST-2617', 'Konkan Architecture Institute', 'West'),
('INST-2618', 'Brahmaputra Engineering College', 'East'),
('INST-2619', 'Deccan Institute of Computing', 'South'),
('INST-2620', 'Malwa Polytechnic', 'West'),
('INST-2621', 'Sundarban Tech University', 'East'),
('INST-2622', 'Punjab Institute of Design', 'North');

-- Seed Applications
INSERT INTO applications (id, institution_id, route_type, current_stage_index, age_in_days, evc_timeline_status) VALUES
('A-2611', 'INST-2611', 'SE', 1, 24, 6),
('A-2612', 'INST-2612', 'S', 0, 17, 0),
('A-2613', 'INST-2613', 'ES', 0, 9, 12),
('A-2614', 'INST-2614', 'SES', 2, 22, 0),
('A-2615', 'INST-2615', 'SE', 0, 6, 0),
('A-2616', 'INST-2616', 'E', 0, 34, -4),
('A-2617', 'INST-2617', 'SE', 1, 12, 18),
('A-2618', 'INST-2618', 'ES', 1, 5, 0),
('A-2619', 'INST-2619', 'S', 0, 14, 0),
('A-2620', 'INST-2620', 'E', 0, 18, 26),
('A-2621', 'INST-2621', 'SES', 1, 27, -9),
('A-2622', 'INST-2622', 'SE', 0, 3, 0);

-- Seed Undertakings
INSERT INTO undertakings (institution_id, condition_text, due_days, status) VALUES
('INST-2611', 'Complete fire-safety NOC', -12, 0),
('INST-2613', 'Appoint 4 faculty members', 9, 0),
('INST-2617', 'Library accreditation proof', 22, 1),
('INST-2621', 'Laboratory equipment evidence', -3, 1),
('INST-2620', 'Playground land mutation', 41, 0),
('INST-2619', 'Deposit corpus fund', 14, 0);

-- Seed Leases and Documents
INSERT INTO leases_and_documents (institution_id, document_type, expiry_days, status) VALUES
('INST-2612', 'Campus lease deed', -5, 0),
('INST-2616', 'Campus lease deed', 12, 0),
('INST-2615', 'Hostel lease', 58, 0),
('INST-2614', 'Campus lease deed', 6, 1),
('INST-2622', 'Lease registration', -22, 0),
('INST-2618', 'Campus lease deed', 140, 0);

-- Seed Initial Audit Log
INSERT INTO audit_logs (timestamp, actor, event_description) VALUES
('25 Oct · 09:00', 'System', 'Nightly deadline scan completed for all regions');
