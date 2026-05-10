def test_incident_group_key_is_stable():
    from app.engines.incident_engine import IncidentEngine

    assert IncidentEngine().group_key("1.1.1.1", "2.2.2.2", "scan") == "1.1.1.1->2.2.2.2:scan"

