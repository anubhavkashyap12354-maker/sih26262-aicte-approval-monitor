import sys
import os
import urllib.request
import urllib.parse
import urllib.error
import json
import sqlite3

BASE_URL = "http://localhost:8000"
passed_checks = []
failed_checks = []

def record(name, passed, detail=""):
    if passed:
        passed_checks.append((name, detail))
        print(f"  [PASS] {name} {detail}")
    else:
        failed_checks.append((name, detail))
        print(f"  [FAIL] {name}: {detail}")

def http_req(url, method="GET", data=None, headers=None):
    if headers is None:
        headers = {}
    body = None
    if data is not None:
        if isinstance(data, dict):
            body = json.dumps(data).encode("utf-8")
            headers["Content-Type"] = "application/json"
        elif isinstance(data, (bytes, bytearray)):
            body = data
        elif isinstance(data, str):
            body = data.encode("utf-8")
    
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            res_body = response.read().decode("utf-8")
            content_type = response.headers.get("Content-Type", "")
            json_data = None
            if "application/json" in content_type:
                try:
                    json_data = json.loads(res_body)
                except:
                    pass
            return response.status, json_data or res_body, response.headers
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            err_json = json.loads(err_body)
        except:
            err_json = err_body
        return e.code, err_json, e.headers
    except Exception as e:
        return 0, str(e), {}

print("\n" + "="*70)
print("SIH26262 AICTE APPROVAL PLATFORM - SYSTEM DIAGNOSTIC & HEALTH CHECK")
print("="*70)

# =====================================================================
# 1. Backend & Database Check
# =====================================================================
print("\n--- [1] Backend & Database Integrity Check ---")

# 1.1 Backend Health
status, data, _ = http_req(f"{BASE_URL}/health")
health_ok = status == 200 and isinstance(data, dict) and data.get("status") == "healthy"
record("FastAPI Server Health", health_ok, f"(HTTP {status})")

# 1.2 Database Tables & Schema (SQLite / DB Engine)
db_file = os.path.join(os.path.dirname(__file__), "aicte.db")
if os.path.exists(db_file):
    conn = sqlite3.connect(db_file)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [row[0] for row in cursor.fetchall()]
    expected_tables = ["institutions", "applications", "undertakings", "leases_and_documents", "audit_logs", "system_configs"]
    all_tables_exist = all(t in tables for t in expected_tables)
    record("Database Tables Existence", all_tables_exist, f"Found: {tables}")

    # Check row counts for seeded data
    cursor.execute("SELECT count(*) FROM institutions")
    inst_count = cursor.fetchone()[0]
    cursor.execute("SELECT count(*) FROM applications")
    app_count = cursor.fetchone()[0]
    cursor.execute("SELECT count(*) FROM undertakings")
    un_count = cursor.fetchone()[0]
    cursor.execute("SELECT count(*) FROM leases_and_documents")
    doc_count = cursor.fetchone()[0]
    cursor.execute("SELECT count(*) FROM audit_logs")
    log_count = cursor.fetchone()[0]

    record("Seed Data - Institutions Count", inst_count >= 12, f"({inst_count} records)")
    record("Seed Data - Applications Count", app_count >= 12, f"({app_count} records)")
    record("Seed Data - Undertakings Count", un_count >= 6, f"({un_count} records)")
    record("Seed Data - Documents Count", doc_count >= 6, f"({doc_count} records)")
    record("Seed Data - Audit Logs Count", log_count >= 1, f"({log_count} records)")

    # Foreign Key Check: ensure all application.institution_id exists in institutions
    cursor.execute("""
        SELECT a.id, a.institution_id 
        FROM applications a 
        LEFT JOIN institutions i ON a.institution_id = i.id 
        WHERE i.id IS NULL;
    """)
    orphan_apps = cursor.fetchall()
    record("Foreign Key Integrity - Applications -> Institutions", len(orphan_apps) == 0, f"Orphans: {orphan_apps}")

    cursor.execute("""
        SELECT u.id, u.institution_id 
        FROM undertakings u 
        LEFT JOIN institutions i ON u.institution_id = i.id 
        WHERE i.id IS NULL;
    """)
    orphan_uns = cursor.fetchall()
    record("Foreign Key Integrity - Undertakings -> Institutions", len(orphan_uns) == 0, f"Orphans: {orphan_uns}")

    cursor.execute("""
        SELECT d.id, d.institution_id 
        FROM leases_and_documents d 
        LEFT JOIN institutions i ON d.institution_id = i.id 
        WHERE i.id IS NULL;
    """)
    orphan_docs = cursor.fetchall()
    record("Foreign Key Integrity - Documents -> Institutions", len(orphan_docs) == 0, f"Orphans: {orphan_docs}")

    conn.close()
