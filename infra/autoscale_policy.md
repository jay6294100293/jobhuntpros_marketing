# Scaling Playbook — LaunchBusiness AI
# Generated: 2026-06-21. Scale is currently UNKNOWN and the product is pre-revenue,
# so this is a deliberately modest playbook, not an aggressive autoscale config.
# Revisit before the planned AppSumo LTD launch (the first real spike trigger).

## Current baseline
- Single Contabo VPS (~1GB RAM) running 4 Docker containers: mongo, backend, frontend, nginx.
- Heavy ML (Wan 2.2 video, SadTalker) is offloaded to Modal A10G (pay-per-use, autoscales
  itself). The VPS never runs GPU work.
- FFmpeg/Pillow video renders run ON the VPS in the FastAPI executor — this is the real
  CPU/RAM bottleneck.

## Do NOT autoscale yet
At pre-revenue scale, horizontal autoscaling adds cost and complexity for no benefit.
Instead, protect the single box:
- Cap concurrent video renders (semaphore around the executor pool) so 1GB RAM doesn't OOM.
- Ensure temp-dir cleanup (`shutil.rmtree`) always runs, even on failure.
- Keep Chromium/Playwright OFF the VPS.

## Watch these signals (manual, via Sentry/host metrics)
| Signal | Threshold | Action |
|--------|-----------|--------|
| VPS memory | > 85% sustained | Reduce render concurrency; consider a bigger VPS |
| VPS CPU | > 80% for 2 min during renders | Queue renders instead of running them inline |
| Mongo response | slow / connection errors | Move Mongo off the app box (Atlas or dedicated) |
| Modal spend | rising faster than signups | Add per-tier GPU caps; check Helicone for waste |
| 5xx rate | spike after a deploy | Roll back (RUNBOOK §5) |

## Scale-up path (when signups justify it)
1. **First move:** bigger VPS (more RAM/CPU) — simplest win for render-bound load.
2. **~1,000 users:** managed MongoDB (Atlas) with backups; introduce a job queue so video
   renders run on dedicated worker(s), not the API process; put `backend/outputs/` behind
   a CDN / object storage.
3. **AppSumo / 10k spike:** separate render workers from the API, S3-compatible object
   storage for outputs, per-tier rate limiting, and Modal concurrency limits to cap GPU
   cost. Only then consider real horizontal autoscaling behind a load balancer.

## Maximum instances
N/A today (single box). Set an explicit cap when/if you move to multi-instance — budget,
not traffic, is the binding constraint pre-revenue.

## TODO before AppSumo launch
- [ ] Confirm DB backups are automated (RUNBOOK §7)
- [ ] Load-test the Magic Button at expected concurrent volume
- [ ] Decide GPU spend cap per tier on Modal
