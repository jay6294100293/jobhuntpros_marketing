"""
Source-level guards for PostHog analytics event coverage.

Verifies that key conversion events cannot be silently removed —
if a file loses its posthog.capture() call, the funnel breaks invisibly.

Run locally:  pytest tests/ -q
"""

from pathlib import Path
import pytest

FRONTEND = Path(__file__).resolve().parent.parent / "frontend" / "src"


def _read(rel_path: str) -> str:
    return (FRONTEND / rel_path).read_text(encoding="utf-8")


# ── Acquisition ───────────────────────────────────────────────────────────────

def test_user_registered_tracked():
    src = _read("components/auth/Register.js")
    assert "user_registered" in src, (
        "Register.js no longer fires user_registered — "
        "cannot measure signup conversion in PostHog"
    )


# ── Core product — Magic Button ───────────────────────────────────────────────

def test_magic_button_started_tracked():
    src = _read("components/Dashboard.js")
    assert "magic_button_started" in src, (
        "Dashboard.js no longer fires magic_button_started — "
        "cannot measure funnel entry"
    )


def test_magic_button_completed_tracked():
    src = _read("components/Dashboard.js")
    assert "magic_button_completed" in src, (
        "Dashboard.js no longer fires magic_button_completed — "
        "cannot measure funnel completion or video output volume"
    )


# ── Core product — Logo ───────────────────────────────────────────────────────

def test_logo_created_tracked():
    src = _read("components/LogoCreator.js")
    assert "logo_created" in src, (
        "LogoCreator.js no longer fires logo_created — "
        "cannot measure logo feature adoption"
    )


def test_logo_kit_created_tracked():
    src = _read("components/LogoCreator.js")
    assert "logo_kit_created" in src, (
        "LogoCreator.js no longer fires logo_kit_created — "
        "cannot measure brand kit usage"
    )


# ── Core product — Legal ──────────────────────────────────────────────────────

def test_legal_generation_started_tracked():
    src = _read("components/legal/DocumentCatalog.js")
    assert "legal_generation_started" in src, (
        "DocumentCatalog.js no longer fires legal_generation_started — "
        "cannot measure legal funnel entry"
    )


def test_legal_generation_completed_tracked():
    src = _read("components/legal/DocumentCatalog.js")
    assert "legal_generation_completed" in src, (
        "DocumentCatalog.js no longer fires legal_generation_completed — "
        "cannot measure legal generation success rate"
    )


def test_legal_doc_downloaded_tracked():
    src = _read("components/legal/DocumentVault.js")
    assert "legal_doc_downloaded" in src, (
        "DocumentVault.js no longer fires legal_doc_downloaded — "
        "cannot measure actual document consumption vs generation"
    )


# ── Revenue ───────────────────────────────────────────────────────────────────

def test_upgrade_clicked_tracked():
    src = _read("components/Pricing.js")
    assert "upgrade_clicked" in src, (
        "Pricing.js no longer fires upgrade_clicked — "
        "cannot measure pricing page → checkout conversion"
    )


def test_upgrade_completed_tracked():
    src = _read("context/AuthContext.js")
    assert "upgrade_completed" in src, (
        "AuthContext.js no longer fires upgrade_completed on the ?upgraded=true redirect — "
        "cannot measure checkout → paid conversion in PostHog"
    )


# ── Sentry release tag ────────────────────────────────────────────────────────

def test_sentry_release_tag_is_launchbusiness():
    src = _read("index.js")
    assert "swiftpack-web" not in src, (
        "index.js Sentry release tag still references 'swiftpack-web' — "
        "Sentry errors will be grouped under the wrong project name"
    )
    assert "launchbusiness" in src, (
        "index.js Sentry release tag does not reference 'launchbusiness'"
    )


def test_posthog_opt_out_by_default():
    src = _read("index.js")
    assert "opt_out_capturing_by_default" in src, (
        "PostHog no longer opts out by default — "
        "analytics captures before cookie consent, violating GDPR/PIPEDA"
    )
