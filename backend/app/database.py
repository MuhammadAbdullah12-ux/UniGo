"""
Database connection setup and session management using SQLAlchemy ORM.
This module configures the PostgreSQL connection engine and provides the
database session dependency used across all FastAPI endpoint routers.
"""

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Load database configuration parameters from the local .env file
load_dotenv()

# Read the PostgreSQL connection string from the environment
DATABASE_URL = os.getenv("DATABASE_URL")

# Validate that the connection string is defined before starting the engine
if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not configured in backend/.env")

# Initialize the SQLAlchemy engine
# pool_pre_ping=True tests active connections before use, preventing stale connection errors
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True
)

# Session factory for handling database transactions
# autocommit=False ensures transactions are explicitly controlled via db.commit() or db.rollback()
# autoflush=False prevents automatic flushing of changes before explicit queries are executed
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Declarative base class from which all database models (User, Route, Fee, etc.) inherit
Base = declarative_base()


def get_db():
    """
    Database session dependency.
    Injected into FastAPI route functions using: db: Session = Depends(get_db)
    
    Opens an isolated session for each incoming HTTP request and guarantees
    that the connection is properly closed after the response is sent.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
