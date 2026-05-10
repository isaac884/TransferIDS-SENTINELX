from __future__ import annotations

from pathlib import Path


class PcapParserService:
    def inspect(self, path: str | Path) -> dict:
        file_path = Path(path)
        return {"path": str(file_path), "exists": file_path.exists(), "size_bytes": file_path.stat().st_size if file_path.exists() else 0}

