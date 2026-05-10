import pytest


def test_canonical_mapping_rejects_missing_features():
    from app.common.canonical_mapper import map_to_canonical

    with pytest.raises(ValueError):
        map_to_canonical({})
