from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from app.core.database import get_db
from app.core.auth import get_current_user, require_role
from app.models.user import User, PaymentStatus
from app.models.event import QRToken, FeeTier
from app.schemas.user import UserOut, UserUpdate, UserAdminOut, PaymentSubmit, RoleUpdate

import uuid

router = APIRouter(prefix="/users", tags=["users"])


@router.patch("/me", response_model=UserOut)
async def update_profile(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update own profile (phone, college, transport opt-in)."""
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(current_user, field, value)

    # Set reg_tier and amount_due if not already set
    if not current_user.reg_tier:
        now = datetime.utcnow()
        result = await db.execute(
            select(FeeTier)
            .where(FeeTier.is_active == True)
            .order_by(FeeTier.deadline)
        )
        tiers = result.scalars().all()
        for tier in tiers:
            if now <= tier.deadline:
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
    """Student submits UTR after paying via UPI."""
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
    """Get QR token (only if payment confirmed)."""
    if current_user.payment_status != PaymentStatus.confirmed:
        raise HTTPException(status_code=403, detail="QR available only after payment confirmation")

    result = await db.execute(select(QRToken).where(QRToken.user_id == current_user.id))
    qr = result.scalar_one_or_none()
    if not qr:
        raise HTTPException(status_code=404, detail="QR token not generated yet")

    return {
        "token": qr.token,
        "verify_url": f"/api/v1/checkin/verify/{qr.token}",
        "user_name": current_user.name,
        "issued_at": qr.issued_at,
    }


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
        # Generate QR token
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
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = data.role
    await db.commit()
    await db.refresh(user)
    return user