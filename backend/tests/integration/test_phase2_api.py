"""Integration tests — Phase 2 API endpoints."""
from __future__ import annotations

import os
os.environ["ENVIRONMENT"] = "test"
os.environ["MONGODB_URI"] = "mongodb://localhost:27017"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-that-is-at-least-32-chars!!"
os.environ["DATABASE_NAME_TEST"] = "mathmax_test"

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from tests.conftest_phase2 import (
    TEACHER_ID, OTHER_TEACHER_ID,
    MockExaminationRepository, MockQuestionRepository,
    MockAnswerKeyRepository, MockRubricRepository,
    make_exam, make_question, make_rubric,
)
from app.core.security import create_access_token
from app.models.examination import ExaminationStatus
from app.models.user import AccountStatus, User, UserRole
from datetime import datetime, timezone


def make_teacher(uid: str = TEACHER_ID) -> User:
    return User(
        id=uid, name="Teacher", email=f"{uid[:6]}@test.com",
        password_hash="x", role=UserRole.TEACHER, is_active=True,
        status=AccountStatus.ACTIVE,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


def make_student() -> User:
    return User(
        id="s" * 24, name="Student", email="student@test.com",
        password_hash="x", role=UserRole.STUDENT, is_active=True,
        status=AccountStatus.ACTIVE,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


@pytest.fixture
def exam_repo():
    return MockExaminationRepository()


@pytest.fixture
def question_repo():
    return MockQuestionRepository()


@pytest.fixture
def answer_key_repo():
    return MockAnswerKeyRepository()


@pytest.fixture
def rubric_repo():
    return MockRubricRepository()


@pytest.fixture
def document_repo():
    from tests.conftest_phase2 import MockDocumentRepository
    return MockDocumentRepository()


@pytest.fixture
def client(exam_repo, question_repo, answer_key_repo, rubric_repo, document_repo):
    from app.api.dependencies.auth import get_user_repo, get_current_user
    from app.api.dependencies.phase2 import (
        get_exam_repo, get_question_repo, get_answer_key_repo, get_rubric_repo, get_document_repo,
    )
    from tests.conftest import MockUserRepository
    from app.main import app

    teacher = make_teacher()
    user_repo = MockUserRepository()
    user_repo.seed(teacher)
    token = create_access_token(teacher.id, extra_claims={"role": "teacher", "email": teacher.email, "name": teacher.name})

    app.dependency_overrides[get_user_repo] = lambda: user_repo
    app.dependency_overrides[get_exam_repo] = lambda: exam_repo
    app.dependency_overrides[get_question_repo] = lambda: question_repo
    app.dependency_overrides[get_answer_key_repo] = lambda: answer_key_repo
    app.dependency_overrides[get_rubric_repo] = lambda: rubric_repo
    app.dependency_overrides[get_document_repo] = lambda: document_repo

    with (
        patch("app.main.connect_to_mongo"),
        patch("app.main.close_mongo_connection"),
        patch("app.main.ensure_indexes"),
        patch("app.main.get_database"),
        patch("app.api.routes.health.ping_database", return_value=True),
    ):
        with TestClient(app, raise_server_exceptions=False) as c:
            c.headers = {"Authorization": f"Bearer {token}"}
            yield c

    app.dependency_overrides.clear()


@pytest.fixture
def student_client(exam_repo, question_repo, answer_key_repo, rubric_repo, document_repo):
    from app.api.dependencies.auth import get_user_repo
    from app.api.dependencies.phase2 import (
        get_exam_repo, get_question_repo, get_answer_key_repo, get_rubric_repo, get_document_repo,
    )
    from tests.conftest import MockUserRepository
    from app.main import app

    student = make_student()
    user_repo = MockUserRepository()
    user_repo.seed(student)
    token = create_access_token(student.id, extra_claims={"role": "student", "email": student.email, "name": student.name})

    app.dependency_overrides[get_user_repo] = lambda: user_repo
    app.dependency_overrides[get_exam_repo] = lambda: exam_repo
    app.dependency_overrides[get_question_repo] = lambda: question_repo
    app.dependency_overrides[get_answer_key_repo] = lambda: answer_key_repo
    app.dependency_overrides[get_rubric_repo] = lambda: rubric_repo
    app.dependency_overrides[get_document_repo] = lambda: document_repo

    with (
        patch("app.main.connect_to_mongo"),
        patch("app.main.close_mongo_connection"),
        patch("app.main.ensure_indexes"),
        patch("app.main.get_database"),
        patch("app.api.routes.health.ping_database", return_value=True),
    ):
        with TestClient(app, raise_server_exceptions=False) as c:
            c.headers = {"Authorization": f"Bearer {token}"}
            yield c

    app.dependency_overrides.clear()


# ── Examination endpoints ─────────────────────────────────────────────────────

def test_create_examination_api(client):
    resp = client.post("/api/v1/examinations", json={
        "title": "Algebra Test", "subject": "Mathematics",
        "total_marks": 20.0, "duration_minutes": 60,
    })
    assert resp.status_code == 201
    body = resp.json()
    assert body["title"] == "Algebra Test"
    assert body["status"] == "draft"


def test_create_examination_negative_marks_rejected(client):
    resp = client.post("/api/v1/examinations", json={
        "title": "Bad Test", "subject": "Maths", "total_marks": -5.0, "duration_minutes": 60,
    })
    assert resp.status_code == 422


def test_list_examinations_api(client, exam_repo):
    exam = make_exam()
    exam_repo.seed(exam)
    resp = client.get("/api/v1/examinations")
    assert resp.status_code == 200
    assert resp.json()["total"] == 1


def test_student_cannot_create_examination(student_client):
    resp = student_client.post("/api/v1/examinations", json={
        "title": "Hack", "subject": "Maths", "total_marks": 10.0, "duration_minutes": 30,
    })
    assert resp.status_code == 403


def test_get_examination_api(client, exam_repo):
    exam = make_exam()
    exam_repo.seed(exam)
    resp = client.get(f"/api/v1/examinations/{exam.id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == exam.id


def test_get_other_teachers_examination_returns_404(client, exam_repo):
    exam = make_exam(teacher_id=OTHER_TEACHER_ID)
    exam_repo.seed(exam)
    resp = client.get(f"/api/v1/examinations/{exam.id}")
    assert resp.status_code == 404


def test_update_examination_api(client, exam_repo):
    exam = make_exam()
    exam_repo.seed(exam)
    resp = client.patch(f"/api/v1/examinations/{exam.id}", json={"title": "Updated"})
    assert resp.status_code == 200
    assert resp.json()["title"] == "Updated"


def test_duplicate_examination_api(client, exam_repo):
    exam = make_exam()
    exam_repo.seed(exam)
    resp = client.post(f"/api/v1/examinations/{exam.id}/duplicate")
    assert resp.status_code == 201
    assert "Copy of" in resp.json()["title"]


def test_archive_examination_api(client, exam_repo):
    exam = make_exam()
    exam_repo.seed(exam)
    resp = client.post(f"/api/v1/examinations/{exam.id}/archive")
    assert resp.status_code == 200
    assert resp.json()["status"] == "archived"


def test_publish_check_api(client, exam_repo):
    exam = make_exam()
    exam_repo.seed(exam)
    resp = client.get(f"/api/v1/examinations/{exam.id}/publish-check")
    assert resp.status_code == 200
    body = resp.json()
    assert body["can_publish"] is False
    assert len(body["reasons"]) > 0


def test_dashboard_stats_api(client, exam_repo):
    exam = make_exam()
    exam_repo.seed(exam)
    resp = client.get("/api/v1/examinations/dashboard-stats")
    assert resp.status_code == 200
    assert resp.json()["draft"] == 1


# ── Question endpoints ────────────────────────────────────────────────────────

def test_add_question_api(client, exam_repo, question_repo):
    exam = make_exam()
    exam_repo.seed(exam)
    resp = client.post(f"/api/v1/examinations/{exam.id}/questions", json={
        "question_number": 1, "question_text": "Solve 2x+4=10.", "maximum_marks": 5.0,
    })
    assert resp.status_code == 201
    assert resp.json()["question_number"] == 1


def test_add_question_empty_text_rejected(client, exam_repo):
    exam = make_exam()
    exam_repo.seed(exam)
    resp = client.post(f"/api/v1/examinations/{exam.id}/questions", json={
        "question_number": 1, "question_text": "", "maximum_marks": 5.0,
    })
    assert resp.status_code == 422


def test_list_questions_api(client, exam_repo, question_repo):
    exam = make_exam()
    exam_repo.seed(exam)
    q = make_question(exam.id)
    question_repo.seed(q)
    resp = client.get(f"/api/v1/examinations/{exam.id}/questions")
    assert resp.status_code == 200
    assert len(resp.json()["questions"]) == 1


def test_student_cannot_list_questions(student_client, exam_repo):
    exam = make_exam()
    exam_repo.seed(exam)
    resp = student_client.get(f"/api/v1/examinations/{exam.id}/questions")
    assert resp.status_code == 403


# ── Rubric endpoints ──────────────────────────────────────────────────────────

def test_create_rubric_api(client, exam_repo, question_repo, rubric_repo):
    exam = make_exam()
    exam_repo.seed(exam)
    q = make_question(exam.id, marks=10.0)
    question_repo.seed(q)
    resp = client.post(f"/api/v1/questions/{q.id}/rubrics", json={
        "title": "Rubric 1",
        "steps": [{"step_number": 1, "title": "Step 1", "description": "Subtract 4", "maximum_marks": 2.0}],
    })
    assert resp.status_code == 201
    assert resp.json()["title"] == "Rubric 1"
    assert resp.json()["status"] == "draft"


def test_rubric_marks_exceed_question_rejected(client, exam_repo, question_repo, rubric_repo):
    exam = make_exam()
    exam_repo.seed(exam)
    q = make_question(exam.id, marks=3.0)
    question_repo.seed(q)
    resp = client.post(f"/api/v1/questions/{q.id}/rubrics", json={
        "title": "Over", "steps": [{"step_number": 1, "title": "S", "description": "D", "maximum_marks": 10.0}],
    })
    assert resp.status_code == 422


def test_activate_rubric_api(client, exam_repo, question_repo, rubric_repo):
    exam = make_exam()
    exam_repo.seed(exam)
    q = make_question(exam.id, marks=10.0)
    question_repo.seed(q)
    rubric = make_rubric(q.id, exam.id)
    rubric_repo.seed(rubric)
    resp = client.post(f"/api/v1/rubrics/{rubric.id}/activate")
    assert resp.status_code == 200
    assert resp.json()["status"] == "active"


def test_student_cannot_access_rubrics(student_client, exam_repo, question_repo):
    exam = make_exam()
    exam_repo.seed(exam)
    q = make_question(exam.id, marks=10.0)
    question_repo.seed(q)
    resp = student_client.get(f"/api/v1/questions/{q.id}/rubrics")
    assert resp.status_code == 403


# ── Answer key endpoints ──────────────────────────────────────────────────────

def test_create_answer_key_api(client, exam_repo, question_repo, answer_key_repo):
    exam = make_exam()
    exam_repo.seed(exam)
    q = make_question(exam.id, marks=5.0)
    question_repo.seed(q)
    resp = client.post(f"/api/v1/questions/{q.id}/answer-key", json={
        "expected_answer": "x = 3",
        "expected_final_answer": "3",
        "expected_steps": [{"step_number": 1, "description": "Subtract", "expression": "2x=6", "result": "2x=6"}],
    })
    assert resp.status_code == 201
    assert resp.json()["expected_answer"] == "x = 3"


def test_get_answer_key_for_question(client, exam_repo, question_repo, answer_key_repo):
    exam = make_exam()
    exam_repo.seed(exam)
    q = make_question(exam.id, marks=5.0)
    question_repo.seed(q)
    # Create it first
    client.post(f"/api/v1/questions/{q.id}/answer-key", json={"expected_answer": "x=3"})
    # Then get it
    resp = client.get(f"/api/v1/questions/{q.id}/answer-key")
    assert resp.status_code == 200
    assert resp.json()["expected_answer"] == "x=3"


# ── Document upload endpoints ─────────────────────────────────────────────────

def test_upload_question_paper_api_success(client, exam_repo, document_repo):
    import io
    exam = make_exam()
    exam_repo.seed(exam)
    file_bytes = b"%PDF-1.4 test question paper content"
    resp = client.post(
        f"/api/v1/examinations/{exam.id}/question-paper",
        files={"file": ("exam.pdf", io.BytesIO(file_bytes), "application/pdf")},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["original_filename"] == "exam.pdf"
    assert data["document_type"] == "question_paper"
    updated_exam = exam_repo.find_by_id(exam.id)
    assert updated_exam.question_paper_ref == data["id"]


def test_upload_answer_key_file_api_success(client, exam_repo, document_repo):
    import io
    exam = make_exam()
    exam_repo.seed(exam)
    file_bytes = b"\x89PNG\r\n\x1a\nvalid png binary header"
    resp = client.post(
        f"/api/v1/examinations/{exam.id}/answer-key-file",
        files={"file": ("key.png", io.BytesIO(file_bytes), "image/png")},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["original_filename"] == "key.png"
    assert data["document_type"] == "answer_key"
    updated_exam = exam_repo.find_by_id(exam.id)
    assert updated_exam.answer_key_ref == data["id"]


def test_upload_invalid_magic_bytes_rejected(client, exam_repo):
    import io
    exam = make_exam()
    exam_repo.seed(exam)
    file_bytes = b"not a real pdf content header"
    resp = client.post(
        f"/api/v1/examinations/{exam.id}/question-paper",
        files={"file": ("exam.pdf", io.BytesIO(file_bytes), "application/pdf")},
    )
    assert resp.status_code == 400
    assert "signature" in resp.json()["detail"].lower()


def test_upload_unauthorized_exam_returns_404(client, exam_repo):
    import io
    exam = make_exam(teacher_id=OTHER_TEACHER_ID)
    exam_repo.seed(exam)
    file_bytes = b"%PDF-1.4 sample content"
    resp = client.post(
        f"/api/v1/examinations/{exam.id}/question-paper",
        files={"file": ("exam.pdf", io.BytesIO(file_bytes), "application/pdf")},
    )
    assert resp.status_code == 404


def test_student_cannot_upload_document(student_client, exam_repo):
    import io
    exam = make_exam()
    exam_repo.seed(exam)
    file_bytes = b"%PDF-1.4 sample content"
    resp = student_client.post(
        f"/api/v1/examinations/{exam.id}/question-paper",
        files={"file": ("exam.pdf", io.BytesIO(file_bytes), "application/pdf")},
    )
    assert resp.status_code == 403


def test_delete_document_clears_examination_ref(client, exam_repo, document_repo):
    import io
    exam = make_exam()
    exam_repo.seed(exam)
    file_bytes = b"%PDF-1.4 test question paper content"
    upload_resp = client.post(
        f"/api/v1/examinations/{exam.id}/question-paper",
        files={"file": ("exam.pdf", io.BytesIO(file_bytes), "application/pdf")},
    )
    doc_id = upload_resp.json()["id"]
    assert exam_repo.find_by_id(exam.id).question_paper_ref == doc_id

    del_resp = client.delete(f"/api/v1/documents/{doc_id}")
    assert del_resp.status_code == 204
    assert document_repo.find_by_id(doc_id) is None
    assert exam_repo.find_by_id(exam.id).question_paper_ref is None


def test_publish_api_validation(client, exam_repo, question_repo, answer_key_repo, rubric_repo):
    exam = make_exam()
    exam.total_marks = 10.0
    exam_repo.seed(exam)
    q = make_question(exam.id, marks=10.0)
    question_repo.seed(q)

    # 1. Blocked when missing answer key & rubric
    resp = client.post(f"/api/v1/examinations/{exam.id}/publish")
    assert resp.status_code == 422

    # 2. Add answer key
    client.post(f"/api/v1/questions/{q.id}/answer-key", json={"expected_answer": "x=5"})

    # Still blocked because missing rubric
    resp = client.post(f"/api/v1/examinations/{exam.id}/publish")
    assert resp.status_code == 422

    # 3. Add rubric (initially draft)
    rubric_resp = client.post(f"/api/v1/questions/{q.id}/rubrics", json={
        "title": "Rubric 1",
        "steps": [{"step_number": 1, "title": "Step 1", "description": "Solve", "maximum_marks": 10.0}],
    })
    rubric_id = rubric_resp.json()["id"]

    # Still blocked because rubric is DRAFT
    resp = client.post(f"/api/v1/examinations/{exam.id}/publish")
    assert resp.status_code == 422

    # 4. Activate rubric
    client.post(f"/api/v1/rubrics/{rubric_id}/activate")

    # Now publishing succeeds
    resp = client.post(f"/api/v1/examinations/{exam.id}/publish")
    assert resp.status_code == 200
    assert resp.json()["status"] == "published"

