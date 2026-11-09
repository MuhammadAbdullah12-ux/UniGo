# UniGo — Campus Transport & Fee Management System

UniGo is a web-based transport and fee verification platform designed for university campuses (modeled on FAST-NUCES Chiniot-Faisalabad Campus operations). It automates student route registration, context-aware transport billing, challan verification, and administrative fleet management across three distinct role-based portals: **Student**, **Accounts Officer**, and **Transport Admin**.

---

## Current Development Milestone: Week 1 Complete (~40% Foundation)

All planned objectives for **Week 1 (Days 0 through 6)** have been implemented, tested, and verified end-to-end.

### Completed Feature Set:
- [x] **Relational Schema Architecture:** 6 core PostgreSQL tables configured via SQLAlchemy ORM (`users`, `routes`, `registrations`, `fees`, `fee_receipts`, `notifications`).
- [x] **Cryptographic Security Engine:** Bcrypt password salting/hashing and signed JSON Web Tokens (JWT) with 8-hour expiration.
- [x] **Role-Based Access Control (RBAC):** Request-level security dependencies enforcing access permissions across `student`, `accounts`, and `admin` roles.
- [x] **Official Transport Fleet:** Seeded with 13 official FAST-NUCES campus routes, scheduled pickup stops, vehicle capacity (55 seats), and base semester fare (Rs. 36,000).
- [x] **Context-Aware Billing Engine:**
  - **Day Scholars:** Enforced full-semester two-way commute (Rs. 36,000). One-way passes restricted.
  - **Hostelites:** Weekend home-travel ticketing (Rs. 500 one-way / Rs. 1,000 two-way).
  - Automated generation of `unpaid` fee ledger records with a 14-day payment due date.
- [x] **React Single-Page Client (Vite):**
  - Centralized Axios client with automatic JWT bearer token injection via request interceptors and auto-logout on session expiration.
  - Global `AuthContext` state provider with browser `localStorage` persistence.
  - Client-side `ProtectedRoute` guards preventing unauthorized navigation across role boundaries.
  - Universal login form with automatic steering to `/student`, `/accounts`, or `/admin`.
  - Student registration form with live university roll number and email format validation.

---

## Technology Stack

| Layer | Technology | Description |
|---|---|---|
| **Frontend** | React 19 (Vite) | Single-Page Application client with fast hot module replacement |
| **Client Routing** | React Router DOM v7 | Declarative client-side routing and protected route wrappers |
| **HTTP Client** | Axios | Network client with request and response interceptors |
| **Backend API** | FastAPI (Python 3.14) | High-performance asynchronous REST API framework |
| **Database** | PostgreSQL 18 | Relational database management system |
| **ORM** | SQLAlchemy 2.0 | Object-Relational Mapping for database queries and migrations |
| **Authentication** | PyJWT & Bcrypt | Stateless token-based authentication and secure password hashing |
| **Web Server** | Uvicorn (ASGI) | Production-grade ASGI web server |

---

## System Architecture

```text
                               ┌────────────────────────────────────────────────────────┐
                               │                    FastAPI Backend                     │
                               │                                                        │
┌────────────────┐  REST / JWT │  ┌──────────────┐   ┌──────────────┐   ┌────────────┐  │
│  React Client  │ ──────────► │  │ Auth Router  │   │ Route Router │   │ Fee Router │  │
│  (Port 5173)   │ ◄────────── │  └──────┬───────┘   └──────┬───────┘   └─────┬──────┘  │
└────────────────┘             │         │                  │                 │         │
                               └─────────┼──────────────────┼─────────────────┼─────────┘
                                         ▼                  ▼                 ▼
                               ┌────────────────────────────────────────────────────────┐
                               │                 PostgreSQL 18 (unigo)                  │
                               │   [users] ──< [registrations] >── [routes]             │
                               │                    │                                   │
                               │                    └── [fees] ──< [fee_receipts]       │
                               └────────────────────────────────────────────────────────┘
```

---

## Repository Structure

```text
UniGo/
├── .gitignore                      # Version control exclusion rules
├── README.md                       # Technical documentation and setup guide
├── backend/
│   ├── .env                        # Local environment variables (DB URL, JWT Secret)
│   ├── requirements.txt            # Python dependencies manifest
│   ├── seed.py                     # Database seeder (staff accounts + campus routes)
│   └── app/
│       ├── database.py             # SQLAlchemy engine, session maker, get_db dependency
│       ├── models.py               # ORM schemas (User, Route, Registration, Fee, etc.)
│       ├── schemas.py              # Pydantic validation and serialization models
│       ├── security.py             # Bcrypt hashing and JWT generation/decoding
│       ├── deps.py                 # Bearer token verification and require_role RBAC
│       ├── main.py                 # FastAPI application entry point and CORS setup
│       ├── routers/
│       │   ├── auth.py             # Registration, login, and profile endpoints
│       │   ├── routes.py           # Route listing, seat tracking, and route creation
│       │   └── fees.py             # Route registration and fee voucher generation
│       └── uploads/receipts/       # Storage directory for student fee receipts
└── frontend/
    ├── package.json                # Frontend dependencies and npm scripts
    ├── vite.config.js              # Vite bundler configuration
    ├── index.html                  # HTML entry point
    └── src/
        ├── main.jsx                # React DOM initialization
        ├── App.jsx                 # Application routes and navigation tree
        ├── index.css & App.css     # Base styling and university theme tokens
        ├── api/
        │   └── client.js           # Axios client with bearer interceptor
        ├── context/
        │   └── AuthContext.jsx     # Global authentication state and useAuth hook
        ├── components/
        │   └── ProtectedRoute.jsx  # Client-side RBAC route guard
        └── pages/
            ├── Login.jsx           # Universal login form with dynamic role routing
            ├── Register.jsx        # Student registration form
            ├── StudentDashboard.jsx# Student portal view
            ├── AccountsDashboard.jsx# Accounts Officer portal view
            └── AdminDashboard.jsx  # Transport Admin portal view
```

---

## Default Accounts for Testing

| Role | Identifier / Email | Password | Assigned Portal |
|---|---|---|---|
| **Student (Day Scholar)** | `23F-0509` *(or email)* | `Password123` | `/student` |
| **Student (Hostelite)** | `23F-0888` *(or email)* | `Password123` | `/student` |
| **Accounts Officer** | `accounts@unigo.test` | `AccountsPassword123` | `/accounts` |
| **Transport Admin** | `admin@unigo.test` | `AdminPassword123` | `/admin` |

---

## How to Run the Application

### 1. Start the Backend API Server
Open a terminal in the root directory:
```powershell
cd backend
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```
- **API Base:** [http://localhost:8000](http://localhost:8000)
- **Interactive Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)

---

### 2. Start the React Frontend Client
Open a second terminal:
```powershell
cd frontend
npm run dev
```
- **Web Application:** [http://localhost:5173](http://localhost:5173)
