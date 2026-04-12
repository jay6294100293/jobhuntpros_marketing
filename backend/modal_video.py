"""
SwiftPack AI — Modal LTX-Video Serverless GPU App
==================================================
Deploy once:  modal deploy backend/modal_video.py
Test locally: modal run backend/modal_video.py

Requires Modal account + token:
  pip install modal
  modal token new          # opens browser login
  modal deploy backend/modal_video.py

Set in secrets/swiftpack.env:
  MODAL_TOKEN_ID=...
  MODAL_TOKEN_SECRET=...

Cost: ~$0.44/video on A100-40GB (LTX-Video, ~30s generation time).
      $0.00 when idle — no reserved instances.
"""

import modal
from pathlib import Path

# ── App & persistent volume ────────────────────────────────────────────────────
APP_NAME = "swiftpack-ltx-video"
app = modal.App(APP_NAME)

# Weights volume — caches the ~12GB LTX-Video model between cold starts
weights_volume = modal.Volume.from_name("swiftpack-weights", create_if_missing=True)

# Docker image with all GPU dependencies
ltx_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install(["ffmpeg", "libgl1", "libglib2.0-0"])
    .pip_install([
        "torch==2.4.1",
        "torchvision==0.19.1",
        "diffusers>=0.32.0",
        "transformers>=4.44.0",
        "accelerate>=0.33.0",
        "sentencepiece",
        "imageio[ffmpeg]",
        "numpy",
        "huggingface_hub>=0.24.0",
        "Pillow",
    ])
)

MODEL_ID = "Lightricks/LTX-Video"
WEIGHTS_DIR = Path("/weights/ltx-video")

# ── Resolution presets (must be divisible by 32) ──────────────────────────────
RESOLUTION = {
    "9:16":  (512, 768),   # TikTok / Reels portrait
    "16:9":  (768, 512),   # YouTube landscape
    "1:1":   (512, 512),   # Instagram square
}


# ── GPU Class ─────────────────────────────────────────────────────────────────
@app.cls(
    gpu=modal.gpu.A100(memory=40),
    image=ltx_image,
    volumes={"/weights": weights_volume},
    timeout=360,
    scaledown_window=30,   # keep container warm 30s after last request
    max_containers=3,      # parallel limit
)
class LTXVideoGenerator:

    @modal.enter()
    def load_model(self):
        """Download model once into volume, then load into GPU VRAM."""
        import torch
        from diffusers import LTXPipeline

        if not WEIGHTS_DIR.exists() or not any(WEIGHTS_DIR.iterdir()):
            print(f"Downloading {MODEL_ID} weights (~12 GB) …")
            from huggingface_hub import snapshot_download
            WEIGHTS_DIR.mkdir(parents=True, exist_ok=True)
            snapshot_download(
                repo_id=MODEL_ID,
                local_dir=str(WEIGHTS_DIR),
                ignore_patterns=["*.msgpack", "*.h5", "flax_model*", "*.ot"],
            )
            weights_volume.commit()
            print("Weights committed to volume.")

        print("Loading LTX-Video pipeline into GPU …")
        self.pipe = LTXPipeline.from_pretrained(
            str(WEIGHTS_DIR),
            torch_dtype=torch.bfloat16,
        ).to("cuda")
        # Enable xformers memory efficient attention if available
        try:
            self.pipe.enable_xformers_memory_efficient_attention()
        except Exception:
            pass
        print("Model ready.")

    @modal.method()
    def generate(
        self,
        prompt: str,
        aspect_ratio: str = "9:16",
        num_frames: int = 97,        # 8n+1 frames at ~25fps ≈ 4s
        num_inference_steps: int = 40,
        guidance_scale: float = 3.0,
        seed: int = 0,
        negative_prompt: str = (
            "worst quality, inconsistent motion, blurry, jittery, "
            "distorted, watermark, text overlay, low resolution"
        ),
    ) -> bytes:
        """
        Generate a short AI video clip and return raw MP4 bytes.
        The caller (server.py) will loop + overlay audio/captions via FFmpeg.
        """
        import torch
        import imageio
        import numpy as np
        import tempfile
        import os

        width, height = RESOLUTION.get(aspect_ratio, (512, 768))

        # LTX-Video constraint: num_frames must be 8n+1
        num_frames = max(9, ((num_frames - 1) // 8) * 8 + 1)

        print(f"Generating {width}x{height} video: {num_frames} frames, prompt={prompt[:80]!r}")

        result = self.pipe(
            prompt=prompt,
            negative_prompt=negative_prompt,
            width=width,
            height=height,
            num_frames=num_frames,
            num_inference_steps=num_inference_steps,
            guidance_scale=guidance_scale,
            generator=torch.Generator("cuda").manual_seed(seed),
        )

        frames = result.frames[0]   # list of PIL Images

        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
            tmp_path = f.name

        try:
            writer = imageio.get_writer(
                tmp_path, fps=25, quality=8,
                codec="libx264", pixelformat="yuv420p",
                output_params=["-preset", "fast"],
            )
            for frame in frames:
                writer.append_data(np.array(frame))
            writer.close()

            with open(tmp_path, "rb") as f:
                video_bytes = f.read()

            print(f"Generated {len(video_bytes)//1024} KB clip ({len(frames)} frames)")
            return video_bytes
        finally:
            try:
                os.unlink(tmp_path)
            except Exception:
                pass


# ── Local test entrypoint ──────────────────────────────────────────────────────
@app.local_entrypoint()
def main(
    prompt: str = "A sleek SaaS product dashboard, dark mode UI, smooth animations, professional",
    aspect_ratio: str = "9:16",
):
    gen = LTXVideoGenerator()
    video_bytes = gen.generate.remote(prompt=prompt, aspect_ratio=aspect_ratio)
    out = Path("modal_test_output.mp4")
    out.write_bytes(video_bytes)
    print(f"Saved to {out} ({len(video_bytes)//1024} KB)")
