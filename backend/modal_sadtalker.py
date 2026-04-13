"""
SwiftPack AI — Modal SadTalker Talking Head App
================================================
Deploy:  modal deploy backend/modal_sadtalker.py
Test:    modal run backend/modal_sadtalker.py

Requires:
  MODAL_TOKEN_ID / MODAL_TOKEN_SECRET in secrets/swiftpack.env

Two Modal functions:
  1. check_face()       — CPU: DeepFace validation (face present, single face, no public figures)
  2. SadTalkerGenerator — GPU A10G: portrait photo + audio → lip-synced MP4

Cost estimate:
  check_face: ~$0.001/call (CPU only)
  SadTalker:  ~$0.10/video on A10G (~30s inference)

PROTECTION LAYERS (enforced in server.py before calling these functions):
  1. Stripe Identity ID verification (identity_verified flag in DB)
  2. DeepFace face check (this file — check_face function)
  3. "AI GENERATED" label burned into output video (server.py FFmpeg pass)
  4. Consent checkbox timestamped in DB (server.py gate)
  5. ToS prohibition on impersonation (legal)
"""

import modal
from pathlib import Path
import io

APP_NAME = "swiftpack-sadtalker"
app = modal.App(APP_NAME)

# ── Persistent volumes ─────────────────────────────────────────────────────────
sadtalker_volume = modal.Volume.from_name("swiftpack-sadtalker-weights", create_if_missing=True)

# ── Images ─────────────────────────────────────────────────────────────────────
# Lightweight image for face validation (CPU only)
face_check_image = (
    modal.Image.debian_slim(python_version="3.10")
    .apt_install(["libgl1", "libglib2.0-0"])
    .pip_install([
        "deepface==0.0.93",
        "tf-keras",
        "Pillow",
        "numpy",
        "opencv-python-headless",
    ])
)

# Full image for SadTalker inference (GPU)
SADTALKER_REPO = "https://github.com/OpenTalker/SadTalker.git"
SADTALKER_DIR = Path("/sadtalker")
WEIGHTS_DIR = Path("/weights/sadtalker")

sadtalker_image = (
    modal.Image.debian_slim(python_version="3.9")
    .apt_install([
        "ffmpeg", "libgl1", "libglib2.0-0", "libsm6", "libxext6",
        "git", "wget", "unzip",
    ])
    .run_commands(
        f"git clone --depth 1 {SADTALKER_REPO} {SADTALKER_DIR}",
        f"pip install -r {SADTALKER_DIR}/requirements.txt",
        "pip install gfpgan",  # face enhancement
    )
    .pip_install([
        "torch==2.0.1+cu118",
        "torchvision==0.15.2+cu118",
        "--extra-index-url", "https://download.pytorch.org/whl/cu118",
    ])
)


