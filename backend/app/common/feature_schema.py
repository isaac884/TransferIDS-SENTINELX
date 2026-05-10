FEATURE_SCHEMA_VERSION = "canonical_13_v1"

CANONICAL_FEATURE_ORDER = [
    "flow_duration",
    "total_fwd_pkts",
    "total_bwd_pkts",
    "total_fwd_bytes",
    "total_bwd_bytes",
    "fwd_pkt_len_mean",
    "bwd_pkt_len_mean",
    "fwd_iat_mean",
    "bwd_iat_mean",
    "fwd_iat_std",
    "bwd_iat_std",
    "init_win_fwd",
    "init_win_bwd",
]

FEATURE_DESCRIPTIONS = {
    "flow_duration": "Flow lifetime in the source extractor unit.",
    "total_fwd_pkts": "Packets observed in the forward direction.",
    "total_bwd_pkts": "Packets observed in the backward direction.",
    "total_fwd_bytes": "Bytes observed in the forward direction.",
    "total_bwd_bytes": "Bytes observed in the backward direction.",
    "fwd_pkt_len_mean": "Mean forward packet length.",
    "bwd_pkt_len_mean": "Mean backward packet length.",
    "fwd_iat_mean": "Mean forward inter-arrival time.",
    "bwd_iat_mean": "Mean backward inter-arrival time.",
    "fwd_iat_std": "Standard deviation of forward inter-arrival time.",
    "bwd_iat_std": "Standard deviation of backward inter-arrival time.",
    "init_win_fwd": "Initial TCP window size in the forward direction.",
    "init_win_bwd": "Initial TCP window size in the backward direction.",
}
