"""
LaunchBusiness AI — Legal Documents Feature
AI-powered legal document generation with adaptive intake chat.

Architecture:
  - Business profiles store intake data per-business (plan-limited)
  - Chat endpoint drives Gemini conversation to gather business info
  - Generation endpoint fetches latest legal context via web search, then generates with Gemini
  - Credits: monthly allowance (resets) + purchased topup (permanent)
  - Regeneration: always 10% cheaper than original cost (laws change, users shouldn't be penalized)
"""

from fastapi import APIRouter, Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import json
import re
import httpx
from bs4 import BeautifulSoup

# ─── Document Catalog ─────────────────────────────────────────────────────────

DOCUMENT_CATALOG = {
    "Privacy & Compliance": [
        {"id": "privacy_general",      "name": "Privacy Policy (General)",                   "credits": 3, "desc": "Core privacy policy for any business"},
        {"id": "privacy_gdpr",         "name": "Privacy Policy — GDPR (EU)",                 "credits": 4, "desc": "GDPR Art. 13/14 compliant — fines up to €20M or 4% revenue"},
        {"id": "privacy_pipeda",       "name": "Privacy Policy — PIPEDA + Law 25 (Canada)",  "credits": 4, "desc": "Covers PIPEDA + Quebec Law 25 (CA$25M max fine)"},
        {"id": "privacy_ccpa",         "name": "Privacy Policy — CCPA (California / US)",    "credits": 4, "desc": "Required for businesses with California users"},
        {"id": "cookie_policy",        "name": "Cookie Policy",                              "credits": 2, "desc": "Cookie categories, consent, and opt-out instructions"},
        {"id": "dpa",                  "name": "Data Processing Agreement (DPA)",            "credits": 3, "desc": "Required GDPR contract between controller and processor"},
        {"id": "pia_template",         "name": "Privacy Impact Assessment Template",         "credits": 3, "desc": "Mandatory under Quebec Law 25 for tech projects"},
        {"id": "data_breach_plan",     "name": "Data Breach Response Plan",                  "credits": 3, "desc": "72-hr notification procedures (GDPR + Law 25)"},
        {"id": "ropa",                 "name": "Record of Processing Activities (ROPA)",     "credits": 3, "desc": "Required for 250+ employees or high-risk processing"},
    ],
    "Business Agreements": [
        {"id": "nda",                  "name": "Non-Disclosure Agreement (NDA)",             "credits": 2, "desc": "Mutual or one-way confidentiality protection"},
        {"id": "terms_of_service",     "name": "Terms of Service",                           "credits": 3, "desc": "User rights, restrictions, and liability limits"},
        {"id": "service_agreement",    "name": "Service Agreement",                          "credits": 3, "desc": "Scope of work, payment terms, and deliverables"},
        {"id": "contractor_agreement", "name": "Contractor / Freelancer Agreement",          "credits": 3, "desc": "Independent contractor classification and IP ownership"},
        {"id": "ip_assignment",        "name": "IP Assignment Agreement",                    "credits": 2, "desc": "Transfer of intellectual property rights"},
        {"id": "client_contract",      "name": "Client Contract",                            "credits": 3, "desc": "End-to-end client engagement terms"},
    ],
    "Corporate & Equity": [
        {"id": "founder_agreement",    "name": "Founder Agreement",                          "credits": 4, "desc": "Roles, equity, and responsibilities between founders"},
        {"id": "cofounder_agreement",  "name": "Co-Founder Agreement",                       "credits": 4, "desc": "Split, vesting, decision rights, and exit clauses"},
        {"id": "shareholder_agreement","name": "Shareholder Agreement",                      "credits": 4, "desc": "Rights, obligations, and exit provisions for shareholders"},
        {"id": "vesting_schedule",     "name": "Equity Vesting Schedule",                   "credits": 3, "desc": "4-year cliff vesting with standard cliff provisions"},
        {"id": "operating_agreement",  "name": "LLC / Operating Agreement Guide",           "credits": 4, "desc": "Management structure, profit distribution, dissolution"},
    ],
    "Finance & Operations": [
        {"id": "invoice_template",     "name": "Invoice Template",                           "credits": 1, "desc": "Professional invoice with payment terms"},
        {"id": "payment_terms",        "name": "Payment Terms Policy",                       "credits": 2, "desc": "Late fees, accepted methods, refund window"},
        {"id": "equity_agreement",     "name": "Equity / SAFE Agreement",                   "credits": 4, "desc": "Simple Agreement for Future Equity"},
        {"id": "business_plan",        "name": "Business Plan Outline",                      "credits": 5, "desc": "Executive summary, market, financial projections"},
        {"id": "sow",                  "name": "Statement of Work (SOW)",                   "credits": 3, "desc": "Project deliverables, timeline, and acceptance criteria"},
        {"id": "project_proposal",     "name": "Project Proposal",                          "credits": 2, "desc": "Scope, cost estimate, and approach for a project"},
    ],
    "HR & Employment": [
        {"id": "offer_letter",         "name": "Offer Letter",                              "credits": 2, "desc": "Job offer with compensation and start date"},
        {"id": "employment_contract",  "name": "Employment Contract",                       "credits": 4, "desc": "Full employment agreement with jurisdiction-specific clauses"},
        {"id": "employee_handbook",    "name": "Employee Handbook Outline",                 "credits": 4, "desc": "Code of conduct, policies, and procedures"},
        {"id": "contractor_guide",     "name": "Contractor vs Employee Classification Guide","credits": 2, "desc": "CRA (Canada) / IRS (US) classification tests and risks"},
    ],
}

