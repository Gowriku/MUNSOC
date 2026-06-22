from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from datetime import datetime

from app.core.database import get_db
from app.core.auth import get_current_user, require_role
from app.models.user import User, PaymentStatus, UserRole
from app.models.event import QRToken, FeeTier, Preference, Assignment
from app.schemas.user import UserOut, UserUpdate, UserAdminOut, PaymentSubmit, RoleUpdate

import uuid

router = APIRouter(prefix="/users", tags=["users"])

DELEGATE_ROLES = {UserRole.delegate}


@router.patch("/me", response_model=UserOut)
async def update_profile(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update own profile (phone, college, transport opt-in)."""
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(current_user, field, value)

    # Only set reg_tier/amount for delegates
    if current_user.role == UserRole.delegate and not current_user.reg_tier:
        now = datetime.utcnow()
        result = await db.execute(select(FeeTier).where(FeeTier.is_active == True).order_by(FeeTier.deadline))
        tiers = result.scalars().all()
        for tier in tiers:
            # respect start_date if set
            tier_start = tier.start_date or datetime.min
            if tier_start <= now <= tier.deadline:
                current_user.reg_tier = tier.tier_key
                current_user.amount_due = tier.amount
                break

    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.post("/me/payment", response_model=UserOut)
async def submit_payment(
    data: PaymentSubmit,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delegate submits UTR after paying via UPI."""
    if current_user.role != UserRole.delegate:
        raise HTTPException(status_code=403, detail="Only delegates can submit payments")
    if current_user.payment_status == PaymentStatus.confirmed:
        raise HTTPException(status_code=400, detail="Payment already confirmed")
    current_user.payment_utr = data.utr
    current_user.payment_status = PaymentStatus.submitted
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.get("/me/qr")
async def get_my_qr(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get QR token (only delegates with confirmed payment)."""
    if current_user.role != UserRole.delegate:
        raise HTTPException(status_code=403, detail="QR is only for delegates")
    if current_user.payment_status != PaymentStatus.confirmed:
        raise HTTPException(status_code=403, detail="QR available only after payment confirmation")

    result = await db.execute(select(QRToken).where(QRToken.user_id == current_user.id))
    qr = result.scalar_one_or_none()
    if not qr:
        raise HTTPException(status_code=404, detail="QR token not generated yet")

    return {"token": qr.token, "verify_url": f"/api/v1/checkin/verify/{qr.token}",
            "user_name": current_user.name, "issued_at": qr.issued_at}


# ── Admin-only routes ──────────────────────────────────────────────

@router.get("/", response_model=list[UserAdminOut])
async def list_all_users(
    _=Depends(require_role("admin", "da_team")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return result.scalars().all()


@router.patch("/{user_id}/payment", response_model=UserOut)
async def confirm_payment(
    user_id: str,
    status: PaymentStatus,
    admin=Depends(require_role("admin", "da_team")),
    db: AsyncSession = Depends(get_db),
):
    """Admin confirms or rejects payment. Generates QR if confirmed."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.payment_status = status
    if status == PaymentStatus.confirmed:
        user.payment_confirmed_at = datetime.utcnow()
        existing_qr = await db.execute(select(QRToken).where(QRToken.user_id == user_id))
        if not existing_qr.scalar_one_or_none():
            qr = QRToken(user_id=user_id, token=str(uuid.uuid4()))
            db.add(qr)

    await db.commit()
    await db.refresh(user)
    return user


@router.patch("/{user_id}/role", response_model=UserOut)
async def update_role(
    user_id: str,
    data: RoleUpdate,
    _=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Change a user's role. When changed FROM delegate, delegate-specific data is cleared."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    old_role = user.role
    new_role = data.role

    # If changing away from delegate → clear delegate-specific fields
    if old_role == UserRole.delegate and new_role != UserRole.delegate:
        user.reg_tier = None
        user.amount_due = 0.0
        user.payment_status = PaymentStatus.pending
        user.payment_utr = None
        user.payment_confirmed_at = None
        user.transportation_opted = False
        # Remove preference and assignment records
        await db.execute(delete(Preference).where(Preference.user_id == user_id))
        await db.execute(delete(Assignment).where(Assignment.user_id == user_id))
        await db.execute(delete(QRToken).where(QRToken.user_id == user_id))

    # If changing TO delegate from non-delegate, nothing extra needed
    user.role = new_role
    await db.commit()
    await db.refresh(user)
    return user
