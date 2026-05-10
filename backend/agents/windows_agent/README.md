# Windows Agent

Lightweight endpoint collector for heartbeat, canonical flow forwarding and secure upload into TransferIDS SENTINEL-X.

This is a thin agent. It does not run the ONNX model locally and it does not generate sample traffic. It forwards real canonical flow records to the central server:

```text
Endpoint traffic -> Flow extractor -> 13 canonical features -> Server inference -> Event/Incident
```

Run once:

```powershell
python agent.py
```

Configuration:

- `server_url`: TransferIDS backend URL.
- `tenant_id`: tenant header sent as `X-TransferIDS-Tenant`.
- `canonical_flow_file`: optional JSON/JSONL file produced by a real packet/flow collector.
- `buffer_path`: retry queue for failed HTTP sends.

Production requirements:

- Npcap or ETW-based capture integration.
- mTLS or signed agent token.
- Local buffering and retry.
- Signed auto-update flow.
