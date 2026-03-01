from datetime import datetime, timedelta, timezone
from uuid import UUID

import bcrypt
from jose import jwt, JWTError

from app.core.config import settings

# JWT settings
ALGORITHM = "HS256"


def hash_password(plain_password: str) -> str:
    """Hash a plain-text password using bcrypt."""
    pwd_bytes = plain_password.encode("utf-8")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against a bcrypt hash."""
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )


def create_access_token(
    user_id: UUID,
    role: str,
    expires_delta: timedelta | None = None,
) -> str:
    """Create a JWT access token."""
    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.access_token_expire_minutes)

    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "role": role,
        "iat": now,
        "exp": now + expires_delta,
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    """
    Decode and validate a JWT token.
    Returns the payload dict or raises JWTError.
    """
    try:
        payload = jwt.decode(
            token, settings.jwt_secret_key, algorithms=[ALGORITHM]
        )
        return payload
    except JWTError:
        raise
