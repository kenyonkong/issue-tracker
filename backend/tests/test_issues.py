import pytest
from fastapi.testclient import TestClient

from app import main

client = TestClient(main.app)


@pytest.fixture(autouse=True)
def reset_issue_store() -> None:
    main.issues.clear()
    main.next_issue_id = 1


def test_get_issues_starts_empty() -> None:
    response = client.get("/api/issues")
    assert response.status_code == 200
    assert response.json() == []


def test_create_and_get_issue() -> None:
    payload = {"title": "  Fix login  ", "description": "Users cannot sign in", "status": "Open", "priority": "High"}
    created = client.post("/api/issues", json=payload)
    assert created.status_code == 201
    assert created.json() == {"id": 1, **payload, "title": "Fix login"}
    assert client.get("/api/issues").json() == [created.json()]


@pytest.mark.parametrize("title", ["", "   ", "\t\n"])
def test_create_rejects_blank_title(title: str) -> None:
    response = client.post("/api/issues", json={"title": title, "description": "", "status": "Open", "priority": "Low"})
    assert response.status_code == 422
    assert main.issues == []


@pytest.mark.parametrize(("field", "value"), [("status", "Closed"), ("priority", "Urgent"), ("status", None), ("priority", None)])
def test_create_rejects_invalid_selections(field: str, value: str | None) -> None:
    payload = {"title": "Valid title", "description": "", "status": "Open", "priority": "Medium"}
    payload[field] = value
    response = client.post("/api/issues", json=payload)
    assert response.status_code == 422
    assert main.issues == []
