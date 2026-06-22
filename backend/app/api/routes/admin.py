from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
import csv
import io
from fastapi.responses import StreamingResponse

from app.core.database import get_db
from app.core.auth import require_role
from app.models.user import User, PaymentStatus, UserRole
from app.models.event import Assignment, Checkin, Preference, Feedback, Message, QRToken
from app.models.committee import Portfolio, Committee

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/dashboard")
async def dashboard_summary(
    _=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Full admin dashboard summary."""
    delegates = await db.execute(
        select(func.count(User.id)).where(User.role == UserRole.delegate)
    )
    total_delegates = delegates.scalar()

    paid = await db.execute(
        select(func.count(User.id)).where(
            User.role == UserRole.delegate,
            User.payment_status == PaymentStatus.confirmed,
        )
    )
    total_paid = paid.scalar()

    unpaid = await db.execute(
        select(func.count(User.id)).where(
            User.role == UserRole.delegate,
            User.payment_status == PaymentStatus.pending,
        )
    )
    total_unpaid = unpaid.scalar()

    submitted = await db.execute(
        select(func.count(User.id)).where(
            User.role == UserRole.delegate,
            User.payment_status == PaymentStatus.submitted,
        )
    )
    total_submitted = submitted.scalar()

    assigned = await db.execute(select(func.count(Assignment.id)))
    total_assigned = assigned.scalar()

    checked_in = await db.execute(select(func.count(Checkin.id)).where(Checkin.type == "event"))
    total_checked_in = checked_in.scalar()

    messages_unread = await db.execute(
        select(func.count(Message.id)).where(Message.is_read == False)
    )
    unread_count = messages_unread.scalar()

    feedback_count = await db.execute(select(func.count(Feedback.id)))
    total_feedback = feedback_count.scalar()

    return {
        "delegates": {
            "total": total_delegates,
            "paid": total_paid,
            "unpaid": total_unpaid,
            "payment_submitted": total_submitted,
        },
        "assignments": {
            "assigned": total_assigned,
            "unassigned": total_delegates - total_assigned,
        },
        "attendance": {
            "checked_in": total_checked_in,
            "not_checked_in": total_delegates - total_checked_in,
        },
        "messages": {"unread": unread_count},
        "feedback": {"total": total_feedback},
    }


@router.get("/delegates/export")
async def export_delegates_csv(
    _=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Export all delegate data as CSV."""
    result = await db.execute(
        select(User)
        .where(User.role == UserRole.delegate)
        .options(
            selectinload(User.assignment).selectinload(Assignment.portfolio).selectinload(Portfolio.committee)
        )
        .order_by(User.created_at)
    )
    users = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Name", "Email", "Phone", "College", "Reg Tier", "Amount Due",
        "Payment Status", "UTR", "Assigned Country", "Committee",
        "Transport Opted", "Checked In", "Registered At"
    ])

    # Fetch checkin status in bulk
    checkin_result = await db.execute(
        select(Checkin.user_id).where(Checkin.type == "event")
    )
    checked_in_ids = {row[0] for row in checkin_result.all()}

    for user in users:
        portfolio = user.assignment.portfolio if user.assignment else None
        committee = portfolio.committee if portfolio else None
        writer.writerow([
            user.name,
            user.email,
            user.phone or "",
            user.college or "",
            user.reg_tier or "",
            user.amount_due,
            user.payment_status.value,
            user.payment_utr or "",
            portfolio.country_name if portfolio else "Unassigned",
            committee.abbreviation if committee else "",
            "Yes" if user.transportation_opted else "No",
            "Yes" if user.id in checked_in_ids else "No",
            user.created_at.strftime("%Y-%m-%d %H:%M"),
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=delegates.csv"},
    )