else:
    record("Database File Exists", False, f"Not found at {db_file}")

# =====================================================================
# 2. CORS & Core REST API Routes Check
# =====================================================================
print("\n--- [2] CORS & Core REST API Routes Check ---")

# 2.1 CORS Options Preflight
status, _, headers = http_req(
    f"{BASE_URL}/api/applications",
    method="OPTIONS",
    headers={
        "Origin": "http://localhost:3000",
        "Access-Control-Request-Method": "POST",
    }
)
allow_origin = headers.get("access-control-allow-origin")
allow_cred = headers.get("access-control-allow-credentials")
cors_ok = status == 200 and allow_origin == "http://localhost:3000" and allow_cred == "true"
record("CORS Preflight Headers", cors_ok, f"Origin: {allow_origin}, Cred: {allow_cred}")

# 2.2 GET /api/applications
status, apps, _ = http_req(f"{BASE_URL}/api/applications")
has_keys = isinstance(apps, list) and len(apps) > 0 and all(k in apps[0] for k in ["id", "route_type", "current_stage_index", "institution"])
record("GET /api/applications schema", status == 200 and has_keys, f"({len(apps) if isinstance(apps, list) else 0} apps returned)")

# 2.3 POST /api/applications (Create application)
test_app_id = "TEST-9999"
create_payload = {
    "id": test_app_id,
    "institution_id": "INST-2611",
    "route_type": "SES",
    "current_stage_index": 0,
    "age_in_days": 10,
    "evc_timeline_status": 5,
    "actor": "Diagnostic Test Runner"
}
status, create_res, _ = http_req(f"{BASE_URL}/api/applications", method="POST", data=create_payload)
record("POST /api/applications (Create)", status in [200, 201], f"(Status {status})")

# 2.4 POST /api/applications/{id}/advance
status, adv_data, _ = http_req(f"{BASE_URL}/api/applications/{test_app_id}/advance", method="POST", data={"actor": "Diagnostic Runner"})
advanced_ok = status == 200 and isinstance(adv_data, dict) and adv_data.get("current_stage_index") == 1 and adv_data.get("age_in_days") == 0
record("POST /api/applications/{id}/advance", advanced_ok, f"Stage index: {adv_data.get('current_stage_index') if isinstance(adv_data, dict) else 'err'}, Age: {adv_data.get('age_in_days') if isinstance(adv_data, dict) else 'err'}")

# 2.5 POST /api/applications/{id}/revert
status, rev_data, _ = http_req(f"{BASE_URL}/api/applications/{test_app_id}/revert", method="POST", data={"reason": "Deficiency verification", "actor": "Diagnostic Runner"})
reverted_ok = status == 200 and isinstance(rev_data, dict) and rev_data.get("current_stage_index") == 0 and rev_data.get("age_in_days") == 0
record("POST /api/applications/{id}/revert", reverted_ok, f"Stage index: {rev_data.get('current_stage_index') if isinstance(rev_data, dict) else 'err'}, Age: {rev_data.get('age_in_days') if isinstance(rev_data, dict) else 'err'}")

# Clean up test application from DB
try:
    conn = sqlite3.connect(db_file)
    conn.execute("DELETE FROM applications WHERE id = ?", (test_app_id,))
    conn.commit()
    conn.close()
