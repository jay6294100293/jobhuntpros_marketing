# Logo Brand Kit + Brand Profile "Description" — Plan
# Decided: June 2026
# Status: Phase 1 (both parts) implemented this session. Phase 2 items are future work.

---

## Why

Two gaps surfaced during a review of the Brand Cohesion feature (`docs/BRAND_PROFILE_FEATURE.md` item 16):

1. **Logo Creator is "bare minimum."** It only outputs one flat 1024×1024 PNG, dark background,
   text baked in. Real brands need: an icon-only mark (for app icons / favicons / video overlays),
   a light-background variant (for white headers, printed docs, light-mode UI), and a horizontal
   lockup (for email signatures, website headers). None of this exists today.

2. **Brand Profile has no "what does this business do" field.** `business_type` is a dropdown
   (SaaS / App / Ecom / ...) but there's no free-text description. The Legal intake chat
   (`legal_router.py` `start_chat`) always asks "What does your business do?" as its first
   question even when a profile is selected — this is the one question a description field
   could pre-answer.

Both are scoped as MVPs here — small, shippable, reuse existing patterns (Pillow, `/download-pack`
ZIP, `prefill_lines`). Larger follow-ups are listed in Phase 2.

---

## Part A — Brand Profile `description` field

### A1. `backend/brand_router.py`
- Add `description: Optional[str] = Field(default="", max_length=500)` to `BrandProfileCreate`
  and `BrandProfileUpdate`.
- Persist `description` in the `profile` dict (`create_profile`) and in `updates`
  (`update_profile`), same pattern as `data_practices`.

### A2. `frontend/src/components/BrandProfiles.js`
- `EMPTY_FORM`: add `description: ''`.
- `ProfileFormModal` → "Brand Identity" section: add a textarea ("What does your business do?
  2–3 sentences.") after the tagline field.

### A3. `backend/legal_router.py` → `start_chat`
- In the `prefill_lines` block, add:
  `if bp.get("description"): prefill_lines.append(f"- What the business does: {bp['description']}")`
- When `description` is present, the prefilled greeting skips "What exactly does the business
  do?" — reducing intake from 3 remaining questions to 2.

### A4. `frontend/src/components/Dashboard.js` → `handleSaveAsBrand`
- Currently maps `brandData.description` (from `/api/scrape`, truncated to 100 chars) → `tagline`.
- Additionally pass the fuller scraped description (up to 500 chars) → new `description` field,
  so a "Save as Brand" from the Hub immediately benefits Legal intake too.

---

## Part B — Logo Brand Kit (MVP)

### What's in the MVP kit
For a brand's name + colors, generate in one call:

| Asset | Size | Background | Use |
|---|---|---|---|
| `icon_transparent.png` | 512×512 RGBA | transparent | video slide overlays, anywhere |
| `icon_dark.png` | 512×512 | zinc-950 | dark UIs, dark social profiles |
| `icon_light.png` | 512×512 | white | light UIs, printed docs |
| `horizontal_dark.png` | 1200×360 | zinc-950 | email signature, dark header |
| `horizontal_light.png` | 1200×360 | white | website header, light docs |
| `favicon.ico` | 16/32/48 multi-size | transparent | browser tab |
| `app_icon_192.png` / `app_icon_512.png` | 192 / 512 | transparent | PWA / mobile home screen |

The "mark" is a rounded badge with the brand's initials in the primary brand color — the same
visual language as the existing `_logo_tech` / `_logo_monogram` templates, factored into a
reusable helper so it's consistent regardless of which of the 6 main-logo styles was picked.

### B1. `backend/server.py` — new Pillow helpers
- `_icon_mark(initials, c1, fg, transparent)` → RGBA rounded badge, 512×512.
- `_logo_horizontal(brand_name, initials, c1, bg, fg)` → 1200×360 lockup (icon + wordmark).

### B2. `backend/server.py` — new endpoint
```
POST /api/generate-logo-kit
Body: { brand_name, primary_color, secondary_color }
Returns: { kit_id, files: { icon_transparent, icon_dark, icon_light,
                             horizontal_dark, horizontal_light,
                             favicon, app_icon_192, app_icon_512 } }
```
- All renders run in `run_in_executor` (matches `generate_logo`).
- Files saved to `OUTPUTS_DIR` with `logokit_<asset>_<id>.{png,ico}` naming so the existing
  `GET /api/download-pack?ids=...` ZIP endpoint works unmodified for "Download All".
- No extra usage-limit charge — kit assets are a free export of an already-generated brand
  identity (not a new logo "generation").

### B3. `frontend/src/components/LogoCreator.js`
- "Generate Brand Kit" button in the selected-action-bar (next to "Save to brand").
- Results grid: 7 thumbnails with individual download buttons + one "Download All as ZIP"
  button that calls `/api/download-pack?ids=<7 filenames>`.

---

## Phase 2 — Future work (not in this pass)

- Refactor `_logo_tech` / `_logo_monogram` to call the new shared `_icon_mark()` so the main
  logo and the kit's icon use identical badge geometry.
- True vector **SVG** export (current pipeline is raster-only via Pillow).
- Apply the same icon-mark + favicon treatment to **our own app** (`frontend/public/` —
  `manifest.json`, `logo192.png`, `logo512.png`, `favicon.ico` currently fall back to the
  full square `logo.png`, which is illegible at 16×16). Same helper functions could generate
  these from `/logo.png` directly.
- "Save kit to brand profile" — store kit asset URLs on the profile so they can be reused in
  posters/videos without regenerating.
