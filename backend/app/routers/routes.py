"""
Transport routes router providing endpoints for viewing university bus routes,
checking real-time seat availability, editing routes, student rosters, and administrative analytics.
Mounted in app/main.py under the /routes and /admin URL prefixes.
"""

from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.database import get_db
from app.models import Route, Registration, User, Fee, RouteChangeRequest, utcnow
from app.schemas import (
    RouteCreate,
    RouteOut,
    RouteUpdate,
    RouteStudentItemOut,
    AdminStatsOut,
    RouteChangeRequestCreate,
    RouteChangeRequestReview,
    RouteChangeRequestOut,
)
from app.deps import require_role

# Main routes router
router = APIRouter(prefix="/routes", tags=["Transport Routes"])

# Dedicated admin router for /admin/stats
admin_router = APIRouter(prefix="/admin", tags=["Transport Admin - Analytics"])


# ==============================================================================
# 1. List Routes (with Occupancy & Optional Inactive Inclusion)
# ==============================================================================

@router.get("", response_model=List[RouteOut])
def get_all_routes(
    include_inactive: bool = Query(False, description="Set True to include inactive routes (for Admin portal)"),
    db: Session = Depends(get_db)
):
    """
    Public endpoint retrieving university transport routes.
    Calculates real-time seat occupancy (seats_taken) for each route.
    Accessible without authentication so students can browse available seats.
    Admin can pass ?include_inactive=true to manage all routes.
    """
    query = db.query(Route)
    if not include_inactive:
        query = query.filter(Route.is_active == True)

    routes = query.order_by(Route.id).all()

    result = []
    for r in routes:
        # Dynamically compute confirmed registrations for this specific route
        confirmed_count = db.query(Registration).filter(Registration.route_id == r.id).count()

        result.append(
            RouteOut(
                id=r.id,
                name=r.name,
                pickup_points=r.pickup_points,
                fee_amount=r.fee_amount,
                seats_total=r.seats_total,
                is_active=r.is_active,
                seats_taken=confirmed_count
            )
        )

    return result


# ==============================================================================
# 2. Get Single Route Details
# ==============================================================================

@router.get("/{route_id}", response_model=RouteOut)
def get_route_by_id(route_id: int, db: Session = Depends(get_db)):
    """
    Retrieves detailed specifications for a single transport route by ID.
    Calculates real-time seat occupancy.
    """
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transport route not found"
        )

    confirmed_count = db.query(Registration).filter(Registration.route_id == route.id).count()
    return RouteOut(
        id=route.id,
        name=route.name,
        pickup_points=route.pickup_points,
        fee_amount=route.fee_amount,
        seats_total=route.seats_total,
        is_active=route.is_active,
        seats_taken=confirmed_count
    )


# ==============================================================================
# 3. Create Route (Admin Only)
# ==============================================================================

@router.post("", response_model=RouteOut, status_code=status.HTTP_201_CREATED)
def create_route(
    route_data: RouteCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_role("admin"))
):
    """
    Administrative endpoint to establish a new university transport route.
    Restricted to users holding the 'admin' role.
    """
    new_route = Route(
        name=route_data.name.strip(),
        pickup_points=route_data.pickup_points.strip() if route_data.pickup_points else None,
        fee_amount=route_data.fee_amount,
        seats_total=route_data.seats_total,
        is_active=route_data.is_active
    )

    db.add(new_route)
    db.commit()
    db.refresh(new_route)

    return RouteOut(
        id=new_route.id,
        name=new_route.name,
        pickup_points=new_route.pickup_points,
        fee_amount=new_route.fee_amount,
        seats_total=new_route.seats_total,
        is_active=new_route.is_active,
        seats_taken=0
    )


# ==============================================================================
# 4. Update Route (Admin Only) - Enforces Capacity Constraint
# ==============================================================================

