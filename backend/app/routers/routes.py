"""
Transport routes router providing endpoints for viewing university bus routes,
checking real-time seat availability, and administrative route management.
Mounted in app/main.py under the /routes URL prefix.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Route, Registration, User
from app.schemas import RouteCreate, RouteOut, RouteUpdate
from app.deps import require_role

# Initialize router with standard URL prefix and Swagger documentation grouping
router = APIRouter(prefix="/routes", tags=["Transport Routes"])


@router.get("", response_model=List[RouteOut])
def get_all_routes(db: Session = Depends(get_db)):
    """
    Public endpoint retrieving all active university transport routes.
    Calculates real-time seat occupancy for each route.
    Accessible without authentication so prospective and current students can browse stops.

    Args:
        db (Session): Database session dependency.

    Returns:
        List[RouteOut]: Listing of transport routes with current seat occupancy counts.
    """
    routes = db.query(Route).filter(Route.is_active == True).all()

    result = []
    for r in routes:
        # Dynamically compute confirmed registrations for this specific route
        confirmed_count = db.query(Registration).filter(Registration.route_id == r.id).count()

        # Construct response schema combining route properties and live seat count
        route_data = RouteOut(
            id=r.id,
            name=r.name,
            pickup_points=r.pickup_points,
            fee_amount=r.fee_amount,
            seats_total=r.seats_total,
            is_active=r.is_active,
            seats_taken=confirmed_count
        )
        result.append(route_data)

    return result


@router.get("/{route_id}", response_model=RouteOut)
def get_route_by_id(route_id: int, db: Session = Depends(get_db)):
    """
    Retrieves detailed specifications for a single transport route by ID.

    Args:
        route_id (int): Primary key ID of the route.
        db (Session): Database session dependency.

    Returns:
        RouteOut: Route details including seat occupancy.

    Raises:
        HTTPException 404: If the route ID does not exist.
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


@router.post("", response_model=RouteOut, status_code=status.HTTP_201_CREATED)
def create_route(
    route_data: RouteCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_role("admin"))
):
    """
    Administrative endpoint to establish a new university transport route.
    Restricted to users holding the 'admin' role.

    Args:
        route_data (RouteCreate): Validated route parameters (name, stops, fee, capacity).
        db (Session): Database session dependency.
        current_admin (User): Injected by require_role('admin') authorization dependency.

    Returns:
        RouteOut: Newly created route record.
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

