from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from app.core.config import settings
from app.core.database import get_db
from app.core.auth import create_access_token, exchange_google_code, get_current_user
from app.models.user import User
from app.schemas.user import TokenOut, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])

GOOGLE_AUTH_URL = (
    "https://accounts.google.com/o/oauth2/v2/auth"
    "?response_type=code"
    "&scope=openid+email+profile"
    f"&client_id={settings.GOOGLE_CLIENT_ID}"
    f"&redirect_uri={settings.GOOGLE_REDIRECT_URI}"
)


@router.get("/login")
async def google_login():
    """Redirect to Google OAuth consent screen."""
    return RedirectResponse(url=GOOGLE_AUTH_URL)


@router.get("/callback")
async def google_callback(code: str, db: AsyncSession = Depends(get_db)):
    """Handle Google OAuth callback, create/fetch user, return JWT."""
    try:
        google_user = await exchange_google_code(code)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Google auth failed: {str(e)}")

    email = google_user.get("email")
    google_id = google_user.get("id")
    name = google_user.get("name", "")
    picture = google_user.get("picture", "")

    if not email:
        raise HTTPException(status_code=400, detail="Could not retrieve email from Google")

    # Check if user exists
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        # Create new user
        user = User(
            email=email,
            name=name,
            google_id=google_id,
            profile_picture=picture,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    else:
        # Update Google info if changed
        user.google_id = google_id
        user.profile_picture = picture
        await db.commit()
        await db.refresh(user)

    token = create_access_token(data={"sub": user.id})

    # Redirect to frontend with token
    frontend_url = f"{settings.FRONTEND_URL}/auth/callback?token={token}"
    return RedirectResponse(url=frontend_url)


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user profile."""
    return current_user


@router.post("/logout")
async def logout():
    """Client-side logout (just clear the token on frontend)."""
    return {"message": "Logged out successfully"}