@router.put("/{route_id}", response_model=RouteOut)
def update_route(
    route_id: int,
    route_data: RouteUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_role("admin"))
):
    """
    Administrative endpoint to edit route name, pickup points, fee, total seats, and active flag.
    Restricted to 'admin' role.
    Enforces seat capacity constraint: Refuses a seat count lower than seats already taken.
    """
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transport route not found"
        )

    seats_taken = db.query(Registration).filter(Registration.route_id == route.id).count()

    # Rule: Refuse a seat count lower than seats already taken
    if route_data.seats_total is not None and route_data.seats_total < seats_taken:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot reduce total seats to {route_data.seats_total} because {seats_taken} students are already registered on this route"
        )

    if route_data.name is not None:
        route.name = route_data.name.strip()
    if route_data.pickup_points is not None:
        route.pickup_points = route_data.pickup_points.strip() if route_data.pickup_points else None
    if route_data.fee_amount is not None:
        route.fee_amount = route_data.fee_amount
    if route_data.seats_total is not None:
        route.seats_total = route_data.seats_total
    if route_data.is_active is not None:
        route.is_active = route_data.is_active

    db.commit()
    db.refresh(route)

    return RouteOut(
        id=route.id,
        name=route.name,
        pickup_points=route.pickup_points,
        fee_amount=route.fee_amount,
        seats_total=route.seats_total,
        is_active=route.is_active,
        seats_taken=seats_taken
    )


# ==============================================================================
# 5. Route Student Roster with Fee Status (Admin Only)
# ==============================================================================

@router.get("/{route_id}/students", response_model=List[RouteStudentItemOut])
def get_route_students(
    route_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_role("admin"))
):
    """
    Administrative endpoint retrieving all students registered on a specific transport route.
    Returns student profile, trip type (one-way / two-way), registration date, and linked fee verification status.
    Restricted to 'admin' role.
    """
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transport route not found"
        )

    records = (
        db.query(Registration, User, Fee)
        .join(User, Registration.user_id == User.id)
        .outerjoin(Fee, Fee.registration_id == Registration.id)
        .filter(Registration.route_id == route_id)
        .order_by(desc(Registration.created_at))
        .all()
    )

    result = []
    for reg, user, fee in records:
        result.append(
            RouteStudentItemOut(
                registration_id=reg.id,
                user_id=user.id,
                student_name=user.full_name,
                student_reg_no=user.reg_no,
                student_type=user.student_type,
                trip_type=reg.trip_type,
                semester=reg.semester,
                registered_at=reg.created_at,
                fee_status=fee.status if fee else "unpaid",
                fee_amount=fee.amount if fee else 0.0
            )
        )

    return result


# ==============================================================================
# 6. Admin Transport Fleet Analytics (Admin Only)
# ==============================================================================

@admin_router.get("/stats", response_model=AdminStatsOut)
def get_admin_fleet_stats(
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_role("admin"))
):
    """
    Administrative fleet metrics endpoint.
    Calculates total routes, active routes, total seats across fleet,
    confirmed registrations, unique registered students, and fleet occupancy percentage.
    Restricted to 'admin' role.
    """
    total_routes = db.query(Route).count()
    active_routes = db.query(Route).filter(Route.is_active == True).count()
    total_seats = db.query(func.sum(Route.seats_total)).filter(Route.is_active == True).scalar() or 0
    seats_taken = db.query(Registration).count()
    registered_students = db.query(func.count(func.distinct(Registration.user_id))).scalar() or 0
    occupancy_pct = round((seats_taken / total_seats * 100), 1) if total_seats > 0 else 0.0

    return AdminStatsOut(
        total_routes=total_routes,
        active_routes=active_routes,
        total_seats=int(total_seats),
        seats_taken=seats_taken,
        registered_students=registered_students,
        occupancy_percentage=occupancy_pct
    )


# ==============================================================================
# 7. Admin Transfer / Switch Student Route (Admin Only)
# ==============================================================================

class RouteSwitchIn(BaseModel):
    new_route_id: int


@admin_router.put("/registrations/{student_id}/switch-route")
def switch_student_route(
    student_id: int,
    payload: RouteSwitchIn,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_role("admin"))
):
    """
    Administrative route transfer endpoint.
    Transfers an enrolled student to a new route upon admin authorization.
    Verifies that the target route exists, is active, and has available seats.
    Dispatches a notification to the student informing them of the approved route change.
    """
    reg = db.query(Registration).filter(Registration.user_id == student_id).order_by(desc(Registration.created_at)).first()
    if not reg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student is not currently registered for any bus route."
        )

    target_route = db.query(Route).filter(Route.id == payload.new_route_id, Route.is_active == True).first()
    if not target_route:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target transport route does not exist or is inactive."
        )

    if reg.route_id == target_route.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student is already assigned to this route."
        )

    target_seats_taken = db.query(Registration).filter(Registration.route_id == target_route.id).count()
    if target_seats_taken >= target_route.seats_total:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Target route '{target_route.name}' is full ({target_route.seats_total}/{target_route.seats_total} seats taken)."
        )

    old_route_name = reg.route.name if reg.route else "previous route"

    reg.route_id = target_route.id

    # If linked fee exists, update route association
    if reg.fee:
        reg.fee.route_id = target_route.id

    db.commit()
    db.refresh(reg)

    from app.routers.notifications import create_notification
    create_notification(
        db=db,
        user_id=student_id,
        title="Bus Route Switched",
        message=f"Your transport route has been successfully transferred from '{old_route_name}' to '{target_route.name}' by Transport Administration."
    )

    return {
        "success": True,
        "message": f"Student successfully transferred from '{old_route_name}' to '{target_route.name}'.",
        "student_id": student_id,
        "new_route_id": target_route.id,
        "new_route_name": target_route.name
    }