# Flat lookup for quick access by id
_DOC_BY_ID: dict = {}
for _cat_docs in DOCUMENT_CATALOG.values():
    for _d in _cat_docs:
        _DOC_BY_ID[_d["id"]] = _d

# ─── Tier Config ──────────────────────────────────────────────────────────────

LEGAL_TIER_CONFIG = {
    "free":    {"monthly_credits": 0,   "max_profiles": 0},
    "starter": {"monthly_credits": 20,  "max_profiles": 1},
    "pro":     {"monthly_credits": 60,  "max_profiles": 3},
    "agency":  {"monthly_credits": 150, "max_profiles": 10},
}

LEGAL_DISCLAIMER = (
    "\n\n---\n"
    "⚠️ **DRAFT DOCUMENT — FOR REVIEW PURPOSES ONLY**\n\n"
    "This document was generated by LaunchBusiness AI on {date} based on {jurisdiction} law "
    "as understood at the time of generation. It has **not** been reviewed by a licensed attorney. "
    "NovaJay Tech makes no representations about its legal validity, accuracy, or compliance "
    "with applicable laws. **You must have this reviewed by a qualified lawyer before signing, "
    "publishing, or relying on it in any way.** Laws change — verify currency before use.\n\n"
    "*Generated by LaunchBusiness AI — LaunchBusinessAI.com*"
)

# ─── Pydantic Models ──────────────────────────────────────────────────────────

class ProfileCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)

class ChatMessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)

class GenerateRequest(BaseModel):
    profile_id: str
    doc_ids: List[str] = Field(..., min_items=1)

class TopupRequest(BaseModel):
    credits: int = Field(..., ge=10, le=500)

# ─── Router ───────────────────────────────────────────────────────────────────

legal_router = APIRouter(prefix="/api/legal", tags=["legal"])
_bearer = HTTPBearer(auto_error=False)

# ─── Auth dependency (mirrors server.py pattern) ──────────────────────────────

async def _auth(creds: HTTPAuthorizationCredentials = Security(_bearer)):
    from server import get_current_user  # late import avoids circular dependency
    return await get_current_user(creds)

# ─── Credit helpers ───────────────────────────────────────────────────────────

def _year_month() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m")

