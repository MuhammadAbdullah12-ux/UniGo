"""
Security utilities for password hashing, credential verification, and JWT lifecycle management.
This module provides cryptographic helpers used during user registration, authentication,
and route-level authorization checks across the UniGo API.
"""

import os
from datetime import datetime, timedelta, timezone
from typing import Optional
import bcrypt
import jwt
from dotenv import load_dotenv

# Load secret keys and token configurations from .env
load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))

# Validate that the secret key is defined before performing cryptographic operations
if not SECRET_KEY:
    raise ValueError("SECRET_KEY is not defined in backend/.env. Authentication cannot initialize.")


def hash_password(plain_password: str) -> str:
    """
    Hashes a raw password using the bcrypt algorithm with an automatically generated salt.
    Called during user registration (app/routers/auth.py) before writing to PostgreSQL.
    
    Args:
        plain_password (str): The plain-text password supplied by the user.

    Returns:
        str: A 60-character one-way hashed string safe for database storage.
    """
    # Bcrypt supports up to 72 bytes; slice defensively to prevent library overflow errors
    password_bytes = plain_password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plain-text password against a stored bcrypt hash.
    Called during user login (app/routers/auth.py) to authenticate credentials.

    Args:
        plain_password (str): The plain-text password submitted in the login form.
        hashed_password (str): The stored password hash retrieved from PostgreSQL.

    Returns:
        bool: True if the password matches the hash, False otherwise.
    """
    password_bytes = plain_password.encode("utf-8")[:72]
    hashed_bytes = hashed_password.encode("utf-8")
    return bcrypt.checkpw(password_bytes, hashed_bytes)


def create_access_token(user_id: int, role: str, expires_delta: Optional[timedelta] = None) -> str:
    """
    Generates a cryptographically signed JSON Web Token (JWT) representing the user session.
    Called upon successful login to return an authentication bearer token to the client.

    Args:
        user_id (int): The primary key ID of the authenticated user.
        role (str): The authorization role ('student', 'accounts', or 'admin').
        expires_delta (Optional[timedelta]): Custom token lifetime; defaults to ACCESS_TOKEN_EXPIRE_MINUTES.

    Returns:
        str: Encoded JWT string containing user identity and expiration claims.
    """
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    # Standard JWT payload claims:
    # - sub: Subject of the token (user ID)
    # - role: Access role for authorization enforcement
    # - exp: Expiration timestamp in UTC
    payload = {
        "sub": str(user_id),
        "role": role,
        "exp": expire
    }

    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    """
    Decodes and cryptographically validates an incoming JWT token.
    Called by authentication dependencies (app/deps.py) on every protected API endpoint.

    Args:
        token (str): Raw bearer token received in the HTTP Authorization header.

    Returns:
        dict: Decoded payload claims if the signature is valid and token is unexpired.

    Raises:
        jwt.PyJWTError: If the token signature is invalid, tampered with, or expired.
    """
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