# ==============================================================================
# 8. Student Route Change / Transfer Requests
# ==============================================================================

@router.post("/change-requests", status_code=status.HTTP_201_CREATED)
def submit_route_change_request(
    payload: RouteChangeRequestCreate,
    db: Session = Depends(get_db),
    current_student: User = Depends(require_role("student"))
):
    """
    Allows an enrolled student to request a route change/transfer.
    Validates:
      1. Student is registered for an existing route.
      2. Target route exists, is active, and is different from current route.
      3. Student does not already have an active pending request.
      4. Target route has available seating capacity.
    Notifies Transport Administration of the incoming request.
    """
    reg = db.query(Registration).filter(Registration.user_id == current_student.id).order_by(desc(Registration.created_at)).first()
    if not reg:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are not currently enrolled in any bus route. Please enroll in a route first."
        )

    target_route = db.query(Route).filter(Route.id == payload.requested_route_id, Route.is_active == True).first()
    if not target_route:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target transport route does not exist or is inactive."
        )

    if reg.route_id == target_route.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"You are already assigned to '{target_route.name}'."
        )

    # Check for active pending request
    pending = db.query(RouteChangeRequest).filter(
        RouteChangeRequest.user_id == current_student.id,
        RouteChangeRequest.status == "pending"
    ).first()
    if pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have an active route transfer request under review by the Transport Administrator."
        )

    # Check target capacity
    seats_taken = db.query(Registration).filter(Registration.route_id == target_route.id).count()
    if seats_taken >= target_route.seats_total:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Target route '{target_route.name}' has reached its maximum capacity ({target_route.seats_total} seats)."
        )

    new_request = RouteChangeRequest(
        user_id=current_student.id,
        current_route_id=reg.route_id,
        requested_route_id=target_route.id,
        reason=payload.reason.strip(),
        status="pending"
    )
    db.add(new_request)
    db.commit()
    db.refresh(new_request)

    # Alert Transport Administrators
    admins = db.query(User).filter(User.role == "admin").all()
    from app.routers.notifications import create_notification
    for adm in admins:
        create_notification(
            db=db,
            user_id=adm.id,
            title="Route Transfer Request",
            message=f"Student {current_student.full_name} ({current_student.reg_no or 'N/A'}) requested to switch from '{reg.route.name}' to '{target_route.name}'."
        )

    return {
        "success": True,
        "message": f"Transfer request to '{target_route.name}' submitted successfully.",
        "request_id": new_request.id
    }


@router.get("/change-requests/my")
def get_my_route_change_requests(
    db: Session = Depends(get_db),
    current_student: User = Depends(require_role("student"))
):
    """
    Returns chronological list of all route change requests submitted by the current student.
    """
    requests = (
        db.query(RouteChangeRequest)
        .filter(RouteChangeRequest.user_id == current_student.id)
        .order_by(desc(RouteChangeRequest.created_at))
        .all()
    )
    res = []
    for r in requests:
        res.append({
            "id": r.id,
            "user_id": r.user_id,
            "current_route_id": r.current_route_id,
            "current_route_name": r.current_route.name if r.current_route else "Unknown",
            "requested_route_id": r.requested_route_id,
            "requested_route_name": r.requested_route.name if r.requested_route else "Unknown",
            "reason": r.reason,
            "status": r.status,
            "admin_notes": r.admin_notes,
            "created_at": r.created_at,
            "reviewed_at": r.reviewed_at,
            "reviewer_name": r.reviewer.full_name if r.reviewer else None
        })
    return res


@router.delete("/change-requests/{request_id}")
def cancel_route_change_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_student: User = Depends(require_role("student"))
):
    """
    Allows a student to cancel their own pending route change request.
    """
    req = db.query(RouteChangeRequest).filter(
        RouteChangeRequest.id == request_id,
        RouteChangeRequest.user_id == current_student.id
    ).first()

    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found.")
    if req.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel a request that has already been {req.status}."
        )

    req.status = "cancelled"
    db.commit()
    return {"success": True, "message": "Route change request has been cancelled."}


