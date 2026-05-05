"""
Backend API tests for Microsoft To Do-like app.
Covers: auth, lists CRUD, tasks CRUD, smart filters, search, AI endpoints.
Auth is seeded via mongosh per /app/auth_testing.md.
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://advanced-todo.preview.emergentagent.com").rstrip("/")
TOKEN = os.environ.get("TEST_SESSION_TOKEN", "test_session_1777678768220")
USER_ID = os.environ.get("TEST_USER_ID", "test-user-1777678768220")
HEADERS = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}


# -------- Auth --------
def test_me_unauthenticated():
    r = requests.get(f"{BASE_URL}/api/auth/me", timeout=15)
    assert r.status_code == 401

def test_me_invalid_token():
    r = requests.get(f"{BASE_URL}/api/auth/me",
                     headers={"Authorization": "Bearer invalid_xxx"}, timeout=15)
    assert r.status_code == 401

def test_me_valid_token():
    r = requests.get(f"{BASE_URL}/api/auth/me", headers=HEADERS, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["user_id"] == USER_ID
    assert "email" in data
    assert "_id" not in data


# -------- Lists CRUD --------
created_list_id = {"id": None}

def test_lists_list_initial():
    r = requests.get(f"{BASE_URL}/api/lists", headers=HEADERS, timeout=15)
    assert r.status_code == 200
    assert isinstance(r.json(), list)
    for item in r.json():
        assert "_id" not in item

def test_create_list():
    payload = {"name": "TEST_List_" + uuid.uuid4().hex[:6], "icon": "Star", "color": "#FF0000"}
    r = requests.post(f"{BASE_URL}/api/lists", json=payload, headers=HEADERS, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["name"] == payload["name"]
    assert data["icon"] == "Star"
    assert "list_id" in data
    assert "_id" not in data
    created_list_id["id"] = data["list_id"]

    # GET to verify persistence
    r2 = requests.get(f"{BASE_URL}/api/lists", headers=HEADERS, timeout=15)
    assert any(item["list_id"] == data["list_id"] for item in r2.json())

def test_update_list():
    lid = created_list_id["id"]
    assert lid
    r = requests.patch(f"{BASE_URL}/api/lists/{lid}", json={"name": "TEST_Renamed"},
                       headers=HEADERS, timeout=15)
    assert r.status_code == 200, r.text
    assert r.json()["name"] == "TEST_Renamed"

def test_update_list_not_found():
    r = requests.patch(f"{BASE_URL}/api/lists/nonexistent_xxx",
                       json={"name": "x"}, headers=HEADERS, timeout=15)
    assert r.status_code == 404


# -------- Tasks CRUD --------
created_task_ids = []

def test_create_task_basic():
    lid = created_list_id["id"]
    payload = {"title": "TEST_Buy milk", "list_id": lid, "important": True, "my_day": True}
    r = requests.post(f"{BASE_URL}/api/tasks", json=payload, headers=HEADERS, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["title"] == "TEST_Buy milk"
    assert data["important"] is True
    assert data["my_day"] is True
    assert data["completed"] is False
    assert "task_id" in data
    assert "_id" not in data
    created_task_ids.append(data["task_id"])

def test_create_task_with_due_date():
    payload = {"title": "TEST_Planned task", "due_date": "2026-12-25", "recurrence": "weekly"}
    r = requests.post(f"{BASE_URL}/api/tasks", json=payload, headers=HEADERS, timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert data["due_date"] == "2026-12-25"
    assert data["recurrence"] == "weekly"
    created_task_ids.append(data["task_id"])

def test_list_tasks_no_id():
    r = requests.get(f"{BASE_URL}/api/tasks", headers=HEADERS, timeout=15)
    assert r.status_code == 200
    items = r.json()
    assert isinstance(items, list)
    assert any(t["task_id"] in created_task_ids for t in items)

def test_smart_today():
    r = requests.get(f"{BASE_URL}/api/tasks?smart=today", headers=HEADERS, timeout=15)
    assert r.status_code == 200
    items = r.json()
    for t in items:
        assert t["my_day"] is True
        assert t["completed"] is False

def test_smart_important():
    r = requests.get(f"{BASE_URL}/api/tasks?smart=important", headers=HEADERS, timeout=15)
    assert r.status_code == 200
    for t in r.json():
        assert t["important"] is True
        assert t["completed"] is False

def test_smart_planned():
    r = requests.get(f"{BASE_URL}/api/tasks?smart=planned", headers=HEADERS, timeout=15)
    assert r.status_code == 200
    for t in r.json():
        assert t["due_date"] is not None
        assert t["completed"] is False

def test_search_q():
    r = requests.get(f"{BASE_URL}/api/tasks?q=Buy", headers=HEADERS, timeout=15)
    assert r.status_code == 200
    titles = [t["title"] for t in r.json()]
    assert any("Buy" in tt for tt in titles)

def test_update_task_complete():
    tid = created_task_ids[0]
    r = requests.patch(f"{BASE_URL}/api/tasks/{tid}", json={"completed": True},
                       headers=HEADERS, timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert data["completed"] is True
    assert data["completed_at"] is not None

def test_smart_completed():
    r = requests.get(f"{BASE_URL}/api/tasks?smart=completed", headers=HEADERS, timeout=15)
    assert r.status_code == 200
    for t in r.json():
        assert t["completed"] is True

def test_update_task_steps():
    tid = created_task_ids[1]
    steps = [{"id": "s1", "title": "Step 1", "completed": False},
             {"id": "s2", "title": "Step 2", "completed": True}]
    r = requests.patch(f"{BASE_URL}/api/tasks/{tid}", json={"steps": steps},
                       headers=HEADERS, timeout=15)
    assert r.status_code == 200
    assert len(r.json()["steps"]) == 2

def test_update_task_not_found():
    r = requests.patch(f"{BASE_URL}/api/tasks/nonexistent_xxx", json={"title": "x"},
                       headers=HEADERS, timeout=15)
    assert r.status_code == 404

def test_delete_task():
    tid = created_task_ids[1]
    r = requests.delete(f"{BASE_URL}/api/tasks/{tid}", headers=HEADERS, timeout=15)
    assert r.status_code == 200
    # verify gone
    r2 = requests.get(f"{BASE_URL}/api/tasks", headers=HEADERS, timeout=15)
    assert all(t["task_id"] != tid for t in r2.json())


# -------- List delete orphans tasks --------
def test_delete_list_orphans_tasks():
    lid = created_list_id["id"]
    # create another task in this list
    r = requests.post(f"{BASE_URL}/api/tasks",
                      json={"title": "TEST_orphan", "list_id": lid},
                      headers=HEADERS, timeout=15)
    tid = r.json()["task_id"]

    rd = requests.delete(f"{BASE_URL}/api/lists/{lid}", headers=HEADERS, timeout=15)
    assert rd.status_code == 200

    # Task should remain but list_id=null
    r2 = requests.get(f"{BASE_URL}/api/tasks", headers=HEADERS, timeout=15)
    found = [t for t in r2.json() if t["task_id"] == tid]
    assert len(found) == 1
    assert found[0]["list_id"] is None

    # cleanup
    requests.delete(f"{BASE_URL}/api/tasks/{tid}", headers=HEADERS, timeout=15)


# -------- AI Endpoints --------
def test_ai_suggest():
    r = requests.post(f"{BASE_URL}/api/ai/suggest",
                      json={"prompt": "haftalık spor planı"},
                      headers=HEADERS, timeout=90)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "suggestions" in data
    assert isinstance(data["suggestions"], list)
    assert len(data["suggestions"]) > 0

def test_ai_parse_natural_language():
    r = requests.post(f"{BASE_URL}/api/ai/parse",
                      json={"prompt": "Yarın 14:00 dişçiye git önemli olarak işaretle"},
                      headers=HEADERS, timeout=90)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "task_id" in data
    assert data["important"] is True
    assert data["due_date"] is not None
    assert "_id" not in data
    requests.delete(f"{BASE_URL}/api/tasks/{data['task_id']}", headers=HEADERS, timeout=15)

def test_ai_plan_day():
    r = requests.post(f"{BASE_URL}/api/ai/plan-day", headers=HEADERS, timeout=90)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "plan" in data
    assert isinstance(data["plan"], str)
    assert len(data["plan"]) > 0


# -------- Logout --------
def test_logout_then_me_fails():
    # Use a separate session so we don't kill TOKEN for other tests (run last)
    pass
