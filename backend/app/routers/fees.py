"""
Fees and student route registration router for the UniGo Transport Management System.
Handles route enrollment, context-aware pricing policies (Day Scholar vs Hostelite),
automated fee voucher generation, and student voucher status retrieval.
Mounted in app/main.py under the /fees and /registrations URL paths.
"""

from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import User, Route, Registration, Fee, FeeReceipt
from app.schemas import RegistrationCreate, FeeOut
from app.deps import require_role

# Router for registration and fee voucher operations
router = APIRouter(tags=["Student Fees & Registrations"])

# Standard payment window for issued fee vouchers
PAYMENT_DUE_DAYS = 14

# Hostelite weekend transport fare constants
HOSTELITE_ONE_WAY_FARE = 500.0
HOSTELITE_TWO_WAY_FARE = 1000.0


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

    Args:
        reg_data (RegistrationCreate): Route ID, trip type ('one_way' or 'two_way'), and semester.
        db (Session): Database session dependency.
        current_student (User): Injected authenticated student model.

    Returns:
        FeeOut: Newly generated fee record with status 'unpaid'.

    Raises:
        HTTPException 400: If business constraints (capacity, duplicate semester, invalid trip type) fail.
        HTTPException 404: If the requested route is invalid or inactive.
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
        # Day scholars are daily commuters; one-way passes are not permitted
        if trip_type == "one_way":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One-way commute is not available for Day Scholars. Full semester two-way commute is required."
            )
        calculated_amount = float(route.fee_amount)  # Standard Rs. 36,000
    else:
        # Hostelites use campus buses for weekend commute home
        if trip_type == "one_way":
            calculated_amount = HOSTELITE_ONE_WAY_FARE   # Rs. 500
        else:
            calculated_amount = HOSTELITE_TWO_WAY_FARE   # Rs. 1,000

    # 5. Persist Registration Record (flush to acquire generated primary key)
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

    Args:
        db (Session): Database session dependency.
        current_student (User): Injected authenticated student model.

    Returns:
        FeeOut: Student voucher details and payment status.

    Raises:
        HTTPException 404: If the student has not yet enrolled in a transport route.
    """
    # Fetch student's most recent route registration
    registration = db.query(Registration).filter(
        Registration.user_id == current_student.id
    ).order_by(desc(Registration.created_at)).first()

    if not registration or not registration.fee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active transport registration or fee voucher found for your account"
        )

    fee = registration.fee

    # Retrieve most recent rejection remark if applicable
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

