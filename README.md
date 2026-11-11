# UniGo — Automated Campus Transport & Fee Verification System

**UniGo** is an enterprise-grade campus transit operations and student fee reconciliation platform engineered for higher education institutions (modeled on FAST-NUCES Chiniot-Faisalabad Campus operations). 

The platform digitizes and unifies transport registration, context-aware semester billing, bank challan verification, and vehicle fleet management across three dedicated role-based portals: **Student Commuter**, **Accounts Officer**, and **Transport Administrator**.

---

## 🏛️ System Architecture

UniGo is structured as a decoupled client-server architecture enforcing strict Role-Based Access Control (RBAC) and privacy isolation:

```text
                                 ┌────────────────────────────────────────────────────────┐
                                 │                   FastAPI Backend                      │
                                 │                                                        │
┌──────────────────┐  REST / JWT │  ┌──────────────┐   ┌──────────────┐   ┌────────────┐  │
│   React Client   │ ──────────► │  │ Auth Router  │   │ Route Router │   │ Fee Router │  │
│   (Vite SPA)     │ ◄────────── │  └──────┬───────┘   └──────┬───────┘   └─────┬──────┘  │
│  Port: 5173      │             │         │                  │                 │         │
└──────────────────┘             │         ▼                  ▼                 ▼         │
                                 │  ┌──────────────┐   ┌──────────────┐                   │
                                 │  │ Accounts API │   │ Notif Router │                   │
                                 │  └──────┬───────┘   └──────┬───────┘                   │
                                 └─────────┼──────────────────┼───────────────────────────┘
                                           ▼                  ▼
                                 ┌────────────────────────────────────────────────────────┐
                                 │                 PostgreSQL Database                    │
                                 │   [users] ──< [registrations] >── [routes]             │
                                 │                    │                                   │
                                 │                    └── [fees] ──< [fee_receipts]       │
                                 │                    │                                   │
                                 │                    └── [notifications]                 │
                                 └────────────────────────────────────────────────────────┘
```

---

## 🚀 Key Features by User Role

### 🎓 1. Student Commuter Portal (`/student`)
* **Route Enrollment with Live Seat Availability:** Browse university bus routes with real-time seat tracking (e.g. `"Faisalabad Route – 12 seats left"`). Routes at maximum capacity are automatically disabled to prevent overbooking.
* **Context-Aware Billing Engine:** 
  * *Day Scholars:* Enforced full-semester two-way commute policy (Rs. 36,000).
  * *Hostelites:* Weekend home-commute ticketing options (Rs. 500 one-way / Rs. 1,000 two-way).
* **Cryptographic PDF Validation:** Receipts uploaded through the portal are validated on both MIME type and `%PDF` binary magic bytes. Files are saved using UUID-based random filenames to prevent server directory traversal.
* **Integrated PDF Canvas Viewer:** In-browser PDF preview rendered via PDF.js on HTML5 `<canvas>`, preventing Internet Download Manager (IDM) interception.
* **Rejection Feedback & Resubmission Loop:** If a challan is rejected by Accounts, a prominent red alert banner displays the exact auditor reason with an instant one-click re-upload action.
* **Seat Confirmation Status:** Dynamic bus pass indicators showing *Unpaid*, *Pending Verification*, *Paid (Confirmed)*, or *Action Required*.

---

### 💼 2. Accounts Officer Portal (`/accounts`)
* **Executive Financial Dashboard:** Real-time KPI metric cards displaying pending verification volume, daily approval counts, total fee collections, and rejection metrics.
* **Dedicated Verification Queue (`/accounts/receipts`):** Multi-criteria search and filter queue by student name, registration number, route, and submission status.
* **Split-Screen Verification Interface (`/accounts/receipts/:id`):** 
  * *Left Panel:* High-fidelity PDF document canvas viewer with zoom controls, fullscreen inspection, and direct download.
  * *Right Panel:* Student registration profile, route details, trip type, expected amount, due date compliance check, and verification action controls.
* **Audited Verification Workflow:** 
  * *Approve:* Updates receipt to `approved`, transitions fee to `paid`, confirms student seat, and dispatches an automated notification.
  * *Reject:* Requires a mandatory written reason (or pre-set templates such as *"Wrong amount deposited"*, *"Unreadable scan"*), transitions fee to `rejected`, and flags student for correction.
* **Receipts Audit Ledger (`/accounts/history`):** Complete historical ledger featuring 400ms debounced student search, status filter tabs, and 10-row pagination.
* **Student Financial Dossier (`/accounts/students/:id`):** Deep-dive profile displaying full student details and a chronological audit milestone timeline tracking every submission, rejection, and approval.

