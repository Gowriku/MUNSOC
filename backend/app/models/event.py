import uuid
import enum
from datetime import datetime
from sqlalchemy import String, DateTime, Boolean, ForeignKey, Text, Float, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Preference(Base):
    __tablename__ = "preferences"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), unique=True, nullable=False)
    pref1_id: Mapped[str | None] = mapped_column(String, ForeignKey("portfolios.id"), nullable=True)
    pref2_id: Mapped[str | None] = mapped_column(String, ForeignKey("portfolios.id"), nullable=True)
    pref3_id: Mapped[str | None] = mapped_column(String, ForeignKey("portfolios.id"), nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="preferences")
    pref1: Mapped["Portfolio"] = relationship("Portfolio", foreign_keys=[pref1_id], back_populates="pref1_users")
    pref2: Mapped["Portfolio"] = relationship("Portfolio", foreign_keys=[pref2_id], back_populates="pref2_users")
    pref3: Mapped["Portfolio"] = relationship("Portfolio", foreign_keys=[pref3_id], back_populates="pref3_users")


class Assignment(Base):
    __tablename__ = "assignments"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), unique=True, nullable=False)
    portfolio_id: Mapped[str] = mapped_column(String, ForeignKey("portfolios.id"), nullable=False)
    assigned_by: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    assigned_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="assignment", foreign_keys=[user_id])
    portfolio: Mapped["Portfolio"] = relationship("Portfolio", back_populates="assignment")


class QRToken(Base):
    __tablename__ = "qr_tokens"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), unique=True, nullable=False)
    token: Mapped[str] = mapped_column(String, unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    is_valid: Mapped[bool] = mapped_column(Boolean, default=True)
    issued_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="qr_token")


class CheckinType(str, enum.Enum):
    event = "event"
    transport = "transport"


class Checkin(Base):
    __tablename__ = "checkins"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    type: Mapped[CheckinType] = mapped_column(SAEnum(CheckinType), nullable=False)
    scanned_by: Mapped[str | None] = mapped_column(String, ForeignKey("users.id"), nullable=True)
    scanned_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="checkins", foreign_keys=[user_id])


class AlertType(str, enum.Enum):
    session_start = "session_start"
    session_end = "session_end"
    break_start = "break_start"
    break_end = "break_end"
    custom = "custom"


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    committee_id: Mapped[str | None] = mapped_column(String, ForeignKey("committees.id"), nullable=True)
    type: Mapped[AlertType] = mapped_column(SAEnum(AlertType), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    sent_by: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    sent_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    committee: Mapped["Committee"] = relationship("Committee", back_populates="alerts")


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    sender_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    replied_by: Mapped[str | None] = mapped_column(String, ForeignKey("users.id"), nullable=True)
    reply_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    sender: Mapped["User"] = relationship("User", back_populates="messages", foreign_keys=[sender_id])


class FeedbackType(str, enum.Enum):
    review = "review"
    query = "query"
    complaint = "complaint"


class Feedback(Base):
    __tablename__ = "feedback"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str | None] = mapped_column(String, ForeignKey("users.id"), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[FeedbackType] = mapped_column(SAEnum(FeedbackType), nullable=False)
    is_anonymous: Mapped[bool] = mapped_column(Boolean, default=False)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="feedback")


class FeeTier(Base):
    __tablename__ = "fee_tiers"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String, nullable=False)       # "Early Bird"
    tier_key: Mapped[str] = mapped_column(String, unique=True)      # "early_bird"
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    # New: explicit window (start + deadline). start_date is nullable for backward compat.
    start_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    deadline: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
