import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Boolean, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
import enum


class UserRole(str, enum.Enum):
    delegate = "delegate"
    volunteer = "volunteer"
    da_team = "da_team"
    admin = "admin"


class RegTier(str, enum.Enum):
    early_bird = "early_bird"
    round1 = "round1"
    round2 = "round2"


class PaymentStatus(str, enum.Enum):
    pending = "pending"
    submitted = "submitted"   # UTR entered, awaiting confirmation
    confirmed = "confirmed"
    rejected = "rejected"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    phone: Mapped[str | None] = mapped_column(String, nullable=True)
    college: Mapped[str | None] = mapped_column(String, nullable=True)
    google_id: Mapped[str | None] = mapped_column(String, unique=True, nullable=True)
    profile_picture: Mapped[str | None] = mapped_column(String, nullable=True)

    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole), default=UserRole.delegate)
    reg_tier: Mapped[RegTier | None] = mapped_column(SAEnum(RegTier), nullable=True)

    amount_due: Mapped[float] = mapped_column(default=0.0)
    payment_status: Mapped[PaymentStatus] = mapped_column(
        SAEnum(PaymentStatus), default=PaymentStatus.pending
    )
    payment_utr: Mapped[str | None] = mapped_column(String, nullable=True)
    payment_confirmed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    transportation_opted: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    preferences: Mapped["Preference"] = relationship("Preference", back_populates="user", uselist=False)
    assignment = relationship("Assignment", back_populates="user", uselist=False, foreign_keys="Assignment.user_id")
    qr_token: Mapped["QRToken"] = relationship("QRToken", back_populates="user", uselist=False)
    checkins: Mapped[list["Checkin"]] = relationship("Checkin", back_populates="user", foreign_keys="Checkin.user_id")
    messages: Mapped[list["Message"]] = relationship("Message", back_populates="sender", foreign_keys="Message.sender_id")
    feedback: Mapped[list["Feedback"]] = relationship("Feedback", back_populates="user")
