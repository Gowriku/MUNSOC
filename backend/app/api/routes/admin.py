from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
import csv
import io
import uuid
from datetime import datetime
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr
from typing import Optional

from app.core.database import get_db
from app.core.auth import require_role
from app.models.user import User, PaymentStatus, UserRole
from app.models.event import Assignment, Checkin, Preference, Feedback, Message, QRToken, FeeTier
from app.models.committee import Portfolio, Committee

router = APIRouter(prefix="/admin", tags=["admin"])


# ── Dashboard ─────────────────────────────────────────────────────

@router.get("/dashboard")
async def dashboard_summary(
    _=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    delegates = await db.execute(select(func.count(User.id)).where(User.role == UserRole.delegate))
    total_delegates = delegates.scalar()

    paid = await db.execute(select(func.count(User.id)).where(User.role == UserRole.delegate, User.payment_status == PaymentStatus.confirmed))
    total_paid = paid.scalar()

    unpaid = await db.execute(select(func.count(User.id)).where(User.role == UserRole.delegate, User.payment_status == PaymentStatus.pending))
    total_unpaid = unpaid.scalar()

    submitted = await db.execute(select(func.count(User.id)).where(User.role == UserRole.delegate, User.payment_status == PaymentStatus.submitted))
    total_submitted = submitted.scalar()

    assigned = await db.execute(select(func.count(Assignment.id)))
    total_assigned = assigned.scalar()

    checked_in = await db.execute(select(func.count(Checkin.id)).where(Checkin.type == "event"))
    total_checked_in = checked_in.scalar()

    messages_unread = await db.execute(select(func.count(Message.id)).where(Message.is_read == False))
    unread_count = messages_unread.scalar()

    feedback_count = await db.execute(select(func.count(Feedback.id)))
    total_feedback = feedback_count.scalar()

    volunteers = await db.execute(select(func.count(User.id)).where(User.role == UserRole.volunteer))
    da_team = await db.execute(select(func.count(User.id)).where(User.role == UserRole.da_team))

    return {
        "delegates": {"total": total_delegates, "paid": total_paid, "unpaid": total_unpaid, "payment_submitted": total_submitted},
        "assignments": {"assigned": total_assigned, "unassigned": total_delegates - total_assigned},
        "attendance": {"checked_in": total_checked_in, "not_checked_in": total_delegates - total_checked_in},
        "messages": {"unread": unread_count},
        "feedback": {"total": total_feedback},
        "team": {"volunteers": volunteers.scalar(), "da_team": da_team.scalar()},
    }


# ── Fee Tiers ─────────────────────────────────────────────────────

class FeeTierUpdate(BaseModel):
    name: Optional[str] = None
    amount: Optional[float] = None
    start_date: Optional[datetime] = None
    deadline: Optional[datetime] = None
    is_active: Optional[bool] = None


@router.get("/fee-tiers")
async def list_fee_tiers(
    _=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(FeeTier).order_by(FeeTier.deadline))
    tiers = result.scalars().all()
    return [
        {
            "id": t.id,
            "name": t.name,
            "tier_key": t.tier_key,
            "amount": t.amount,
            "start_date": t.start_date,
            "deadline": t.deadline,
            "is_active": t.is_active,
        }
        for t in tiers
    ]


@router.patch("/fee-tiers/{tier_id}")
async def update_fee_tier(
    tier_id: str,
    data: FeeTierUpdate,
    _=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(FeeTier).where(FeeTier.id == tier_id))
    tier = result.scalar_one_or_none()
    if not tier:
        raise HTTPException(status_code=404, detail="Fee tier not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(tier, field, value)
    await db.commit()
    await db.refresh(tier)
    return {"id": tier.id, "name": tier.name, "tier_key": tier.tier_key, "amount": tier.amount,
            "start_date": tier.start_date, "deadline": tier.deadline, "is_active": tier.is_active}


# ── Add Staff (volunteer / da_team) ──────────────────────────────

class AddStaffUser(BaseModel):
    email: EmailStr
    name: str
    role: UserRole
    phone: Optional[str] = None


@router.post("/staff/add")
async def add_staff_user(
    data: AddStaffUser,
    _=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Create a new volunteer or DA team member account directly."""
    if data.role not in (UserRole.volunteer, UserRole.da_team, UserRole.admin):
        raise HTTPException(status_code=400, detail="Can only create volunteer, da_team, or admin accounts via this endpoint")

    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="A user with this email already exists")

    new_user = User(
        id=str(uuid.uuid4()),
        email=data.email,
        name=data.name,
        phone=data.phone,
        role=data.role,
        payment_status="pending",
        amount_due=0.0,
        is_active=True,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return {"id": new_user.id, "email": new_user.email, "name": new_user.name, "role": new_user.role}


# ── Export ────────────────────────────────────────────────────────

@router.get("/delegates/export")
async def export_delegates_csv(
    _=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User)
        .where(User.role == UserRole.delegate)
        .options(selectinload(User.assignment).selectinload(Assignment.portfolio).selectinload(Portfolio.committee))
        .order_by(User.created_at)
    )
    users = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Name", "Email", "Phone", "College", "Reg Tier", "Amount Due",
                     "Payment Status", "UTR", "Assigned Country", "Committee", "Transport Opted", "Checked In", "Registered At"])

    checkin_result = await db.execute(select(Checkin.user_id).where(Checkin.type == "event"))
    checked_in_ids = {row[0] for row in checkin_result.all()}

    for user in users:
        portfolio = user.assignment.portfolio if user.assignment else None
        committee = portfolio.committee if portfolio else None
        writer.writerow([
            user.name, user.email, user.phone or "", user.college or "",
            user.reg_tier or "", user.amount_due, user.payment_status.value,
            user.payment_utr or "",
            portfolio.country_name if portfolio else "Unassigned",
            committee.abbreviation if committee else "",
            "Yes" if user.transportation_opted else "No",
            "Yes" if user.id in checked_in_ids else "No",
            user.created_at.strftime("%Y-%m-%d %H:%M"),
        ])

    output.seek(0)
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=delegates.csv"})
