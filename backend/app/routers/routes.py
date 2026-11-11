"""
Transport routes router providing endpoints for viewing university bus routes,
checking real-time seat availability, editing routes, student rosters, and administrative analytics.
Mounted in app/main.py under the /routes and /admin URL prefixes.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.database import get_db
from app.models import Route, Registration, User, Fee
from app.schemas import (
    RouteCreate,
    RouteOut,
    RouteUpdate,
    RouteStudentItemOut,
    AdminStatsOut
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
