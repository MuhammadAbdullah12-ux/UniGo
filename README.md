# UniGo — Campus Transport Management System

UniGo is a web-based transport and fee management platform designed for university campuses. It streamlines student transport registration, route administration, challan fee tracking, and accounts verification through three distinct role-based portals: **Student**, **Accounts Officer**, and **Transport Admin**.

---

## Current Development Milestone: Mid-Evaluation (~40% Completion)

This repository contains the completed **Day 0 (Environment & Architecture Setup)** and **Day 1 (Database Connection, ORM Modeling, and Server Initialization)** implementation.

### Completed Objectives:
- [x] Initialized project repository structure with version control configuration (`.gitignore`).
- [x] Configured Python virtual environment and installed backend dependencies.
- [x] Initialized frontend React application via Vite and configured client libraries (`axios`, `react-router-dom`, `lucide-react`).
- [x] Configured PostgreSQL database connection using SQLAlchemy ORM with connection pooling (`pool_pre_ping`).
- [x] Implemented relational schema models for all 6 core entities with foreign keys and cascade rules.
- [x] Auto-generated and verified all 6 tables in the PostgreSQL database.
- [x] Configured FastAPI application with Cross-Origin Resource Sharing (CORS) for frontend client access.
- [x] Verified API status and server availability via health check endpoints.

---

## Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 19 (Vite) | Single-Page Application client with fast hot module replacement |
| **Routing & HTTP** | React Router DOM, Axios | Client-side routing and asynchronous API communication |
| **Backend** | FastAPI (Python 3.14) | High-performance asynchronous REST API framework |
| **Database** | PostgreSQL 18 | Relational database management system |
| **ORM** | SQLAlchemy 2.0 | Object-Relational Mapping for database queries and transactions |
| **Authentication** | PyJWT, Bcrypt | Token-based stateless authentication and password hashing |
| **Server** | Uvicorn (ASGI) | Production-grade ASGI web server implementation |

---

## Repository Structure

```text
UniGo/
├── .gitignore                      # Version control exclusion rules
├── README.md                       # Project technical documentation
├── backend/
│   ├── .env                        # Local environment parameters (database URL, JWT secrets)
│   ├── requirements.txt            # Python dependencies manifest
│   ├── venv/                       # Isolated Python virtual environment
│   └── app/
│       ├── __init__.py             # Python package marker
│       ├── database.py             # SQLAlchemy engine, session maker, and get_db dependency
│       ├── models.py               # Database schemas (User, Route, Registration, Fee, FeeReceipt, Notification)
│       ├── main.py                 # FastAPI application entry point, CORS config, and health check
│       ├── routers/                # Modular API route controllers
│       └── uploads/receipts/       # Local storage directory for student fee receipt PDFs
└── frontend/
    ├── package.json                # Frontend package manifest and npm scripts
    ├── vite.config.js              # Vite build and development configuration
    ├── index.html                  # Single HTML page entry point
    └── src/
        ├── main.jsx                # Application DOM mounting script
        ├── App.jsx                 # Top-level React routing component
        └── assets/                 # Static graphical resources
```

---

## Database Architecture

The PostgreSQL database (`unigo`) contains 6 interrelated tables designed to support the complete route registration and fee verification lifecycle:

```text
[users] ──< [registrations] >── [routes]
                 │
                 └── [fees] ──< [fee_receipts] >── [users (verifier)]
                          
[users] ──< [notifications]
```

### Table Definitions:

| Entity | Primary Table | Key Attributes | Description |
|---|---|---|---|
| **Users** | `users` | `id`, `reg_no`, `full_name`, `email`, `password_hash`, `role`, `student_type`, `phone` | Stores system actors across three roles: `student`, `accounts`, and `admin`. |
| **Routes** | `routes` | `id`, `name`, `pickup_points`, `fee_amount`, `seats_total`, `is_active` | Maintained by Transport Admins; stores route details, base fees, and vehicle capacity. |
| **Registrations** | `registrations` | `id`, `user_id`, `route_id`, `trip_type`, `semester`, `created_at` | Associates a student with a chosen route for a specific academic semester. |
| **Fees** | `fees` | `id`, `registration_id`, `amount`, `due_date`, `status` | Auto-generated payment ledger. Status flow: `unpaid` → `pending` → `paid` / `rejected`. |
| **Fee Receipts** | `fee_receipts` | `id`, `fee_id`, `file_path`, `original_name`, `status`, `reject_reason`, `verified_by` | Tracks uploaded bank challan PDFs and accounts officer audit decisions. |
| **Notifications** | `notifications` | `id`, `user_id`, `title`, `message`, `is_read`, `created_at` | Delivers in-app system updates regarding fee submissions, approvals, and rejection remarks. |

---

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js LTS (v20+ or v24+)
- PostgreSQL 18 running locally on port `5432`

---

### Backend Setup

1. **Navigate to the backend directory and activate the virtual environment:**
   ```powershell
   cd backend
   .\venv\Scripts\Activate.ps1
   ```

2. **Verify dependencies are installed:**
   ```powershell
   pip install -r requirements.txt
   ```

3. **Verify environment variables in `backend/.env`:**
   ```env
   DATABASE_URL=postgresql+psycopg2://postgres:admin123@localhost:5432/unigo
   SECRET_KEY=unigo-mid-eval-super-secret-key-2026-change-in-prod
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=480
   ```

4. **Start the FastAPI development server:**
   ```powershell
   uvicorn app.main:app --reload
   ```

   - **API Root:** [http://localhost:8000/](http://localhost:8000/)
   - **Health Check:** [http://localhost:8000/health](http://localhost:8000/health)
   - **Interactive API Documentation (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)

---

### Frontend Setup

1. **Open a new terminal and navigate to the frontend directory:**
   ```powershell
   cd frontend
   ```

2. **Install frontend dependencies (if not already installed):**
   ```powershell
   npm install
   ```

3. **Start the Vite development server:**
   ```powershell
   npm run dev
   ```

   - **Frontend Application:** [http://localhost:5173/](http://localhost:5173/)

---

## Upcoming Implementation Roadmap

- **Week 1 (Days 2–3):** Authentication system (Bcrypt hashing, JWT generation, role authorization middleware, registration & login endpoints).
- **Week 1 (Days 4–5):** Route administration, initial database seeding, and student route registration with automated fee creation.
- **Week 1 (Day 6):** React authentication state management and role-based route guards.
- **Week 2:** PDF challan upload with file validation, Accounts Officer verification dashboard, and notification triggers.
- **Week 3:** Admin & Accounts portal user interfaces, reporting, and defense preparation.

