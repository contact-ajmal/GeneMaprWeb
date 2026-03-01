from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, model_validator


class UserCreate(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=200)
    email: str = Field(..., max_length=320)
    password: str = Field(..., min_length=8, max_length=128)

    @model_validator(mode="after")
    def validate_email_format(self):
        """Basic email format validation without requiring email-validator."""
        if "@" not in self.email or "." not in self.email.split("@")[-1]:
            raise ValueError("Invalid email format")
        self.email = self.email.lower().strip()
        return self


class UserLogin(BaseModel):
    email: str = Field(..., max_length=320)
    password: str = Field(..., min_length=1)

    @model_validator(mode="after")
    def normalize_email(self):
        self.email = self.email.lower().strip()
        return self


class UserUpdate(BaseModel):
    full_name: str | None = Field(None, min_length=1, max_length=200)
    password: str | None = Field(None, min_length=8, max_length=128)


class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime
    last_login: datetime | None = None

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