async def _get_credits_info(user: dict) -> dict:
    """Return available, used, and topup credit details for the user."""
    from server import db  # late import
    tier = user.get("tier", "free")
    cfg = LEGAL_TIER_CONFIG.get(tier, LEGAL_TIER_CONFIG["free"])
    monthly_allowance = cfg["monthly_credits"]

    ym = _year_month()
    usage_doc = await db.legal_credits_usage.find_one(
        {"user_id": user["id"], "year_month": ym}
    ) or {}
    monthly_used = usage_doc.get("credits_used", 0)
    monthly_remaining = max(0, monthly_allowance - monthly_used)

    topup = user.get("legal_credits_topup", 0)
    total_available = monthly_remaining + topup

    return {
        "monthly_allowance": monthly_allowance,
        "monthly_used": monthly_used,
        "monthly_remaining": monthly_remaining,
        "topup": topup,
        "total_available": total_available,
        "tier": tier,
        "max_profiles": cfg["max_profiles"],
    }

async def _deduct_credits(user_id: str, amount: int, from_topup: bool = False) -> None:
    """Deduct credits — monthly first, then topup."""
    from server import db  # late import
    ym = _year_month()
    usage_doc = await db.legal_credits_usage.find_one(
        {"user_id": user_id, "year_month": ym}
    ) or {"user_id": user_id, "year_month": ym, "credits_used": 0}

    monthly_used = usage_doc.get("credits_used", 0)
    # Figure out how much comes from monthly vs topup
    user_doc = await db.users.find_one({"id": user_id}) or {}
    tier = user_doc.get("tier", "free")
    monthly_allowance = LEGAL_TIER_CONFIG.get(tier, LEGAL_TIER_CONFIG["free"])["monthly_credits"]
    monthly_remaining = max(0, monthly_allowance - monthly_used)

    from_monthly = min(amount, monthly_remaining)
    from_topup_credits = amount - from_monthly

    if from_monthly > 0:
        await db.legal_credits_usage.update_one(
            {"user_id": user_id, "year_month": ym},
            {"$inc": {"credits_used": from_monthly}},
            upsert=True,
        )
    if from_topup_credits > 0:
        await db.users.update_one(
            {"id": user_id},
            {"$inc": {"legal_credits_topup": -from_topup_credits}},
        )

# ─── Web search for latest legal context ──────────────────────────────────────

async def _search_legal_context(doc_type: str, jurisdiction: str) -> str:
    """Search DuckDuckGo for latest legal requirements for a given document type + jurisdiction."""
    query = f"{doc_type} legal requirements {jurisdiction} 2026"
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True, verify=False) as client:
            r = await client.get(
                "https://duckduckgo.com/html/",
                params={"q": query},
                headers={"User-Agent": "Mozilla/5.0 (compatible; LaunchBusinessAI/1.0)"},
            )
        soup = BeautifulSoup(r.text, "html.parser")
        snippets = []
        for result in soup.select("div.result__body")[:4]:
            title_el = result.select_one("a.result__a")
            snippet_el = result.select_one(".result__snippet")
            if title_el and snippet_el:
                snippets.append(f"• {title_el.get_text(strip=True)}: {snippet_el.get_text(strip=True)}")
        return "\n".join(snippets) if snippets else "No specific recent updates found. Apply standard requirements."
    except Exception:
        return "Web search unavailable. Apply standard requirements for this jurisdiction."

# ─── Gemini call helper ───────────────────────────────────────────────────────

async def _gemini(prompt: str, system: str = "", temperature: float = 0.3) -> str:
    from server import _gemini_client  # late import
    from google.genai import types as gentypes

    if not _gemini_client:
        raise HTTPException(status_code=503, detail="AI service not configured.")
    try:
        cfg = gentypes.GenerateContentConfig(
            system_instruction=system or None,
            temperature=temperature,
            max_output_tokens=4096,
        )
        response = await _gemini_client.aio.models.generate_content(
            model="gemini-2.0-flash",
            contents=[gentypes.Part.from_text(text=prompt)],
            config=cfg,
        )
        return (response.text or "").strip()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")

# ─── Chat system prompt ───────────────────────────────────────────────────────

