from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.event import AlertType, FeedbackType, CheckinType


class AlertCreate(BaseModel):
    committee_id: Optional[str] = None
    type: AlertType
    message: str


class AlertOut(BaseModel):
    id: str
    committee_id: Optional[str]
    type: AlertType
    message: str
    sent_by: str
    sent_at: datetime

    class Config:
        from_attributes = True


class MessageCreate(BaseModel):
    message: str


class MessageOut(BaseModel):
    id: str
    sender_id: str
    message: str
    is_read: bool
    reply_text: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class FeedbackCreate(BaseModel):
    content: str
    type: FeedbackType
    is_anonymous: bool = False
    is_public: bool = True


class FeedbackOut(BaseModel):
    id: str
    user_id: Optional[str]
    content: str
    type: FeedbackType
    is_anonymous: bool
    is_public: bool
    created_at: datetime

    class Config:
        from_attributes = True


class FeeTierCreate(BaseModel):
    name: str
    tier_key: str
    amount: float
    deadline: datetime


class FeeTierOut(BaseModel):
    id: str
    name: str
    tier_key: str
    amount: float
    deadline: datetime
    is_active: bool

    class Config:
        from_attributes = True


class QRTokenOut(BaseModel):
    id: str
    user_id: str
    token: str
    is_valid: bool
    issued_at: datetime

    class Config:
        from_attributes = True


class CheckinOut(BaseModel):
    id: str
    user_id: str
    type: CheckinType
    scanned_by: Optional[str]
    scanned_at: datetime

    class Config:
        from_attributes = True


class CheckinVerifyOut(BaseModel):
    success: bool
    user_name: str
    user_email: str
    assigned_country: Optional[str]
    committee: Optional[str]
    checkin_type: CheckinType
    message: str