from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import engine, Base
from app.api.routes.auth import router as auth_router
from app.api.routes.users import router as users_router
from app.api.routes.portfolios import router as portfolios_router
from app.api.routes.payments import router as payments_router
from app.api.routes.checkin import router as checkin_router
from app.api.routes.alerts import router as alerts_router
from app.api.routes.misc import messages_router, feedback_router
from app.api.routes.admin import router as admin_router

# Import all models so Alembic can detect them
import app.models  # noqa


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup (dev only — use Alembic in prod)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="MUNPortal API",
    description="Model United Nations Event Management System",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PREFIX = "/api/v1"

app.include_router(auth_router, prefix=PREFIX)
app.include_router(users_router, prefix=PREFIX)
app.include_router(portfolios_router, prefix=PREFIX)
app.include_router(payments_router, prefix=PREFIX)
app.include_router(checkin_router, prefix=PREFIX)
app.include_router(alerts_router, prefix=PREFIX)
app.include_router(messages_router, prefix=PREFIX)
app.include_router(feedback_router, prefix=PREFIX)
app.include_router(admin_router, prefix=PREFIX)


@app.get("/")
async def root():
    return {"message": "MUNPortal API is running", "docs": "/docs"}


@app.get("/health")
async def health():
    return {"status": "ok"}