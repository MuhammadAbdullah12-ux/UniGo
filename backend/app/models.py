"""
SQLAlchemy database models defining the schema for the UniGo Transport Management System.
These models map directly to relational tables in PostgreSQL and define relationships,
foreign key constraints, and cascade delete rules across the system.
"""

from datetime import datetime, timezone
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from app.database import Base


def utcnow():
    """Standardized UTC timestamp helper for record creation and audit logs."""
    return datetime.now(timezone.utc)


class User(Base):
    """
    Stores system users across three roles: 'student', 'accounts', and 'admin'.
    Used by:
      - Authentication router (app/routers/auth.py) for login and registration
      - Security dependencies (app/deps.py) for role-based authorization
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    reg_no = Column(String(50), unique=True, index=True, nullable=True)  # Populated for students (e.g., 23F-0509)
    full_name = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)                 # Bcrypt hashed password
    role = Column(String(20), nullable=False, default="student")        # 'student', 'accounts', 'admin'
    student_type = Column(String(20), nullable=True)                    # 'hostelite' or 'day_scholar'
    phone = Column(String(30), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    # Relationships linked to user activity
    registrations = relationship("Registration", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    verified_receipts = relationship("FeeReceipt", back_populates="verifier")


class Route(Base):
    """
    Stores transport routes, capacities, and base semester fare amounts.
    Used by:
      - Admin portal for creating and editing routes
      - Student portal for displaying available bus routes and seat availability
    """
    __tablename__ = "routes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)                          # e.g., 'Faisalabad - Chiniot'
    pickup_points = Column(Text, nullable=True)                         # Comma-separated or descriptive stops
    fee_amount = Column(Float, nullable=False)                          # Base semester fee for full two-way commute
    seats_total = Column(Integer, nullable=False, default=50)           # Total vehicle seat capacity
    is_active = Column(Boolean, default=True)                           # Allows admins to toggle route availability

    # Tracks all students registered to this specific route
    registrations = relationship("Registration", back_populates="route")


class Registration(Base):
    """
    Represents a student's enrollment in a transport route for an academic semester.
    Used by:
      - Student registration endpoint when selecting a route
      - Fee calculation logic to auto-generate corresponding fee records
    """
    __tablename__ = "registrations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    route_id = Column(Integer, ForeignKey("routes.id", ondelete="CASCADE"), nullable=False)
    trip_type = Column(String(20), nullable=False, default="two_way")  # 'one_way' or 'two_way'
    semester = Column(String(30), nullable=False)                       # Academic semester identifier (e.g., 'Fall 2026')
    created_at = Column(DateTime(timezone=True), default=utcnow)

    # Relational connections
    user = relationship("User", back_populates="registrations")
    route = relationship("Route", back_populates="registrations")
    fee = relationship("Fee", back_populates="registration", uselist=False, cascade="all, delete-orphan")


class Fee(Base):
    """
    Maintains the payment ledger entry for a student's route registration.
    Used by:
      - Student dashboard to display current fee status and payable amount
      - Verification workflow to transition status: unpaid -> pending -> paid / rejected
    """
    __tablename__ = "fees"

    id = Column(Integer, primary_key=True, index=True)
    registration_id = Column(Integer, ForeignKey("registrations.id", ondelete="CASCADE"), unique=True, nullable=False)
    amount = Column(Float, nullable=False)                              # Calculated payable amount based on trip type
    due_date = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(20), nullable=False, default="unpaid")       # 'unpaid', 'pending', 'paid', 'rejected'

    # Relational connections
    registration = relationship("Registration", back_populates="fee")
    receipts = relationship("FeeReceipt", back_populates="fee", order_by="desc(FeeReceipt.uploaded_at)", cascade="all, delete-orphan")


class FeeReceipt(Base):
    """
    Tracks bank challan PDF uploads and the audit trail for accounts officer verification.
    Used by:
      - Fee submission endpoint when student uploads a receipt PDF
      - Accounts officer verification screen to review PDFs, approve, or reject with remarks
    """
    __tablename__ = "fee_receipts"

    id = Column(Integer, primary_key=True, index=True)
    fee_id = Column(Integer, ForeignKey("fees.id", ondelete="CASCADE"), nullable=False)
    file_path = Column(String(255), nullable=False)                     # Saved location on disk in backend/app/uploads/receipts/
    original_name = Column(String(255), nullable=False)                 # User's submitted file name for reference
    uploaded_at = Column(DateTime(timezone=True), default=utcnow)
    status = Column(String(20), nullable=False, default="pending")      # 'pending', 'approved', 'rejected'
    reject_reason = Column(Text, nullable=True)                         # Mandatory feedback if rejected by officer
    verified_by = Column(Integer, ForeignKey("users.id"), nullable=True)# Foreign key to the reviewing Accounts Officer
    verified_at = Column(DateTime(timezone=True), nullable=True)

    # Relational connections
    fee = relationship("Fee", back_populates="receipts")
    verifier = relationship("User", back_populates="verified_receipts")


class Notification(Base):
    """
    In-app alert records delivered to users.
    Used by:
      - Fee verification logic to notify students of approvals or rejections
      - Submission workflow to alert accounts officers when a new receipt is uploaded
    """
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(150), nullable=False)                         # Notification headline
    message = Column(Text, nullable=False)                              # Detailed alert message
    is_read = Column(Boolean, default=False)                            # Unread indicator badge flag
    created_at = Column(DateTime(timezone=True), default=utcnow)

    # Relational connections
    user = relationship("User", back_populates="notifications")
