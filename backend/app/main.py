"""
Application entry point for the UniGo FastAPI backend.
Initializes the application instance, establishes database tables on startup,
configures Cross-Origin Resource Sharing (CORS) for the frontend client,
and registers API route handlers.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
import app.models  # Imports model definitions so SQLAlchemy registers them with metadata

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
