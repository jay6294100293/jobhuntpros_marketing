"""JARVIS intelligence endpoint for LaunchBusiness AI.

Called by JARVIS on Mac Mini every 5 minutes.
Auth: X-Admin-Key header must match ADMIN_SECRET env var.
"""
from fastapi import APIRouter, Header, HTTPException
from datetime import datetime, timezone, timedelta
import os

router = APIRouter(prefix="/api/jarvis", tags=["jarvis"])

TIER_PRICES_USD = {"free": 0, "starter": 19, "pro": 49, "agency": 149}
USD_TO_CAD = 1.37
JARVIS_GOAL_CAD = 4000


def _auth(key: str) -> None:
    secret = os.getenv("ADMIN_SECRET", "")
    if not secret or key != secret:
        raise HTTPException(status_code=403, detail="Unauthorized")


@router.get("/pulse")
async def pulse(x_admin_key: str = Header(default="")):
    """Full business intelligence snapshot for JARVIS dashboard."""
    _auth(x_admin_key)

    from server import db  # late import — avoids circular import at load time

    now = datetime.now(timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    week_ago = (now - timedelta(days=7)).isoformat()
    month_ago = (now - timedelta(days=30)).isoformat()

    # ── Users ────────────────────────────────────────────────────────────────
    total_users = await db.users.count_documents({})
    new_today   = await db.users.count_documents({"created_at": {"$gte": today}})
    new_week    = await db.users.count_documents({"created_at": {"$gte": week_ago}})
    new_month   = await db.users.count_documents({"created_at": {"$gte": month_ago}})
    verified    = await db.users.count_documents({"email_verified": True})

    tier_counts = {}
    for tier in TIER_PRICES_USD:
        tier_counts[tier] = await db.users.count_documents({"tier": tier})

    paid_users = sum(tier_counts[t] for t in ["starter", "pro", "agency"])

    # Beta funnel
    beta_pending  = await db.beta_users.count_documents({"approved": {"$ne": True}})
    beta_approved = await db.beta_users.count_documents({"approved": True})

    # ── Revenue (calculated from live user tiers — Stripe is source of truth) ──
    mrr_usd = sum(tier_counts[t] * TIER_PRICES_USD[t] for t in TIER_PRICES_USD)
    mrr_cad = round(mrr_usd * USD_TO_CAD, 2)
    arpu    = round(mrr_usd / max(paid_users, 1), 2)

    # ── Usage ────────────────────────────────────────────────────────────────
    videos_today  = await db.videos.count_documents({"created_at": {"$gte": today}})
    videos_week   = await db.videos.count_documents({"created_at": {"$gte": week_ago}})
    videos_month  = await db.videos.count_documents({"created_at": {"$gte": month_ago}})
    scripts_today = await db.scripts.count_documents({"created_at": {"$gte": today}})
    scripts_month = await db.scripts.count_documents({"created_at": {"$gte": month_ago}})
    posters_month = await db.posters.count_documents({"created_at": {"$gte": month_ago}})

    try:
        th_month = await db.talking_head_logs.count_documents({"created_at": {"$gte": month_ago}})
    except Exception:
        th_month = 0

    # ── System ───────────────────────────────────────────────────────────────
    try:
        await db.command("ping")
        db_ok = True
        db_stats = await db.command("dbStats")
        db_size_mb = round(db_stats.get("dataSize", 0) / (1024 * 1024), 2)
    except Exception:
        db_ok = False
        db_size_mb = 0

    # ── Recent activity (JARVIS voice alerts) ────────────────────────────────
    recent_signups = await (
        db.users.find({}, {"_id": 0, "email": 1, "tier": 1, "created_at": 1})
        .sort("created_at", -1)
        .limit(3)
        .to_list(3)
    )

    conversion_rate = round((paid_users / max(total_users, 1)) * 100, 1)

    return {
        "service":   "swiftpack",
        "domain":    "launchbusinessai.com",
        "timestamp": now.isoformat(),
        "status":    "ok" if db_ok else "degraded",

        "users": {
            "total":            total_users,
            "paid":             paid_users,
            "free":             tier_counts.get("free", 0),
            "by_tier":          tier_counts,
            "new_today":        new_today,
            "new_week":         new_week,
            "new_month":        new_month,
            "verified":         verified,
            "beta_waitlist":    beta_pending,
            "beta_approved":    beta_approved,
            "conversion_pct":   conversion_rate,
        },

        "revenue": {
            "mrr_usd":           mrr_usd,
            "mrr_cad":           mrr_cad,
            "arpu_usd":          arpu,
            "goal_cad":          JARVIS_GOAL_CAD,
            "goal_progress_pct": round((mrr_cad / JARVIS_GOAL_CAD) * 100, 1),
        },

        "usage": {
            "videos_today":       videos_today,
            "videos_week":        videos_week,
            "videos_month":       videos_month,
            "scripts_today":      scripts_today,
            "scripts_month":      scripts_month,
            "posters_month":      posters_month,
            "talking_head_month": th_month,
        },

        "system": {
            "db_connected": db_ok,
            "db_size_mb":   db_size_mb,
        },

        "milestones": {
            "first_paying_user": paid_users >= 1,
            "paid_users_5":      paid_users >= 5,
            "paid_users_10":     paid_users >= 10,
            "mrr_100_usd":       mrr_usd >= 100,
            "mrr_500_usd":       mrr_usd >= 500,
            "mrr_2900_cad":      mrr_cad >= 2900,
        },

        "recent_signups": recent_signups,
    }
