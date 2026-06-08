"""
LaunchBusiness AI — Modal Wan 2.2 TI2V-5B Serverless GPU App
=============================================================
Replaces LTX-Video with Wan 2.2 Text+Image-to-Video (5B params, Apache 2.0).

Key advantage over LTX-Video:
  - Accepts the Hero Pillow slide as the IMAGE INPUT — animates actual branded content
  - LTX-Video only took text prompts → generated generic unrelated footage
  - Wan 2.2 animates the REAL brand design (colors, logo, headline)
  - Fits A10G GPU (24GB) instead of A100 40GB — 14x cheaper: $0.03 vs $0.44/clip

Deploy: modal deploy backend/modal_video.py
Cost:   ~$0.03/clip on A10G (14x cheaper than LTX-Video on A100)

Requires Modal account + token:
  pip install modal
  modal token new
  modal deploy backend/modal_video.py

Set in secrets:
  MODAL_TOKEN_ID=...
  MODAL_TOKEN_SECRET=...
  MODAL_APP_NAME=launchbusiness-wan-video
"""

import modal
from pathlib import Path

APP_NAME = "launchbusiness-wan-video"
app = modal.App(APP_NAME)

# Weights volume — caches the ~10GB Wan 2.2 model between cold starts
weights_volume = modal.Volume.from_name("launchbusiness-wan-weights", create_if_missing=True)

wan_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install(["ffmpeg", "libgl1", "libglib2.0-0"])
    .pip_install([
        "torch==2.4.1",
        "torchvision==0.19.1",
        "diffusers>=0.33.0",
        "transformers>=4.44.0",
        "accelerate>=0.33.0",
        "sentencepiece",
        "imageio[ffmpeg]",
        "numpy",
        "huggingface_hub>=0.24.0",
        "Pillow",
    ])
)

MODEL_ID = "Wan-AI/Wan2.2-TI2V-5B"
WEIGHTS_DIR = Path("/weights/wan2.2-ti2v-5b")

# Resolutions divisible by 16 — sized for A10G memory budget on short clips
# FFmpeg upscales these to final 1080p/1920p output after assembly
RESOLUTION_SHORT = {
    "9:16":  (480, 832),    # portrait  → upscale to 1080×1920
    "16:9":  (832, 480),    # landscape → upscale to 1920×1080
    "1:1":   (624, 624),    # square    → upscale to 1080×1080
    "4:5":   (480, 608),    # feed      → upscale to 1080×1350
}


@app.cls(
    gpu=modal.gpu.A10G(),
    image=wan_image,
    volumes={"/weights": weights_volume},
    timeout=300,
    scaledown_window=30,
    max_containers=3,
)
class WanVideoGenerator:

    @modal.enter()
    def load_model(self):
        import torch
        from diffusers import WanImageToVideoPipeline

        if not WEIGHTS_DIR.exists() or not any(WEIGHTS_DIR.iterdir()):
            print(f"Downloading {MODEL_ID} weights (~10 GB) …")
            from huggingface_hub import snapshot_download
            WEIGHTS_DIR.mkdir(parents=True, exist_ok=True)
            snapshot_download(
                repo_id=MODEL_ID,
                local_dir=str(WEIGHTS_DIR),
                ignore_patterns=["*.msgpack", "*.h5", "flax_model*"],
            )
            weights_volume.commit()
            print("Weights committed to volume.")

        print("Loading Wan 2.2 TI2V pipeline into GPU …")
        self.pipe = WanImageToVideoPipeline.from_pretrained(
            str(WEIGHTS_DIR),
            torch_dtype=torch.bfloat16,
        ).to("cuda")
        print("Model ready.")

    def _run(
        self,
        prompt: str,
        aspect_ratio: str,
        image_bytes: bytes,
        num_frames: int,
        seed: int,
    ) -> bytes:
        """Internal generation — shared by generate_short() and generate()."""
        import torch
        import imageio
        import numpy as np
        import tempfile
        import os
        import io
        from PIL import Image

        width, height = RESOLUTION_SHORT.get(aspect_ratio, (480, 832))

        if image_bytes:
            pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB").resize((width, height))
        else:
            # Fallback when no Hero slide provided — indigo gradient placeholder
            pil_image = Image.new("RGB", (width, height), (99, 102, 241))

        print(f"Wan 2.2 generating {width}x{height}, {num_frames} frames, "
              f"image={'yes' if image_bytes else 'gradient fallback'}")

        result = self.pipe(
            image=pil_image,
            prompt=prompt,
            negative_prompt=(
                "blurry, distorted, low quality, watermark, text overlay, "
                "jittery, inconsistent motion, ugly, bad anatomy"
            ),
            height=height,
            width=width,
            num_frames=num_frames,
            num_inference_steps=20,
            guidance_scale=5.0,
            generator=torch.Generator("cuda").manual_seed(seed),
        )

        frames = result.frames[0]

        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
            tmp_path = f.name
        try:
            writer = imageio.get_writer(
                tmp_path, fps=16, quality=8,
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

    @modal.method()
    def generate_short(
        self,
        prompt: str,
        aspect_ratio: str = "9:16",
        image_bytes: bytes = None,   # Hero Pillow slide PNG bytes — animates real brand
        num_frames: int = 25,        # 25 frames at 16fps ≈ 1.5s — used as intro/outro
        seed: int = 42,
    ) -> bytes:
        """
        Generate a short (~1.5s) cinematic clip for hybrid intro/outro.
        Pass image_bytes = Hero slide PNG to animate actual branded content.
        The caller reverses this clip for the outro. One generation, two uses. ~$0.03.
        """
        return self._run(prompt, aspect_ratio, image_bytes, num_frames, seed)

    @modal.method()
    def generate(
        self,
        prompt: str,
        aspect_ratio: str = "16:9",
        image_bytes: bytes = None,
        num_frames: int = 49,        # ~3s at 16fps — longer background segment
        seed: int = 0,
    ) -> bytes:
        """Generate a longer clip (~3s) for full background segment use."""
        return self._run(prompt, aspect_ratio, image_bytes, num_frames, seed)


# ── Local test entrypoint ──────────────────────────────────────────────────────
@app.local_entrypoint()
def main(
    prompt: str = "Cinematic brand opening, smooth motion, professional dark theme, premium feel",
    aspect_ratio: str = "16:9",
):
    gen = WanVideoGenerator()
    video_bytes = gen.generate_short.remote(prompt=prompt, aspect_ratio=aspect_ratio)
    out = Path("wan_test_output.mp4")
    out.write_bytes(video_bytes)
    print(f"Saved to {out} ({len(video_bytes)//1024} KB)")
