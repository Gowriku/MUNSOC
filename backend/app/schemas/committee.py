from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class CommitteeCreate(BaseModel):
    name: str
    abbreviation: str
    description: Optional[str] = None
    topics: Optional[str] = None


class CommitteeOut(BaseModel):
    id: str
    name: str
    abbreviation: str
    description: Optional[str]
    topics: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class PortfolioCreate(BaseModel):
    committee_id: str
    country_name: str
    flag_url: Optional[str] = None
    description: Optional[str] = None


class PortfolioOut(BaseModel):
    id: str
    committee_id: str
    country_name: str
    flag_url: Optional[str]
    is_assigned: bool
    description: Optional[str]
    committee: Optional[CommitteeOut] = None

    class Config:
        from_attributes = True


class CommitteeWithPortfolios(CommitteeOut):
    portfolios: List[PortfolioOut] = []


class PreferenceCreate(BaseModel):
    pref1_id: Optional[str] = None
    pref2_id: Optional[str] = None
    pref3_id: Optional[str] = None


class PreferenceOut(BaseModel):
    id: str
    user_id: str
    pref1_id: Optional[str]
    pref2_id: Optional[str]
    pref3_id: Optional[str]
    pref1: Optional[PortfolioOut] = None
    pref2: Optional[PortfolioOut] = None
    pref3: Optional[PortfolioOut] = None
    submitted_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AssignmentCreate(BaseModel):
    user_id: str
    portfolio_id: str
    notes: Optional[str] = None


class AssignmentOut(BaseModel):
    id: str
    user_id: str
    portfolio_id: str
    assigned_by: str
    notes: Optional[str]
    assigned_at: datetime
    portfolio: Optional[PortfolioOut] = None

    class Config:
        from_attributes = True