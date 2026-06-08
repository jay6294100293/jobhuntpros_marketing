"""
LaunchBusiness AI — Brand Profile Feature
Stores client/brand context shared across Logo Creator, Video Pipeline, and Legal Docs.
One profile per client → user never re-enters brand info across tools.
"""

from fastapi import APIRouter, Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import re

brand_router = APIRouter(prefix="/api/brand-profiles", tags=["brand-profiles"])

security_scheme = HTTPBearer(auto_error=False)

# ── Tier limits ────────────────────────────────────────────────────────────────

BRAND_TIER_LIMITS = {
    "free":    0,
    "starter": 1,
    "pro":     3,
    "agency":  999,
}

# ── Pydantic models ────────────────────────────────────────────────────────────

class BrandProfileCreate(BaseModel):
    brand_name:     str            = Field(max_length=100)
    tagline:        Optional[str]  = Field(default=None, max_length=200)
    url:            Optional[str]  = Field(default=None, max_length=500)
    primary_color:  str            = Field(default="#6366f1", max_length=7)
    secondary_color:str            = Field(default="#8b5cf6", max_length=7)
    audience:       Optional[str]  = Field(default=None, max_length=200)
    tone:           Optional[str]  = Field(default="professional", max_length=50)
    business_type:  Optional[str]  = Field(default=None, max_length=50)
    jurisdiction:   Optional[str]  = Field(default=None, max_length=50)
    revenue_model:  Optional[str]  = Field(default=None, max_length=50)
    data_practices: Optional[str]  = Field(default=None, max_length=500)
    key_features:   List[str]      = Field(default_factory=list)
    cta_text:       Optional[str]  = Field(default="Try free", max_length=50)

class BrandProfileUpdate(BrandProfileCreate):
    pass

class SetLogoRequest(BaseModel):
    logo_url: str = Field(max_length=1000)


# ── Auth helper (mirrors server.py pattern) ────────────────────────────────────

def _get_db_and_jwt():
    """Late import to avoid circular dependency with server.py."""
    from server import db, JWT_SECRET, JWT_ALGORITHM
    return db, JWT_SECRET, JWT_ALGORITHM


async def _require_user(credentials: HTTPAuthorizationCredentials = Security(security_scheme)):
    from jose import JWTError, jwt
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    db, JWT_SECRET, JWT_ALGORITHM = _get_db_and_jwt()
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ── Helpers ────────────────────────────────────────────────────────────────────

def _clean_hex(color: str) -> str:
    """Ensure color is a valid #RRGGBB string."""
    color = color.strip()
    if re.match(r'^#[0-9a-fA-F]{6}$', color):
        return color
    return "#6366f1"


async def _count_profiles(db, user_id: str) -> int:
    return await db.brand_profiles.count_documents({"user_id": user_id})


# ── Routes ─────────────────────────────────────────────────────────────────────

@brand_router.post("", status_code=201)
async def create_profile(body: BrandProfileCreate, user=Depends(_require_user)):
    db, _, _ = _get_db_and_jwt()
    tier = user.get("tier", "free")
    limit = BRAND_TIER_LIMITS.get(tier, 0)
    if limit == 0:
        raise HTTPException(
            status_code=403,
            detail="Brand profiles require a Starter plan or higher. Upgrade to create your first profile."
        )
    count = await _count_profiles(db, user["id"])
    if count >= limit:
        raise HTTPException(
            status_code=403,
            detail=f"Profile limit reached ({count}/{limit} for {tier} plan). Upgrade to create more profiles."
        )
    profile = {
        "id":              str(uuid.uuid4()),
        "user_id":         user["id"],
        "brand_name":      body.brand_name.strip(),
        "tagline":         (body.tagline or "").strip() or None,
        "url":             (body.url or "").strip() or None,
        "primary_color":   _clean_hex(body.primary_color),
        "secondary_color": _clean_hex(body.secondary_color),
        "audience":        (body.audience or "").strip() or None,
        "tone":            body.tone or "professional",
        "business_type":   body.business_type or None,
        "jurisdiction":    body.jurisdiction or None,
        "revenue_model":   body.revenue_model or None,
        "data_practices":  (body.data_practices or "").strip() or None,
        "key_features":    [f.strip() for f in (body.key_features or []) if f.strip()][:5],
        "cta_text":        body.cta_text or "Try free",
        "active_logo_url": None,
        "created_at":      datetime.now(timezone.utc).isoformat(),
        "updated_at":      datetime.now(timezone.utc).isoformat(),
    }
    await db.brand_profiles.insert_one({**profile, "_id": profile["id"]})
    return profile


@brand_router.get("")
async def list_profiles(user=Depends(_require_user)):
    db, _, _ = _get_db_and_jwt()
    profiles = await db.brand_profiles.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    tier = user.get("tier", "free")
    return {
        "profiles": profiles,
        "count":    len(profiles),
        "limit":    BRAND_TIER_LIMITS.get(tier, 0),
        "tier":     tier,
    }


@brand_router.get("/{profile_id}")
async def get_profile(profile_id: str, user=Depends(_require_user)):
    db, _, _ = _get_db_and_jwt()
    profile = await db.brand_profiles.find_one(
        {"id": profile_id, "user_id": user["id"]}, {"_id": 0}
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@brand_router.put("/{profile_id}")
async def update_profile(profile_id: str, body: BrandProfileUpdate, user=Depends(_require_user)):
    db, _, _ = _get_db_and_jwt()
    existing = await db.brand_profiles.find_one({"id": profile_id, "user_id": user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Profile not found")
    updates = {
        "brand_name":      body.brand_name.strip(),
        "tagline":         (body.tagline or "").strip() or None,
        "url":             (body.url or "").strip() or None,
        "primary_color":   _clean_hex(body.primary_color),
        "secondary_color": _clean_hex(body.secondary_color),
        "audience":        (body.audience or "").strip() or None,
        "tone":            body.tone or "professional",
        "business_type":   body.business_type or None,
        "jurisdiction":    body.jurisdiction or None,
        "revenue_model":   body.revenue_model or None,
        "data_practices":  (body.data_practices or "").strip() or None,
        "key_features":    [f.strip() for f in (body.key_features or []) if f.strip()][:5],
        "cta_text":        body.cta_text or "Try free",
        "updated_at":      datetime.now(timezone.utc).isoformat(),
    }
    await db.brand_profiles.update_one({"id": profile_id}, {"$set": updates})
    return {**{k: v for k, v in existing.items() if k != "_id"}, **updates}


@brand_router.delete("/{profile_id}", status_code=204)
async def delete_profile(profile_id: str, user=Depends(_require_user)):
    db, _, _ = _get_db_and_jwt()
    result = await db.brand_profiles.delete_one({"id": profile_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Profile not found")


@brand_router.post("/{profile_id}/set-logo")
async def set_active_logo(profile_id: str, body: SetLogoRequest, user=Depends(_require_user)):
    """Store the selected logo URL on the brand profile so it auto-renders on video slides."""
    db, _, _ = _get_db_and_jwt()
    existing = await db.brand_profiles.find_one({"id": profile_id, "user_id": user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Profile not found")
    await db.brand_profiles.update_one(
        {"id": profile_id},
        {"$set": {"active_logo_url": body.logo_url.strip(), "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"profile_id": profile_id, "active_logo_url": body.logo_url.strip()}