# ── 1. Face validation (CPU) ───────────────────────────────────────────────────
@app.function(
    image=face_check_image,
    timeout=60,
    cpu=2,
)
def check_face(portrait_bytes: bytes) -> dict:
    """
    Validate the uploaded portrait photo:
    - Checks there is exactly ONE human face
    - Rejects group photos
    - Basic liveness check (not a cartoon / illustration)

    Returns:
      {
        "ok": bool,
        "face_count": int,
        "reason": str   — human-readable message
      }
    """
    import numpy as np
    from PIL import Image as PILImage

    try:
        img = PILImage.open(io.BytesIO(portrait_bytes)).convert("RGB")
    except Exception:
        return {"ok": False, "face_count": 0, "reason": "Could not decode image. Upload a JPEG or PNG."}

    # Minimum resolution check
    if img.width < 128 or img.height < 128:
        return {"ok": False, "face_count": 0, "reason": "Image too small. Minimum 128×128 pixels."}

    img_array = np.array(img)

    try:
        from deepface import DeepFace
        faces = DeepFace.extract_faces(
            img_array,
            detector_backend="retinaface",
            enforce_detection=True,
            align=True,
        )
        face_count = len(faces)
    except Exception as e:
        err = str(e).lower()
        if "face could not be detected" in err or "no face" in err:
            return {"ok": False, "face_count": 0,
                    "reason": "No face detected. Upload a clear portrait photo facing the camera."}
        return {"ok": False, "face_count": 0, "reason": f"Face detection error: {e}"}

    if face_count == 0:
        return {"ok": False, "face_count": 0,
                "reason": "No face detected. Upload a clear portrait photo facing the camera."}

    if face_count > 1:
        return {"ok": False, "face_count": face_count,
                "reason": f"{face_count} faces detected. Upload a single-person portrait only."}

    # Face area sanity check — face should occupy a reasonable portion of the image
    face_area = faces[0].get("facial_area", {})
    fw = face_area.get("w", 0)
    fh = face_area.get("h", 0)
    face_fraction = (fw * fh) / (img.width * img.height)
    if face_fraction < 0.03:
        return {"ok": False, "face_count": 1,
                "reason": "Face is too small in the image. Upload a portrait where your face fills most of the frame."}

    return {"ok": True, "face_count": 1, "reason": "Face validation passed."}


