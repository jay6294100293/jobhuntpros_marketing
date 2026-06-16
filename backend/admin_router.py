"""
LaunchBusiness AI — Admin Panel API
Full operator console: users, revenue, usage, coupons, beta waitlist.

Auth model:
  - All /api/admin/* routes require a logged-in user whose account has is_admin=True
    (JWT bearer token, same auth as the rest of the app).
  - The one exception is POST /api/admin/bootstrap, which is gated by the legacy
    X-Admin-Secret header (ADMIN_SECRET env var) and is used ONCE to promote the
    first real admin account. After that, manage admins from the panel itself.
"""

from fastapi import APIRouter, Depends, HTTPException, Security, Header, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone, timedelta
import os
import uuid
import secrets

admin_panel_router = APIRouter(prefix="/api/admin", tags=["admin-panel"])

security_scheme = HTTPBearer(auto_error=False)

TIER_PRICES_USD = {"free": 0, "starter": 19, "pro": 49, "agency": 149}
TIER_LABELS = {
    "free": "Free", "starter": "Starter ($19/mo)",
    "pro": "Pro ($49/mo)", "agency": "Agency ($149/mo)",
}
VALID_TIERS = ("free", "starter", "pro", "agency")


# ── Auth ─────────────────────────────────────────────────────────────────────

def _get_db_and_jwt():
    """Late import to avoid circular dependency with server.py."""
    from server import db, JWT_SECRET, JWT_ALGORITHM
    return db, JWT_SECRET, JWT_ALGORITHM


async def _require_admin_user(credentials: HTTPAuthorizationCredentials = Security(security_scheme)):
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
    from server import resolve_is_admin  # honors both DB flag and ADMIN_EMAILS
    if not resolve_is_admin(user):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


async def _audit(admin: dict, action: str, target: str = "", meta: Optional[dict] = None):
    """Append an admin action to the audit log. Best-effort — never blocks the action."""
    db, _, _ = _get_db_and_jwt()
    try:
        await db.admin_audit.insert_one({
            "_id": str(uuid.uuid4()),
            "admin_id": admin.get("id"),
            "admin_email": admin.get("email"),
            "action": action,
            "target": target,
            "meta": meta or {},
            "at": datetime.now(timezone.utc).isoformat(),
        })
    except Exception:
        pass


# ── Models ───────────────────────────────────────────────────────────────────

class BootstrapRequest(BaseModel):
    email: str

class UpdateUserRequest(BaseModel):
    tier:           Optional[str]  = None
    is_admin:       Optional[bool] = None
    is_banned:      Optional[bool] = None
    tier_expires_at: Optional[str] = None   # ISO string or null to clear

class CreateCouponRequest(BaseModel):
    code:          str
    tier:          str = "pro"
    duration_days: int = Field(default=30, ge=1, le=3650)
    max_uses:      int = Field(default=1, ge=1, le=100000)
    note:          Optional[str] = None


# ── Bootstrap (legacy-secret gated, run once) ─────────────────────────────────

@admin_panel_router.post("/bootstrap")
async def bootstrap_admin(req: BootstrapRequest, x_admin_secret: str = Header(default="")):
    """
    Promote an existing user account to admin using the legacy ADMIN_SECRET.
    Use this once to create your first admin, then manage admins from the panel.

      curl -X POST https://swiftpackai.tech/api/admin/bootstrap \\
        -H "X-Admin-Secret: YOUR_SECRET" -H "Content-Type: application/json" \\
        -d '{"email":"you@example.com"}'
    """
    secret = os.getenv("ADMIN_SECRET", "")
    if not secret or x_admin_secret != secret:
        raise HTTPException(status_code=403, detail="Forbidden")
    db, _, _ = _get_db_and_jwt()
    email = req.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail=f"No user account for {email}. Register/sign in first, then bootstrap.")
    await db.users.update_one({"id": user["id"]}, {"$set": {"is_admin": True}})
    return {"message": f"{email} is now an admin.", "user_id": user["id"]}


# ── Overview / dashboard stats ────────────────────────────────────────────────

