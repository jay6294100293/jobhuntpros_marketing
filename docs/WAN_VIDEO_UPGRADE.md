# LaunchBusiness AI — Wan 2.2 Video Model Upgrade
# Decision made: June 2026 | Status: PLANNED — build alongside Tutorial Studio

---

## What Is This In Plain English?

Right now, the AI video generation feature (Modal GPU) uses **LTX-Video** — a model that generates video clips from a text description. We are replacing it with **Wan 2.2 TI2V-5B** — a newer model that generates video from BOTH a text description AND an image.

That difference matters enormously for our product.

---

## The Problem With LTX-Video

LTX-Video takes a text prompt like *"professional SaaS dashboard, dark mode, smooth animations"* and generates a generic cinematic background clip. The clip looks nice but it has **nothing to do with the actual product**. It is generic AI footage.

Our Pillow slides are beautiful — they have the product's brand colors, logo, and real scraped features. But LTX-Video ignores all of that. It just makes stock footage.

Additionally, LTX-Video requires an **A100 40GB GPU** on Modal, which costs approximately **$0.44 per video** — the most expensive GPU option Modal offers.

---

## Why Wan 2.2 TI2V-5B Is Better For Us

**Wan 2.2 TI2V-5B** = Text + Image to Video, 5 Billion parameters.

The key difference: **you give it an image as the starting frame**, and it animates that image into a video clip.

For LaunchBusiness AI, the image we give it is our **Hero Pillow slide** — the branded opening slide with the product name, headline, and brand colors. Wan 2.2 then animates THAT SPECIFIC BRANDED SLIDE into a cinematic clip.

Result: the AI video clip actually shows the product's brand, not generic footage.

### Side-by-side comparison

| | LTX-Video (current) | Wan 2.2 TI2V-5B (new) |
|---|---|---|
| Input | Text prompt only | Text prompt + Hero slide image |
| Output | Generic AI footage (unrelated to brand) | Animated version of actual branded slide |
| GPU required | A100 40GB (Modal's most expensive) | A10G (Modal's mid-tier) |
| Cost per video | ~$0.44 | ~$0.03 |
| Model size | 12GB | 10GB (FP8 quantized) |
| License | Apache 2.0 | Apache 2.0 |
| Commercial use | ✅ Yes | ✅ Yes |

---

## The Cost Impact

This is a 14× cost reduction per video.

| | LTX-Video | Wan 2.2 |
|---|---|---|
| GPU | A100 40GB | A10G |
| Modal cost/second | ~$0.0004 | ~$0.00015 |
| Generation time | ~30 seconds | ~20 seconds |
| Cost per clip | ~$0.44 | ~$0.03 |

### What This Does To Our Margins

Old margins with LTX-Video (A100):
- Starter ($19/mo, ~8 videos avg): $3.52 GPU cost → 81% margin
- Pro ($49/mo, ~25 videos avg): $11.00 GPU cost → 78% margin
- Agency ($149/mo, ~100 videos avg): $44 GPU cost → 70% margin

New margins with Wan 2.2 (A10G):
- Starter ($19/mo, ~8 videos avg): $0.24 GPU cost → **99% margin**
- Pro ($49/mo, ~25 videos avg): $0.75 GPU cost → **98% margin**
- Agency ($149/mo, ~100 videos avg): $3.00 GPU cost → **98% margin**

This changes the economics entirely. We can give AI video to ALL paid tiers (not just Pro/Agency) without destroying margin.

---

## What Changes in the Code

**Only one file changes:** `backend/modal_video.py`

The rest of the system (server.py, the hybrid pipeline, the fallback chain) stays identical. Wan 2.2 is a drop-in replacement from server.py's perspective — it still receives a text prompt, optionally receives an image, and returns MP4 bytes.

### What `modal_video.py` changes to

```
Old:
- Model: Lightricks/LTX-Video (12GB)
- GPU: A100 40GB
- Input: text prompt only
- Class: LTXVideoGenerator
- APP_NAME: "swiftpack-ltx-video"

New:
- Model: Wan-AI/Wan2.2-TI2V-5B (10GB FP8)
- GPU: A10G (24GB)
- Input: text prompt + optional image bytes (Hero slide PNG)
- Class: WanVideoGenerator
- APP_NAME: "launchbusiness-wan-video"
```

### Why APP_NAME must change

The existing code has a bug: `modal_video.py` deploys as `"swiftpack-ltx-video"` but `server.py` defaults to looking for `"launchbusiness-ltx-video"`. They never matched. The Wan 2.2 upgrade is the right time to fix this permanently.

New name: `"launchbusiness-wan-video"` — consistent with the product name, no legacy confusion.

`server.py` line 129 also needs updating: `MODAL_APP_NAME = os.getenv('MODAL_APP_NAME', 'launchbusiness-wan-video')`

And in `/root/secrets/swiftpack.env`: `MODAL_APP_NAME=launchbusiness-wan-video`

---

## What Does NOT Change

- The 4-tier video pipeline in `server.py` (Hybrid → Pexels-only → LTX-only → Slideshow) — only the GPU tier gets a new model, the fallback logic is identical
- The FFmpeg assembly (captions, music, progress bar, watermark) — completely unchanged
- The Pexels B-roll integration — unchanged
- SadTalker talking head — separate Modal app, not affected
- All other features — unchanged

---

## How Wan 2.2 Fits The Hybrid Pipeline

The hybrid pipeline currently uses LTX-Video for ONE short clip (33 frames = 1.3 seconds) as a cinematic intro. The same clip reversed becomes the outro. Two uses, one generation.

Wan 2.2 does the same job but better:
- We pass the Hero Pillow slide as the image input
- The model animates the actual branded slide (logo, colors, headline) into a 1.3-second cinematic clip
- That clip plays at the start of every video — showing the REAL brand
- Reversed clip plays at the end — CTA with actual brand design

This is what competitors charge $35–$100/month for. We do it at $0.03.

---

## Activation Steps

1. Rewrite `backend/modal_video.py` (swap model + GPU + add image input parameter)
2. Update `MODAL_APP_NAME` default in `server.py` line 129
3. Update `generate_short()` call in `server.py` `_generate_modal_short_clip()` to pass Hero slide image bytes
4. Deploy: `modal deploy backend/modal_video.py`
5. Add to secrets: `MODAL_APP_NAME=launchbusiness-wan-video`

---

## Decision Log

| Date | Decision | Reason |
|---|---|---|
| June 2026 | Replace LTX-Video with Wan 2.2 TI2V-5B | 14× cost reduction + shows actual branded content vs generic footage |
| June 2026 | Use A10G not A100 | Wan 2.2 5B FP8 fits in 24GB A10G; A100 is overkill and costs 3× more |
| June 2026 | Fix APP_NAME mismatch at same time | `swiftpack-ltx-video` vs `launchbusiness-ltx-video` was a silent failure bug |
| June 2026 | Keep existing 4-tier fallback chain | No architectural change needed — Wan 2.2 is a drop-in replacement |
| June 2026 | Give AI video to all paid tiers | At $0.03/clip, there's no reason to gate it to Pro/Agency only |
