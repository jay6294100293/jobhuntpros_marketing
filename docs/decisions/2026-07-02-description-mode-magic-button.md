# Decision: Description Mode for Magic Button (No-URL Fallback)

Date: 2026-07-02

## Problem
The Magic Button requires a public URL to scrape. Products with no public page
(internal tools, enterprise dashboards, apps behind login) get zero value from it.
Founders also asked: "what if I haven't launched yet and have no website?"

## Decision
Add an optional "Describe your product" mode alongside the URL mode.
- Frontend: toggle between URL input and a description form (textarea + 3 feature fields)
- Backend: `MagicButtonRequest.url` becomes Optional; new fields `user_description` and
  `user_features` accepted. When no URL provided, skip `scrape_url` and synthesize
  `brand_data` from user input.

## What doesn't change
- URL mode is unchanged — all existing behavior preserved
- Usage limits enforced identically
- Script / video / poster pipeline untouched
- No new DB collections or fields

## Synthesized brand_data in description mode
```python
{
    "colors": ["#6366f1", "#8b5cf6"],   # default indigo/violet — no scrape to extract from
    "features": user_features[:3],      # from form
    "description": user_description,    # from form
    "images": [],                       # no scraped images
}
```
Colors default to indigo/violet (the LaunchBusiness AI brand). This means slides
look branded even without a scraped color palette. A future enhancement could let
users pick colors manually in this mode.

## Validation rule
At least one of `url` or `user_description` must be provided. Enforced by
`@model_validator` on `MagicButtonRequest`.

## Rollback
Revert `MagicButtonRequest` to require `url: str` and remove the if-branch in
`_magic_launch_pack_handler`. Revert Dashboard.js toggle. No DB changes.
