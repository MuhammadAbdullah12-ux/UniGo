"""
Pydantic schemas for request validation, data serialization, and response formatting.
Defines the data transfer contracts between the frontend client and the FastAPI backend,
ensuring strict validation of incoming payloads and filtering sensitive fields on responses.
"""

import re
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict


# ==============================================================================
# Authentication & User Schemas
# ==============================================================================

class UserRegister(BaseModel):
    """
    Validation schema for student registration requests.
    Used by: POST /auth/register (app/routers/auth.py)
    """
    reg_no: str = Field(..., description="Student registration identifier (e.g., 23F-0509)")
    full_name: str = Field(..., min_length=2, max_length=100, description="Full legal name")
    email: EmailStr = Field(..., description="Valid institutional or personal email address")
    password: str = Field(..., min_length=8, description="Account password (minimum 8 characters)")
    student_type: str = Field(default="day_scholar", description="'hostelite' or 'day_scholar'")
    phone: Optional[str] = Field(None, description="Contact phone number")

    @field_validator("reg_no")
    @classmethod
    def validate_registration_number(cls, value: str) -> str:
        """Enforces standardized university registration number patterns."""
        normalized = value.strip().upper()
        if not re.match(r"^\d{2}[A-Z]{1,3}-\d{3,5}$", normalized):
            raise ValueError("Registration number must follow standard format (e.g., 23F-0509)")
        return normalized

    @field_validator("student_type")
    @classmethod
    def validate_student_type(cls, value: str) -> str:
        """Restricts student residence categorization to recognized values."""
        normalized = value.strip().lower()
        if normalized not in ["hostelite", "day_scholar"]:
            raise ValueError("student_type must be either 'hostelite' or 'day_scholar'")
        return normalized


class UserLogin(BaseModel):
    """
    Credentials schema for authentication requests.
    Accepts either an email address or student registration number.
    Used by: POST /auth/login (app/routers/auth.py)
    """
    identifier: str = Field(..., description="Registered email address or student registration number")
    password: str = Field(..., description="Account password")


class UserOut(BaseModel):
    """
    Public user representation serialized for client responses.
    Excludes sensitive attributes such as password_hash.
    Used by: GET /auth/me, POST /auth/register, and user profile endpoints
    """
    model_config = ConfigDict(from_attributes=True)

    id: int
    reg_no: Optional[str] = None
    full_name: str
    email: str
    role: str
    student_type: Optional[str] = None
    phone: Optional[str] = None
    created_at: Optional[datetime] = None


class TokenResponse(BaseModel):
    """
    Authentication token payload returned upon successful login.
    Used by: POST /auth/login (app/routers/auth.py)
    """
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ==============================================================================
# Transport Route Schemas
# ==============================================================================

class RouteBase(BaseModel):
    """Common route attributes shared across creation and presentation schemas."""
    name: str = Field(..., description="Descriptive route title (e.g., Faisalabad - Chiniot)")
    pickup_points: Optional[str] = Field(None, description="Listing of scheduled stops")
    fee_amount: float = Field(..., gt=0, description="Base semester transport fee for full commute")
    seats_total: int = Field(default=55, gt=0, description="Vehicle maximum seating capacity")
    is_active: bool = Field(default=True, description="Route availability status")


class RouteCreate(RouteBase):
    """Payload schema for administrative route creation."""
    pass


class RouteUpdate(BaseModel):
    """Payload schema for administrative route modifications (all fields optional)."""
    name: Optional[str] = None
    pickup_points: Optional[str] = None
    fee_amount: Optional[float] = Field(None, gt=0)
    seats_total: Optional[int] = Field(None, gt=0)
    is_active: Optional[bool] = None


class RouteOut(RouteBase):
    """
    Route representation returned to student and administration portals.
    Includes calculated real-time seat occupancy counts.
    Used by: GET /routes, POST /routes, and PUT /routes/{id}
    """
    model_config = ConfigDict(from_attributes=True)

    id: int
    seats_taken: int = Field(default=0, description="Number of currently confirmed student registrations")


class RouteStudentItemOut(BaseModel):
    """
    Representation of a registered student on a specific transport route.
    Used by: GET /routes/{id}/students (app/routers/routes.py)
    """
    model_config = ConfigDict(from_attributes=True)

    registration_id: int
    user_id: int
    student_name: str
    student_reg_no: Optional[str] = None
    student_type: Optional[str] = None
    trip_type: str
    semester: str
    registered_at: datetime
    fee_status: str = Field(default="unpaid", description="Status of linked fee: unpaid, pending, paid, rejected")
    fee_amount: float


class AdminStatsOut(BaseModel):
    """
    Transport administration dashboard metrics and fleet seat occupancy.
    Used by: GET /admin/stats (app/routers/routes.py)
    """
    total_routes: int = Field(default=0, description="Total transport routes configured")
    active_routes: int = Field(default=0, description="Currently operational transport routes")
    total_seats: int = Field(default=0, description="Total seating capacity across active routes")
    seats_taken: int = Field(default=0, description="Total confirmed student registrations")
    registered_students: int = Field(default=0, description="Total unique students registered")
    occupancy_percentage: float = Field(default=0.0, description="Overall fleet seat occupancy percentage")


# ==============================================================================
# Route Registration & Fee Schemas
# ==============================================================================

