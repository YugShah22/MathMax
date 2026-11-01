"""
Integration tests for Phase 3 document ingestion and processing API endpoints.
"""
from __future__ import annotations

import io
import os
from datetime import datetime, timezone
from unittest.mock import patch

import pypdf
import pytest
from PIL import Image
from fastapi.testclient import TestClient

os.environ["ENVIRONMENT"] = "test"
os.environ["MONGODB_URI"] = "mongodb://localhost:27017"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-that-is-at-least-32-chars!!"
os.environ["DATABASE_NAME_TEST"] = "mathmax_test"

from app.core.security import create_access_token
from app.models.document import Document, DocumentStatus, DocumentType
from app.models.document_page import DocumentPage, PageStatus
from app.models.examination import ExaminationStatus
from app.models.processing_job import JobStatus, ProcessingJob, ProcessingStage
from app.models.user import AccountStatus, User, UserRole
from tests.conftest import MockUserRepository
from tests.conftest_phase2 import (
    TEACHER_ID,
    OTHER_TEACHER_ID,
    MockDocumentPageRepository,
    MockDocumentRepository,
    MockExaminationRepository,
    MockProcessingJobRepository,
    make_exam,
)


STUDENT_A_ID = "c" * 24
STUDENT_B_ID = "d" * 24


