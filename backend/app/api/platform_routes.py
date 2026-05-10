from __future__ import annotations

import importlib.util
import os
import subprocess
import sys
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.api.response_utils import api_error, api_success
from app.config import PROJECT_ROOT
from app.dependencies import get_current_user


router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("/geoip/status")
def geoip_status() -> dict[str, Any]:
    city_db_path = os.getenv("GEOIP_CITY_DB_PATH") or os.getenv("MAXMIND_CITY_DB_PATH") or ""
    city_db = Path(city_db_path) if city_db_path else None
    library_installed = importlib.util.find_spec("geoip2") is not None
    city_db_exists = bool(city_db and city_db.exists())
    enabled = library_installed and city_db_exists
    data = {
        "enabled": enabled,
        "provider": "maxmind_geoip2" if enabled else "unavailable",
        "mode": "real_geoip_with_protected_site_anchor" if enabled else "protected_site_anchor_only",
        "city_db_exists": city_db_exists,
        "city_db_path": str(city_db) if city_db else "",
        "library_installed": library_installed,
        "message": "GeoIP city database is available." if enabled else "GeoIP is unavailable. The map uses protected-site anchor fallback only.",
        "protected_site_anchor": {
            "site_name": os.getenv("PROTECTED_SITE_NAME", "Protected Site"),
            "country": os.getenv("PROTECTED_SITE_COUNTRY", "Taiwan"),
            "region": os.getenv("PROTECTED_SITE_REGION", "Taipei"),
            "latitude": float(os.getenv("PROTECTED_SITE_LATITUDE", "25.0330")),
            "longitude": float(os.getenv("PROTECTED_SITE_LONGITUDE", "121.5654")),
        },
    }
    return api_success(data, **data)


@router.get("/endpoint-agent/runtime")
def endpoint_agent_runtime() -> dict[str, Any]:
    agent_root = PROJECT_ROOT / "agent"
    agent_script = agent_root / "transferids_agent.py"
    config_example = agent_root / "config.example.json"
    config_file = agent_root / "config.json"
    queue_file = agent_root / "queue" / "agent_queue.jsonl"
    log_file = agent_root / "agent.log"
    install_script = agent_root / "install_agent.ps1"
    uninstall_script = agent_root / "uninstall_agent.ps1"
    smoke_script = agent_root / "smoke_test_agent.ps1"
    data = {
        "available": agent_script.exists(),
        "mode": "thin_sensor_canonical_observation_sender",
        "message": "Thin sensor agent is available. Raw packet capture and Windows service installation are not required in this MVP.",
        "admin_session": _is_admin_session(),
        "admin_required_for_service": False,
        "service": {
            "installed": False,
            "running": False,
            "status": "not-required",
            "start_mode": None,
            "message": "No Windows service is installed. This MVP agent runs as a thin Python sender.",
        },
        "python": {
            "path": sys.executable,
            "exists": Path(sys.executable).exists(),
            "scapy_installed": importlib.util.find_spec("scapy") is not None,
            "pywin32_installed": importlib.util.find_spec("win32service") is not None,
            "standard_library_agent": True,
            "message": "The thin agent uses the Python standard library. Scapy and pywin32 are optional for future packet-capture/service builds.",
        },
        "npcap": _npcap_status(),
        "config": {
            "backend_url": os.getenv("TRANSFERIDS_AGENT_BACKEND_URL", "http://127.0.0.1:8010/api"),
            "enrollment_secret_configured": bool(os.getenv("TRANSFERIDS_AGENT_TOKEN") or os.getenv("TRANSFERIDS_AGENT_AUTH_TOKEN")),
            "preferred_interface": os.getenv("TRANSFERIDS_AGENT_INTERFACE") or None,
            "config_exists": config_file.exists(),
        },
        "files": {
            "agent_root": str(agent_root),
            "agent_script": str(agent_script),
            "agent_script_exists": agent_script.exists(),
            "config_example": str(config_example),
            "config_example_exists": config_example.exists(),
            "env_file": "",
            "credentials_file": str(config_file),
            "credentials_exists": config_file.exists(),
            "queue_file": str(queue_file),
            "queue_exists": queue_file.exists(),
            "log_file": str(log_file),
            "log_exists": log_file.exists(),
            "last_log_line": _last_line(log_file),
            "install_admin_script": str(install_script) if install_script.exists() else "",
            "install_service_script": "",
            "uninstall_service_script": str(uninstall_script) if uninstall_script.exists() else "",
            "start_agent_script": str(agent_script),
            "smoke_test_script": str(smoke_script) if smoke_script.exists() else "",
        },
        "commands": {
            "install_admin": _powershell_command(install_script) if install_script.exists() else "",
            "uninstall_service": _powershell_command(uninstall_script) if uninstall_script.exists() else "",
            "smoke_test": _powershell_command(smoke_script) if smoke_script.exists() else "",
        },
    }
    return api_success(data, **data)


