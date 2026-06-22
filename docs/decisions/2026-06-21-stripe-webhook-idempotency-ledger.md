# 2026-06-21 — Stripe webhook idempotency + `payment_transactions` ledger

## Context
Audit (2026-06-21) found two CRITICAL billing defects:

1. **No webhook idempotency.** `stripe_webhook_handler` (`server.py`) processed every
   delivered event blindly. The legal-topup branch does
   `$inc: {legal_credits_topup: credits}` — Stripe redelivers events on timeout/retry,
   so one purchase could credit a user 2–3×. No `event["id"]` was ever recorded.
2. **No payment ledger.** `payment_transactions` is declared "catastrophic to lose" in
   `CLAUDE.md §4` and documented in `README.md`, but was **never written**. Tier/credit
   changes mutated `users` directly with zero audit trail — making refunds, chargeback
   defense, and revenue reconciliation impossible.

## Decision

### Idempotency: claim-first, roll-back-on-failure
Add `_claim_stripe_event(event)`:
- Insert `{_id: event["id"], type, received_at}` into a new `stripe_events` collection.
- `_id` uniqueness gives atomic dedup for free (no extra index needed).
- `DuplicateKeyError` → event already seen → handler returns early (`duplicate: true`).
- **Any other insert error (e.g. Mongo down) is re-raised** → handler 500s → Stripe
  retries later. We fail CLOSED on the dedup write: billing correctness > availability
  here. (This is a deliberate exception to the "Mongo writes are skippable" rule in
  `CLAUDE.md §4`, which applies to content generation, not money.)

On a processing exception *after* claiming, we **delete the claim and re-raise** so
Stripe's retry can reprocess — otherwise a transient failure would permanently swallow
the upgrade/credit.

# DECISION: claim-first (not process-first) because the critical bug is double-APPLY
# from concurrent/duplicate deliveries; claim-first is the only ordering that prevents it.
# EDGE CASE: crash between claim and effect → handled by delete-claim-on-exception.

### Ledger: `payment_transactions`
Add `_record_payment_transaction(...)` writing one row per money-moving event:
`{_id: uuid, event_id, kind, user_id, stripe_customer_id, amount_total, currency,
tier, credits, raw_event_type, created_at}`. Best-effort (wrapped in try/except) — a
ledger write failure must not break the user's upgrade, but is logged.

### Coverage
Both `/billing/webhook` and `/billing/webhook/identity` get the dedup gate (identity
events can also be redelivered). Identity writes no ledger row (no money moved).

### Indexes
`startup_db_client` adds:
- `payment_transactions.event_id` (non-unique — an event can yield one ledger row;
  index supports reconciliation queries).
- `payment_transactions.user_id`.
`stripe_events` needs no extra index (`_id` is unique by default).

## Rollback
`git revert <sha>` + `docker compose -f docker-compose.prod.yml up -d --build backend`.
New collections are additive; leaving them populated is harmless.

## Testing
- `python -c "import ast; ast.parse(open('backend/server.py').read())"`
- Unit test in `tests/` simulating: (a) first delivery applies + ledgers,
  (b) duplicate delivery is a no-op, (c) processing failure deletes the claim.
- Applied on staging before production (no prod deploy without explicit approval).
