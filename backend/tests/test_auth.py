def test_auth_contract_exists():
    from app.core.auth import create_access_token

    token = create_access_token({"sub": "tester"})
    assert token


def test_login_uses_users_database_and_returns_jwt():
    from fastapi.testclient import TestClient

    from app.config import settings
    from app.database import initialize_database
    from app.main import app

    initialize_database(force=True)
    client = TestClient(app)
    response = client.post(
        "/api/auth/login",
        json={"username": settings.bootstrap_admin_username, "password": settings.bootstrap_admin_password},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["access_token"]
    assert payload["token_type"] == "bearer"
    assert payload["username"] == settings.bootstrap_admin_username
    assert payload["role"] == settings.bootstrap_admin_role


def test_login_rejects_bad_password():
    from fastapi.testclient import TestClient

    from app.config import settings
    from app.database import initialize_database
    from app.main import app

    initialize_database(force=True)
    client = TestClient(app)
    response = client.post(
        "/api/auth/login",
        json={"username": settings.bootstrap_admin_username, "password": "__wrong__"},
    )
    assert response.status_code == 401


def test_register_creates_analyst_user_and_returns_jwt():
    from uuid import uuid4

    from fastapi.testclient import TestClient

    from app.database import SessionLocal, initialize_database
    from app.main import app
    from app.services.user_service import get_user_by_username

    initialize_database(force=True)
    client = TestClient(app)
    username = f"analyst_{uuid4().hex[:10]}"
    password = "TransferIDS_User_2026!"
    response = client.post("/api/auth/register", json={"username": username, "password": password})
    assert response.status_code == 201
    payload = response.json()
    assert payload["access_token"]
    assert payload["username"] == username
    assert payload["role"] == "analyst"

    db = SessionLocal()
    try:
        user = get_user_by_username(db, username)
        assert user is not None
        assert user.password_hash != password
        assert user.role == "analyst"
    finally:
        db.close()


def test_register_rejects_duplicate_username():
    from uuid import uuid4

    from fastapi.testclient import TestClient

    from app.database import initialize_database
    from app.main import app

    initialize_database(force=True)
    client = TestClient(app)
    username = f"analyst_{uuid4().hex[:10]}"
    password = "TransferIDS_User_2026!"
    first = client.post("/api/auth/register", json={"username": username, "password": password})
    second = client.post("/api/auth/register", json={"username": username, "password": password})
    assert first.status_code == 201
    assert second.status_code == 409


def test_register_cors_preflight_allows_frontend_origin():
    from fastapi.testclient import TestClient

    from app.main import app

    client = TestClient(app)
    response = client.options(
        "/api/v1/auth/register",
        headers={
            "Origin": "http://127.0.0.1:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,x-transferids-tenant",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://127.0.0.1:5173"


def test_backend_serves_login_page_same_origin():
    from fastapi.testclient import TestClient

    from app.main import app

    client = TestClient(app)
    response = client.get("/login.html")
    assert response.status_code == 200
    assert "TransferIDS SENTINEL-X | Login" in response.text


def test_runtime_info_reports_frontend_mount():
    from fastapi.testclient import TestClient

    from app.main import app

    client = TestClient(app)
    response = client.get("/runtime-info")
    assert response.status_code == 200
    payload = response.json()
    assert payload["frontend_root_exists"] is True
    assert payload["login_html_exists"] is True
