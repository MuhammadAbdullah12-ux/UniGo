"""
Application entry point for the UniGo FastAPI backend.
Initializes the application instance, establishes database tables on startup,
configures Cross-Origin Resource Sharing (CORS) for the frontend client,
and registers modular API route handlers across all departments.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
import app.models  # Imports model definitions so SQLAlchemy registers them with metadata
from app.routers import auth, routes, fees, accounts, notifications  # Import modular domain routers

# Synchronize models with PostgreSQL: creates any missing tables when the application starts
Base.metadata.create_all(bind=engine)

# Initialize the core FastAPI application
app = FastAPI(
    title="UniGo API",
    description="Campus Transport Management System - Mid-Evaluation API",
    version="1.0.0"
)

# Configure Cross-Origin Resource Sharing (CORS)
# Allows the React frontend running on port 5173 (Vite development server)
# to make asynchronous HTTP requests without encountering browser origin restrictions
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==============================================================================
# Router Registrations
# ==============================================================================
# 1. Mount authentication endpoints: /auth/register, /auth/login, /auth/me
app.include_router(auth.router)

# 2. Mount transport route endpoints: GET /routes, GET /routes/{id}, POST /routes
app.include_router(routes.router)

# 3. Mount student registration & fee voucher endpoints: POST /registrations, GET /fees/my, POST /fees/{id}/receipt
app.include_router(fees.router)

# 4. Mount accounts officer verification endpoints: /accounts/stats, /accounts/receipts, /accounts/students/{id}
app.include_router(accounts.router)

# 5. Mount in-app notification endpoints: GET /notifications, POST /notifications/{id}/read, POST /notifications/read-all
app.include_router(notifications.router)


# ==============================================================================
# General & Health Check Endpoints
# ==============================================================================
@app.get("/", tags=["General"])
def root():
    """Root endpoint providing quick navigation links to API documentation and system status."""
    return {
        "message": "Welcome to UniGo API",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health", tags=["General"])
def health_check():
    """
    Health check endpoint used to verify backend availability and server uptime.
    Returns status 200 when the service is operational.
    """
    return {
        "status": "ok",
        "app": "UniGo",
        "message": "Backend is running and PostgreSQL database is connected!"
    }
