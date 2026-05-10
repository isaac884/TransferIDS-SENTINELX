from __future__ import annotations

import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
sys.path.insert(0, str(BACKEND))

from app.database import initialize_database  # noqa: E402
from ensure_database_exists import ensure_database_exists  # noqa: E402


if __name__ == "__main__":
    ensure_database_exists()
    status = initialize_database(force=True)
    print(json.dumps(status, indent=2, sort_keys=True))
    if not status.get("available"):
        raise SystemExit(1)
