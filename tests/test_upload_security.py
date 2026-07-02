"""
Source-level guards for the file upload security hardening (CP-002 + CP-003).

WHY source-level: CI installs only pytest — no FastAPI, Motor, or secrets.
These tests catch the most likely regression: someone removing the auth dependency
or the MIME blocklist from the upload endpoints.

Run locally:  pytest tests/ -q
"""

import ast
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
SERVER = BACKEND_DIR / "server.py"
FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend" / "src"
ASSET_UPLOAD = FRONTEND_DIR / "components" / "AssetUpload.js"


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


# ── CP-002: upload endpoints require authentication ───────────────────────────


def test_upload_file_requires_auth(server_ast):
    node = _fn(server_ast, "upload_file")
    assert node is not None, "upload_file() not found in server.py"
    src = ast.unparse(node)
    assert "get_current_user" in src, (
        "upload_file() no longer depends on get_current_user — "
        "any caller can upload files without authentication"
    )


def test_delete_upload_requires_auth(server_ast):
    node = _fn(server_ast, "delete_upload")
    assert node is not None, "delete_upload() not found in server.py"
    src = ast.unparse(node)
    assert "get_current_user" in src, (
        "delete_upload() no longer depends on get_current_user — "
        "unauthenticated callers can delete any file by UUID"
    )


def test_frontend_upload_sends_auth_header(server_src):
    """AssetUpload.js must send an Authorization header on POST /upload."""
    assert ASSET_UPLOAD.exists(), "AssetUpload.js not found"
    js = ASSET_UPLOAD.read_text(encoding="utf-8")
    assert "jhp_token" in js, "AssetUpload.js no longer reads jhp_token for upload auth"
    assert "Authorization" in js, "AssetUpload.js no longer sends Authorization header"


def test_frontend_delete_sends_auth_header(server_src):
    """AssetUpload.js must send an Authorization header on DELETE /upload/{id}."""
    js = ASSET_UPLOAD.read_text(encoding="utf-8")
    # Both post (upload) and delete must use authHeaders()
    assert js.count("authHeaders()") >= 2, (
        "AssetUpload.js should call authHeaders() for both upload POST and DELETE — "
        "one or both calls lost the auth header"
    )


# ── CP-003: MIME / extension blocklist present and populated ──────────────────


def test_extension_blocklist_defined(server_src):
    assert "_BLOCKED_UPLOAD_EXTENSIONS" in server_src, (
        "_BLOCKED_UPLOAD_EXTENSIONS removed — extension blocklist no longer protects uploads"
    )


def test_extension_blocklist_covers_executables(server_src):
    for dangerous in (".php", ".py", ".exe", ".sh", ".bat", ".ps1"):
        assert dangerous in server_src, (
            f"'{dangerous}' missing from _BLOCKED_UPLOAD_EXTENSIONS — "
            "executable file type can now be uploaded"
        )


def test_magic_byte_blocklist_defined(server_src):
    assert "_BLOCKED_UPLOAD_MAGIC" in server_src, (
        "_BLOCKED_UPLOAD_MAGIC removed — binary executable signatures no longer blocked"
    )


def test_magic_bytes_cover_key_formats(server_src):
    # PE (Windows EXE): MZ header
    assert r"\x4d\x5a" in server_src or "\\x4d\\x5a" in server_src or "b'MZ'" in server_src or "b'\\x4d\\x5a'" in server_src, (
        "PE/EXE magic bytes (MZ / \\x4d\\x5a) missing from _BLOCKED_UPLOAD_MAGIC"
    )
    # ELF (Linux binary)
    assert "ELF" in server_src, "ELF binary magic missing from _BLOCKED_UPLOAD_MAGIC"
    # Unix shebang
    assert "#!/" in server_src, "Unix shebang (#!/) missing from _BLOCKED_UPLOAD_MAGIC"


def test_magic_check_runs_before_disk_write(server_ast):
    """The header check must happen BEFORE the first chunk is written to disk."""
    node = _fn(server_ast, "upload_file")
    assert node is not None
    src = ast.unparse(node)
    magic_pos = src.find("_BLOCKED_UPLOAD_MAGIC")
    write_pos = src.find("f.write")
    assert magic_pos != -1, "_BLOCKED_UPLOAD_MAGIC check missing from upload_file()"
    assert write_pos != -1, "f.write missing from upload_file() — sanity check"
    assert magic_pos < write_pos, (
        "Magic byte check appears AFTER disk write — a malicious file is written "
        "before being rejected; check must run on the first chunk before any write"
    )


# ── CP-005: stripe_events TTL index is created at startup ────────────────────


def test_stripe_events_ttl_index_created(server_src):
    assert "stripe_events" in server_src and "expireAfterSeconds" in server_src, (
        "stripe_events TTL index removed from startup — "
        "the collection will grow unbounded after launch"
    )


# ── CP-006: Magic Button requires authentication ──────────────────────────────


def test_magic_button_requires_auth(server_ast):
    for name in ("magic_button", "magic_launch_pack"):
        node = _fn(server_ast, name)
        assert node is not None, f"{name}() not found in server.py"
        src = ast.unparse(node)
        assert "get_current_user" in src, (
            f"{name}() no longer requires authentication — "
            "unauthenticated callers can trigger GPU video renders at no cost"
        )


def test_magic_handler_receives_user(server_ast):
    node = _fn(server_ast, "_magic_launch_pack_handler")
    assert node is not None, "_magic_launch_pack_handler() not found"
    # Signature must accept a user parameter
    arg_names = [a.arg for a in node.args.args]
    assert "user" in arg_names, (
        "_magic_launch_pack_handler() no longer accepts a user parameter — "
        "usage limits and tier watermarks will not be applied"
    )


def test_magic_handler_passes_user_to_children(server_ast):
    node = _fn(server_ast, "_magic_launch_pack_handler")
    assert node is not None
    src = ast.unparse(node)
    # Must not contain user=None after CP-006 (user is now always passed through)
    assert "user=None" not in src, (
        "_magic_launch_pack_handler() still passes user=None to child functions — "
        "usage limits and watermarks are not applied for magic button runs"
    )


def test_dashboard_magic_button_sends_auth(server_src):
    dashboard = (
        Path(__file__).resolve().parent.parent
        / "frontend" / "src" / "components" / "Dashboard.js"
    )
    assert dashboard.exists(), "Dashboard.js not found"
    js = dashboard.read_text(encoding="utf-8")
    assert "magic-button" in js, "magic-button call not found in Dashboard.js"
    # The auth header must appear in the same file
    assert "jhp_token" in js and "Authorization" in js, (
        "Dashboard.js magic-button call no longer sends Authorization header — "
        "all magic button requests will 401"
    )