class RegistrationCreate(BaseModel):
    """
    Payload submitted by students when selecting a bus route.
    Used by: POST /registrations (app/routers/fees.py)
    """
    route_id: int
    trip_type: str = Field(default="two_way", description="'one_way' or 'two_way'")
    semester: str = Field(default="Fall 2026", description="Academic semester label")

    @field_validator("trip_type")
    @classmethod
    def validate_trip_type(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in ["one_way", "two_way"]:
            raise ValueError("trip_type must be either 'one_way' or 'two_way'")
        return normalized


class FeeOut(BaseModel):
    """
    Ledger record representation showing fee status, payable amounts, and rejection feedback.
    Used by: GET /fees/my, POST /registrations (app/routers/fees.py)
    """
    model_config = ConfigDict(from_attributes=True)

    id: int
    amount: float
    due_date: Optional[datetime] = None
    status: str
    route_name: Optional[str] = None
    trip_type: Optional[str] = None
    semester: Optional[str] = None
    last_reject_reason: Optional[str] = None


class FeeReceiptOut(BaseModel):
    """
    Representation returned to student upon successful challan PDF submission.
    Used by: POST /fees/{fee_id}/receipt (app/routers/fees.py), GET /accounts/students/{id}
    """
    model_config = ConfigDict(from_attributes=True)

    id: int
    fee_id: int
    original_name: str
    uploaded_at: datetime
    status: str
    reject_reason: Optional[str] = None
    verified_at: Optional[datetime] = None
    verified_by_name: Optional[str] = None


class RejectReceiptIn(BaseModel):
    """
    Mandatory reason payload submitted by Accounts Officers when rejecting a fee slip.
    Used by: POST /accounts/receipts/{id}/reject (app/routers/accounts.py)
    """
    reason: str = Field(..., min_length=3, max_length=500, description="Formal explanation detailing why the slip was rejected")

    @field_validator("reason")
    @classmethod
    def validate_non_empty_reason(cls, value: str) -> str:
        trimmed = value.strip()
        if len(trimmed) < 3:
            raise ValueError("Rejection reason must contain at least 3 non-whitespace characters")
        return trimmed


class ReceiptActionOut(BaseModel):
    """
    Confirmation response returned after an Accounts Officer approves or rejects a receipt.
    Used by: POST /accounts/receipts/{id}/approve, POST /accounts/receipts/{id}/reject (app/routers/accounts.py)
    """
    success: bool = True
    receipt_id: int
    fee_id: int
    status: str
    message: str
    verified_at: Optional[datetime] = None
    reject_reason: Optional[str] = None


# ==============================================================================
# Accounts Officer Schemas (Day 9 Review & Verification Queue)
# ==============================================================================

class AccountsStatsOut(BaseModel):
    """
    High-level financial and review metrics displayed on Accounts Officer dashboard.
    Used by: GET /accounts/stats (app/routers/accounts.py)
    """
    pending_count: int = Field(default=0, description="Receipts currently waiting for officer verification")
    approved_today_count: int = Field(default=0, description="Receipts verified and approved today")
    rejected_count: int = Field(default=0, description="Receipts rejected requiring correction")
    total_collected_amount: float = Field(default=0.0, description="Total verified transport fee amount collected in PKR")


class ReceiptListItemOut(BaseModel):
    """
    Summary row schema for the pending and historical receipt review tables.
    Used by: GET /accounts/receipts (app/routers/accounts.py)
    """
    id: int
    fee_id: int
    student_id: Optional[int] = None
    student_name: str
    student_reg_no: Optional[str] = None
    route_name: str
    amount: float
    uploaded_at: datetime
    status: str
    is_late: bool = Field(default=False, description="True if uploaded after voucher due date")


class ReceiptDetailOut(BaseModel):
    """
    Detailed dossier populating the right-hand inspection panel of the Verify Receipt screen.
    Used by: GET /accounts/receipts/{id} (app/routers/accounts.py)
    """
    id: int
    fee_id: int
    student_id: int
    student_name: str
    student_reg_no: Optional[str] = None
    student_type: Optional[str] = None
    student_email: str
    student_phone: Optional[str] = None
    route_name: str
    trip_type: str
    semester: str
    amount: float
    due_date: Optional[datetime] = None
    uploaded_at: datetime
    status: str
    original_name: str
    reject_reason: Optional[str] = None
    verified_at: Optional[datetime] = None
    verified_by_name: Optional[str] = None
    is_late: bool = Field(default=False, description="True if uploaded after voucher due date")


class StudentFeeHistoryOut(BaseModel):
    """
    Complete financial audit timeline for an individual student.
    Used by: GET /accounts/students/{user_id} (app/routers/accounts.py)
    """
    student: UserOut
    fee: Optional[FeeOut] = None
    receipts: List[FeeReceiptOut] = []


# ==============================================================================
# In-App Notification Schemas (Day 11)
# ==============================================================================

class NotificationOut(BaseModel):
    """
    Representation of an individual in-app notification delivered to a user.
    Used by: GET /notifications, POST /notifications/{id}/read (app/routers/notifications.py)
    """
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    title: str
    message: str
    is_read: bool
    created_at: datetime


class NotificationListOut(BaseModel):
    """
    Notification inbox response containing unread badge counter and full notification feed.
    Used by: GET /notifications (app/routers/notifications.py)
    """
    unread_count: int = Field(default=0, description="Total number of unread notifications for notification bell badge")
    notifications: List[NotificationOut] = Field(default=[], description="Chronological listing of notifications, newest first")

