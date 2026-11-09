"""
Authentication router providing endpoints for user registration, credential verification,
login token issuance, and current authenticated profile retrieval.
Mounted in app/main.py under the /auth URL prefix.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models import User
from app.schemas import (
    UserRegister,
    UserLogin,
    UserOut,
    TokenResponse,
)
from app.security import (
    hash_password,
    verify_password,
    create_access_token,
)
from app.deps import get_current_user

# Initialize router with standard URL prefix and Swagger documentation grouping
router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """
    Public student self-registration endpoint.
    Validates submitted credentials, verifies uniqueness constraints against PostgreSQL,
    encrypts the account password, and forces the assigned role to 'student'.

    Args:
        user_data (UserRegister): Validated incoming registration payload.
        db (Session): Database session dependency.

    Returns:
        UserOut: Newly created user record without sensitive password hashes.

    Raises:
        HTTPException 400: If the email address or registration number is already in use.
    """
    normalized_email = user_data.email.lower().strip()
    normalized_reg_no = user_data.reg_no.upper().strip()

    # Verify uniqueness of email address
    if db.query(User).filter(User.email == normalized_email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address is already registered in the system"
        )

    # Verify uniqueness of student registration number
    if db.query(User).filter(User.reg_no == normalized_reg_no).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student registration number is already registered in the system"
        )

    # Construct and persist new student record
    new_user = User(
        reg_no=normalized_reg_no,
        full_name=user_data.full_name.strip(),
        email=normalized_email,
        password_hash=hash_password(user_data.password),
        role="student",  # Server-side safety: public registration is locked to student role
        student_type=user_data.student_type,
        phone=user_data.phone.strip() if user_data.phone else None
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post("/login", response_model=TokenResponse)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    """
    User login endpoint supporting both email and student registration numbers.
    Validates credentials and issues an authenticated JWT token upon success.

    Args:
        login_data (UserLogin): Submitted identifier and password.
        db (Session): Database session dependency.

    Returns:
        TokenResponse: Access bearer token and user profile summary.

    Raises:
        HTTPException 401: If credentials are invalid.
    """
    ident = login_data.identifier.strip()

    # Query matching against either email or uppercase student registration number
    user = db.query(User).filter(
        or_(
            User.email == ident.lower(),
            User.reg_no == ident.upper()
        )
    ).first()

    # Verify user existence and password hash match
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email/reg no or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Issue signed JSON Web Token encoding the user ID and role
    token = create_access_token(user_id=user.id, role=user.role)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Protected endpoint retrieving the profile of the currently authenticated user.
    Requires a valid 'Authorization: Bearer <token>' header.

    Args:
        current_user (User): Injected by get_current_user dependency after validating the token.

    Returns:
        UserOut: Authenticated user details.
    """
    return current_user

