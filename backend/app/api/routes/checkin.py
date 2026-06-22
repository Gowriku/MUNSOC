from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.auth import get_current_user, require_role
from app.models.user import User, PaymentStatus
from app.models.event import QRToken, Checkin, CheckinType, Assignment
from app.models.committee import Portfolio
from app.schemas.event import CheckinOut, CheckinVerifyOut

router = APIRouter(prefix="/checkin", tags=["checkin"])


@router.get("/verify/{token}", response_model=CheckinVerifyOut)
async def verify_qr(
    token: str,
    checkin_type: CheckinType = CheckinType.event,
    volunteer: User = Depends(require_role("volunteer", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """Volunteer scans QR → verifies token → marks attendance."""
    # Find QR token
    result = await db.execute(
        select(QRToken)
        .where(QRToken.token == token, QRToken.is_valid == True)
        .options(selectinload(QRToken.user))
    )
    qr = result.scalar_one_or_none()
    if not qr:
        raise HTTPException(status_code=404, detail="Invalid or expired QR code")

    user = qr.user

    # Check payment confirmed
    if user.payment_status != PaymentStatus.confirmed:
        raise HTTPException(status_code=403, detail="Payment not confirmed for this delegate")

    # Check transport opt-in for transport checkin
    if checkin_type == CheckinType.transport and not user.transportation_opted:
        raise HTTPException(status_code=400, detail="Delegate did not opt for transportation")

    # Check if already checked in for this type
    existing = await db.execute(
        select(Checkin).where(
            Checkin.user_id == user.id,
            Checkin.type == checkin_type,
        )
    )
    if existing.scalar_one_or_none():
        return CheckinVerifyOut(
            success=False,
            user_name=user.name,
            user_email=user.email,
            assigned_country=None,
            committee=None,
            checkin_type=checkin_type,
            message=f"Already checked in ({checkin_type.value})",
        )

    # Get assignment
    assign_result = await db.execute(
        select(Assignment)
        .where(Assignment.user_id == user.id)
        .options(selectinload(Assignment.portfolio).selectinload(Portfolio.committee))
    )
    assignment = assign_result.scalar_one_or_none()

    country = None
    committee_name = None
    if assignment and assignment.portfolio:
        country = assignment.portfolio.country_name
        committee_name = assignment.portfolio.committee.abbreviation if assignment.portfolio.committee else None

    # Mark checkin
    checkin = Checkin(
        user_id=user.id,
        type=checkin_type,
        scanned_by=volunteer.id,
    )
    db.add(checkin)
    await db.commit()

    return CheckinVerifyOut(
        success=True,
        user_name=user.name,
        user_email=user.email,
        assigned_country=country,
        committee=committee_name,
        checkin_type=checkin_type,
        message="Checked in successfully ✓",
    )


@router.get("/list")
async def list_checkins(
    _=Depends(require_role("admin", "volunteer")),
    db: AsyncSession = Depends(get_db),
):
    """List all event checkins for volunteer/admin view."""
    result = await db.execute(
        select(User, Checkin)
        .outerjoin(Checkin, User.id == Checkin.user_id)
        .where(User.role == "delegate")
    )
    rows = result.all()
    return [
        {
            "user_id": user.id,
            "name": user.name,
            "email": user.email,
            "checked_in": checkin is not None,
            "checkin_type": checkin.type if checkin else None,
            "checked_in_at": checkin.scanned_at if checkin else None,
        }
        for user, checkin in rows
    ]