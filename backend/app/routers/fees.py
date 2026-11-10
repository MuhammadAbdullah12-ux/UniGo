"""
Fees and student route registration router for the UniGo Transport Management System.
Handles route enrollment, context-aware pricing policies (Day Scholar vs Hostelite),
automated fee voucher generation, secure PDF bank challan uploads, and inline PDF streaming.
Mounted in app/main.py under the /fees and /registrations URL paths.
"""

import uuid
import pathlib
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import User, Route, Registration, Fee, FeeReceipt
from app.schemas import RegistrationCreate, FeeOut, FeeReceiptOut
from app.deps import get_current_user, require_role
from app.routers.notifications import create_notification

# Router for registration, fee voucher, and receipt upload operations
router = APIRouter(tags=["Student Fees & Registrations"])

# Standard payment window for issued fee vouchers
PAYMENT_DUE_DAYS = 14

# Hostelite weekend transport fare constants
HOSTELITE_ONE_WAY_FARE = 500.0
HOSTELITE_TWO_WAY_FARE = 1000.0

# File Upload Security Parameters
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 Megabytes
PDF_MAGIC_BYTES = b"%PDF"               # Universal binary signature for authentic PDF files

# Storage directory on disk: backend/app/uploads/receipts
UPLOAD_DIR = pathlib.Path(__file__).resolve().parent.parent / "uploads" / "receipts"


# ==============================================================================
# Route Enrollment & Fee Voucher Endpoints
# ==============================================================================

@router.post("/registrations", response_model=FeeOut, status_code=status.HTTP_201_CREATED)
def register_for_route(
    reg_data: RegistrationCreate,
    db: Session = Depends(get_db),
    current_student: User = Depends(require_role("student"))
):
    """
    Registers a student for a transport route and automatically generates an unpaid fee record.
    Enforces university policy:
      - Day Scholars must take full semester commute (Rs. 36,000, two-way only).
      - Hostelites travel on weekends (Rs. 500 one-way, Rs. 1,000 two-way).
      - Duplicate registrations for the same semester are blocked.
    """
    # 1. Validate route existence and availability
    route = db.query(Route).filter(Route.id == reg_data.route_id, Route.is_active == True).first()
    if not route:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Selected transport route does not exist or is inactive"
        )

    # 2. Enforce bus seating capacity limit (55 seats)
    confirmed_seats = db.query(Registration).filter(Registration.route_id == route.id).count()
    if confirmed_seats >= route.seats_total:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Route '{route.name}' is currently at full capacity ({route.seats_total} seats)"
        )

    # 3. Check for existing registration in the same academic semester
    existing_reg = db.query(Registration).filter(
        Registration.user_id == current_student.id,
        Registration.semester == reg_data.semester.strip()
    ).first()
    if existing_reg:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"You are already registered for semester '{reg_data.semester}'. Route changes require Transport Admin approval."
        )

    # 4. Context-Aware Fee Calculation based on Student Residence Type
    student_type = (current_student.student_type or "day_scholar").lower()
    trip_type = reg_data.trip_type.lower()

    if student_type == "day_scholar":
        if trip_type == "one_way":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One-way commute is not available for Day Scholars. Full semester two-way commute is required."
            )
        calculated_amount = float(route.fee_amount)  # Standard Rs. 36,000
    else:
        if trip_type == "one_way":
            calculated_amount = HOSTELITE_ONE_WAY_FARE   # Rs. 500
        else:
            calculated_amount = HOSTELITE_TWO_WAY_FARE   # Rs. 1,000

    # 5. Persist Registration Record
    new_reg = Registration(
        user_id=current_student.id,
        route_id=route.id,
        trip_type=trip_type,
        semester=reg_data.semester.strip()
    )
    db.add(new_reg)
    db.flush()

    # 6. Auto-Generate Unpaid Fee Record with 14-day payment due date
    due_date = datetime.now(timezone.utc) + timedelta(days=PAYMENT_DUE_DAYS)
    new_fee = Fee(
        registration_id=new_reg.id,
        amount=calculated_amount,
        due_date=due_date,
        status="unpaid"
    )
    db.add(new_fee)
    db.commit()
    db.refresh(new_fee)

    return FeeOut(
        id=new_fee.id,
        amount=new_fee.amount,
        due_date=new_fee.due_date,
        status=new_fee.status,
        route_name=route.name,
        trip_type=new_reg.trip_type,
        semester=new_reg.semester,
        last_reject_reason=None
    )


@router.get("/fees/my", response_model=FeeOut)
def get_my_fee(
    db: Session = Depends(get_db),
    current_student: User = Depends(require_role("student"))
):
    """
    Retrieves the active transport fee voucher for the logged-in student.
    Includes current payment status ('unpaid', 'pending', 'paid', 'rejected')
    and administrative rejection feedback if previously rejected by Accounts.
    """
    registration = db.query(Registration).filter(
        Registration.user_id == current_student.id
    ).order_by(desc(Registration.created_at)).first()

    if not registration or not registration.fee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active transport registration or fee voucher found for your account"
        )

    fee = registration.fee

    latest_reject_reason = None
    if fee.status == "rejected":
        latest_receipt = db.query(FeeReceipt).filter(
            FeeReceipt.fee_id == fee.id
        ).order_by(desc(FeeReceipt.uploaded_at)).first()
        if latest_receipt and latest_receipt.reject_reason:
            latest_reject_reason = latest_receipt.reject_reason

    return FeeOut(
        id=fee.id,
        amount=fee.amount,
        due_date=fee.due_date,
        status=fee.status,
        route_name=registration.route.name if registration.route else None,
        trip_type=registration.trip_type,
        semester=registration.semester,
        last_reject_reason=latest_reject_reason
    )


