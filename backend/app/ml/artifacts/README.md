# Model Artifacts

Place production binary artifacts here when they are exported and checksummed:

- `transferids_cicids.onnx`
- `transferids_unsw.onnx`
- `transferids_c3.onnx`
- `scaler.pkl`
- `feature_order.json` is included because it is a deterministic schema contract, not a model artifact.

These files are intentionally not stubbed. Invalid placeholder ONNX files should not be committed because they would break smoke tests and misrepresent production readiness.
