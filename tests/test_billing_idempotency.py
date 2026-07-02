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


# ── Subscription-sync / isolation / failure-handling guards (2026-06-22) ──────────
# See docs/decisions/2026-06-22-stripe-subscription-sync-and-failure-handling.md


def test_product_isolation_helper_wired(server_ast, server_src):
    """Shared Stripe account: the webhook must filter sibling-product events by an
    explicit product tag, not rely on accidental UUID non-collision."""
    assert 'PRODUCT_TAG = "launchbusiness"' in server_src, "PRODUCT_TAG removed"
    assert _func(server_ast, "_event_is_foreign") is not None, "missing _event_is_foreign()"
    node = _func(server_ast, "stripe_webhook_handler")
    calls = [
        n.func.id
        for n in ast.walk(node)
        if isinstance(n, ast.Call) and isinstance(n.func, ast.Name)
    ]
    assert calls.count("_event_is_foreign") >= 3, (
        "stripe_webhook_handler() no longer screens every money branch for foreign-product "
        "events — sibling products on the shared Stripe account could be acted on"
    )


def test_subscription_updated_is_status_aware(server_src):
    """customer.subscription.updated must only grant a paid tier while the subscription
    is actually being paid — otherwise a past_due/unpaid sub keeps its monthly allowance."""
    assert '"active", "trialing"' in server_src or "'active', 'trialing'" in server_src, (
        "subscription.updated no longer gates the tier grant on Stripe billing status — "
        "failed renewals would keep granting credits"
    )


def test_payment_failed_handled(server_src):
    """A failed renewal must be handled (flagged + audited), not silently ignored."""
    assert "invoice.payment_failed" in server_src, (
        "invoice.payment_failed branch removed — failed renewals leave no local audit trail"
    )
    assert '"payment_failed"' in server_src, "payment_failed ledger row removed"


def test_subscription_id_persisted_on_checkout(server_src):
    """We must store stripe_subscription_id so subscription/invoice events map to a user."""
    assert "stripe_subscription_id" in server_src, (
        "stripe_subscription_id no longer persisted at checkout"
    )


def test_checkout_sets_subscription_metadata(server_src):
    """subscription_data.metadata carries user_id+product so metadata-less subscription/
    invoice events stay isolated and mappable."""
    assert "subscription_data" in server_src, (
        "checkout no longer sets subscription_data metadata"
    )