@router.get("/suricata-sensor/status")
def suricata_sensor_status() -> dict[str, Any]:
    data = _suricata_status()
    return api_success(data, **data)


@router.post("/suricata-sensor/start")
def start_suricata_sensor() -> JSONResponse:
    return JSONResponse(
        status_code=503,
        content=api_error(
            "SENSOR_CONTROL_UNAVAILABLE",
            "Live Suricata start/stop control is unavailable in this build. Use Data Intake Suricata EVE upload or distributed agent observations.",
            {"control_available": False},
        ),
    )


@router.post("/suricata-sensor/stop")
def stop_suricata_sensor() -> JSONResponse:
    return JSONResponse(
        status_code=503,
        content=api_error(
            "SENSOR_CONTROL_UNAVAILABLE",
            "Live Suricata start/stop control is unavailable in this build. No live sensor process was changed.",
            {"control_available": False},
        ),
    )


def _suricata_status() -> dict[str, Any]:
    eve_path_value = os.getenv("SURICATA_EVE_PATH", "")
    eve_path = Path(eve_path_value) if eve_path_value else None
    return {
        "available": False,
        "control_available": False,
        "running": False,
        "process_id": None,
        "mode": "unavailable",
        "message": "Live Suricata process control is not implemented in this MVP. Suricata EVE ingestion is available through Data Intake upload.",
        "interface_name": "",
        "interface_description": "",
        "interface_ip": "",
        "recommended_interface_name": "",
        "recommended_interface_ip": "",
        "interfaces": [],
        "config_path": "",
        "log_dir": "",
        "eve_file": str(eve_path) if eve_path else "",
        "eve": {
            "path": str(eve_path) if eve_path else "",
            "exists": bool(eve_path and eve_path.exists()),
            "size_bytes": eve_path.stat().st_size if eve_path and eve_path.exists() else 0,
            "last_write_time": "",
        },
        "auto_start": {"enabled": False, "interface_name": "", "interface_ip": "", "replay_file": ""},
        "replay_library": [],
        "runtime_error": "SENSOR_CONTROL_UNAVAILABLE",
    }


def _is_admin_session() -> bool:
    if os.name == "nt":
        try:
            import ctypes

            return bool(ctypes.windll.shell32.IsUserAnAdmin())
        except Exception:
            return False
    try:
        return os.geteuid() == 0
    except AttributeError:
        return False


def _npcap_status() -> dict[str, Any]:
    installed = False
    service_status = None
    start_type = None
    path_exists = False
    if os.name == "nt":
        candidates = [
            Path(os.environ.get("WINDIR", r"C:\Windows")) / "System32" / "Npcap",
            Path(os.environ.get("ProgramFiles", r"C:\Program Files")) / "Npcap",
        ]
        path_exists = any(path.exists() for path in candidates)
        try:
            result = subprocess.run(["sc.exe", "query", "npcap"], capture_output=True, text=True, timeout=3, check=False)
            installed = result.returncode == 0
            service_status = "installed" if installed else "not-installed"
        except Exception:
            service_status = "unknown"
    return {
        "installed": installed or path_exists,
        "service_status": service_status,
        "start_type": start_type,
        "path_exists": path_exists,
        "required_for_thin_agent": False,
        "message": "Npcap is optional here. The current thin agent does not capture packets directly.",
    }


def _powershell_command(script: Path) -> str:
    return f"powershell -NoProfile -ExecutionPolicy Bypass -File '{script}'"


def _last_line(path: Path) -> str:
    if not path.exists():
        return ""
    try:
        lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
        return lines[-1] if lines else ""
    except Exception:
        return ""