---

### 🚌 3. Transport Administrator Portal (`/admin`)
* **Campus Fleet Operations Dashboard:** Top executive KPI cards monitoring Active Campus Routes, Total Fleet Capacity, Enrolled Student Count, and Overall Fleet Occupancy Percentage.
* **Fleet Route Management:** Table of university routes displaying pickup stops, semester fares, and live seat occupancy progress bars.
* **One-Click Active/Inactive Toggles:** Toggle route operational status instantly via backend API without reloading.
* **Route Editor with Capacity Guard:** Modal form allowing modifications to route names, stops, and fees, with a safety guard that prohibits reducing total capacity below the count of already enrolled students.
* **Passenger Rosters per Route (`/routes/:id/students`):** Interactive modal showing all registered commuters for any bus route with student category (*Day Scholar / Hostelite*), commute type (*One-way / Two-way*), and live fee status badge.

---

### 🔔 4. Real-time Notification Engine (`/notifications`)
* **Global Navigation Bell Component:** Header bell icon with unread badge counter and 30-second automated background polling.
* **Priority Color Coding:** 
  * 🔴 **Action Required (Red):** Highlighted alerts for rejected fee slips with instant redirection to resubmission.
  * 🟢 **Fee Verified (Green):** Instant confirmation when seat is secured.
  * 🔵 **Receipt Submissions (Blue):** New submission alerts for Accounts staff.
* **Dedicated Notification Center:** Comprehensive notifications screen with overview metrics, category filtering (*All, Unread, Action Required, Approved*), and batch mark-all-read functionality.

---

## 🛡️ Security & Role-Based Access Control (RBAC)

* **Stateless JWT Authentication:** Cryptographically signed Bearer tokens with 8-hour expiration.
* **Bcrypt Password Salting:** Passwords hashed with individual cryptographic salts before storage in PostgreSQL.
* **Strict Role Segregation:** Endpoint-level dependency injection (`require_role`) rejects unauthorized callers with `403 Forbidden`. Students cannot access Accounts or Transport Admin endpoints.
* **Privacy Isolation:** Student users are strictly blocked from downloading or viewing receipts belonging to other students.
* **Environment Isolation:** Sensitive database strings, credentials, and JWT secret keys are managed through `.env` and permanently excluded from version control via `.gitignore`.

---

## 🛠️ Technology Stack

| Domain | Technology | Purpose |
|---|---|---|
| **Frontend Framework** | React 19 | Declarative user interface with React Hooks & Context |
| **Build Tool** | Vite | Lightning-fast development server and optimized bundler |
| **Client Routing** | React Router DOM v7 | Protected route wrappers and role-based client routing |
| **HTTP Client** | Axios | REST client with automated JWT bearer interceptors |
| **Document Viewer** | PDF.js (Mozilla) | HTML5 Canvas rendering preventing IDM download traps |
| **Icons & UI** | Lucide React | Modern, consistent iconography across all portals |
| **Backend Framework** | FastAPI (Python 3.14) | High-performance asynchronous REST API framework |
| **Database** | PostgreSQL 18 | Production-grade relational database management system |
| **ORM** | SQLAlchemy 2.0 | Type-safe database queries and relationship modeling |
| **Data Validation** | Pydantic v2 | Strict request/response schema parsing and serialization |
| **Authentication** | PyJWT & Bcrypt | Secure password hashing and token lifecycle management |
| **Automated Testing** | Pytest & TestClient | End-to-end API integration and security test suite |

---

## 📂 Repository Structure