# ==============================================================================
# PDF Fee Receipt Upload Endpoint (Day 8 Core Feature)
# ==============================================================================

@router.post("/fees/{fee_id}/receipt", response_model=FeeReceiptOut, status_code=status.HTTP_201_CREATED)
async def upload_fee_receipt(
    fee_id: int,
    file: UploadFile = File(..., description="Paid bank challan or online transaction receipt in PDF format"),
    db: Session = Depends(get_db),
    current_student: User = Depends(require_role("student"))
):
    """
    Submits a bank payment receipt PDF against an active fee voucher.
    Executes comprehensive security checks:
      1. Verifies that the fee belongs to the logged-in student.
      2. Enforces that fee status is 'unpaid' or 'rejected' (blocks duplicate submissions).
      3. Validates file size (maximum 5 MB).
      4. Inspects binary magic bytes (%PDF) to reject spoofed files.
      5. Generates a cryptographic random filename and updates fee status to 'pending'.
    """
    fee = db.query(Fee).filter(Fee.id == fee_id).first()
    if not fee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fee voucher not found"
        )

    if fee.registration.user_id != current_student.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You can only submit payment receipts for your own fee vouchers"
        )

    if fee.status not in ["unpaid", "rejected"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot upload receipt: Fee is currently '{fee.status}'. Receipts can only be submitted for 'unpaid' or 'rejected' vouchers."
        )

    data = await file.read()
    if len(data) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty. Please select a valid document."
        )

    if len(data) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Uploaded file exceeds the maximum permitted size of 5 MB"
        )

    if not data.startswith(PDF_MAGIC_BYTES):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Only genuine PDF documents starting with %PDF are accepted."
        )

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    random_filename = f"{uuid.uuid4().hex}.pdf"
    target_path = UPLOAD_DIR / random_filename
    target_path.write_bytes(data)

    relative_storage_path = f"app/uploads/receipts/{random_filename}"

    new_receipt = FeeReceipt(
        fee_id=fee.id,
        file_path=relative_storage_path,
        original_name=file.filename or "challan_receipt.pdf",
        status="pending",
        reject_reason=None
    )
    db.add(new_receipt)

    fee.status = "pending"

    db.commit()
    db.refresh(new_receipt)

    # Dispatch in-app notifications to all Accounts Officers and Admins
    officers = db.query(User).filter(User.role.in_(["accounts", "admin"])).all()
    for officer in officers:
        create_notification(
            db=db,
            user_id=officer.id,
            title="New Receipt Submitted",
            message=f"Student {current_student.reg_no or current_student.full_name} has uploaded a fee receipt for verification."
        )

    return new_receipt


# ==============================================================================
# PDF Receipt Retrieval Endpoint (Day 8 & Day 9 Verification View)
# ==============================================================================

@router.get("/fees/{fee_id}/receipt/file")
def get_fee_receipt_file(
    fee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Streams the physical PDF challan document for browser viewing.
    Role-based visibility:
      - Students may only view PDFs uploaded against their own fee records.
      - Accounts Officers and Transport Admins may view any student's receipt.

    Args:
        fee_id (int): Primary key ID of the fee voucher.
        db (Session): Database session dependency.
        current_user (User): Authenticated caller model.

    Returns:
        FileResponse: Inline binary PDF stream with appropriate MIME type.

    Raises:
        HTTPException 403: If a student attempts to view another student's document.
        HTTPException 404: If the fee record, receipt metadata, or physical file is missing.
    """
    fee = db.query(Fee).filter(Fee.id == fee_id).first()
    if not fee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fee voucher not found"
        )

    # Privacy check: Students can only view their own receipts; staff can inspect all
    if current_user.role == "student" and fee.registration.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You do not have permission to view other students' receipts"
        )

    # Fetch the most recently uploaded receipt record
    receipt = db.query(FeeReceipt).filter(
        FeeReceipt.fee_id == fee.id
    ).order_by(desc(FeeReceipt.uploaded_at)).first()

    if not receipt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No receipt document has been uploaded for this fee voucher"
        )

    # Resolve physical disk path
    saved_filename = pathlib.Path(receipt.file_path).name
    physical_path = UPLOAD_DIR / saved_filename

    if not physical_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The receipt document was not found in storage. Please contact administrator."
        )

    # Stream inline PDF for interactive browser viewing
    return FileResponse(
        path=str(physical_path),
        media_type="application/pdf",
        filename=receipt.original_name,
        content_disposition_type="inline"
    )
