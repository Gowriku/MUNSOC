from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.auth import get_current_user, require_role
from app.models.committee import Committee, Portfolio
from app.models.event import Preference, Assignment
from app.models.user import User
from app.schemas.committee import (
    CommitteeCreate, CommitteeOut, CommitteeWithPortfolios,
    PortfolioCreate, PortfolioOut,
    PreferenceCreate, PreferenceOut,
    AssignmentCreate, AssignmentOut,
)

router = APIRouter(prefix="/portfolios", tags=["portfolios"])


# ── Committees ────────────────────────────────────────────────────

@router.get("/committees", response_model=list[CommitteeWithPortfolios])
async def list_committees(db: AsyncSession = Depends(get_db)):
    """Public: list all committees with their portfolios."""
    result = await db.execute(
        select(Committee)
        .where(Committee.is_active == True)
        .options(selectinload(Committee.portfolios))
    )
    return result.scalars().all()


@router.post("/committees", response_model=CommitteeOut)
async def create_committee(
    data: CommitteeCreate,
    _=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    committee = Committee(**data.model_dump())
    db.add(committee)
    await db.commit()
    await db.refresh(committee)
    return committee


# ── Portfolios ────────────────────────────────────────────────────

@router.post("/", response_model=PortfolioOut)
async def create_portfolio(
    data: PortfolioCreate,
    _=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    portfolio = Portfolio(**data.model_dump())
    db.add(portfolio)
    await db.commit()
    await db.refresh(portfolio)
    return portfolio


@router.get("/available", response_model=list[PortfolioOut])
async def list_available_portfolios(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    """List portfolios not yet assigned."""
    result = await db.execute(
        select(Portfolio)
        .where(Portfolio.is_assigned == False)
        .options(selectinload(Portfolio.committee))
    )
    return result.scalars().all()


# ── Preferences ───────────────────────────────────────────────────

@router.post("/preferences", response_model=PreferenceOut)
async def submit_preferences(
    data: PreferenceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delegate submits or updates their 3 portfolio preferences."""
    existing_assign = await db.execute(
        select(Assignment).where(Assignment.user_id == current_user.id)
    )
    if existing_assign.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="You already have an assigned portfolio")

    existing = await db.execute(
        select(Preference).where(Preference.user_id == current_user.id)
    )
    pref = existing.scalar_one_or_none()

    if pref:
        pref.pref1_id = data.pref1_id
        pref.pref2_id = data.pref2_id
        pref.pref3_id = data.pref3_id
    else:
        pref = Preference(user_id=current_user.id, **data.model_dump())
        db.add(pref)

    await db.commit()

    # Re-fetch with relationships eagerly loaded
    result = await db.execute(
        select(Preference)
        .where(Preference.user_id == current_user.id)
        .options(
            selectinload(Preference.pref1).selectinload(Portfolio.committee),
            selectinload(Preference.pref2).selectinload(Portfolio.committee),
            selectinload(Preference.pref3).selectinload(Portfolio.committee),
        )
    )
    return result.scalar_one()


@router.get("/preferences/me", response_model=PreferenceOut)
async def get_my_preferences(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Preference)
        .where(Preference.user_id == current_user.id)
        .options(
            selectinload(Preference.pref1).selectinload(Portfolio.committee),
            selectinload(Preference.pref2).selectinload(Portfolio.committee),
            selectinload(Preference.pref3).selectinload(Portfolio.committee),
        )
    )
    pref = result.scalar_one_or_none()
    if not pref:
        raise HTTPException(status_code=404, detail="No preferences submitted yet")
    return pref


# ── Assignments ───────────────────────────────────────────────────

@router.get("/preferences/all", response_model=list[dict])
async def list_all_preferences(
    _=Depends(require_role("admin", "da_team")),
    db: AsyncSession = Depends(get_db),
):
    """DA team: view all delegates with their preferences."""
    result = await db.execute(
        select(User, Preference, Assignment)
        .outerjoin(Preference, User.id == Preference.user_id)
        .outerjoin(Assignment, User.id == Assignment.user_id)
        .where(User.role == "delegate")
        .options(selectinload(User.assignment))
    )
    rows = result.all()
    output = []
    for user, pref, assign in rows:
        output.append({
            "user_id": user.id,
            "name": user.name,
            "email": user.email,
            "college": user.college,
            "pref1_id": pref.pref1_id if pref else None,
            "pref2_id": pref.pref2_id if pref else None,
            "pref3_id": pref.pref3_id if pref else None,
            "assigned_portfolio_id": assign.portfolio_id if assign else None,
        })
    return output


@router.post("/assign", response_model=AssignmentOut)
async def assign_portfolio(
    data: AssignmentCreate,
    current_user: User = Depends(require_role("admin", "da_team")),
    db: AsyncSession = Depends(get_db),
):
    """DA team assigns a portfolio to a delegate."""
    # Check user exists
    result = await db.execute(select(User).where(User.id == data.user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check portfolio exists and available
    result = await db.execute(select(Portfolio).where(Portfolio.id == data.portfolio_id))
    portfolio = result.scalar_one_or_none()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    if portfolio.is_assigned:
        raise HTTPException(status_code=400, detail="Portfolio already assigned")

    # Remove old assignment if exists
    old = await db.execute(select(Assignment).where(Assignment.user_id == data.user_id))
    old_assign = old.scalar_one_or_none()
    if old_assign:
        old_portfolio = await db.execute(
            select(Portfolio).where(Portfolio.id == old_assign.portfolio_id)
        )
        old_p = old_portfolio.scalar_one_or_none()
        if old_p:
            old_p.is_assigned = False
        await db.delete(old_assign)

    assignment = Assignment(
        user_id=data.user_id,
        portfolio_id=data.portfolio_id,
        assigned_by=current_user.id,
        notes=data.notes,
    )
    portfolio.is_assigned = True
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)
    return assignment


@router.get("/assignment/me", response_model=AssignmentOut)
async def get_my_assignment(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Assignment)
        .where(Assignment.user_id == current_user.id)
        .options(selectinload(Assignment.portfolio).selectinload(Portfolio.committee))
    )
    assign = result.scalar_one_or_none()
    if not assign:
        raise HTTPException(status_code=404, detail="No assignment yet")
    return assign