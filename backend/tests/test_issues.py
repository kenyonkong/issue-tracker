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


def test_backend_generates_unique_issue_ids() -> None:
    first = client.post("/api/issues", json={"title": "First", "description": "", "status": "Open", "priority": "Low"})
    second = client.post("/api/issues", json={"title": "Second", "description": "", "status": "Resolved", "priority": "High"})

    assert first.json()["id"] == 1
    assert second.json()["id"] == 2


@pytest.mark.parametrize("existing_status", ["Open", "In Progress"])
def test_rejects_title_matching_an_active_issue(existing_status: str) -> None:
    original = client.post(
        "/api/issues",
        json={"title": "Fix   Login", "description": "First report", "status": existing_status, "priority": "Low"},
    )
    duplicate = client.post(
        "/api/issues",
        json={"title": "  FIX login  ", "description": "Different report", "status": "Open", "priority": "High"},
    )

    assert original.status_code == 201
    assert duplicate.status_code == 409
    assert duplicate.json() == {"detail": "An active issue with this title already exists (issue #1)."}
    assert len(main.issues) == 1


def test_allows_title_matching_only_resolved_issues() -> None:
    resolved = client.post(
        "/api/issues",
        json={"title": "Fix login", "description": "Old occurrence", "status": "Resolved", "priority": "Low"},
    )
    repeated = client.post(
        "/api/issues",
        json={"title": " fix LOGIN ", "description": "It happened again", "status": "Open", "priority": "High"},
    )

    assert resolved.status_code == 201
    assert repeated.status_code == 201
    assert repeated.json()["id"] == 2
    assert len(main.issues) == 2


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


def test_patch_updates_editable_fields_without_changing_title_or_id() -> None:
    created = client.post(
        "/api/issues",
        json={"title": "Fix login", "description": "Old", "status": "Open", "priority": "Low"},
    ).json()
    response = client.patch(
        f"/api/issues/{created['id']}",
        json={"description": "Updated", "status": "Resolved", "priority": "High"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "id": created["id"], "title": "Fix login", "description": "Updated",
        "status": "Resolved", "priority": "High",
    }
    assert client.get("/api/issues").json() == [response.json()]


def test_patch_rejects_title_changes_and_unknown_ids() -> None:
    created = client.post(
        "/api/issues",
        json={"title": "Fixed title", "description": "", "status": "Open", "priority": "Low"},
    ).json()

    assert client.patch(f"/api/issues/{created['id']}", json={"title": "New title"}).status_code == 422
    missing = client.patch("/api/issues/999", json={"status": "Resolved"})
    assert missing.status_code == 404
    assert missing.json() == {"detail": "Issue #999 not found."}


def test_delete_removes_issue_and_unknown_id_returns_404() -> None:
    created = client.post(
        "/api/issues",
        json={"title": "Delete me", "description": "", "status": "Open", "priority": "Low"},
    ).json()

    assert client.delete(f"/api/issues/{created['id']}").status_code == 204
    assert client.get("/api/issues").json() == []
    missing = client.delete(f"/api/issues/{created['id']}")
    assert missing.status_code == 404
    assert missing.json() == {"detail": f"Issue #{created['id']} not found."}
