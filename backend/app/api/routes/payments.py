from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from urllib.parse import quote

from app.core.database import get_db
from app.core.auth import get_current_user, require_role
from app.core.config import settings
from app.models.user import User, PaymentStatus
from app.models.event import FeeTier
from app.schemas.event import FeeTierCreate, FeeTierOut

router = APIRouter(prefix="/payments", tags=["payments"])


@router.get("/upi-link")
async def get_upi_link(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate UPI deep link for the student's registration amount."""
    if current_user.payment_status == PaymentStatus.confirmed:
        raise HTTPException(status_code=400, detail="Payment already confirmed")

    amount = current_user.amount_due
    if amount <= 0:
        raise HTTPException(
            status_code=400,
            detail="Complete your profile first to determine fee tier"
        )

    upi_id = settings.UPI_ID
    name = quote(settings.UPI_NAME)
    note = quote(f"MUN Registration - {current_user.name}")

    upi_link = f"upi://pay?pa={upi_id}&pn={name}&am={amount:.2f}&cu=INR&tn={note}"

    return {
        "upi_link": upi_link,
        "upi_id": upi_id,
        "amount": amount,
        "reg_tier": current_user.reg_tier,
        "payment_status": current_user.payment_status,
        "instructions": [
            f"Open any UPI app (GPay, PhonePe, Paytm)",
            f"Pay ₹{amount:.0f} to {upi_id}",
            "Note the UTR/Transaction ID after payment",
            "Enter UTR on the portal to submit for confirmation",
        ],
    }


@router.get("/fee-tiers", response_model=list[FeeTierOut])
async def list_fee_tiers(db: AsyncSession = Depends(get_db)):
    """Public: list all fee tiers."""
    result = await db.execute(
        select(FeeTier).where(FeeTier.is_active == True).order_by(FeeTier.deadline)
    )
    return result.scalars().all()


@router.post("/fee-tiers", response_model=FeeTierOut)
async def create_fee_tier(
    data: FeeTierCreate,
    _=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    tier = FeeTier(**data.model_dump())
    db.add(tier)
    await db.commit()
    await db.refresh(tier)
    return tier


@router.get("/summary")
async def payment_summary(
    _=Depends(require_role("admin", "da_team")),
    db: AsyncSession = Depends(get_db),
):
    """Admin: payment summary counts."""
    from sqlalchemy import func

    result = await db.execute(
        select(User.payment_status, func.count(User.id))
        .where(User.role == "delegate")
        .group_by(User.payment_status)
    )
    rows = result.all()
    summary = {status: 0 for status in ["pending", "submitted", "confirmed", "rejected"]}
    for status, count in rows:
        summary[status.value] = count
    return summary