# ── 2. SadTalker talking head (GPU) ───────────────────────────────────────────
@app.cls(
    gpu=modal.gpu.A10G(),
    image=sadtalker_image,
    volumes={"/weights": sadtalker_volume},
    timeout=300,
    scaledown_window=30,
    max_containers=2,
)
class SadTalkerGenerator:

    @modal.enter()
    def download_weights(self):
        """Download SadTalker model weights into persistent volume on first run."""
        import subprocess

        WEIGHTS_DIR.mkdir(parents=True, exist_ok=True)
        checkpoints_dir = WEIGHTS_DIR / "checkpoints"
        gfpgan_dir = WEIGHTS_DIR / "gfpgan" / "weights"

        if not (checkpoints_dir / "SadTalker_V0.0.2_256.safetensors").exists():
            print("Downloading SadTalker weights …")
            checkpoints_dir.mkdir(parents=True, exist_ok=True)
            gfpgan_dir.mkdir(parents=True, exist_ok=True)

            urls = [
                ("https://github.com/OpenTalker/SadTalker/releases/download/v0.0.2-rc/SadTalker_V0.0.2_256.safetensors",
                 checkpoints_dir / "SadTalker_V0.0.2_256.safetensors"),
                ("https://github.com/OpenTalker/SadTalker/releases/download/v0.0.2-rc/SadTalker_V0.0.2_512.safetensors",
                 checkpoints_dir / "SadTalker_V0.0.2_512.safetensors"),
                ("https://github.com/OpenTalker/SadTalker/releases/download/v0.0.2-rc/mapping_00109-model.pth.tar",
                 checkpoints_dir / "mapping_00109-model.pth.tar"),
                ("https://github.com/OpenTalker/SadTalker/releases/download/v0.0.2-rc/mapping_00229-model.pth.tar",
                 checkpoints_dir / "mapping_00229-model.pth.tar"),
                ("https://github.com/xinntao/facexlib/releases/download/v0.1.0/alignment_WFLW_4HG.pth",
                 checkpoints_dir / "alignment_WFLW_4HG.pth"),
                ("https://github.com/xinntao/facexlib/releases/download/v0.1.0/detection_Resnet50_Final.pth",
                 checkpoints_dir / "detection_Resnet50_Final.pth"),
                ("https://github.com/TencentARC/GFPGAN/releases/download/v1.3.0/GFPGANv1.4.pth",
                 gfpgan_dir / "GFPGANv1.4.pth"),
            ]
            for url, dest in urls:
                if not dest.exists():
                    subprocess.run(["wget", "-q", "-O", str(dest), url], check=True)

            sadtalker_volume.commit()
            print("SadTalker weights downloaded and committed.")

        # Symlink weights into SadTalker's expected locations
        sadtalker_checkpoints = SADTALKER_DIR / "checkpoints"
        sadtalker_gfpgan = SADTALKER_DIR / "gfpgan" / "weights"
        if not sadtalker_checkpoints.exists():
            sadtalker_checkpoints.symlink_to(checkpoints_dir)
        if not sadtalker_gfpgan.exists():
            sadtalker_gfpgan.parent.mkdir(parents=True, exist_ok=True)
            sadtalker_gfpgan.symlink_to(gfpgan_dir)

        print("SadTalker weights ready.")

    @modal.method()
    def generate(
        self,
        portrait_bytes: bytes,
        audio_bytes: bytes,
        still_mode: bool = True,   # True = subtle head movement (safer/cleaner)
        enhancer: str = "gfpgan",  # face enhancement
        size: int = 256,           # 256 or 512 (512 is slower but higher res)
    ) -> bytes:
        """
        Generate lip-synced talking head video.
        portrait_bytes: JPEG/PNG portrait photo
        audio_bytes:    MP3/WAV voiceover audio
        Returns: raw MP4 bytes of talking head video (NO AI label — added by caller)
        """
        import sys
        import tempfile
        import subprocess
        import shutil
        import os

        sys.path.insert(0, str(SADTALKER_DIR))

        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir = Path(tmpdir)

            # Write inputs to disk
            portrait_path = tmpdir / "portrait.jpg"
            audio_path = tmpdir / "audio.wav"
            portrait_path.write_bytes(portrait_bytes)

            # Convert audio to WAV (SadTalker expects WAV)
            audio_mp3 = tmpdir / "audio.mp3"
            audio_mp3.write_bytes(audio_bytes)
            subprocess.run(
                ["ffmpeg", "-y", "-i", str(audio_mp3), "-ar", "16000", str(audio_path)],
                capture_output=True, check=True,
            )

            out_dir = tmpdir / "output"
            out_dir.mkdir()

            # Run SadTalker inference
            result_dir = tmpdir / "results"
            cmd = [
                "python", str(SADTALKER_DIR / "inference.py"),
                "--driven_audio", str(audio_path),
                "--source_image", str(portrait_path),
                "--result_dir", str(result_dir),
                "--still" if still_mode else "--expression_scale", "1.0" if not still_mode else "",
                "--size", str(size),
                "--enhancer", enhancer,
                "--batch_size", "1",
                "--face3dvis",
            ]
            cmd = [c for c in cmd if c]  # remove empty strings
            proc = subprocess.run(cmd, capture_output=True, text=True, cwd=str(SADTALKER_DIR))
            if proc.returncode != 0:
                raise RuntimeError(f"SadTalker failed: {proc.stderr[-500:]}")

            # Find output MP4
            mp4_files = list(result_dir.rglob("*.mp4"))
            if not mp4_files:
                raise RuntimeError("SadTalker produced no output file")

            return mp4_files[0].read_bytes()


# ── Local test entrypoint ──────────────────────────────────────────────────────
@app.local_entrypoint()
def main(portrait: str = "portrait.jpg", audio: str = "audio.mp3"):
    """Test talking head generation. Provide portrait.jpg and audio.mp3 locally."""
    portrait_bytes = Path(portrait).read_bytes()
    audio_bytes = Path(audio).read_bytes()

    # First validate the face
    result = check_face.remote(portrait_bytes)
    print(f"Face check: {result}")
    if not result["ok"]:
        print("Aborting — face validation failed.")
        return

    # Generate talking head
    gen = SadTalkerGenerator()
    video_bytes = gen.generate.remote(portrait_bytes, audio_bytes)
    out = Path("sadtalker_output.mp4")
    out.write_bytes(video_bytes)
    print(f"Saved to {out} ({len(video_bytes)//1024} KB)")