_CHAT_SYSTEM = """You are a professional legal intake specialist for LaunchBusiness AI.
Your role is to gather essential business information to generate accurate, jurisdiction-specific legal documents.

Be conversational, warm, and efficient. Ask 2-3 related questions at a time — never dump everything at once.
Explain briefly why you need each piece of information so the user understands its importance.

You need to gather (adapt questions to what documents were selected):
1. Business name and what it does (1-2 sentences)
2. Business structure (sole proprietor, LLC, corporation, partnership)
3. Primary jurisdiction: country + province/state if Canada or USA
4. Do they have users/customers in the EU? Canada? California? (compliance triggers)
5. Revenue model: subscription, one-time purchase, freemium, marketplace, consulting
6. What personal data is collected (email, payment info, location, health data, age, etc.)
7. Do they serve users under 18 or under 13? (COPPA/PIPEDA implications)
8. B2B, B2C, or both?
9. Industry type (standard, healthcare, finance, education, legal, real estate)
10. Number of employees (0 = founder only, 1-10, 11-50, 50+)
11. Key third-party services used (Stripe, PayPal, Google Analytics, Mailchimp, AWS, etc.)
12. Do they share or sell user data to third parties?
13. Website/app URL if available (optional)

When you have gathered ALL the information needed, end your response with this exact block:

[PROFILE_COMPLETE]
{"business_name":"...","business_type":"...","business_structure":"...","jurisdiction_country":"...","jurisdiction_region":"...","eu_users":true/false,"canada_users":true/false,"california_users":true/false,"revenue_model":"...","data_collected":["email","payment"...],"serves_minors":false,"min_age":null,"audience":"B2C","industry":"standard","employee_count":"0","third_party_services":["Stripe"...],"shares_data":false,"website":"...","summary":"2-3 sentence plain English description of the business"}

Only include [PROFILE_COMPLETE] when you genuinely have enough to generate accurate documents.
If something is unclear or missing, ask a follow-up instead."""

# ─── Profile endpoints ────────────────────────────────────────────────────────

@legal_router.post("/profiles")
async def create_profile(body: ProfileCreateRequest, user=Depends(_auth)):
    from server import db
    cfg = LEGAL_TIER_CONFIG.get(user.get("tier", "free"), LEGAL_TIER_CONFIG["free"])
    if cfg["max_profiles"] == 0:
        raise HTTPException(
            status_code=403,
            detail="Free plan cannot create business profiles. Upgrade to Starter or higher.",
        )
    existing_count = await db.legal_profiles.count_documents({"user_id": user["id"]})
    if existing_count >= cfg["max_profiles"]:
        raise HTTPException(
            status_code=403,
            detail=f"Your {user.get('tier','free').title()} plan allows up to {cfg['max_profiles']} business profile(s). "
                   f"Upgrade or delete an existing profile.",
        )
    profile = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "name": body.name.strip(),
        "intake_complete": False,
        "intake_data": {},
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.legal_profiles.insert_one(profile)
    return {k: v for k, v in profile.items() if k != "_id"}


@legal_router.get("/profiles")
async def list_profiles(user=Depends(_auth)):
    from server import db
    profiles = await db.legal_profiles.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(20)
    return profiles


