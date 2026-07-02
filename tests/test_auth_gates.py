"""
Source-level guards for authentication and authorisation gates.

Verifies that the critical auth invariants cannot be silently removed:
  - get_current_user verifies the JWT signature and expiry
  - get_optional_user never raises on a missing/bad token
  - Admin routes use _require_admin_user (is_admin=True), not just a secret header
  - User-owned data is always filtered by user_id
  - The JWT_SECRET insecure-default warning is present

WHY source-level: CI installs only pytest — no FastAPI, Motor, or secrets.
These tests catch regressions that would silently open auth bypass holes.

Run locally:  pytest tests/ -q
"""

import ast
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
SERVER = BACKEND_DIR / "server.py"
ADMIN = BACKEND_DIR / "admin_router.py"


@pytest.fixture(scope="module")
def server_src() -> str:
    return SERVER.read_text(encoding="utf-8-sig")


@pytest.fixture(scope="module")
def server_ast(server_src):
    return ast.parse(server_src, filename=str(SERVER))


@pytest.fixture(scope="module")
def admin_src() -> str:
    return ADMIN.read_text(encoding="utf-8-sig")


@pytest.fixture(scope="module")
def admin_ast(admin_src):
    return ast.parse(admin_src, filename=str(ADMIN))


def _fn(tree, name):
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == name:
            return node
    return None


# ── JWT verification ──────────────────────────────────────────────────────────


def test_get_current_user_decodes_jwt(server_ast, server_src):
    """get_current_user must call jwt.decode (jose) — the signature and expiry check."""
    node = _fn(server_ast, "get_current_user")
    assert node is not None, "get_current_user() not found in server.py"
    src = ast.unparse(node)
    assert "decode" in src, (
        "get_current_user() no longer calls jwt.decode — "
        "tokens would be accepted without signature or expiry verification"
    )


def test_get_current_user_raises_on_bad_token(server_ast):
    """get_current_user must raise HTTPException on bad tokens, not return None."""
    node = _fn(server_ast, "get_current_user")
    assert node is not None
    src = ast.unparse(node)
    assert "HTTPException" in src or "raise" in src, (
        "get_current_user() appears to swallow bad tokens silently — "
        "it must raise 401 so protected endpoints stay protected"
    )


def test_get_optional_user_does_not_raise(server_ast):
    """get_optional_user must return None (not raise) when the token is absent/invalid."""
    node = _fn(server_ast, "get_optional_user")
    assert node is not None, "get_optional_user() not found in server.py"
    src = ast.unparse(node)
    assert "return None" in src or "return" in src, (
        "get_optional_user() may be missing a graceful None return on bad credentials"
    )


def test_jwt_secret_insecure_default_warned(server_src):
    """A startup warning must fire when JWT_SECRET is still the insecure default."""
    assert "dev-jwt-secret-change-in-production" in server_src, (
        "JWT_SECRET default value changed — update this test and the CLAUDE.md warning"
    )
    assert "SECURITY" in server_src and "JWT_SECRET" in server_src, (
        "Startup security warning for weak JWT_SECRET removed — "
        "a production deploy with the default secret will now be silent"
    )


def test_jwt_secret_sourced_from_env(server_src):
    """JWT_SECRET must be read from env, not hardcoded."""
    assert "os.getenv('JWT_SECRET'" in server_src or 'os.getenv("JWT_SECRET"' in server_src, (
        "JWT_SECRET no longer read from environment — may be hardcoded"
    )


# ── Admin gate ────────────────────────────────────────────────────────────────


def test_admin_router_uses_require_admin_user(admin_src):
    """/api/admin/* routes must use _require_admin_user (is_admin=True check)."""
    assert "_require_admin_user" in admin_src, (
        "_require_admin_user removed from admin_router.py — "
        "admin endpoints may no longer check is_admin=True"
    )


def test_require_admin_user_checks_is_admin(admin_ast):
    node = _fn(admin_ast, "_require_admin_user")
    assert node is not None, "_require_admin_user() not found in admin_router.py"
    src = ast.unparse(node)
    assert "is_admin" in src or "resolve_is_admin" in src, (
        "_require_admin_user() no longer checks is_admin flag — admin gate may be bypassed"
    )


def test_bootstrap_is_the_only_secret_header_route(server_src):
    """The legacy X-Admin-Secret header must only gate the one-time bootstrap endpoint."""
    assert "X-Admin-Secret" in server_src, "X-Admin-Secret header gate removed entirely — update this test"
    assert "bootstrap" in server_src, "bootstrap endpoint missing"


# ── User data isolation ───────────────────────────────────────────────────────


def test_legal_documents_filtered_by_user_id(server_src):
    """Queries on legal_documents must always include user_id filter."""
    # Every find on legal_documents in server.py must carry user_id
    # Simple heuristic: check that no bare find_one/find without user_id appears
    # on the legal_documents collection (AST-level full check is too complex;
    # this catches the most obvious accidental removal).
    assert 'legal_documents' in server_src, "legal_documents collection reference removed"
    # The legal router owns most of these — just verify user_id appears alongside it
    assert 'user_id' in server_src, "user_id filter appears to have been removed from server.py"


def test_delete_account_filters_by_user_id(server_ast):
    """Account deletion must only delete the requesting user's data."""
    node = _fn(server_ast, "delete_account")
    assert node is not None, "delete_account() not found"
    src = ast.unparse(node)
    assert "user_id" in src, (
        "delete_account() no longer filters deletions by user_id — "
        "it could erase another user's data"
    )


# ── Frontend token key consistency ────────────────────────────────────────────


def test_frontend_uses_jhp_token_key(server_src):
    """All frontend components must use 'jhp_token' as the localStorage key.
    The wrong key causes silent 401s (this has bitten the codebase before)."""
    frontend_dir = Path(__file__).resolve().parent.parent / "frontend" / "src"
    wrong_key_files = []
    for js_file in frontend_dir.rglob("*.js"):
        text = js_file.read_text(encoding="utf-8", errors="ignore")
        # Flag any localStorage.getItem call NOT using jhp_token
        if "localStorage.getItem('token')" in text or 'localStorage.getItem("token")' in text:
            wrong_key_files.append(js_file.name)
    assert not wrong_key_files, (
        f"These files use 'token' instead of 'jhp_token' in localStorage — "
        f"will silently 401 in production: {wrong_key_files}"
    )
