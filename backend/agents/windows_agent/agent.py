from __future__ import annotations

try:
    from .flow_extractor import extract_flows
    from .heartbeat import heartbeat_payload
    from .sender import flush_buffer, load_config, send_payload
except ImportError:
    from flow_extractor import extract_flows
    from heartbeat import heartbeat_payload
    from sender import flush_buffer, load_config, send_payload


def main() -> None:
    config = load_config()
    agent_id = str(config.get("agent_id", "windows-agent-local"))
    send_payload("/api/v1/intake/agent/heartbeat", heartbeat_payload(agent_id), config)

    flows = extract_flows(config)
    if flows:
        send_payload(
            "/api/v1/intake/agent/flows",
            {"agent_id": agent_id, "flows": flows},
            config,
        )
    flush_buffer(config)


if __name__ == "__main__":
    main()
