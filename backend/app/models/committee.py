import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Committee(Base):
    __tablename__ = "committees"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String, nullable=False)
    abbreviation: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    topics: Mapped[str | None] = mapped_column(Text, nullable=True)  # comma-separated
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    portfolios: Mapped[list["Portfolio"]] = relationship("Portfolio", back_populates="committee")
    alerts: Mapped[list["Alert"]] = relationship("Alert", back_populates="committee")


class Portfolio(Base):
    __tablename__ = "portfolios"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    committee_id: Mapped[str] = mapped_column(String, ForeignKey("committees.id"), nullable=False)
    country_name: Mapped[str] = mapped_column(String, nullable=False)
    flag_url: Mapped[str | None] = mapped_column(String, nullable=True)
    is_assigned: Mapped[bool] = mapped_column(Boolean, default=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    committee: Mapped["Committee"] = relationship("Committee", back_populates="portfolios")
    assignment: Mapped["Assignment"] = relationship("Assignment", back_populates="portfolio", uselist=False)
    pref1_users: Mapped[list["Preference"]] = relationship("Preference", foreign_keys="Preference.pref1_id", back_populates="pref1")
    pref2_users: Mapped[list["Preference"]] = relationship("Preference", foreign_keys="Preference.pref2_id", back_populates="pref2")
    pref3_users: Mapped[list["Preference"]] = relationship("Preference", foreign_keys="Preference.pref3_id", back_populates="pref3")