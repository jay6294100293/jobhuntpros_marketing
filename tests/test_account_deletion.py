"""
Source-level guards for the account-deletion (GDPR/CCPA erasure) endpoint.

Dependency-free for the same reason as the other tests here: CI installs only pytest
(see .github/workflows/deploy.yml), so we assert on server.py's AST/source rather than
importing it. See docs/decisions/2026-06-22-account-deletion-and-legal-pages.md.

Run locally:  pytest tests/ -q
"""

import ast
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
SERVER = BACKEND_DIR / "server.py"


@pytest.fixture(scope="module")
def server_src() -> str:
    return SERVER.read_text(encoding="utf-8-sig")


@pytest.fixture(scope="module")
def delete_fn(server_src):
    tree = ast.parse(server_src, filename=str(SERVER))
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == "delete_account":
            return node
    pytest.fail("delete_account() endpoint not found in server.py")


def test_endpoint_is_authenticated(delete_fn):
    # Must depend on get_current_user — erasure can never be unauthenticated.
    src = ast.unparse(delete_fn)
    assert "get_current_user" in src, "delete_account() is not auth-gated"


def test_reauth_gate_present(delete_fn):
    """Deletion must be re-confirmed via password OR exact-email match."""
    src = ast.unparse(delete_fn)
    assert "verify_password" in src, "delete_account() no longer re-checks the password"
    assert "confirm_email" in src, "delete_account() no longer offers email confirmation"


def test_payment_ledger_is_retained(server_src):
    """payment_transactions must NOT be in the erasure list — financial records are kept."""
    # Pull the _ERASURE_COLLECTIONS tuple literal out of the source and inspect it.
    tree = ast.parse(server_src, filename=str(SERVER))
    erasure = None
    for node in ast.walk(tree):
        if isinstance(node, ast.Assign):
            for tgt in node.targets:
                if isinstance(tgt, ast.Name) and tgt.id == "_ERASURE_COLLECTIONS":
                    erasure = {el.value for el in node.value.elts if isinstance(el, ast.Constant)}
    assert erasure is not None, "_ERASURE_COLLECTIONS not found"
    assert "payment_transactions" not in erasure, (
        "payment_transactions must be retained, not erased (financial record-keeping)"
    )
    assert "users" not in erasure, "users must be deleted explicitly LAST, not in the loop"


def test_users_deleted_last(delete_fn):
    """The users record must be deleted after the owned-data loop so a partial failure
    leaves a recoverable account."""
    src = ast.unparse(delete_fn)
    loop_pos = src.find("_ERASURE_COLLECTIONS")
    users_delete_pos = src.find("db.users.delete_one")
    assert loop_pos != -1 and users_delete_pos != -1, "expected erasure loop + users delete"
    assert users_delete_pos > loop_pos, "users record must be deleted after the erasure loop"