def make_user(uid: str, role: UserRole, email: str, name: str) -> User:
    return User(
        id=uid,
        name=name,
        email=email,
        password_hash="x",
        role=role,
        is_active=True,
        status=AccountStatus.ACTIVE,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


def create_blank_pdf(num_pages: int = 1) -> bytes:
    writer = pypdf.PdfWriter()
    for _ in range(num_pages):
        writer.add_blank_page(width=200, height=300)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


def create_png_image() -> bytes:
    img = Image.new("RGB", (100, 100), color=(255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


@pytest.fixture
def exam_repo():
    return MockExaminationRepository()


@pytest.fixture
def doc_repo():
    return MockDocumentRepository()


@pytest.fixture
def page_repo():
    return MockDocumentPageRepository()


@pytest.fixture
def job_repo():
    return MockProcessingJobRepository()


@pytest.fixture
def clients(exam_repo, doc_repo, page_repo, job_repo):
    from app.api.dependencies.auth import get_user_repo
    from app.api.dependencies.phase2 import get_document_repo, get_exam_repo
    from app.api.dependencies.phase3 import get_document_page_repo, get_processing_job_repo
    from app.main import app

    user_repo = MockUserRepository()

    teacher = make_user(TEACHER_ID, UserRole.TEACHER, "teacher@mathmax.com", "Teacher")
    student_a = make_user(STUDENT_A_ID, UserRole.STUDENT, "alice@mathmax.com", "Alice")
    student_b = make_user(STUDENT_B_ID, UserRole.STUDENT, "bob@mathmax.com", "Bob")

    user_repo.seed(teacher)
    user_repo.seed(student_a)
    user_repo.seed(student_b)

    token_teacher = create_access_token(teacher.id, extra_claims={"role": "teacher", "email": teacher.email, "name": teacher.name})
    token_a = create_access_token(student_a.id, extra_claims={"role": "student", "email": student_a.email, "name": student_a.name})
    token_b = create_access_token(student_b.id, extra_claims={"role": "student", "email": student_b.email, "name": student_b.name})

    app.dependency_overrides[get_user_repo] = lambda: user_repo
    app.dependency_overrides[get_exam_repo] = lambda: exam_repo
    app.dependency_overrides[get_document_repo] = lambda: doc_repo
    app.dependency_overrides[get_document_page_repo] = lambda: page_repo
    app.dependency_overrides[get_processing_job_repo] = lambda: job_repo

    with (
        patch("app.main.connect_to_mongo"),
        patch("app.main.close_mongo_connection"),
        patch("app.main.ensure_indexes"),
        patch("app.main.get_database"),
        patch("app.api.routes.health.ping_database", return_value=True),
    ):
        with TestClient(app, raise_server_exceptions=False) as c_teacher, \
             TestClient(app, raise_server_exceptions=False) as c_student_a, \
             TestClient(app, raise_server_exceptions=False) as c_student_b, \
             TestClient(app, raise_server_exceptions=False) as c_anon:
            c_teacher.headers = {"Authorization": f"Bearer {token_teacher}"}
            c_student_a.headers = {"Authorization": f"Bearer {token_a}"}
            c_student_b.headers = {"Authorization": f"Bearer {token_b}"}
            yield {
                "teacher": c_teacher,
                "student_a": c_student_a,
                "student_b": c_student_b,
                "anon": c_anon,
            }

    app.dependency_overrides.clear()


def test_upload_answer_sheet_student_success(clients, exam_repo):
    exam = make_exam(teacher_id=TEACHER_ID, status=ExaminationStatus.PUBLISHED)
    exam_repo.seed(exam)

    pdf_bytes = create_blank_pdf(num_pages=2)
    files = {"file": ("student_submission.pdf", pdf_bytes, "application/pdf")}

    resp = clients["student_a"].post(f"/api/v1/examinations/{exam.id}/answer-sheets", files=files)
    assert resp.status_code == 201
    data = resp.json()
    assert data["examination_id"] == exam.id
    assert data["student_id"] == STUDENT_A_ID
    assert data["page_count"] == 2
    assert data["status"] == "processed"
    assert data["document_type"] == "student_answer_sheet"


def test_upload_answer_sheet_to_draft_exam_fails(clients, exam_repo):
    exam = make_exam(teacher_id=TEACHER_ID, status=ExaminationStatus.DRAFT)
    exam_repo.seed(exam)

    pdf_bytes = create_blank_pdf(num_pages=1)
    files = {"file": ("student_submission.pdf", pdf_bytes, "application/pdf")}

    resp = clients["student_a"].post(f"/api/v1/examinations/{exam.id}/answer-sheets", files=files)
    assert resp.status_code == 400
    assert "not available for submissions" in resp.json()["detail"]


def test_upload_answer_sheet_invalid_magic_bytes_rejected(clients, exam_repo):
    exam = make_exam(teacher_id=TEACHER_ID, status=ExaminationStatus.PUBLISHED)
    exam_repo.seed(exam)

    fake_pdf = b"NOT_A_REAL_PDF_FILE_HEADER"
    files = {"file": ("solution.pdf", fake_pdf, "application/pdf")}

    resp = clients["student_a"].post(f"/api/v1/examinations/{exam.id}/answer-sheets", files=files)
    assert resp.status_code == 400
    detail = resp.json()["detail"].lower()
    assert "signature" in detail or "magic bytes" in detail


def test_list_answer_sheets_role_separation(clients, exam_repo):
    exam = make_exam(teacher_id=TEACHER_ID, status=ExaminationStatus.PUBLISHED)
    exam_repo.seed(exam)

    # Student A uploads
    pdf_a = create_blank_pdf(1)
    clients["student_a"].post(
        f"/api/v1/examinations/{exam.id}/answer-sheets",
        files={"file": ("a_solution.pdf", pdf_a, "application/pdf")},
    )

    # Student B uploads
    pdf_b = create_blank_pdf(1)
    clients["student_b"].post(
        f"/api/v1/examinations/{exam.id}/answer-sheets",
        files={"file": ("b_solution.pdf", pdf_b, "application/pdf")},
    )

    # Student A queries: only sees own sheet
    resp_a = clients["student_a"].get(f"/api/v1/examinations/{exam.id}/answer-sheets")
    assert resp_a.status_code == 200
    data_a = resp_a.json()
    assert data_a["total"] == 1
    assert data_a["items"][0]["student_id"] == STUDENT_A_ID

    # Teacher queries: sees both sheets
    resp_t = clients["teacher"].get(f"/api/v1/examinations/{exam.id}/answer-sheets")
    assert resp_t.status_code == 200
    data_t = resp_t.json()
    assert data_t["total"] == 2


def test_student_me_documents_endpoint(clients, exam_repo):
    exam = make_exam(teacher_id=TEACHER_ID, status=ExaminationStatus.PUBLISHED)
    exam_repo.seed(exam)

    pdf = create_blank_pdf(1)
    clients["student_a"].post(
        f"/api/v1/examinations/{exam.id}/answer-sheets",
        files={"file": ("a_solution.pdf", pdf, "application/pdf")},
    )

    resp = clients["student_a"].get("/api/v1/students/me/documents")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["original_filename"] == "a_solution.pdf"


def test_get_document_pages_and_stream(clients, exam_repo):
    exam = make_exam(teacher_id=TEACHER_ID, status=ExaminationStatus.PUBLISHED)
    exam_repo.seed(exam)

    png_bytes = create_png_image()
    up_resp = clients["student_a"].post(
        f"/api/v1/examinations/{exam.id}/answer-sheets",
        files={"file": ("exam_page.png", png_bytes, "image/png")},
    )
    doc_id = up_resp.json()["id"]

    # List pages
    pages_resp = clients["student_a"].get(f"/api/v1/documents/{doc_id}/pages")
    assert pages_resp.status_code == 200
    pages_data = pages_resp.json()
    assert pages_data["total"] == 1
    page_id = pages_data["items"][0]["id"]
    assert pages_data["items"][0]["page_number"] == 1
    assert pages_data["items"][0]["image_format"] == "PNG"

    # Get single page
    page_resp = clients["student_a"].get(f"/api/v1/documents/{doc_id}/pages/{page_id}")
    assert page_resp.status_code == 200
    assert page_resp.json()["id"] == page_id

    # Stream page image
    stream_resp = clients["student_a"].get(f"/api/v1/documents/{doc_id}/pages/{page_id}/file")
    assert stream_resp.status_code == 200
    assert stream_resp.headers["content-type"] in ("image/png", "image/png; charset=utf-8")
    assert len(stream_resp.content) > 0


def test_processing_status_and_retry(clients, exam_repo, doc_repo):
    exam = make_exam(teacher_id=TEACHER_ID, status=ExaminationStatus.PUBLISHED)
    exam_repo.seed(exam)

    png_bytes = create_png_image()
    up_resp = clients["student_a"].post(
        f"/api/v1/examinations/{exam.id}/answer-sheets",
        files={"file": ("sample.png", png_bytes, "image/png")},
    )
    doc_id = up_resp.json()["id"]

    # Processing status endpoint
    status_resp = clients["student_a"].get(f"/api/v1/documents/{doc_id}/processing-status")
    assert status_resp.status_code == 200
    s_data = status_resp.json()
    assert s_data["document_id"] == doc_id
    assert s_data["document_status"] == "processed"
    assert s_data["can_retry"] is False

    # Simulate failure to test retry endpoint
    doc_repo.update(doc_id, {"status": DocumentStatus.FAILED.value})

    # Status should now indicate can_retry is True
    status_resp_failed = clients["student_a"].get(f"/api/v1/documents/{doc_id}/processing-status")
    assert status_resp_failed.json()["can_retry"] is True

    # Call retry
    retry_resp = clients["student_a"].post(f"/api/v1/documents/{doc_id}/retry")
    assert retry_resp.status_code == 200
    assert retry_resp.json()["status"] == "processed"


def test_cross_student_access_denied(clients, exam_repo):
    exam = make_exam(teacher_id=TEACHER_ID, status=ExaminationStatus.PUBLISHED)
    exam_repo.seed(exam)

    png_bytes = create_png_image()
    up_resp = clients["student_a"].post(
        f"/api/v1/examinations/{exam.id}/answer-sheets",
        files={"file": ("alice_page.png", png_bytes, "image/png")},
    )
    doc_id = up_resp.json()["id"]

    # Student B attempts to access Student A's document
    get_resp = clients["student_b"].get(f"/api/v1/documents/{doc_id}")
    assert get_resp.status_code == 403

    # Student B attempts to access Student A's pages
    pages_resp = clients["student_b"].get(f"/api/v1/documents/{doc_id}/pages")
    assert pages_resp.status_code == 403

    # Student B attempts to retry Student A's document
    retry_resp = clients["student_b"].post(f"/api/v1/documents/{doc_id}/retry")
    assert retry_resp.status_code == 403


def test_unauthenticated_request_rejected(clients, exam_repo):
    exam = make_exam(status=ExaminationStatus.PUBLISHED)
    exam_repo.seed(exam)

    resp = clients["anon"].get(f"/api/v1/examinations/{exam.id}/answer-sheets")
    assert resp.status_code == 401


def test_teacher_can_upload_for_student(clients, exam_repo):
    exam = make_exam(teacher_id=TEACHER_ID, status=ExaminationStatus.PUBLISHED)
    exam_repo.seed(exam)

    png_bytes = create_png_image()
    files = {"file": ("student_submission.png", png_bytes, "image/png")}
    data = {"student_id": STUDENT_A_ID}

    resp = clients["teacher"].post(f"/api/v1/examinations/{exam.id}/answer-sheets", files=files, data=data)
    assert resp.status_code == 201
    res_data = resp.json()
    assert res_data["student_id"] == STUDENT_A_ID
    assert res_data["teacher_id"] == TEACHER_ID
    assert res_data["status"] == "processed"


def test_student_cannot_tamper_student_id_via_api(clients, exam_repo):
    exam = make_exam(teacher_id=TEACHER_ID, status=ExaminationStatus.PUBLISHED)
    exam_repo.seed(exam)

    png_bytes = create_png_image()
    files = {"file": ("spoof.png", png_bytes, "image/png")}
    data = {"student_id": STUDENT_B_ID}

    # Student A uploads with Student B's ID in the form data
    resp = clients["student_a"].post(f"/api/v1/examinations/{exam.id}/answer-sheets", files=files, data=data)
    assert resp.status_code == 201
    res_data = resp.json()
    # Must be forced to Student A's authenticated identity
    assert res_data["student_id"] == STUDENT_A_ID
    assert res_data["student_id"] != STUDENT_B_ID


def test_download_document_file(clients, exam_repo):
    exam = make_exam(teacher_id=TEACHER_ID, status=ExaminationStatus.PUBLISHED)
    exam_repo.seed(exam)

    png_bytes = create_png_image()
    files = {"file": ("sheet.png", png_bytes, "image/png")}
    up_resp = clients["student_a"].post(f"/api/v1/examinations/{exam.id}/answer-sheets", files=files)
    doc_id = up_resp.json()["id"]

    dl_resp = clients["student_a"].get(f"/api/v1/documents/{doc_id}/download")
    assert dl_resp.status_code == 200
    assert len(dl_resp.content) > 0
    assert "attachment" in dl_resp.headers.get("content-disposition", "") or "sheet.png" in dl_resp.headers.get("content-disposition", "")


def test_delete_document_api_cascades(clients, exam_repo, doc_repo, page_repo):
    exam = make_exam(teacher_id=TEACHER_ID, status=ExaminationStatus.PUBLISHED)
    exam_repo.seed(exam)

    png_bytes = create_png_image()
    files = {"file": ("to_delete.png", png_bytes, "image/png")}
    up_resp = clients["student_a"].post(f"/api/v1/examinations/{exam.id}/answer-sheets", files=files)
    doc_id = up_resp.json()["id"]

    assert doc_repo.find_by_id(doc_id) is not None
    assert len(page_repo.list_by_document(doc_id)) == 1

    del_resp = clients["student_a"].delete(f"/api/v1/documents/{doc_id}")
    assert del_resp.status_code == 204

    assert doc_repo.find_by_id(doc_id) is None
    assert len(page_repo.list_by_document(doc_id)) == 0

