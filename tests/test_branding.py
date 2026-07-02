"""
Source-level guards for brand/domain consistency.

Prevents stale swiftpackai.tech or swiftpack-web references from shipping
to production — these break SEO, error grouping, and monitoring dashboards.

Note: the secrets file on the VPS IS named swiftpack.env (legacy filename) —
these tests intentionally allow "swiftpack.env" references and only block the
old domain name and stale product names.

Run locally:  pytest tests/ -q
"""

from pathlib import Path
import pytest

ROOT = Path(__file__).resolve().parent.parent
BACKEND = ROOT / "backend"
FRONTEND_SRC = ROOT / "frontend" / "src"
FRONTEND_PUBLIC = ROOT / "frontend" / "public"


# ── Domain name ───────────────────────────────────────────────────────────────

def test_robots_txt_has_correct_domain():
    src = (FRONTEND_PUBLIC / "robots.txt").read_text(encoding="utf-8")
    assert "swiftpackai.tech" not in src, (
        "robots.txt Sitemap still points to swiftpackai.tech — "
        "search engines will follow the wrong sitemap URL"
    )
    assert "launchbusinessai.com" in src, (
        "robots.txt Sitemap does not reference launchbusinessai.com"
    )


def test_sitemap_has_correct_domain():
    src = (FRONTEND_PUBLIC / "sitemap.xml").read_text(encoding="utf-8")
    assert "swiftpackai.tech" not in src, (
        "sitemap.xml still references swiftpackai.tech — "
        "Google Search Console will report a domain mismatch"
    )
    assert "launchbusinessai.com" in src, (
        "sitemap.xml does not reference launchbusinessai.com"
    )


def test_sitemap_covers_legal_page():
    src = (FRONTEND_PUBLIC / "sitemap.xml").read_text(encoding="utf-8")
    assert "/legal" in src, (
        "sitemap.xml missing /legal — AI Legal Document generator is not indexed"
    )


def test_sitemap_covers_logo_page():
    src = (FRONTEND_PUBLIC / "sitemap.xml").read_text(encoding="utf-8")
    assert "/logo" in src, (
        "sitemap.xml missing /logo — Logo Creator is not indexed"
    )


def test_sitemap_covers_privacy_and_terms():
    src = (FRONTEND_PUBLIC / "sitemap.xml").read_text(encoding="utf-8")
    assert "/privacy" in src and "/terms" in src, (
        "sitemap.xml missing /privacy or /terms — legal pages are not indexed"
    )


# ── Sentry / monitoring ───────────────────────────────────────────────────────

def test_sentry_release_tag_not_swiftpack():
    src = (FRONTEND_SRC / "index.js").read_text(encoding="utf-8")
    assert "swiftpack-web" not in src, (
        "index.js Sentry release tag still references 'swiftpack-web' — "
        "errors in Sentry will be grouped under the wrong release"
    )


# ── JARVIS pulse endpoint ─────────────────────────────────────────────────────

def test_jarvis_pulse_service_name():
    src = (BACKEND / "jarvis_router.py").read_text(encoding="utf-8")
    assert '"service":   "swiftpack"' not in src and "'service': 'swiftpack'" not in src, (
        "jarvis_router.py JARVIS pulse still reports service='swiftpack' — "
        "monitoring dashboards will show the wrong product name"
    )
    assert "launchbusiness" in src, (
        "jarvis_router.py JARVIS pulse does not report launchbusiness as the service name"
    )


# ── Frontend JS — no old domain in source ────────────────────────────────────

def _js_files():
    return list(FRONTEND_SRC.rglob("*.js"))


def test_no_swiftpackai_domain_in_frontend():
    violations = []
    for f in _js_files():
        src = f.read_text(encoding="utf-8")
        if "swiftpackai.tech" in src:
            violations.append(f.relative_to(ROOT))
    assert not violations, (
        f"Old domain swiftpackai.tech found in frontend source: {violations}"
    )