except:
    pass

# =====================================================================
# 3. Compliance Handlers & Alert Sweep Check
# =====================================================================
print("\n--- [3] Compliance Handlers & Alert Sweep Check ---")

# 3.1 Undertaking Upload & Verify
status_up, data_up, _ = http_req(f"{BASE_URL}/api/undertakings/1/upload", method="POST", data={"actor": "Institution Representative"})
upload_ok = status_up == 200 and isinstance(data_up, dict) and data_up.get("status") == 1
record("POST /api/undertakings/1/upload (Status 0 -> 1)", upload_ok, f"Status: {data_up.get('status') if isinstance(data_up, dict) else 'err'}")

status_ver, data_ver, _ = http_req(f"{BASE_URL}/api/undertakings/1/verify", method="POST", data={"actor": "Bureau Verification Officer"})
verify_ok = status_ver == 200 and isinstance(data_ver, dict) and data_ver.get("status") == 2
record("POST /api/undertakings/1/verify (Status 1 -> 2)", verify_ok, f"Status: {data_ver.get('status') if isinstance(data_ver, dict) else 'err'}")

# Reset back to 0 for consistent demo data
conn = sqlite3.connect(db_file)
conn.execute("UPDATE undertakings SET status = 0 WHERE id = 1")
conn.commit()
conn.close()

# 3.2 Document Upload & Verify
status_doc_up, data_doc_up, _ = http_req(f"{BASE_URL}/api/documents/1/upload", method="POST", data={"actor": "College Admin"})
doc_up_ok = status_doc_up == 200 and isinstance(data_doc_up, dict) and data_doc_up.get("status") == 1
record("POST /api/documents/1/upload (Status 0 -> 1)", doc_up_ok, f"Status: {data_doc_up.get('status') if isinstance(data_doc_up, dict) else 'err'}")

status_doc_ver, data_doc_ver, _ = http_req(f"{BASE_URL}/api/documents/1/verify", method="POST", data={"actor": "Regional Officer"})
doc_ver_ok = status_doc_ver == 200 and isinstance(data_doc_ver, dict) and data_doc_ver.get("status") == 2 and data_doc_ver.get("expiry_days") == 365
record("POST /api/documents/1/verify (Status 1 -> 2 & Expiry +365d)", doc_ver_ok, f"Status: {data_doc_ver.get('status') if isinstance(data_doc_ver, dict) else 'err'}, Expiry: {data_doc_ver.get('expiry_days') if isinstance(data_doc_ver, dict) else 'err'}d")

# Reset back to 0 & -5 for consistent demo data
conn = sqlite3.connect(db_file)
conn.execute("UPDATE leases_and_documents SET status = 0, expiry_days = -5 WHERE id = 1")
conn.commit()
conn.close()

# 3.3 Alert Sweep Trigger
status_sweep, data_sweep, _ = http_req(f"{BASE_URL}/api/triggers/alert-sweep", method="POST", data={"actor": "System Sweep Daemon"})
sweep_ok = status_sweep == 200 and isinstance(data_sweep, dict) and data_sweep.get("status") == "success" and data_sweep.get("alerts_count") > 0
record("POST /api/triggers/alert-sweep", sweep_ok, f"Generated {data_sweep.get('alerts_count') if isinstance(data_sweep, dict) else 0} alerts")

# 3.4 Audit Trail Validation
status_log, logs, _ = http_req(f"{BASE_URL}/api/audit-logs")
logs_ok = status_log == 200 and isinstance(logs, list) and len(logs) > 0 and all(k in logs[0] for k in ["id", "timestamp", "actor", "event_description"])
record("GET /api/audit-logs Schema & Entries", logs_ok, f"Total audit entries: {len(logs) if isinstance(logs, list) else 0}")

# =====================================================================
# 4. Role-Based Access Control (RBAC) Filter Validation
# =====================================================================
print("\n--- [4] Role-Based Access Control (RBAC) Check ---")

