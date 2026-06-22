# 2026-06-22 — Account deletion (GDPR/CCPA erasure) + Privacy/Terms pages

## Context
Audit (2026-06-21) Action #2 found two launch blockers:

1. **Dead legal links.** `Landing.js:536` footer and `Register.js:188` link `/privacy`
   and `/terms`, but no routes exist — they fall through `/*` → `ProtectedApp`, which
   renders `<Landing/>` (logged-out) or an empty Layout (logged-in). For a product that
   collects PII + payment data and *sells* GDPR/CCPA policy generation, shipping with no
   privacy policy or ToS is a compliance + trust blocker.
2. **No account deletion.** No right-to-erasure endpoint existed (`grep` confirmed) —
   a GDPR Art. 17 / CCPA gap.

## Decision

### Privacy + Terms (public pages)
New `PrivacyPolicy.js` and `Terms.js` rendered at **public top-level routes** `/privacy`
and `/terms` (siblings of `/login`, before the `/*` catch-all) so they're reachable
logged-out and from registration. Content is grounded in what the app *actually*
collects (cross-referenced with the DB writes): account email/name, bcrypt-hashed
password, Stripe customer id, generated content, brand/legal profiles (business info),
usage counters, IP (rate limiting), plus Sentry (errors) and PostHog (analytics).

# KNOWN LIMIT: these are plain-language, good-faith policies, NOT lawyer-reviewed.
# A "last updated" date and a contact address are included; counsel review is a TODO
# before GA. (We are not stripping any generated-doc disclaimer — that is unrelated.)

### Account deletion: `DELETE /api/auth/account`
- **Re-auth gate** to prevent accidental / token-replay deletion:
  - Password accounts: must submit the correct current password.
  - OAuth-only accounts (no `hashed_password`): must type their exact account email.
- **Erasure scope** — tightly user_id-filtered `delete_many` (permitted by CLAUDE.md §4
  since the filter is tight) across user-owned collections. `legal_chat` is keyed by
  `profile_id`, so the user's profile ids are resolved first and chats deleted by them.
- **Retention** — `payment_transactions` is **kept** under financial record-keeping
  obligations (a legitimate legal basis to retain), keyed to the now-deleted user id.
  `admin_audit` is also kept.
- **Ordering** — the `users` document is deleted **last**. If an earlier step fails the
  account still exists, so the user (or a retry) can run it again; no orphaned-but-
  inaccessible account.
- **Stripe** — best-effort cancellation of the customer's active subscriptions so a
  deleted account is not billed forever. Wrapped in try/except; never blocks erasure.
  This is a cancellation only (cannot increase charges), not webhook/charge logic.
- Returns a per-collection deleted-count summary for support/debugging.

### UI
New protected `Settings.js` at `/settings` with account info + a "Danger zone" delete
flow (typed confirmation). The Layout user avatar links to it; Layout footer gains
Privacy/Terms links so they're reachable from every authenticated page too.

## Failure modes & mitigations
See the PLAN block in the session. Key: re-auth gate (accidental deletion), users-last
ordering (partial failure), best-effort Stripe cancel (continued billing).

## Rollback
`git revert <sha>` + rebuild backend & frontend. Deletions are user-initiated and
irreversible by design (backups unconfirmed per CLAUDE.md §4 — the re-auth gate is the
safeguard).

## Testing
- `ast.parse` on server.py; `yarn build` on frontend.
- Source-guard unit test: endpoint exists, is re-auth-gated, deletes users last,
  retains payment_transactions.
- Manual: delete a throwaway account on staging; verify rows gone + ledger retained.
