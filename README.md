# SIH26262 - Integrated AICTE Approval Workflow Automation, Compliance Monitoring and Alert Management System

Full-stack monorepo prototype for automated AICTE approval workflows, statutory APH rules management, time-bound compliance undertakings, lease deed tracking, inspection (EVC) scheduling, and multi-tier escalation ladders.

## 🛠️ Tech Stack
- **Backend**: FastAPI (Python 3.10+ / 3.11), SQLAlchemy ORM, Pydantic v2
- **Database**: PostgreSQL with SQLite local execution fallback, Redis
- **Frontend**: React 18, TypeScript, Tailwind CSS / CSS Variables (Abyss & Daylight themes)
- **3D Graphics**: Three.js WebGL procedural shader canvas & status gate rings
- **Architecture**: Monorepo with Docker Compose orchestration

---

## 📁 Monorepo Structure

```
SIH26263/
├── backend/                              # FastAPI Backend (Python 3.11)
│   ├── models.py                         # SQLAlchemy Models (exact schema & foreign keys)
│   ├── database.py                       # PostgreSQL Engine, SessionLocal, fallback & get_db
│   ├── schemas.py                        # Pydantic schemas for requests/responses
│   ├── seed.py                           # Seed script with exact mock data matching the prototype
│   ├── main.py                           # FastAPI app with CORS middleware (3000/3001) & endpoints
│   ├── init.sql                          # Raw PostgreSQL DDL schema & seed data
│   ├── requirements.txt                  # Python dependencies
│   ├── Dockerfile                        # Backend container specification
│   └── .env.example                      # Backend environment variables
│
├── frontend/                             # React 18+ / TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── components/
│   │   │   └── ThreeBackdrop.tsx         # 3D Three.js WebGL animated background shader & gate rings
│   │   ├── types.ts                      # Strict TypeScript types
│   │   ├── api.ts                        # Typed API client
│   │   ├── App.tsx                       # Full interactive dashboard with tabs & role selector
│   │   └── index.css                     # Abyss (Dark) and Daylight (Light) theme variables
│   ├── vite.config.ts                    # Configured for localhost:3000
│   ├── package.json
│   └── Dockerfile                        # Frontend container specification
│
├── docker-compose.yml                    # Multi-container orchestration (Postgres, Backend, Frontend)
├── run-backend.ps1                       # Helper script to launch FastAPI server
├── run-frontend.ps1                      # Helper script to launch Frontend dev server
├── AICTE Approval & Compliance Monitor.html # Original standalone UI reference
└── README.md
```

---

## 🔌 Backend REST API Endpoints & Business Logic

### 1. State Machine Endpoints (`/api/applications`)

* **`GET /api/applications`**:
  * **Query Params**: `region` (`North`, `South`, `East`, `West`), `role` (`Bureau`, `South`, `North`, `West`, `East`, `Committee`)
  * **Role Logic**:
    * `Bureau`: Full visibility across all regions.
    * Regional Officer (`North`, `South`, etc.): Only sees institutions within their jurisdiction.
    * `Committee` (EVC / SAC): Filters to only view applications in active `EVC` or `SAC/SHC` stages.
* **`POST /api/applications/{id}/advance`**:
  * Advances the application along its prescribed route:
    * `S`: `Scrutiny`
    * `SE`: `Scrutiny` $\rightarrow$ `EVC`
    * `ES`: `EVC` $\rightarrow$ `SAC/SHC`
    * `E`: `EVC`
    * `SES`: `Scrutiny` $\rightarrow$ `EVC` $\rightarrow$ `SAC/SHC`
  * Increments `current_stage_index` by 1.
  * Resets `age_in_days` to 0.
  * Transitions:
    * If next stage exists: logs `{id}: {from_stage} completed → moved to {to_stage}` in `audit_logs`.
    * If final stage completed: logs `{id}: {from_stage} completed → forwarded to competent authority for decision`.
* **`POST /api/applications/{id}/revert`** (alias: `/api/applications/{id}/return`):
  * Decreases `current_stage_index` by 1 (minimum 0).
  * Resets `age_in_days` to 0.
  * Accepts JSON payload:
    ```json
    {
      "reason": "Deficiency",
      "actor": "Regional officer"
    }
    ```
    Reasons include: `Deficiency`, `Clarification`, `Further verification`.
  * Logs `{id}: returned to {stage} · reason: {reason}` in `audit_logs`.

