"""
In-app notifications router and dispatch engine for UniGo.
Provides endpoints for fetching user notifications, tracking unread counts,
and updating notification read status.
Also exposes the `create_notification` helper used across the application
to dispatch automated event-driven alerts.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import Notification, User
from app.schemas import NotificationOut, NotificationListOut
from app.deps import get_current_user

# Router instance with standard prefix and OpenAPI tag
router = APIRouter(prefix="/notifications", tags=["Notifications"])


# ==============================================================================
# Notification Dispatch Helper Function
# ==============================================================================

def create_notification(db: Session, user_id: int, title: str, message: str) -> Notification:
    """
    Core utility to insert an in-app notification record into PostgreSQL.
    Invoked across domain routers (fees.py, accounts.py) to dispatch event alerts:
      - Challan upload -> Alerts Accounts Officers
      - Challan approval -> Alerts Student
      - Challan rejection -> Alerts Student with rejection reason
    """
    notif = Notification(
        user_id=user_id,
        title=title.strip(),
        message=message.strip(),
        is_read=False
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif


# ==============================================================================
# 1. Fetch User Notifications & Unread Count
# ==============================================================================

@router.get("", response_model=NotificationListOut)
def get_my_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves the chronological notification inbox for the authenticated user.
    Returns the total unread counter alongside notification cards ordered newest first.
    Used by: Student, Accounts Officer, and Admin dashboards (notification bell component).
    """
    notifs = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(desc(Notification.created_at), desc(Notification.id)).all()

    unread_count = sum(1 for n in notifs if not n.is_read)

    return NotificationListOut(
        unread_count=unread_count,
        notifications=[NotificationOut.model_validate(n) for n in notifs]
    )


# ==============================================================================
# 2. Mark Single Notification as Read
# ==============================================================================

@router.post("/{notification_id}/read", response_model=NotificationOut)
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Marks an individual notification as read.
    Enforces ownership check: users can only mark their own notifications.
    """
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()

    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification record not found"
        )

    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return NotificationOut.model_validate(notif)


# ==============================================================================
# 3. Mark All Notifications as Read
# ==============================================================================

@router.post("/read-all")
def mark_all_notifications_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Batch updates all unread notifications belonging to the logged-in user to read.
    Used by: 'Mark all as read' button in the notification bell dropdown.
    """
    updated_count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({Notification.is_read: True})

    db.commit()

    return {
        "success": True,
        "message": f"All notifications marked as read ({updated_count} updated)."
    }

