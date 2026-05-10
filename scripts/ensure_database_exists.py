from __future__ import annotations

import json
import sys
from pathlib import Path

from sqlalchemy.engine import make_url


ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
sys.path.insert(0, str(BACKEND))

from app.config import settings  # noqa: E402


def ensure_database_exists() -> dict:
    url = make_url(settings.database_url)
    if url.get_backend_name() != "postgresql":
        return {"status": "skipped", "reason": "not_postgresql", "database": url.database}

    if not url.database:
        raise RuntimeError("DATABASE_URL must include a database name.")

    import psycopg

    target_database = url.database
    maintenance_url = url.set(drivername="postgresql", database="postgres")
    with psycopg.connect(maintenance_url.render_as_string(hide_password=False), autocommit=True) as conn:
        with conn.cursor() as cursor:
            cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s", (target_database,))
            exists = cursor.fetchone() is not None
            if not exists:
                cursor.execute(f'CREATE DATABASE "{target_database}"')

    return {"status": "ready", "database": target_database, "created": not exists}


if __name__ == "__main__":
    print(json.dumps(ensure_database_exists(), indent=2, sort_keys=True))