---

### 2. Compliance & Document Endpoints (`/api/undertakings` & `/api/documents`)

* **Undertakings**:
  * `GET /api/undertakings`: List with optional `region` and `role` filtering.
  * `POST /api/undertakings/{id}/upload`: Increments status from `0` (Pending) to `1` (Submitted).
    * Logs `{institution}: {condition} submitted by institution` in `audit_logs`.
  * `POST /api/undertakings/{id}/verify`: Increments status from `1` (Submitted) to `2` (Verified).
    * Logs `{institution}: {condition} verified by officer` in `audit_logs`.
* **Documents & Leases**:
  * `GET /api/documents` (alias: `/api/leases-and-documents`): List with optional filtering.
  * `POST /api/documents/{id}/upload`: Increments status from `0` (Pending/Expired) to `1` (Submitted).
    * Logs `{institution}: {document} submitted by institution` in `audit_logs`.
  * `POST /api/documents/{id}/verify`: Increments status from `1` (Submitted) to `2` (Renewed) and extends expiry days by **`+365`**.
    * Logs `{institution}: {document} verified by officer (renewed +365d)` in `audit_logs`.

---

### 3. Alert Sweep & Audit Trail (`/api/triggers/alert-sweep` & `/api/audit-logs`)

* **`POST /api/triggers/alert-sweep`** (alias: `/api/alert-sweep`):
  * Scans all records across applications, EVC inspections, undertakings, and lease deeds where remaining timeline $\le 15$ days.
  * Evaluates escalation level:
    * **`L3`**: overdue by $> 7$ days ($d < -7$) $\rightarrow$ Bureau escalation
    * **`L2`**: overdue ($d < 0$) $\rightarrow$ Regional officer escalation
    * **`L1`**: due within 15 days ($d \le 15$) $\rightarrow$ Institutional reminder
  * Saves formatted notification entries into `audit_logs`.
  * Returns structured JSON with alerts array:
    ```json
    {
      "status": "success",
      "alerts_count": 20,
      "alerts": [
        {
          "level": "L3",
          "category": "Application Stage",
          "item": "Stage: EVC",
          "institution": "Thar Technical Campus",
          "region": "North",
          "days": -4,
          "log": "L3 sent: Stage: EVC (-4d left) · Thar Technical Campus"
        }
      ]
    }
    ```
* **`GET /api/audit-logs`**: Returns all audit events ordered by ID descending.

---

## 🗄️ Database Architecture (PostgreSQL / SQLAlchemy)

| Table | Columns | Keys & Constraints |
| :--- | :--- | :--- |
| **`institutions`** | `id` (String)<br>`name` (String)<br>`region` (Enum: North, South, East, West) | **PK**: `id` |
| **`applications`** | `id` (String)<br>`institution_id` (String)<br>`route_type` (String: S, SE, ES, E, SES)<br>`current_stage_index` (Integer, default 0)<br>`age_in_days` (Integer)<br>`evc_timeline_status` (Integer) | **PK**: `id`<br>**FK**: `institution_id` references `institutions(id)` |
| **`undertakings`** | `id` (Integer)<br>`institution_id` (String)<br>`condition_text` (String)<br>`due_days` (Integer)<br>`status` (Integer: 0=Pending, 1=Submitted, 2=Verified) | **PK**: `id` (auto-increment)<br>**FK**: `institution_id` references `institutions(id)` |
| **`leases_and_documents`**| `id` (Integer)<br>`institution_id` (String)<br>`document_type` (String)<br>`expiry_days` (Integer)<br>`status` (Integer: 0=Pending/Expired, 1=Submitted, 2=Renewed) | **PK**: `id` (auto-increment)<br>**FK**: `institution_id` references `institutions(id)` |
| **`audit_logs`** | `id` (Integer)<br>`timestamp` (String)<br>`actor` (String)<br>`event_description` (String) | **PK**: `id` (auto-increment) |

---

## 🚀 Running the Monorepo

### 1. Launch FastAPI Backend
```powershell
.\run-backend.ps1
```
* Interactive Swagger Docs: `http://localhost:8000/docs`
* OpenAPI JSON: `http://localhost:8000/openapi.json`

### 2. Launch React Frontend
```powershell
.\run-frontend.ps1
```
* Frontend Dashboard: `http://localhost:3000`

### 3. Launch via Docker Compose
```bash
docker compose up --build
```