```text
UniGo/
├── .gitignore                      # Git exclusion rules (.env, uploads, node_modules)
├── README.md                       # Comprehensive platform documentation
├── backend/
│   ├── .env                        # Local database credentials & JWT secret key
│   ├── requirements.txt            # Python dependencies manifest
│   ├── seed.py                     # Database initialization and demo seeder
│   ├── tests/
│   │   ├── __init__.py             # Test package initialization
│   │   └── test_api.py             # Automated end-to-end integration test suite
│   └── app/
│       ├── database.py             # SQLAlchemy engine & session lifecycle manager
│       ├── models.py               # Database entities (User, Route, Registration, Fee, etc.)
│       ├── schemas.py              # Pydantic input/output schemas
│       ├── security.py             # Bcrypt hashing and JWT encoding/decoding
│       ├── deps.py                 # Token validator and require_role RBAC guards
│       ├── main.py                 # FastAPI application initialization & CORS config
│       ├── routers/
│       │   ├── auth.py             # Login, registration, and profile endpoints
│       │   ├── routes.py           # Bus routes, fleet stats, and passenger rosters
│       │   ├── fees.py             # Route registration & PDF challan uploads
│       │   ├── accounts.py         # Receipts queue, verification, and audit history
│       │   └── notifications.py    # In-app notifications engine and read status
│       └── uploads/receipts/       # Server storage directory for student fee receipts
└── frontend/
    ├── package.json                # Frontend packages and execution scripts
    ├── vite.config.js              # Vite configuration
    ├── index.html                  # HTML5 entrypoint
    └── src/
        ├── main.jsx                # React DOM mount
        ├── App.jsx                 # Client router and role protection tree
        ├── index.css & App.css     # Base styling and design tokens
        ├── api/
        │   └── client.js           # Axios instance with request/response interceptors
        ├── context/
        │   └── AuthContext.jsx     # Authentication state provider & session persistence
        ├── components/
        │   ├── Layout.jsx          # Shared role-aware shell (sidebar + header bar)
        │   ├── NotificationBell.jsx# Interactive notification drawer with 30s polling
        │   ├── ProtectedRoute.jsx  # Client navigation security guard
        │   ├── ReceiptsTable.jsx   # Reusable receipts table with search & actions
        │   ├── RegisterRouteModal.jsx # Student route selection modal with seat counters
        │   ├── StatusBadge.jsx     # Uniform status badge (Paid, Pending, Unpaid, Rejected)
        │   └── UploadReceiptModal.jsx # PDF receipt uploader with validation
        └── pages/
            ├── Login.jsx           # Universal login screen with smart redirection
            ├── Register.jsx        # Commuter registration screen
            ├── StudentDashboard.jsx# Student commute dashboard & rejection alert view
            ├── AccountsDashboard.jsx# Accounts overview dashboard & review queue
            ├── PendingReceipts.jsx # Dedicated receipts audit queue
            ├── VerifyReceipt.jsx   # Split-screen PDF canvas verification view
            ├── ReceiptsHistory.jsx # Historical audit ledger with search & pagination
            ├── StudentDetail.jsx   # Student financial dossier & milestone timeline
            ├── AdminDashboard.jsx  # Fleet operations, route editor & rosters
            └── NotificationsPage.jsx # Full-page notification center
```

---

## 👥 Default Demo Credentials

The database seeder provisions standard accounts across all three university roles:

| Role | Email Address | Password | Default Portal |
|---|---|---|---|
| **Transport Administrator** | `admin@unigo.test` | `admin123` | `/admin` |
| **Accounts Officer** | `accounts@unigo.test` | `accounts123` | `/accounts` |
| **Student Commuter** | `student@unigo.test` | `student123` | `/student` |

---

## 🚀 Getting Started

### 1. Prerequisites
* **Python 3.11+** installed
* **Node.js 18+** installed
* **PostgreSQL 14+** running locally with a database named `unigo`

---

### 2. Backend Setup & Database Seeding

Open a PowerShell terminal in the repository root:

```powershell
# 1. Navigate to backend directory
cd backend

# 2. Activate Python virtual environment
.\venv\Scripts\Activate.ps1

# 3. Ensure environment variables are configured in backend/.env:
# DATABASE_URL=postgresql://postgres:your_password@localhost:5432/unigo
# SECRET_KEY=your_secure_jwt_secret_key

# 4. Seed initial accounts and official FAST-NUCES bus routes
python seed.py

# 5. Start the FastAPI development server
uvicorn app.main:app --reload
```

* **API Base URL:** [http://localhost:8000](http://localhost:8000)
* **Interactive OpenAPI Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)

*(Note: To perform a clean reset of all database tables and seed fresh data at any time, run: `python seed.py --reset`)*

---

### 3. Frontend Setup

Open a second PowerShell terminal:

```powershell
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies (if not already installed)
npm install

# 3. Start the Vite development client
npm run dev
```

* **Web Application:** [http://localhost:5173](http://localhost:5173)

---

### 4. Running the Automated Test Suite

UniGo includes an automated integration test suite verifying authentication, route capacity rules, PDF upload validation, approve/reject cycles, and cross-student privacy isolation:

```powershell
cd backend
python tests/test_api.py
```
*(All 8 test suites will run and report status in the terminal)*

---

## 📄 License & Attribution

Designed and developed for academic evaluation at **FAST National University of Computer and Emerging Sciences (FAST-NUCES)**, Chiniot-Faisalabad Campus.
