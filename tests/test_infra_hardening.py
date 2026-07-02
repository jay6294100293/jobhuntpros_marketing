"""
Source-level guards for infrastructure hardening (Loop 7).

Covers:
  - nginx HSTS header
  - nginx Permissions-Policy header
  - nginx Magic Button extended timeout
  - Docker HEALTHCHECK

Run locally:  pytest tests/ -q
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NGINX_CONF = ROOT / "nginx" / "nginx.prod.conf"
DOCKERFILE = ROOT / "backend" / "Dockerfile"


def _nginx() -> str:
    return NGINX_CONF.read_text(encoding="utf-8")


def _dockerfile() -> str:
    return DOCKERFILE.read_text(encoding="utf-8")


# ── CP-012: HSTS ─────────────────────────────────────────────────────────────

def test_nginx_has_hsts_header():
    assert "Strict-Transport-Security" in _nginx(), (
        "nginx.prod.conf missing Strict-Transport-Security — "
        "browsers will never learn to skip the HTTP→HTTPS redirect, "
        "leaving users vulnerable to SSL stripping"
    )


def test_nginx_hsts_has_long_max_age():
    cfg = _nginx()
    assert "63072000" in cfg or "31536000" in cfg, (
        "HSTS max-age is too short — should be at least 1 year (31536000s)"
    )


def test_nginx_hsts_includes_subdomains():
    cfg = _nginx()
    assert "includeSubDomains" in cfg, (
        "HSTS is missing includeSubDomains — subdomains remain vulnerable to downgrade"
    )


# ── CP-015: Permissions-Policy ───────────────────────────────────────────────

def test_nginx_has_permissions_policy():
    assert "Permissions-Policy" in _nginx(), (
        "nginx.prod.conf missing Permissions-Policy — "
        "browser APIs (camera, microphone, geolocation) are unrestricted"
    )


def test_nginx_permissions_policy_blocks_camera():
    cfg = _nginx()
    assert "camera=()" in cfg, (
        "Permissions-Policy does not block camera access"
    )


# ── CP-013: Magic Button extended timeout ─────────────────────────────────────

def test_nginx_magic_button_location_exists():
    cfg = _nginx()
    assert "/api/magic-button" in cfg, (
        "nginx.prod.conf has no dedicated location for /api/magic-button — "
        "the route uses the generic 120s /api/ timeout, which can 504 on slow Gemini/Modal"
    )


def test_nginx_magic_button_has_180s_timeout():
    cfg = _nginx()
    assert "180s" in cfg, (
        "Magic Button nginx location does not use 180s timeout — "
        "slow Gemini or Modal cold starts will hit the 120s 504 limit"
    )


def test_nginx_magic_launch_pack_location_exists():
    cfg = _nginx()
    assert "/api/magic-launch-pack" in cfg, (
        "nginx.prod.conf has no dedicated location for /api/magic-launch-pack"
    )


# ── CP-014: Docker HEALTHCHECK ───────────────────────────────────────────────

def test_dockerfile_has_healthcheck():
    assert "HEALTHCHECK" in _dockerfile(), (
        "backend/Dockerfile has no HEALTHCHECK — "
        "Docker cannot detect a hung backend and will not restart it automatically"
    )


def test_dockerfile_healthcheck_hits_api_endpoint():
    cfg = _dockerfile()
    assert "/api/" in cfg and "HEALTHCHECK" in cfg, (
        "Dockerfile HEALTHCHECK does not probe /api/ — "
        "it may not reflect actual FastAPI readiness"
    )


def test_dockerfile_healthcheck_has_start_period():
    assert "start-period" in _dockerfile(), (
        "HEALTHCHECK missing --start-period — "
        "Docker will fail-count health checks during the ~30s startup, "
        "potentially killing the container before FastAPI is ready"
    )