roles_to_test = [
    ("Bureau", None, 12),
    ("Regional · South", "South", 3),
    ("Regional · North", "North", 3),
    ("Regional · West", "West", 3),
    ("Regional · East", "East", 3),
]

for role_label, reg_key, expected_count in roles_to_test:
    url = f"{BASE_URL}/api/applications?role={reg_key or 'Bureau'}"
    status, apps, _ = http_req(url)
    if status == 200 and isinstance(apps, list):
        if reg_key:
            all_match_region = all(a["institution"]["region"] == reg_key for a in apps)
            count_ok = len(apps) == expected_count and all_match_region
            record(f"RBAC Filter: {role_label}", count_ok, f"Count: {len(apps)}/{expected_count}, All region '{reg_key}': {all_match_region}")
        else:
            record(f"RBAC Filter: {role_label}", len(apps) >= expected_count, f"Count: {len(apps)} (all regions)")
    else:
        record(f"RBAC Filter: {role_label}", False, f"Status: {status}")

# Test Committee Role (EVC/SAC queues only)
status, apps, _ = http_req(f"{BASE_URL}/api/applications?role=Committee")
if status == 200 and isinstance(apps, list):
    route_stages = {"S": ["Scrutiny"], "SE": ["Scrutiny", "EVC"], "ES": ["EVC", "SAC/SHC"], "E": ["EVC"], "SES": ["Scrutiny", "EVC", "SAC/SHC"]}
    valid_committee = True
    for a in apps:
        stages = route_stages.get(a["route_type"], [])
        st = stages[a["current_stage_index"]] if a["current_stage_index"] < len(stages) else "Decision"
        if st not in ["EVC", "SAC/SHC"]:
            valid_committee = False
            break
    record("RBAC Filter: Committee (EVC / SAC only)", valid_committee and len(apps) > 0, f"Filtered apps: {len(apps)}")
else:
    record("RBAC Filter: Committee", False, f"Status: {status}")

# =====================================================================
# 5. APH Rules & Pendency Report CSV Check
# =====================================================================
print("\n--- [5] APH Rules & CSV Pendency Export Check ---")

# 5.1 GET /api/config/aph-rules
status, rules, _ = http_req(f"{BASE_URL}/api/config/aph-rules")
has_rules = isinstance(rules, dict) and "Scrutiny" in rules and "EVC" in rules and "SAC/SHC" in rules
record("GET /api/config/aph-rules", status == 200 and has_rules, f"Current: {rules}")

# 5.2 PUT /api/config/aph-rules
status, saved_rules, _ = http_req(
    f"{BASE_URL}/api/config/aph-rules",
    method="PUT",
    data={"Scrutiny": 15, "EVC": 30, "SAC/SHC": 20, "actor": "Diagnostic Checker"}
)
record("PUT /api/config/aph-rules", status == 200 and isinstance(saved_rules, dict) and saved_rules.get("Scrutiny") == 15, f"Saved: {saved_rules}")

# 5.3 GET /api/reports/pendency-csv
status, content, headers = http_req(f"{BASE_URL}/api/reports/pendency-csv")
has_header = "Application ID,Institution ID,Institution Name,Region" in str(content)
line_count = len(str(content).strip().split("\n"))
record("GET /api/reports/pendency-csv", status == 200 and has_header and line_count >= 13, f"Lines: {line_count}, Content-Type: {headers.get('content-type')}")

# =====================================================================
# Summary
# =====================================================================
print("\n" + "="*70)
print(f"DIAGNOSTIC SUMMARY: {len(passed_checks)} PASSED, {len(failed_checks)} FAILED")
print("="*70)

if failed_checks:
    print("\nFAILED CHECKS:")
    for name, detail in failed_checks:
        print(f"  - {name}: {detail}")
    sys.exit(1)
else:
    print("\nALL SYSTEM DIAGNOSTIC CHECKS PASSED (100% HEALTHY)!\n")
    sys.exit(0)