@admin_panel_router.get("/overview")
async def overview(admin=Depends(_require_admin_user)):
    db, _, _ = _get_db_and_jwt()
    now = datetime.now(timezone.utc)
    today    = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    week_ago  = (now - timedelta(days=7)).isoformat()
    month_ago = (now - timedelta(days=30)).isoformat()

    total_users = await db.users.count_documents({})
    new_today = await db.users.count_documents({"created_at": {"$gte": today}})
    new_week  = await db.users.count_documents({"created_at": {"$gte": week_ago}})
    new_month = await db.users.count_documents({"created_at": {"$gte": month_ago}})
    banned    = await db.users.count_documents({"is_banned": True})
    admins    = await db.users.count_documents({"is_admin": True})

    tier_counts = {t: await db.users.count_documents({"tier": t}) for t in VALID_TIERS}
    paid_users = sum(tier_counts[t] for t in ("starter", "pro", "agency"))
    mrr_usd = sum(tier_counts[t] * TIER_PRICES_USD[t] for t in VALID_TIERS)
    conversion = round((paid_users / max(total_users, 1)) * 100, 1)

    async def _count(coll, q):
        try:
            return await db[coll].count_documents(q)
        except Exception:
            return 0

    usage = {
        "videos_today":  await _count("videos",  {"created_at": {"$gte": today}}),
        "videos_month":  await _count("videos",  {"created_at": {"$gte": month_ago}}),
        "scripts_month": await _count("scripts", {"created_at": {"$gte": month_ago}}),
        "posters_month": await _count("posters", {"created_at": {"$gte": month_ago}}),
    }

    # Beta waitlist — handle both legacy flag names
    beta_pending = await db.beta_users.count_documents(
        {"$and": [{"is_approved": {"$ne": True}}, {"approved": {"$ne": True}}]}
    )
    beta_total = await db.beta_users.count_documents({})

    try:
        await db.command("ping")
        db_ok = True
    except Exception:
        db_ok = False

    return {
        "users": {
            "total": total_users, "paid": paid_users, "free": tier_counts.get("free", 0),
            "by_tier": tier_counts, "new_today": new_today, "new_week": new_week,
            "new_month": new_month, "banned": banned, "admins": admins,
            "conversion_pct": conversion,
        },
        "revenue": {"mrr_usd": mrr_usd, "arr_usd": mrr_usd * 12,
                    "arpu_usd": round(mrr_usd / max(paid_users, 1), 2)},
        "usage": usage,
        "waitlist": {"pending": beta_pending, "total": beta_total},
        "system": {"db_connected": db_ok, "generated_at": now.isoformat()},
    }


# ── Users ─────────────────────────────────────────────────────────────────────

@admin_panel_router.get("/users")
async def list_users(
    admin=Depends(_require_admin_user),
    search: str = Query(default=""),
    tier: str = Query(default=""),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=25, ge=1, le=200),
):
    db, _, _ = _get_db_and_jwt()
    q: dict = {}
    if search.strip():
        rx = {"$regex": search.strip(), "$options": "i"}
        q["$or"] = [{"email": rx}, {"name": rx}]
    if tier in VALID_TIERS:
        q["tier"] = tier

    total = await db.users.count_documents(q)
    cursor = db.users.find(
        q,
        {"_id": 0, "hashed_password": 0},
    ).sort("created_at", -1).skip(skip).limit(limit)
    users = await cursor.to_list(limit)

    # Attach lifetime usage totals per user
    for u in users:
        try:
            pipeline = [
                {"$match": {"user_id": u["id"]}},
                {"$group": {"_id": None,
                            "videos": {"$sum": "$videos"},
                            "scripts": {"$sum": "$scripts"},
                            "posters": {"$sum": "$posters"}}},
            ]
            res = await db.usage.aggregate(pipeline).to_list(1)
            u["usage"] = {k: (res[0].get(k, 0) if res else 0) for k in ("videos", "scripts", "posters")}
        except Exception:
            u["usage"] = {"videos": 0, "scripts": 0, "posters": 0}

    return {"total": total, "skip": skip, "limit": limit, "users": users}


@admin_panel_router.patch("/users/{user_id}")
async def update_user(user_id: str, req: UpdateUserRequest, admin=Depends(_require_admin_user)):
    db, _, _ = _get_db_and_jwt()
    target = await db.users.find_one({"id": user_id}, {"_id": 0, "hashed_password": 0})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    updates: dict = {}
    if req.tier is not None:
        if req.tier not in VALID_TIERS:
            raise HTTPException(status_code=400, detail=f"tier must be one of {VALID_TIERS}")
        updates["tier"] = req.tier
    if req.is_admin is not None:
        # Guard: an admin cannot strip their own admin rights (avoid lockout)
        if user_id == admin["id"] and req.is_admin is False:
            raise HTTPException(status_code=400, detail="You cannot remove your own admin access.")
        updates["is_admin"] = req.is_admin
    if req.is_banned is not None:
        if user_id == admin["id"] and req.is_banned is True:
            raise HTTPException(status_code=400, detail="You cannot ban yourself.")
        updates["is_banned"] = req.is_banned
    if req.tier_expires_at is not None:
        updates["tier_expires_at"] = req.tier_expires_at or None

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    await db.users.update_one({"id": user_id}, {"$set": updates})
    await _audit(admin, "user.update", target=target.get("email", user_id), meta=updates)
    refreshed = await db.users.find_one({"id": user_id}, {"_id": 0, "hashed_password": 0})
    return {"message": "User updated", "user": refreshed}


