# ONNX Model Contract

Expected production artifacts:

- `transferids_c3.onnx`
- `transferids_c3.metadata.json`
- `feature_order.json`

Feature order must match `backend/app/common/feature_schema.py`. Do not commit invalid placeholder ONNX files.

The current C3/C3-2 binary model uses this exact 13-feature order:

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

Export from the default C3-2 checkpoint:

```bash
python scripts/export_c3_checkpoint_to_onnx.py
```

## Validation Gate

After placing `backend/app/ml/artifacts/transferids_c3.onnx`, run:

```bash
python -m pip install -r backend/requirements-model.txt
npm run onnx:smoke
```

The smoke test enforces:

- `feature_order.json` has exactly 13 features.
- `transferids_c3.metadata.json` feature order matches `feature_order.json` when metadata exists.
- The ONNX model has exactly one input.
- The ONNX input final dimension is 13.
- A single `[1, 13]` input tensor can execute inference.
- The model returns at least one output tensor.
