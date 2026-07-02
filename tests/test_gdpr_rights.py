"""
Source-level guards for GDPR/PIPEDA/CCPA user rights:
  - Right to erasure (Art. 17)  — delete_account()    [existing]
  - Right to portability (Art. 20) — export_data()    [new: Loop 3]
  - Cookie consent                 — CookieBanner.js  [new: Loop 3]

WHY source-level: CI installs only pytest — no FastAPI, Motor, or secrets.

Run locally:  pytest tests/ -q
"""

import ast
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
SERVER = BACKEND_DIR / "server.py"
FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend" / "src"


@pytest.fixture(scope="module")
def server_src() -> str:
    return SERVER.read_text(encoding="utf-8-sig")


@pytest.fixture(scope="module")
def server_ast(server_src):
    return ast.parse(server_src, filename=str(SERVER))


def _fn(tree, name):
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == name:
            return node
    return None


# ── Right to portability (Art. 20) ───────────────────────────────────────────


def test_export_data_endpoint_exists(server_ast):
    node = _fn(server_ast, "export_data")
    assert node is not None, (
        "export_data() endpoint not found — GDPR Art. 20 right to portability is not implemented"
    )


def test_export_data_requires_auth(server_ast):
    node = _fn(server_ast, "export_data")
    assert node is not None
    src = ast.unparse(node)
    assert "get_current_user" in src, (
        "export_data() no longer requires authentication — "
        "any caller could export another user's data"
    )


def test_export_strips_password_hash(server_ast):
    node = _fn(server_ast, "export_data")
    assert node is not None
    src = ast.unparse(node)
    assert "hashed_password" in src, (
        "export_data() no longer explicitly strips hashed_password — "
        "password hashes may be included in the export bundle"
    )


def test_export_strips_reset_token(server_ast):
    node = _fn(server_ast, "export_data")
    assert node is not None
    src = ast.unparse(node)
    assert "password_reset_token" in src, (
        "export_data() no longer strips password_reset_token — "
        "active reset tokens may be included in the export bundle"
    )


def test_export_includes_payment_transactions(server_ast):
    node = _fn(server_ast, "export_data")
    assert node is not None
    src = ast.unparse(node)
    assert "payment_transactions" in src, (
        "payment_transactions missing from export — users have a right to their payment history"
    )


def test_export_includes_legal_documents(server_ast):
    node = _fn(server_ast, "export_data")
    assert node is not None
    src = ast.unparse(node)
    assert "legal_documents" in src, (
        "legal_documents missing from data export — user-generated documents must be portable"
    )


def test_payment_transactions_excluded_from_erasure(server_src):
    """Financial records must be kept — never added to the erasure list."""
    tree = ast.parse(server_src, filename=str(SERVER))
    erasure = None
    for node in ast.walk(tree):
        if isinstance(node, ast.Assign):
            for tgt in node.targets:
                if isinstance(tgt, ast.Name) and tgt.id == "_ERASURE_COLLECTIONS":
                    erasure = {el.value for el in node.value.elts if isinstance(el, ast.Constant)}
    assert erasure is not None, "_ERASURE_COLLECTIONS not found in server.py"
    assert "payment_transactions" not in erasure, (
        "payment_transactions must not be erased — required for financial record-keeping"
    )


# ── Cookie consent banner ─────────────────────────────────────────────────────


def test_cookie_banner_component_exists():
    banner = FRONTEND_DIR / "components" / "CookieBanner.js"
    assert banner.exists(), "CookieBanner.js missing — cookie consent UI not implemented"


def test_cookie_banner_mounted_in_app():
    app = FRONTEND_DIR / "App.js"
    assert app.exists()
    src = app.read_text(encoding="utf-8")
    assert "CookieBanner" in src, (
        "CookieBanner not imported or mounted in App.js — "
        "cookie consent banner will never appear"
    )


def test_cookie_banner_links_to_privacy_policy():
    banner = FRONTEND_DIR / "components" / "CookieBanner.js"
    assert banner.exists()
    src = banner.read_text(encoding="utf-8")
    assert "/privacy" in src, (
        "CookieBanner does not link to /privacy — "
        "PIPEDA/GDPR require a link to the privacy policy from the consent notice"
    )


def test_cookie_banner_has_decline_option():
    banner = FRONTEND_DIR / "components" / "CookieBanner.js"
    src = banner.read_text(encoding="utf-8")
    assert "decline" in src.lower() or "opt_out" in src.lower(), (
        "CookieBanner has no decline option — "
        "GDPR/PIPEDA require that consent can be refused"
    )


def test_posthog_respects_consent(server_src):
    index = FRONTEND_DIR.parent / "src" / "index.js"
    assert index.exists()
    src = index.read_text(encoding="utf-8")
    assert "opt_out_capturing_by_default" in src, (
        "PostHog is not set to opt_out_capturing_by_default — "
        "analytics captures before the user consents, violating GDPR/PIPEDA"
    )


# ── Settings page surfaces both rights ───────────────────────────────────────


def test_settings_has_export_button():
    settings = FRONTEND_DIR / "components" / "Settings.js"
    assert settings.exists()
    src = settings.read_text(encoding="utf-8")
    assert "export-data" in src or "handleExport" in src, (
        "Settings.js no longer has a data export action — "
        "users cannot exercise their right to portability from the UI"
    )


def test_settings_has_delete_button():
    settings = FRONTEND_DIR / "components" / "Settings.js"
    src = settings.read_text(encoding="utf-8")
    assert "delete" in src.lower() and "account" in src.lower(), (
        "Settings.js no longer has an account deletion action — "
        "users cannot exercise their right to erasure from the UI"
    )
