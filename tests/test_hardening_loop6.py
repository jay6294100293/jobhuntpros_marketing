"""
Source-level guards for Loop 6 hardening.

Covers:
  - MODAL_SADTALKER_APP default name
  - Login response token strip
  - Rate limiter eviction (memory leak fix)
  - package.json branding
  - REACT_APP_POSTHOG_HOST in docker-compose build args

Run locally:  pytest tests/ -q
"""

import ast
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BACKEND = ROOT / "backend"
SERVER = BACKEND / "server.py"
FRONTEND = ROOT / "frontend"


def _server_src() -> str:
    return SERVER.read_text(encoding="utf-8")


# ── CP-007: MODAL_SADTALKER_APP default ──────────────────────────────────────

def test_modal_sadtalker_app_default_is_launchbusiness():
    src = _server_src()
    assert "swiftpack-sadtalker" not in src, (
        "server.py MODAL_SADTALKER_APP still defaults to 'swiftpack-sadtalker' — "
        "talking head would call a non-existent Modal app if env var is not set"
    )
    assert "launchbusiness-sadtalker" in src, (
        "server.py MODAL_SADTALKER_APP does not default to 'launchbusiness-sadtalker'"
    )


# ── CP-008: Login response token strip ───────────────────────────────────────

def _login_fn(tree):
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == "login":
            return node
    return None


def test_login_strips_password_reset_token():
    tree = ast.parse(_server_src(), filename=str(SERVER))
    node = _login_fn(tree)
    assert node is not None, "login() not found in server.py"
    src = ast.unparse(node)
    assert "password_reset_token" in src, (
        "login() no longer strips password_reset_token — "
        "a pending reset token could be exposed in the login response"
    )


def test_login_strips_email_verification_token():
    tree = ast.parse(_server_src(), filename=str(SERVER))
    node = _login_fn(tree)
    assert node is not None
    src = ast.unparse(node)
    assert "email_verification_token" in src, (
        "login() no longer strips email_verification_token — "
        "an active verification token could be exposed in the login response"
    )


# ── CP-011: Rate limiter eviction ────────────────────────────────────────────

def test_rate_store_evicts_stale_entries():
    src = _server_src()
    assert "_rate_store.pop(ip" in src or "del _rate_store[ip]" in src, (
        "rate_limit_middleware no longer evicts stale IP entries — "
        "_rate_store will grow unbounded over time"
    )


def test_rate_limiter_uses_get_to_avoid_defaultdict_creation():
    src = _server_src()
    assert "_rate_store.get(ip" in src, (
        "rate_limit_middleware no longer uses _rate_store.get() for reads — "
        "defaultdict access would create an empty entry for every incoming IP"
    )


# ── CP-010: package.json branding ────────────────────────────────────────────

def test_package_json_name_is_launchbusiness():
    pkg = json.loads((FRONTEND / "package.json").read_text(encoding="utf-8"))
    assert pkg["name"] != "frontend", (
        "package.json name is still 'frontend' — "
        "PWA manifest and build tooling will use the wrong app name"
    )
    assert pkg["name"] == "launchbusiness-ai", (
        f"package.json name is '{pkg['name']}', expected 'launchbusiness-ai'"
    )


def test_package_json_version_is_1_0_0():
    pkg = json.loads((FRONTEND / "package.json").read_text(encoding="utf-8"))
    assert pkg["version"] == "1.0.0", (
        f"package.json version is '{pkg['version']}', expected '1.0.0'"
    )


# ── CP-009: REACT_APP_POSTHOG_HOST in prod compose ───────────────────────────

def test_prod_compose_includes_posthog_host():
    src = (ROOT / "docker-compose.prod.yml").read_text(encoding="utf-8")
    assert "REACT_APP_POSTHOG_HOST" in src, (
        "docker-compose.prod.yml missing REACT_APP_POSTHOG_HOST build arg — "
        "EU PostHog region would silently fall back to US endpoint"
    )
