from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db, AsyncSessionLocal
from app.core.auth import get_current_user, require_role, decode_token
from app.core.websocket import manager
from app.models.event import Alert
from app.models.user import User
from app.schemas.event import AlertCreate, AlertOut

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.post("/", response_model=AlertOut)
async def send_alert(
    data: AlertCreate,
    current_user: User = Depends(require_role("volunteer", "admin", "da_team")),
    db: AsyncSession = Depends(get_db),
):
    """Volunteer sends an alert to a committee (or all)."""
    alert = Alert(
        committee_id=data.committee_id,
        type=data.type,
        message=data.message,
        sent_by=current_user.id,
    )
    db.add(alert)
    await db.commit()
    await db.refresh(alert)

    # Broadcast via WebSocket
    payload = {
        "type": "alert",
        "alert_type": data.type,
        "message": data.message,
        "committee_id": data.committee_id,
        "sent_at": alert.sent_at.isoformat(),
    }

    if data.committee_id:
        await manager.broadcast_to_committee(data.committee_id, payload)
    else:
        await manager.broadcast_to_all(payload)

    return alert


@router.get("/", response_model=list[AlertOut])
async def list_alerts(
    committee_id: str | None = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    """Get recent alerts (optionally filter by committee)."""
    query = select(Alert).order_by(Alert.sent_at.desc()).limit(50)
    if committee_id:
        query = query.where(Alert.committee_id == committee_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.websocket("/ws/{user_id}")
async def websocket_alerts(
    websocket: WebSocket,
    user_id: str,
    token: str | None = None,
    committee_id: str | None = None,
):
    """WebSocket endpoint for real-time alerts."""
    # Validate token
    if token:
        try:
            payload = decode_token(token)
            if payload.get("sub") != user_id:
                await websocket.close(code=1008)
                return
        except Exception:
            await websocket.close(code=1008)
            return

    await manager.connect(websocket, user_id, committee_id)
    try:
        while True:
            # Keep connection alive, listen for pings
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(user_id, committee_id)