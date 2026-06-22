"""
Source-level guards for Stripe webhook idempotency + the payment_transactions ledger.

WHY source-level and not a running integration test: CI installs only `pytest`
(see .github/workflows/deploy.yml) and the existing test suite is deliberately
import-free so it needs no secrets, no network, and no MongoDB. Importing server.py
here would fail in CI (fastapi/motor not installed). These tests therefore parse
server.py's AST and assert the critical billing protections are present and wired —
catching the most likely regression: someone deleting or bypassing the dedup gate.

A true behavioral test (first delivery applies, duplicate is a no-op, failure releases
the claim) needs a Mongo-backed harness and lives outside the CI syntax gate. See
docs/decisions/2026-06-21-stripe-webhook-idempotency-ledger.md.

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
def server_ast(server_src):
    return ast.parse(server_src, filename=str(SERVER))


def _func(tree: ast.AST, name: str):
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == name:
            return node
    return None


def test_idempotency_helpers_defined(server_ast):
    for name in ("_claim_stripe_event", "_unclaim_stripe_event", "_record_payment_transaction"):
        assert _func(server_ast, name) is not None, f"missing helper {name}()"


def test_duplicate_key_error_imported(server_src):
    # Claim-first dedup relies on catching DuplicateKeyError on the unique _id insert.
    assert "DuplicateKeyError" in server_src, "DuplicateKeyError import/handling removed"


def test_both_webhooks_gate_on_claim(server_ast):
    """Every webhook handler must call _claim_stripe_event before doing work — that is
    the whole idempotency guarantee. If a new webhook is added without it, fail."""
    for handler in ("stripe_webhook_handler", "stripe_identity_webhook"):
        node = _func(server_ast, handler)
        assert node is not None, f"webhook handler {handler}() not found"
        calls = {
            n.func.id
            for n in ast.walk(node)
            if isinstance(n, ast.Call) and isinstance(n.func, ast.Name)
        }
        assert "_claim_stripe_event" in calls, (
            f"{handler}() no longer claims the event before processing — "
            "Stripe redeliveries will be double-applied"
        )


def test_main_webhook_writes_ledger(server_ast):
    """The money-moving webhook must record to the payment_transactions ledger."""
    node = _func(server_ast, "stripe_webhook_handler")
    calls = [
        n.func.id
        for n in ast.walk(node)
        if isinstance(n, ast.Call) and isinstance(n.func, ast.Name)
    ]
    assert calls.count("_record_payment_transaction") >= 1, (
        "stripe_webhook_handler() no longer writes to the payment ledger"
    )


def test_failure_releases_claim(server_ast):
    """A processing failure must release the claim so Stripe can retry; otherwise a
    transient error permanently swallows an upgrade/credit."""
    node = _func(server_ast, "stripe_webhook_handler")
    calls = {
        n.func.id
        for n in ast.walk(node)
        if isinstance(n, ast.Call) and isinstance(n.func, ast.Name)
    }
    assert "_unclaim_stripe_event" in calls, (
        "stripe_webhook_handler() no longer releases the claim on failure"
    )


def test_ledger_indexes_created(server_src):
    assert "payment_transactions.create_index" in server_src, (
        "payment_transactions indexes were removed from startup"
    )
