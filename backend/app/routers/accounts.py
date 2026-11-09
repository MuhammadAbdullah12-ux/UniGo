"""
Accounts Officer verification and financial review router for UniGo.
Provides endpoints for review queues, receipt inspection, student financial dossiers,
search/filtering capabilities, and dashboard KPI metrics.
Mounted in app/main.py under the /accounts URL path.
Restricted to users holding the 'accounts' or 'admin' roles.
"""

import pathlib
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_

from app.database import get_db
from app.models import User, Route, Registration, Fee, FeeReceipt
from app.schemas import (
    AccountsStatsOut,
    ReceiptListItemOut,
    ReceiptDetailOut,
    StudentFeeHistoryOut,
    UserOut,
    FeeOut,
    FeeReceiptOut
)
from app.deps import require_role

# Initialize router with standard URL prefix and Swagger documentation grouping
router = APIRouter(prefix="/accounts", tags=["Accounts Officer - Verification"])

# Storage directory on disk: backend/app/uploads/receipts
UPLOAD_DIR = pathlib.Path(__file__).resolve().parent.parent / "uploads" / "receipts"


# ==============================================================================
# 1. Accounts Dashboard KPI Stats
# ==============================================================================

@router.get("/stats", response_model=AccountsStatsOut)
def get_accounts_stats(
    db: Session = Depends(get_db),
    current_officer: User = Depends(require_role("accounts", "admin"))
):
    """
    Computes real-time KPI metrics for the Accounts Officer dashboard.
    Calculates pending verifications, approvals executed today, rejections, and total revenue.
    """
    # 1. Pending Receipts count
    pending_count = db.query(FeeReceipt).filter(FeeReceipt.status == "pending").count()

    # 2. Approved Today count (compares verified_at against start of today in UTC)
    now_utc = datetime.now(timezone.utc)
    start_of_today = now_utc.replace(hour=0, minute=0, second=0, microsecond=0)
    approved_today_count = db.query(FeeReceipt).filter(
        FeeReceipt.status == "approved",
        FeeReceipt.verified_at >= start_of_today
    ).count()

    # 3. Total Rejected count
    rejected_count = db.query(FeeReceipt).filter(FeeReceipt.status == "rejected").count()

    # 4. Total Verified Revenue collected (sum of all fees with status 'paid')
    total_amount_query = db.query(func.sum(Fee.amount)).filter(Fee.status == "paid").scalar()
    total_collected_amount = float(total_amount_query) if total_amount_query else 0.0

    return AccountsStatsOut(
        pending_count=pending_count,
        approved_today_count=approved_today_count,
        rejected_count=rejected_count,
        total_collected_amount=total_collected_amount
    )


# ==============================================================================
# 2. Searchable & Filterable Receipt Review Queue
# ==============================================================================

@router.get("/receipts", response_model=List[ReceiptListItemOut])
def list_receipts(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status: 'pending', 'approved', 'rejected'"),
    route_id: Optional[int] = Query(None, description="Filter receipts by specific transport route ID"),
    q: Optional[str] = Query(None, description="Search keyword for student name or registration number"),
    db: Session = Depends(get_db),
    current_officer: User = Depends(require_role("accounts", "admin"))
):
    """
    Retrieves the receipt review table with support for status filtering, route filtering,
    and case-insensitive student search. Calculates due-date compliance timing for each receipt.
    """
    # Build joined query across receipts, fees, registrations, users, and routes
    query = (
        db.query(FeeReceipt, Fee, Registration, User, Route)
        .join(Fee, FeeReceipt.fee_id == Fee.id)
        .join(Registration, Fee.registration_id == Registration.id)
        .join(User, Registration.user_id == User.id)
        .join(Route, Registration.route_id == Route.id)
    )

    # Apply status filter
    if status_filter:
        query = query.filter(FeeReceipt.status == status_filter.strip().lower())

    # Apply route filter
    if route_id:
        query = query.filter(Registration.route_id == route_id)

    # Apply search keyword across student name or roll number (case-insensitive)
    if q:
        search_pattern = f"%{q.strip()}%"
        query = query.filter(
            or_(
                User.full_name.ilike(search_pattern),
                User.reg_no.ilike(search_pattern)
            )
        )

    # Order newest submissions first
    records = query.order_by(desc(FeeReceipt.uploaded_at)).all()

    results = []
    for receipt, fee, registration, user, route in records:
        # Automated timing check: flag as late if uploaded after voucher due date
        is_late = bool(fee.due_date and receipt.uploaded_at > fee.due_date)

        results.append(
            ReceiptListItemOut(
                id=receipt.id,
                fee_id=fee.id,
                student_name=user.full_name,
                student_reg_no=user.reg_no,
                route_name=route.name,
                amount=fee.amount,
                uploaded_at=receipt.uploaded_at,
                status=receipt.status,
                is_late=is_late
            )
        )

    return results