@legal_router.delete("/profiles/{profile_id}")
async def delete_profile(profile_id: str, user=Depends(_auth)):
    from server import db
    res = await db.legal_profiles.delete_one({"id": profile_id, "user_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Profile not found.")
    # Clean up associated chat + documents
    await db.legal_chat.delete_many({"profile_id": profile_id})
    await db.legal_documents.delete_many({"profile_id": profile_id})
    return {"ok": True}

# ─── Chat endpoints ───────────────────────────────────────────────────────────

@legal_router.get("/chat/{profile_id}")
async def get_chat_history(profile_id: str, user=Depends(_auth)):
    from server import db
    profile = await db.legal_profiles.find_one({"id": profile_id, "user_id": user["id"]})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found.")
    messages = await db.legal_chat.find(
        {"profile_id": profile_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(200)
    return {
        "messages": messages,
        "intake_complete": profile.get("intake_complete", False),
        "intake_data": profile.get("intake_data", {}),
    }


@legal_router.post("/chat/{profile_id}")
async def send_chat_message(profile_id: str, body: ChatMessageRequest, user=Depends(_auth)):
    from server import db

    # Free users can't use legal feature
    tier = user.get("tier", "free")
    if tier == "free":
        raise HTTPException(
            status_code=403,
            detail="Legal documents require a paid plan. Upgrade to Starter or higher.",
        )

    profile = await db.legal_profiles.find_one({"id": profile_id, "user_id": user["id"]})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found.")

    # Load existing chat history
    history = await db.legal_chat.find(
        {"profile_id": profile_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(100)

    # Build conversation context for Gemini
    conversation_parts = []
    for msg in history:
        role_prefix = "User" if msg["role"] == "user" else "Assistant"
        conversation_parts.append(f"{role_prefix}: {msg['content']}")
    conversation_parts.append(f"User: {body.message}")
    full_conversation = "\n\n".join(conversation_parts)

    # Save user message
    user_msg = {
        "id": str(uuid.uuid4()),
        "profile_id": profile_id,
        "role": "user",
        "content": body.message,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.legal_chat.insert_one(user_msg)

    # Generate AI response
    prompt = f"Continue this intake conversation.\n\n{full_conversation}\n\nAssistant:"
    ai_text = await _gemini(prompt, system=_CHAT_SYSTEM, temperature=0.4)

    # Check if profile is complete
    intake_complete = False
    intake_data = {}
    if "[PROFILE_COMPLETE]" in ai_text:
        try:
            json_match = re.search(r"\[PROFILE_COMPLETE\]\s*(\{.*\})", ai_text, re.DOTALL)
            if json_match:
                intake_data = json.loads(json_match.group(1))
                intake_complete = True
                # Remove the JSON block from the displayed message
                display_text = ai_text[:ai_text.index("[PROFILE_COMPLETE]")].strip()
                if display_text:
                    display_text += "\n\n✅ **I have all the information I need!** You can now select the documents you want to generate."
                else:
                    display_text = "✅ **Perfect — I have everything I need!** Head over to the Document Catalog to select which documents you'd like to generate."
                ai_text = display_text
                await db.legal_profiles.update_one(
                    {"id": profile_id},
                    {"$set": {
                        "intake_complete": True,
                        "intake_data": intake_data,
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }},
                )
        except (json.JSONDecodeError, Exception):
            pass  # keep going even if parsing fails

    # Save AI message
    ai_msg = {
        "id": str(uuid.uuid4()),
        "profile_id": profile_id,
        "role": "assistant",
        "content": ai_text,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.legal_chat.insert_one(ai_msg)

    return {
        "message": {k: v for k, v in ai_msg.items() if k != "_id"},
        "intake_complete": intake_complete,
        "intake_data": intake_data,
    }


@legal_router.post("/chat/{profile_id}/start")
async def start_chat(profile_id: str, user=Depends(_auth)):
    """Send an initial greeting message from the AI to kick off the intake."""
    from server import db

    tier = user.get("tier", "free")
    if tier == "free":
        raise HTTPException(status_code=403, detail="Legal documents require a paid plan.")

    profile = await db.legal_profiles.find_one({"id": profile_id, "user_id": user["id"]})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found.")

    # Check if chat already started
    existing = await db.legal_chat.count_documents({"profile_id": profile_id})
    if existing > 0:
        raise HTTPException(status_code=400, detail="Chat already started for this profile.")

    greeting = (
        f"Hi! I'm here to help generate the legal documents for **{profile['name']}**. "
        "This should only take a few minutes.\n\n"
        "Let's start with the basics:\n\n"
        "1. **What does your business do?** Give me a 1-2 sentence description.\n"
        "2. **What's the business structure?** (sole proprietor, LLC, corporation, partnership)\n"
        "3. **Where is the business registered/operating?** Country and province/state if applicable."
    )

    msg = {
        "id": str(uuid.uuid4()),
        "profile_id": profile_id,
        "role": "assistant",
        "content": greeting,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.legal_chat.insert_one(msg)
    return {"message": {k: v for k, v in msg.items() if k != "_id"}}

# ─── Catalog endpoint ─────────────────────────────────────────────────────────

@legal_router.get("/catalog")
async def get_catalog(user=Depends(_auth)):
    credits_info = await _get_credits_info(user)
    return {
        "catalog": DOCUMENT_CATALOG,
        "credits": credits_info,
    }

# ─── Generate endpoint ────────────────────────────────────────────────────────

@legal_router.post("/generate")
async def generate_documents(body: GenerateRequest, user=Depends(_auth)):
    from server import db

    tier = user.get("tier", "free")
    if tier == "free":
        raise HTTPException(status_code=403, detail="Document generation requires a paid plan.")

    # Validate profile
    profile = await db.legal_profiles.find_one({"id": body.profile_id, "user_id": user["id"]})
    if not profile:
        raise HTTPException(status_code=404, detail="Business profile not found.")
    if not profile.get("intake_complete"):
        raise HTTPException(
            status_code=400,
            detail="Complete the intake chat before generating documents.",
        )

    # Validate doc IDs
    invalid = [d for d in body.doc_ids if d not in _DOC_BY_ID]
    if invalid:
        raise HTTPException(status_code=400, detail=f"Unknown document IDs: {invalid}")

    # Calculate total credits required
    total_credits = sum(_DOC_BY_ID[d]["credits"] for d in body.doc_ids)
    credits_info = await _get_credits_info(user)
    if credits_info["total_available"] < total_credits:
        raise HTTPException(
            status_code=402,
            detail=(
                f"Not enough credits. Need {total_credits}, have {credits_info['total_available']}. "
                "Purchase a topup or wait for your monthly renewal."
            ),
        )

    intake = profile.get("intake_data", {})
    jurisdiction = f"{intake.get('jurisdiction_country', 'Canada')} {intake.get('jurisdiction_region', '')}".strip()
    generated_docs = []

    for doc_id in body.doc_ids:
        doc_meta = _DOC_BY_ID[doc_id]
        doc_name = doc_meta["name"]
        credits = doc_meta["credits"]

        # 1. Fetch latest legal context
        legal_context = await _search_legal_context(doc_name, jurisdiction)

        # 2. Build generation prompt
        intake_summary = json.dumps(intake, indent=2)
        generation_prompt = f"""Generate a complete, professional {doc_name} for the following business.

BUSINESS PROFILE:
{intake_summary}

JURISDICTION: {jurisdiction}

LATEST LEGAL REQUIREMENTS (as of 2026):
{legal_context}

INSTRUCTIONS:
- Write a complete, properly formatted legal document ready for lawyer review
- Include all sections standard for {doc_name} in {jurisdiction}
- Use formal legal language with numbered sections and clear headings
- Where specific information is unknown, use clearly marked placeholders like [COMPANY LEGAL NAME], [ADDRESS], [DATE]
- Apply jurisdiction-specific requirements (e.g., GDPR clauses if EU users detected, PIPEDA if Canada)
- Tailor every clause to the specific business type and data practices described
- Do NOT use generic templates — make this specific to this business
- Format in proper Markdown with # Section headings

Generate the complete {doc_name} now:"""

        content = await _gemini(generation_prompt, temperature=0.2)

        # 3. Append disclaimer
        disclaimer = LEGAL_DISCLAIMER.format(
            date=datetime.now(timezone.utc).strftime("%B %d, %Y"),
            jurisdiction=jurisdiction,
        )
        content = content + disclaimer

        # 4. Save document
        doc_record = {
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "profile_id": body.profile_id,
            "doc_id": doc_id,
            "doc_name": doc_name,
            "jurisdiction": jurisdiction,
            "content": content,
            "credits_cost": credits,
            "intake_snapshot": intake,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "laws_version": "2026-06",
        }
        await db.legal_documents.insert_one(doc_record)
        generated_docs.append({k: v for k, v in doc_record.items() if k not in ("_id", "content")})

    # 5. Deduct credits after all docs generated successfully
    await _deduct_credits(user["id"], total_credits)

    return {
        "generated": generated_docs,
        "credits_used": total_credits,
        "credits_remaining": credits_info["total_available"] - total_credits,
    }

# ─── Document history & retrieval ─────────────────────────────────────────────

@legal_router.get("/history/{profile_id}")
async def get_document_history(profile_id: str, user=Depends(_auth)):
    from server import db
    profile = await db.legal_profiles.find_one({"id": profile_id, "user_id": user["id"]})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found.")
    docs = await db.legal_documents.find(
        {"profile_id": profile_id, "user_id": user["id"]},
        {"_id": 0, "content": 0},  # exclude full content from list view
    ).sort("generated_at", -1).to_list(100)
    return docs


@legal_router.get("/document/{doc_record_id}")
async def get_document(doc_record_id: str, user=Depends(_auth)):
    from server import db
    doc = await db.legal_documents.find_one(
        {"id": doc_record_id, "user_id": user["id"]}, {"_id": 0}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    # Flag if older than 90 days
    try:
        gen_date = datetime.fromisoformat(doc["generated_at"])
        age_days = (datetime.now(timezone.utc) - gen_date).days
        doc["age_days"] = age_days
        doc["laws_may_have_changed"] = age_days >= 90
    except Exception:
        doc["age_days"] = 0
        doc["laws_may_have_changed"] = False
    return doc


@legal_router.post("/regenerate/{doc_record_id}")
async def regenerate_document(doc_record_id: str, user=Depends(_auth)):
    """Regenerate a previously generated document at 10% credit discount."""
    from server import db

    original = await db.legal_documents.find_one(
        {"id": doc_record_id, "user_id": user["id"]}, {"_id": 0}
    )
    if not original:
        raise HTTPException(status_code=404, detail="Document not found.")

    original_cost = original.get("credits_cost", _DOC_BY_ID.get(original["doc_id"], {}).get("credits", 3))
    regen_cost = max(1, int(original_cost * 0.9))  # 10% off, minimum 1 credit

    credits_info = await _get_credits_info(user)
    if credits_info["total_available"] < regen_cost:
        raise HTTPException(
            status_code=402,
            detail=f"Not enough credits. Need {regen_cost}, have {credits_info['total_available']}.",
        )

    # Get latest profile data
    profile = await db.legal_profiles.find_one({"id": original["profile_id"], "user_id": user["id"]})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile no longer exists.")

    intake = profile.get("intake_data", original.get("intake_snapshot", {}))
    jurisdiction = original["jurisdiction"]
    doc_name = original["doc_name"]

    legal_context = await _search_legal_context(doc_name, jurisdiction)
    intake_summary = json.dumps(intake, indent=2)

    generation_prompt = f"""Generate a complete, professional {doc_name} for the following business.
This is a regeneration with the latest 2026 legal requirements applied.

BUSINESS PROFILE:
{intake_summary}

JURISDICTION: {jurisdiction}

LATEST LEGAL REQUIREMENTS (2026 — this regeneration fetches the most current requirements):
{legal_context}

Generate the complete, up-to-date {doc_name} now. Apply all 2026 regulatory updates:"""

    content = await _gemini(generation_prompt, temperature=0.2)
    disclaimer = LEGAL_DISCLAIMER.format(
        date=datetime.now(timezone.utc).strftime("%B %d, %Y"),
        jurisdiction=jurisdiction,
    )
    content = content + disclaimer

    new_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "profile_id": original["profile_id"],
        "doc_id": original["doc_id"],
        "doc_name": doc_name,
        "jurisdiction": jurisdiction,
        "content": content,
        "credits_cost": regen_cost,
        "intake_snapshot": intake,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "laws_version": "2026-06",
        "regenerated_from": doc_record_id,
    }
    await db.legal_documents.insert_one(new_doc)
    await _deduct_credits(user["id"], regen_cost)

    return {
        "document": {k: v for k, v in new_doc.items() if k != "_id"},
        "credits_used": regen_cost,
        "discount_applied": original_cost - regen_cost,
    }

# ─── Credits endpoint ─────────────────────────────────────────────────────────

@legal_router.get("/credits")
async def get_credits(user=Depends(_auth)):
    return await _get_credits_info(user)
