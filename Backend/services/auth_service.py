# SCM-INSIGHTS Auth Service
import uuid
import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Tuple, Dict, Any


class AuthService:
    SESSION_DURATION_HOURS = 1
    RESET_TOKEN_DURATION_HOURS = 1
    ACTIVATION_TOKEN_DURATION_HOURS = 24
    BCRYPT_ROUNDS = 12

    @staticmethod
    def hash_password(plain_password: str) -> str:
        if not plain_password:
            raise ValueError("Password cannot be empty")
        salt = bcrypt.gensalt(rounds=AuthService.BCRYPT_ROUNDS)
        hashed = bcrypt.hashpw(plain_password.encode("utf-8"), salt)
        return hashed.decode("utf-8")

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        if not plain_password or not hashed_password:
            return False
        try:
            return bcrypt.checkpw(
                plain_password.encode("utf-8"),
                hashed_password.encode("utf-8"),
            )
        except (ValueError, TypeError):
            return plain_password == hashed_password

    @staticmethod
    def validate_password_strength(password: str) -> Dict[str, Any]:
        errors = []
        if len(password) < 8:
            errors.append("Password must be at least 8 characters long")
        if not any(c.isupper() for c in password):
            errors.append("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in password):
            errors.append("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in password):
            errors.append("Password must contain at least one number")
        return {"valid": len(errors) == 0, "errors": errors}
