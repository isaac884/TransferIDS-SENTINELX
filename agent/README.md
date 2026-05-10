# TransferIDS SENTINEL-X Thin Sensor Agent

This agent sends canonical flow observations to the SENTINEL-X backend.
It does not perform raw packet capture in this build.

## Scope

- Sends heartbeat to `POST /api/agents/heartbeat`.
- Reads local CSV, JSON, or JSONL flow observations.
- Requires the 13 canonical TransferIDS features.
- Sends observations to `POST /api/agents/observations`.
- Stores failed sends in a local JSONL retry queue.
- Does not include Npcap, packet capture, EDR behavior monitoring, self-protection, or remote update logic.

## Required Observation Fields

Each observation must include `source_ip`, `destination_ip`, and the 13 canonical features in the same order as `backend/app/ml/artifacts/feature_order.json`:

```text
flow_duration
total_fwd_pkts
total_bwd_pkts
total_fwd_bytes
total_bwd_bytes
fwd_pkt_len_mean
bwd_pkt_len_mean
fwd_iat_mean
bwd_iat_mean
fwd_iat_std
bwd_iat_std
init_win_fwd
init_win_bwd
```

The agent rejects missing, unsupported, non-numeric, NaN, Infinity, and negative feature values before sending.

## Configure

Create a runtime config from `config.example.json`:

```powershell
Copy-Item .\config.example.json .\config.json
```

If backend auth is enabled, put a real bearer token in `auth_token`.

## Run Once

```powershell
python .\transferids_agent.py --config .\config.json --once
```

## Run Continuously

```powershell
python .\transferids_agent.py --config .\config.json
```

The continuous mode repeats heartbeat, queue retry, and observation send on `heartbeat_interval`.
