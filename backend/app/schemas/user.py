from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from app.models.user import UserRole, RegTier, PaymentStatus


class UserBase(BaseModel):
    email: EmailStr
    name: str
    phone: Optional[str] = None
    college: Optional[str] = None
    transportation_opted: bool = False


class UserUpdate(BaseModel):
    phone: Optional[str] = None
    college: Optional[str] = None
    transportation_opted: Optional[bool] = None


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    phone: Optional[str]
    college: Optional[str]
    profile_picture: Optional[str]
    role: UserRole
    reg_tier: Optional[RegTier]
    amount_due: float
    payment_status: PaymentStatus
    payment_utr: Optional[str]
    transportation_opted: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserAdminOut(UserOut):
    google_id: Optional[str]
    payment_confirmed_at: Optional[datetime]
    is_active: bool


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class PaymentSubmit(BaseModel):
    utr: str


class RoleUpdate(BaseModel):
    role: UserRole