# ==============================================================================
# 3. Detailed Receipt Inspection (Verify Screen Right Panel)
# ==============================================================================

@router.get("/receipts/{receipt_id}", response_model=ReceiptDetailOut)
def get_receipt_details(
    receipt_id: int,
    db: Session = Depends(get_db),
    current_officer: User = Depends(require_role("accounts", "admin"))
):
    """
    Retrieves complete specifications for a single receipt to populate the right-hand inspection panel
    of the Verify Screen (student contact, trip type, fee due date, timing compliance).
    """
    record = (
        db.query(FeeReceipt, Fee, Registration, User, Route)
        .join(Fee, FeeReceipt.fee_id == Fee.id)
        .join(Registration, Fee.registration_id == Registration.id)
        .join(User, Registration.user_id == User.id)
        .join(Route, Registration.route_id == Route.id)
        .filter(FeeReceipt.id == receipt_id)
        .first()
    )

    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Receipt record not found"
        )

    receipt, fee, registration, user, route = record
    is_late = bool(fee.due_date and receipt.uploaded_at > fee.due_date)

    return ReceiptDetailOut(
        id=receipt.id,
        fee_id=fee.id,
        student_id=user.id,
        student_name=user.full_name,
        student_reg_no=user.reg_no,
        student_type=user.student_type,
        student_email=user.email,
        student_phone=user.phone,
        route_name=route.name,
        trip_type=registration.trip_type,
        semester=registration.semester,
        amount=fee.amount,
        due_date=fee.due_date,
        uploaded_at=receipt.uploaded_at,
        status=receipt.status,
        original_name=receipt.original_name,
        reject_reason=receipt.reject_reason,
        is_late=is_late
    )


# ==============================================================================
# 4. Stream PDF Document for Accounts Officer (Verify Screen Left Panel)
# ==============================================================================

@router.get("/receipts/{receipt_id}/file")
def get_receipt_file_for_officer(
    receipt_id: int,
    db: Session = Depends(get_db),
    current_officer: User = Depends(require_role("accounts", "admin"))
):
    """
    Streams the physical PDF challan directly for the Accounts Officer PDF viewer.
    """
    receipt = db.query(FeeReceipt).filter(FeeReceipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Receipt record not found"
        )

    saved_filename = pathlib.Path(receipt.file_path).name
    physical_path = UPLOAD_DIR / saved_filename

    if not physical_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Receipt PDF document was not found on server disk"
        )

    return FileResponse(
        path=str(physical_path),
        media_type="application/pdf",
        filename=receipt.original_name,
        content_disposition_type="inline"
    )


# ==============================================================================
# 5. Individual Student Financial Ledger & Audit Trail
# ==============================================================================

@router.get("/students/{user_id}", response_model=StudentFeeHistoryOut)
def get_student_fee_history(
    user_id: int,
    db: Session = Depends(get_db),
    current_officer: User = Depends(require_role("accounts", "admin"))
):
    """
    Retrieves the complete financial history of a student including their profile,
    active fee voucher, and all receipt upload attempts with their rejection/approval history.
    """
    student = db.query(User).filter(User.id == user_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student user record not found"
        )

    # Fetch active registration and fee record
    active_reg = db.query(Registration).filter(
        Registration.user_id == student.id
    ).order_by(desc(Registration.created_at)).first()

    fee_out = None
    receipts_out = []

    if active_reg and active_reg.fee:
        fee = active_reg.fee
        fee_out = FeeOut(
            id=fee.id,
            amount=fee.amount,
            due_date=fee.due_date,
            status=fee.status,
            route_name=active_reg.route.name if active_reg.route else None,
            trip_type=active_reg.trip_type,
            semester=active_reg.semester,
            last_reject_reason=None
        )

        # Retrieve all historical receipt upload attempts ordered newest first
        receipt_records = db.query(FeeReceipt).filter(
            FeeReceipt.fee_id == fee.id
        ).order_by(desc(FeeReceipt.uploaded_at)).all()

        receipts_out = [
            FeeReceiptOut(
                id=r.id,
                fee_id=r.fee_id,
                original_name=r.original_name,
                uploaded_at=r.uploaded_at,
                status=r.status,
                reject_reason=r.reject_reason
            )
            for r in receipt_records
        ]

    return StudentFeeHistoryOut(
        student=UserOut.model_validate(student),
        fee=fee_out,
        receipts=receipts_out
    )

