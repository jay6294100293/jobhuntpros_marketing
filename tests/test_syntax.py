"""
Syntax gate for the FastAPI backend.

This is intentionally dependency-free: it ast.parse()s every backend Python
module rather than importing them, so it runs in CI with no secrets, no network,
and no MongoDB. It catches the most common deploy-breaker (a syntax error in
server.py or a router) before the auto-deploy cron ships it to production.

Run locally:  pytest tests/ -q
"""

import ast
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"

# Top-level backend modules that must always parse cleanly.
PY_FILES = sorted(
    p for p in BACKEND_DIR.glob("*.py") if p.name != "__init__.py"
)


def test_backend_dir_exists():
    assert BACKEND_DIR.is_dir(), f"backend/ not found at {BACKEND_DIR}"
    assert PY_FILES, "no backend Python modules found to check"


@pytest.mark.parametrize("py_file", PY_FILES, ids=lambda p: p.name)
def test_module_parses(py_file):
    # utf-8-sig mirrors CPython's own source loading (strips a leading BOM, which
    # some modules here have) so this matches what `python server.py` actually does.
    source = py_file.read_text(encoding="utf-8-sig")
    try:
        ast.parse(source, filename=str(py_file))
    except SyntaxError as exc:  # pragma: no cover - failure path
        pytest.fail(f"SyntaxError in {py_file.name}: {exc}")


def test_health_endpoint_string_present():
    """Guard the health payload the deploy scripts + Mother AI grep for."""
    server = (BACKEND_DIR / "server.py").read_text(encoding="utf-8-sig")
    assert '"LaunchBusiness AI API"' in server, (
        "health endpoint payload changed — update deploy.sh / health_check.sh greps"
    )
