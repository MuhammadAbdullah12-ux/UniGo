"""
FastAPI dependencies for request-level authentication and role-based authorization (RBAC).
Provides dependencies injected into route handlers to validate JWT bearer tokens,
retrieve authenticated user records from PostgreSQL, and enforce role permissions.
"""

from typing import Optional
from fastapi import Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jwt.exceptions import PyJWTError

from app.database import get_db
from app.models import User
from app.security import decode_token

# HTTPBearer extracts the 'Authorization: Bearer <token>' header from incoming requests.
# auto_error=False enables fallback to the '?token=' query parameter for direct browser PDF streaming.
security_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    token: Optional[str] = Query(None, alias="token"),
    db: Session = Depends(get_db)
) -> User:
    """
    Validates the bearer token on incoming requests and retrieves the authenticated User.
    Accepts token via standard Authorization header or '?token=' query parameter (for direct PDF viewing).
    Injected into protected endpoints using: current_user: User = Depends(get_current_user)

    Args:
        credentials: Bearer token extracted from HTTP Authorization header.
        token: Optional JWT token passed as a URL query parameter for browser tabs.
        db: Active SQLAlchemy database session for the request.

    Returns:
        User: The authenticated SQLAlchemy model instance retrieved from PostgreSQL.

    Raises:
        HTTPException 401: If the token is missing, expired, tampered with, or user no longer exists.
    """
    raw_token = None
    if credentials and credentials.credentials:
        raw_token = credentials.credentials
    elif token:
        raw_token = token

    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or token expired",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # Decode and verify token signature and expiration
        payload = decode_token(raw_token)
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
        user_id = int(user_id_str)
    except (PyJWTError, ValueError):
        raise credentials_exception

    # Query PostgreSQL to ensure the user still exists in the database
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Authenticated user record was not found"
        )

    return user


def require_role(*allowed_roles: str):
    """
    Dependency factory enforcing Role-Based Access Control (RBAC).
    Usage example: current_user: User = Depends(require_role("accounts", "admin"))

    Args:
        *allowed_roles (str): Variable list of permitted role strings (e.g. 'student', 'accounts', 'admin').

    Returns:
        Callable dependency that inspects the current user's role and returns the User if authorized.

    Raises:
        HTTPException 403: If the authenticated user's role is not within allowed_roles.
    """
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Operation requires one of the following roles: {list(allowed_roles)}"
            )
        return current_user

    return role_checker