# ==============================================================================
# 9. Transport Admin Route Change Review & Directory
# ==============================================================================

@admin_router.get("/route-change-requests")
def get_admin_route_change_requests(
    status_filter: Optional[str] = Query(None, description="'pending', 'approved', 'rejected', or 'all'"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_role("admin"))
):
    """
    Lists all route change requests across the student body for administrative review.
    """
    query = db.query(RouteChangeRequest)
    if status_filter and status_filter != "all":
        query = query.filter(RouteChangeRequest.status == status_filter)

    requests = query.order_by(desc(RouteChangeRequest.created_at)).all()

    res = []
    for r in requests:
        res.append({
            "id": r.id,
            "user_id": r.user_id,
            "student_name": r.user.full_name if r.user else "Unknown",
            "student_reg_no": r.user.reg_no if r.user else None,
            "student_email": r.user.email if r.user else "Unknown",
            "student_type": r.user.student_type if r.user else None,
            "current_route_id": r.current_route_id,
            "current_route_name": r.current_route.name if r.current_route else "Unknown",
            "requested_route_id": r.requested_route_id,
            "requested_route_name": r.requested_route.name if r.requested_route else "Unknown",
            "reason": r.reason,
            "status": r.status,
            "admin_notes": r.admin_notes,
            "created_at": r.created_at,
            "reviewed_at": r.reviewed_at,
            "reviewer_name": r.reviewer.full_name if r.reviewer else None
        })
    return res


@admin_router.put("/route-change-requests/{request_id}/review")
def review_route_change_request(
    request_id: int,
    payload: RouteChangeRequestReview,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_role("admin"))
):
    """
    Administrative review of a student's route transfer request.
    If approved:
      1. Verifies target route is active and has available capacity.
      2. Reassigns student's Registration.route_id and linked Fee.route_id.
      3. Dispatches approval notification to the student.
    If rejected:
      1. Records rejection reason in admin_notes.
      2. Dispatches rejection notification to the student.
    """
    req = db.query(RouteChangeRequest).filter(RouteChangeRequest.id == request_id).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Route change request not found."
        )

    if req.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"This request has already been processed as '{req.status}'."
        )

    from app.routers.notifications import create_notification

    if payload.action == "approve":
        target_route = db.query(Route).filter(Route.id == req.requested_route_id, Route.is_active == True).first()
        if not target_route:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Target route is no longer active."
            )

        target_seats_taken = db.query(Registration).filter(Registration.route_id == target_route.id).count()
        if target_seats_taken >= target_route.seats_total:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot approve: '{target_route.name}' has reached its maximum capacity ({target_route.seats_total}/{target_route.seats_total} seats)."
            )

        reg = db.query(Registration).filter(Registration.user_id == req.user_id).order_by(desc(Registration.created_at)).first()
        if not reg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Student no longer has an active bus registration."
            )

        old_route_name = reg.route.name if reg.route else "previous route"
        reg.route_id = target_route.id
        if reg.fee:
            reg.fee.route_id = target_route.id

        req.status = "approved"
        req.reviewed_at = utcnow()
        req.reviewed_by = current_admin.id
        req.admin_notes = payload.admin_notes

        db.commit()
        db.refresh(req)

        create_notification(
            db=db,
            user_id=req.user_id,
            title="Route Transfer Approved",
            message=f"Your request to switch from '{old_route_name}' to '{target_route.name}' has been APPROVED by Transport Administration."
        )

        return {
            "success": True,
            "message": f"Transfer approved: student assigned to '{target_route.name}'.",
            "status": "approved"
        }

    elif payload.action == "reject":
        req.status = "rejected"
        req.reviewed_at = utcnow()
        req.reviewed_by = current_admin.id
        req.admin_notes = payload.admin_notes

        db.commit()
        db.refresh(req)

        target_name = req.requested_route.name if req.requested_route else "requested route"
        notes_str = f" Reason: {payload.admin_notes}" if payload.admin_notes else ""
        create_notification(
            db=db,
            user_id=req.user_id,
            title="Route Transfer Declined",
            message=f"Your request to switch to '{target_name}' was declined by Transport Administration.{notes_str}"
        )

        return {
            "success": True,
            "message": "Route change request rejected.",
            "status": "rejected"
        }
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Action must be either 'approve' or 'reject'."
        )