@admin_panel_router.post("/users/{user_id}/reset-password")
async def reset_user_password(user_id: str, admin=Depends(_require_admin_user)):
    """Generate a new temporary password, store it, and email it to the user."""
    from server import hash_password, send_email, FRONTEND_URL
    db, _, _ = _get_db_and_jwt()
    target = await db.users.find_one({"id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    temp_password = secrets.token_urlsafe(12)
    await db.users.update_one(
        {"id": user_id}, {"$set": {"hashed_password": hash_password(temp_password)}}
    )
    emailed = False
    try:
        await send_email(
            to_email=target["email"],
            to_name=target.get("name") or target["email"].split("@")[0],
            subject="Your LaunchBusiness AI password was reset",
            html=f"""
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
              <h2 style="color:#6366f1">Password reset</h2>
              <p>An administrator reset your password. Sign in with:</p>
              <ul>
                <li><strong>Email:</strong> {target['email']}</li>
                <li><strong>Temporary password:</strong> <code>{temp_password}</code></li>
              </ul>
              <p>Sign in at <a href="{FRONTEND_URL}/login">{FRONTEND_URL}/login</a> and change it.</p>
            </div>
            """,
        )
        emailed = True
    except Exception:
        emailed = False
    await _audit(admin, "user.reset_password", target=target.get("email", user_id), meta={"emailed": emailed})
    # Return the temp password so the admin can relay it if email delivery is off
    return {"message": "Password reset", "emailed": emailed, "temp_password": temp_password}


# ── Coupons ───────────────────────────────────────────────────────────────────

@admin_panel_router.get("/coupons")
async def list_coupons(admin=Depends(_require_admin_user)):
    db, _, _ = _get_db_and_jwt()
    coupons = await db.coupons.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"count": len(coupons), "coupons": coupons}


@admin_panel_router.post("/coupons", status_code=201)
async def create_coupon(req: CreateCouponRequest, admin=Depends(_require_admin_user)):
    db, _, _ = _get_db_and_jwt()
    code = req.code.strip().upper()
    if not code:
        raise HTTPException(status_code=400, detail="Code cannot be empty")
    if req.tier not in ("starter", "pro", "agency"):
        raise HTTPException(status_code=400, detail="tier must be starter, pro, or agency")
    if await db.coupons.find_one({"code": code}):
        raise HTTPException(status_code=400, detail=f"Coupon '{code}' already exists")
    coupon = {
        "code": code, "tier": req.tier, "duration_days": req.duration_days,
        "max_uses": req.max_uses, "used_count": 0, "used_by": [],
        "is_active": True, "note": req.note,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.coupons.insert_one({**coupon, "_id": code})
    await _audit(admin, "coupon.create", target=code, meta={"tier": req.tier, "max_uses": req.max_uses})
    return coupon


@admin_panel_router.delete("/coupons/{code}")
async def deactivate_coupon(code: str, admin=Depends(_require_admin_user)):
    db, _, _ = _get_db_and_jwt()
    result = await db.coupons.update_one(
        {"code": code.upper()}, {"$set": {"is_active": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Coupon not found")
    await _audit(admin, "coupon.deactivate", target=code.upper())
    return {"deactivated": code.upper()}


# ── Beta waitlist ─────────────────────────────────────────────────────────────

@admin_panel_router.get("/waitlist")
async def list_waitlist(admin=Depends(_require_admin_user)):
    db, _, _ = _get_db_and_jwt()
    entries = await db.beta_users.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    for e in entries:
        e["is_approved"] = bool(e.get("is_approved") or e.get("approved"))
    return {"count": len(entries), "entries": entries}


@admin_panel_router.post("/waitlist/approve")
async def approve_waitlist(req: BootstrapRequest, admin=Depends(_require_admin_user)):
    """Approve a beta waitlist user → creates account + emails temp password."""
    from server import hash_password, send_email, FRONTEND_URL
    db, _, _ = _get_db_and_jwt()
    email = req.email.lower().strip()
    beta_entry = await db.beta_users.find_one({"email": email})
    if not beta_entry:
        raise HTTPException(status_code=404, detail="Email not found in beta waitlist")
    if beta_entry.get("is_approved") or beta_entry.get("approved"):
        raise HTTPException(status_code=400, detail="User is already approved")
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="User account already exists")

    temp_password = secrets.token_urlsafe(12)
    user_id = str(uuid.uuid4())
    name = beta_entry.get("name") or email.split("@")[0]
    user = {
        "id": user_id, "email": email, "name": name,
        "hashed_password": hash_password(temp_password),
        "tier": "free", "google_id": None, "stripe_customer_id": None,
        "email_verified": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one({**user, "_id": user_id})
    await db.beta_users.update_one(
        {"email": email},
        {"$set": {"is_approved": True, "approved": True,
                  "approved_at": datetime.now(timezone.utc).isoformat()}},
    )
    try:
        await send_email(
            to_email=email, to_name=name,
            subject="Welcome to LaunchBusiness AI Beta — Your account is ready",
            html=f"""
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
              <h2 style="color:#6366f1">Welcome to LaunchBusiness AI Beta!</h2>
              <p>Hi {name}, your beta access has been approved.</p>
              <p>Sign in at <a href="{FRONTEND_URL}/login">{FRONTEND_URL}/login</a> with:</p>
              <ul>
                <li><strong>Email:</strong> {email}</li>
                <li><strong>Temporary password:</strong> <code>{temp_password}</code></li>
              </ul>
            </div>
            """,
        )
    except Exception:
        pass
    await _audit(admin, "waitlist.approve", target=email)
    return {"message": f"Account created for {email}.", "temp_password": temp_password}


# ── Recent generations ────────────────────────────────────────────────────────

@admin_panel_router.get("/generations")
async def list_generations(
    admin=Depends(_require_admin_user),
    kind: str = Query(default="video"),
    limit: int = Query(default=30, ge=1, le=200),
):
    db, _, _ = _get_db_and_jwt()
    coll = {"video": "videos", "script": "scripts", "poster": "posters", "logo": "logos"}.get(kind)
    if not coll:
        raise HTTPException(status_code=400, detail="kind must be video, script, poster, or logo")
    try:
        items = await db[coll].find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    except Exception:
        items = []
    # Resolve owner email for display
    user_ids = list({i.get("user_id") for i in items if i.get("user_id")})
    email_map = {}
    if user_ids:
        owners = await db.users.find(
            {"id": {"$in": user_ids}}, {"_id": 0, "id": 1, "email": 1}
        ).to_list(len(user_ids))
        email_map = {o["id"]: o["email"] for o in owners}
    for i in items:
        i["owner_email"] = email_map.get(i.get("user_id"), "—")
    return {"kind": kind, "count": len(items), "items": items}


# ── User detail (drill-down) ──────────────────────────────────────────────────

@admin_panel_router.get("/users/{user_id}")
async def user_detail(user_id: str, admin=Depends(_require_admin_user)):
    db, _, _ = _get_db_and_jwt()
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "hashed_password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    async def _count(coll, q):
        try:
            return await db[coll].count_documents(q)
        except Exception:
            return 0

    uid = {"user_id": user_id}
    counts = {
        "videos":         await _count("videos", uid),
        "scripts":        await _count("scripts", uid),
        "posters":        await _count("posters", uid),
        "logos":          await _count("logos", uid),
        "brand_profiles": await _count("brand_profiles", uid),
        "legal_documents": await _count("legal_documents", uid),
        "talking_heads":  await _count("talking_head_logs", uid),
    }
    try:
        brands = await db.brand_profiles.find(uid, {"_id": 0, "id": 1, "brand_name": 1, "primary_color": 1}).to_list(50)
    except Exception:
        brands = []
    try:
        agreement = await db.beta_agreements.find_one({"user_id": user_id})
    except Exception:
        agreement = None

    return {
        "user": user,
        "counts": counts,
        "brands": brands,
        "subscription": {
            "tier": user.get("tier", "free"),
            "stripe_customer_id": user.get("stripe_customer_id"),
            "tier_expires_at": user.get("tier_expires_at"),
        },
        "identity_verified": bool(user.get("identity_verified")),
        "has_agreed": bool(agreement),
    }


# ── Moderation: talking-head / deepfake review ────────────────────────────────

@admin_panel_router.get("/moderation/talking-head")
async def talking_head_review(
    admin=Depends(_require_admin_user),
    limit: int = Query(default=50, ge=1, le=200),
):
    """Talking-head generations + identity-consent records (deepfake safety review)."""
    db, _, _ = _get_db_and_jwt()
    try:
        logs = await db.talking_head_logs.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    except Exception:
        logs = []
    try:
        consents = await db.talking_head_consents.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    except Exception:
        consents = []
    user_ids = list({x.get("user_id") for x in (logs + consents) if x.get("user_id")})
    email_map = {}
    if user_ids:
        owners = await db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "id": 1, "email": 1}).to_list(len(user_ids))
        email_map = {o["id"]: o["email"] for o in owners}
    for x in logs:
        x["owner_email"] = email_map.get(x.get("user_id"), "—")
    return {"logs": logs, "consents": consents, "log_count": len(logs)}


# ── Legal overview ────────────────────────────────────────────────────────────

@admin_panel_router.get("/legal")
async def legal_overview(
    admin=Depends(_require_admin_user),
    limit: int = Query(default=30, ge=1, le=200),
):
    db, _, _ = _get_db_and_jwt()
    async def _count(coll, q=None):
        try:
            return await db[coll].count_documents(q or {})
        except Exception:
            return 0
    try:
        recent = await db.legal_documents.find(
            {}, {"_id": 0, "id": 1, "user_id": 1, "doc_type": 1, "title": 1, "created_at": 1}
        ).sort("created_at", -1).to_list(limit)
    except Exception:
        recent = []
    user_ids = list({d.get("user_id") for d in recent if d.get("user_id")})
    email_map = {}
    if user_ids:
        owners = await db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "id": 1, "email": 1}).to_list(len(user_ids))
        email_map = {o["id"]: o["email"] for o in owners}
    for d in recent:
        d["owner_email"] = email_map.get(d.get("user_id"), "—")
    return {
        "totals": {
            "documents": await _count("legal_documents"),
            "profiles":  await _count("legal_profiles"),
            "chats":     await _count("legal_chat"),
        },
        "recent": recent,
    }


# ── System / integration config ───────────────────────────────────────────────

@admin_panel_router.get("/system")
async def system_status(admin=Depends(_require_admin_user)):
    """Which integrations are configured (booleans only — never returns secret values)."""
    db, _, _ = _get_db_and_jwt()

    def _set(name):
        return bool(os.getenv(name, "").strip())

    integrations = {
        "mongodb":            None,  # filled below from live ping
        "gemini":             _set("GEMINI_API_KEY") or _set("GOOGLE_API_KEY"),
        "stripe_secret":      _set("STRIPE_SECRET_KEY"),
        "stripe_webhook":     _set("STRIPE_WEBHOOK_SECRET"),
        "stripe_starter":     _set("STRIPE_STARTER_PRICE_ID"),
        "stripe_pro":         _set("STRIPE_PRO_PRICE_ID"),
        "stripe_agency":      _set("STRIPE_AGENCY_PRICE_ID"),
        "modal_token":        _set("MODAL_TOKEN_ID") and _set("MODAL_TOKEN_SECRET"),
        "modal_app":          _set("MODAL_APP_NAME"),
        "pexels":             _set("PEXELS_API_KEY"),
        "google_oauth":       _set("GOOGLE_CLIENT_ID") and _set("GOOGLE_CLIENT_SECRET"),
        "safe_browsing":      _set("GOOGLE_SAFE_BROWSING_KEY"),
        "email":              _set("RESEND_API_KEY") or _set("SMTP_HOST") or _set("BREVO_API_KEY"),
        "admin_secret":       _set("ADMIN_SECRET"),
    }

    db_ok, db_size_mb = False, 0
    try:
        await db.command("ping")
        db_ok = True
        stats = await db.command("dbStats")
        db_size_mb = round(stats.get("dataSize", 0) / (1024 * 1024), 2)
    except Exception:
        pass
    integrations["mongodb"] = db_ok

    collections = {}
    for c in ("users", "videos", "scripts", "posters", "logos", "brand_profiles",
              "legal_documents", "coupons", "beta_users", "talking_head_logs"):
        try:
            collections[c] = await db[c].count_documents({})
        except Exception:
            collections[c] = None

    return {
        "integrations": integrations,
        "database": {"connected": db_ok, "size_mb": db_size_mb, "collections": collections},
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


# ── Audit log ─────────────────────────────────────────────────────────────────

@admin_panel_router.get("/audit")
async def audit_log(
    admin=Depends(_require_admin_user),
    limit: int = Query(default=100, ge=1, le=500),
):
    db, _, _ = _get_db_and_jwt()
    try:
        entries = await db.admin_audit.find({}, {"_id": 0}).sort("at", -1).to_list(limit)
    except Exception:
        entries = []
    return {"count": len(entries), "entries": entries}
