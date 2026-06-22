from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.auth import get_current_user, require_role
from app.models.event import Message, Feedback
from app.models.user import User
from app.schemas.event import MessageCreate, MessageOut, FeedbackCreate, FeedbackOut

messages_router = APIRouter(prefix="/messages", tags=["messages"])
feedback_router = APIRouter(prefix="/feedback", tags=["feedback"])


# ── Emergency Messages ────────────────────────────────────────────

@messages_router.post("/", response_model=MessageOut)
async def send_message(
    data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    msg = Message(sender_id=current_user.id, message=data.message)
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return msg


@messages_router.get("/", response_model=list[dict])
async def list_messages(
    _=Depends(require_role("admin", "volunteer", "da_team")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Message, User)
        .join(User, Message.sender_id == User.id)
        .order_by(Message.created_at.desc())
    )
    rows = result.all()
    return [
        {
            "id": msg.id,
            "message": msg.message,
            "is_read": msg.is_read,
            "reply_text": msg.reply_text,
            "created_at": msg.created_at,
            "sender_name": user.name,
            "sender_email": user.email,
            "sender_phone": user.phone,
        }
        for msg, user in rows
    ]

@messages_router.patch("/{message_id}/read")
async def mark_read(
    message_id: str,
    reply: str | None = None,          # ← query param, optional
    volunteer: User = Depends(require_role("admin", "volunteer")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Message).where(Message.id == message_id))
    msg = result.scalar_one_or_none()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    msg.is_read = True
    msg.replied_by = volunteer.id
    if reply:
        msg.reply_text = reply
    await db.commit()
    return {"success": True}


# ── Feedback ──────────────────────────────────────────────────────

@feedback_router.post("/", response_model=FeedbackOut)
async def submit_feedback(
    data: FeedbackCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_id = None if data.is_anonymous else current_user.id
    feedback = Feedback(user_id=user_id, **data.model_dump())
    db.add(feedback)
    await db.commit()
    await db.refresh(feedback)
    return feedback


@feedback_router.get("/public", response_model=list[FeedbackOut])
async def public_feedback(db: AsyncSession = Depends(get_db)):
    """Anyone can view public, non-anonymous feedback."""
    result = await db.execute(
        select(Feedback)
        .where(Feedback.is_public == True)
        .order_by(Feedback.created_at.desc())
    )
    feedbacks = result.scalars().all()
    # Strip user_id from anonymous ones
    out = []
    for f in feedbacks:
        if f.is_anonymous:
            f.user_id = None
        out.append(f)
    return out


@feedback_router.get("/all", response_model=list[dict])
async def all_feedback(
    _=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Admin sees everything including anonymous."""
    result = await db.execute(
        select(Feedback, User)
        .outerjoin(User, Feedback.user_id == User.id)
        .order_by(Feedback.created_at.desc())
    )
    rows = result.all()
    return [
        {
            "id": fb.id,
            "content": fb.content,
            "type": fb.type,
            "is_anonymous": fb.is_anonymous,
            "is_public": fb.is_public,
            "created_at": fb.created_at,
            "user_name": user.name if user and not fb.is_anonymous else "Anonymous",
            "user_email": user.email if user and not fb.is_anonymous else None,
        }
        for fb, user in rows
    ]