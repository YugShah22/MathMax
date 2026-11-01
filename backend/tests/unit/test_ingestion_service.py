"""
Unit tests for IngestionService, document validation, page extraction, and processing jobs.
"""
from __future__ import annotations

import io
from datetime import datetime, timezone
import pypdf
import pytest
from PIL import Image

from app.models.document import Document, DocumentStatus, DocumentType
from app.models.document_page import DocumentPage, PageStatus
from app.models.examination import Examination, ExaminationStatus
from app.models.processing_job import JobStatus, ProcessingJob, ProcessingStage
from app.models.user import AccountStatus, User, UserRole
from app.services.ingestion_service import IngestionError, IngestionService
from tests.conftest_phase2 import (
    TEACHER_ID,
    OTHER_TEACHER_ID,
    MockDocumentPageRepository,
    MockDocumentRepository,
    MockExaminationRepository,
    MockProcessingJobRepository,
    make_exam,
)


STUDENT_ID = "c" * 24
OTHER_STUDENT_ID = "d" * 24


def make_test_teacher(uid: str = TEACHER_ID) -> User:
    return User(
        id=uid,
        name="Teacher Test",
        email=f"{uid[:6]}@example.com",
        password_hash="hashed",
        role=UserRole.TEACHER,
        is_active=True,
        status=AccountStatus.ACTIVE,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


def make_test_student(uid: str = STUDENT_ID) -> User:
    return User(
        id=uid,
        name="Student Test",
        email=f"{uid[:6]}@example.com",
        password_hash="hashed",
        role=UserRole.STUDENT,
        is_active=True,
        status=AccountStatus.ACTIVE,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


def create_blank_pdf(num_pages: int = 1, encrypted: bool = False) -> bytes:
    writer = pypdf.PdfWriter()
    for _ in range(num_pages):
        writer.add_blank_page(width=200, height=300)
    if encrypted:
        writer.encrypt("user_pass")
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


def create_test_image(format: str = "PNG", size: tuple[int, int] = (200, 200)) -> bytes:
    img = Image.new("RGB", size, color=(240, 240, 240))
    buf = io.BytesIO()
    img.save(buf, format=format)
    return buf.getvalue()


@pytest.fixture
def service():
    doc_repo = MockDocumentRepository()
    page_repo = MockDocumentPageRepository()
    job_repo = MockProcessingJobRepository()
    exam_repo = MockExaminationRepository()
    return IngestionService(
        doc_repo=doc_repo,
        page_repo=page_repo,
        job_repo=job_repo,
        exam_repo=exam_repo,
    ), doc_repo, page_repo, job_repo, exam_repo


def test_ingest_multipage_pdf_success(service):
    srv, doc_repo, page_repo, job_repo, exam_repo = service
    teacher = make_test_teacher()
    student = make_test_student()

    exam = make_exam(teacher_id=teacher.id, status=ExaminationStatus.PUBLISHED)
    exam_repo.seed(exam)

    pdf_bytes = create_blank_pdf(num_pages=3)
    doc, job, pages = srv.ingest_answer_sheet(
        examination_id=exam.id,
        uploader=student,
        filename="answers.pdf",
        content_type="application/pdf",
        data=pdf_bytes,
    )

    assert doc.id != ""
    assert doc.status == DocumentStatus.PROCESSED
    assert doc.page_count == 3
    assert doc.document_type == DocumentType.STUDENT_ANSWER_SHEET
    assert doc.student_id == student.id

    assert job.status == JobStatus.COMPLETED
    assert job.processed_pages == 3
    assert job.total_pages == 3

    assert len(pages) == 3
    for i, p in enumerate(pages):
        assert p.page_number == i + 1
        assert p.document_id == doc.id
        assert p.status == PageStatus.PROCESSED
        assert p.image_format == "PNG"
        assert p.original_width > 0
        assert p.original_height > 0

    # Ensure repository state persists
    assert doc_repo.find_by_id(doc.id) is not None
    assert len(page_repo.list_by_document(doc.id)) == 3
    assert job_repo.find_latest_by_document(doc.id) is not None


def test_ingest_image_png_success(service):
    srv, doc_repo, page_repo, job_repo, exam_repo = service
    teacher = make_test_teacher()
    student = make_test_student()

    exam = make_exam(teacher_id=teacher.id, status=ExaminationStatus.PUBLISHED)
    exam_repo.seed(exam)

    png_bytes = create_test_image("PNG", size=(300, 400))
    doc, job, pages = srv.ingest_answer_sheet(
        examination_id=exam.id,
        uploader=student,
        filename="solution.png",
        content_type="image/png",
        data=png_bytes,
    )

    assert doc.status == DocumentStatus.PROCESSED
    assert doc.page_count == 1
    assert len(pages) == 1
    assert pages[0].page_number == 1
    assert pages[0].image_format == "PNG"
    assert pages[0].original_width == 300
    assert pages[0].original_height == 400


def test_ingest_image_jpeg_success(service):
    srv, doc_repo, page_repo, job_repo, exam_repo = service
    teacher = make_test_teacher()
    student = make_test_student()

    exam = make_exam(teacher_id=teacher.id, status=ExaminationStatus.PUBLISHED)
    exam_repo.seed(exam)

    jpg_bytes = create_test_image("JPEG", size=(250, 350))
    doc, job, pages = srv.ingest_answer_sheet(
        examination_id=exam.id,
        uploader=student,
        filename="page1.jpg",
        content_type="image/jpeg",
        data=jpg_bytes,
    )

    assert doc.status == DocumentStatus.PROCESSED
    assert doc.page_count == 1
    assert len(pages) == 1
    assert pages[0].image_format == "JPEG"
    assert pages[0].original_width == 250
    assert pages[0].original_height == 350


def test_ingest_empty_file_fails(service):
    srv, _, _, _, exam_repo = service
    student = make_test_student()
    exam = make_exam(status=ExaminationStatus.PUBLISHED)
    exam_repo.seed(exam)

    with pytest.raises(IngestionError) as exc_info:
        srv.ingest_answer_sheet(
            examination_id=exam.id,
            uploader=student,
            filename="blank.pdf",
            content_type="application/pdf",
            data=b"",
        )
    assert exc_info.value.status_code == 400
    assert "empty" in str(exc_info.value).lower()


def test_ingest_corrupted_pdf_fails(service):
    srv, _, _, _, exam_repo = service
    student = make_test_student()
    exam = make_exam(status=ExaminationStatus.PUBLISHED)
    exam_repo.seed(exam)

    corrupted = b"%PDF-1.4\nSome invalid binary garbage not a valid pdf."
    with pytest.raises(IngestionError) as exc_info:
        srv.ingest_answer_sheet(
            examination_id=exam.id,
            uploader=student,
            filename="bad.pdf",
            content_type="application/pdf",
            data=corrupted,
        )
    assert exc_info.value.status_code == 400
    assert "corrupted" in str(exc_info.value).lower() or "invalid" in str(exc_info.value).lower()


def test_ingest_encrypted_pdf_fails(service):
    srv, _, _, _, exam_repo = service
    student = make_test_student()
    exam = make_exam(status=ExaminationStatus.PUBLISHED)
    exam_repo.seed(exam)

    encrypted_pdf = create_blank_pdf(num_pages=1, encrypted=True)
    with pytest.raises(IngestionError) as exc_info:
        srv.ingest_answer_sheet(
            examination_id=exam.id,
            uploader=student,
            filename="encrypted.pdf",
            content_type="application/pdf",
            data=encrypted_pdf,
        )
    assert exc_info.value.status_code == 400
    assert "encrypted" in str(exc_info.value).lower() or "password" in str(exc_info.value).lower()


def test_ingest_pdf_exceeding_max_pages_fails(service):
    srv, _, _, _, exam_repo = service
    student = make_test_student()
    exam = make_exam(status=ExaminationStatus.PUBLISHED)
    exam_repo.seed(exam)

    pdf_51_pages = create_blank_pdf(num_pages=51)
    with pytest.raises(IngestionError) as exc_info:
        srv.ingest_answer_sheet(
            examination_id=exam.id,
            uploader=student,
            filename="huge.pdf",
            content_type="application/pdf",
            data=pdf_51_pages,
        )
    assert exc_info.value.status_code == 400
    assert "maximum allowed page count" in str(exc_info.value)


def test_ingest_oversized_image_dimensions_fails(service):
    srv, _, _, _, exam_repo = service
    student = make_test_student()
    exam = make_exam(status=ExaminationStatus.PUBLISHED)
    exam_repo.seed(exam)

    # 8193 x 100 exceeds 8192px limit
    img_bytes = create_test_image("PNG", size=(8193, 100))
    with pytest.raises(IngestionError) as exc_info:
        srv.ingest_answer_sheet(
            examination_id=exam.id,
            uploader=student,
            filename="wide.png",
            content_type="image/png",
            data=img_bytes,
        )
    assert exc_info.value.status_code == 400
    assert "dimension" in str(exc_info.value).lower()


def test_student_cannot_ingest_for_draft_exam(service):
    srv, _, _, _, exam_repo = service
    student = make_test_student()
    exam = make_exam(status=ExaminationStatus.DRAFT)
    exam_repo.seed(exam)

    pdf_bytes = create_blank_pdf(1)
    with pytest.raises(IngestionError) as exc_info:
        srv.ingest_answer_sheet(
            examination_id=exam.id,
            uploader=student,
            filename="answers.pdf",
            content_type="application/pdf",
            data=pdf_bytes,
        )
    assert exc_info.value.status_code == 400
    assert "not available for submissions" in str(exc_info.value)


def test_teacher_cannot_ingest_for_other_teachers_exam(service):
    srv, _, _, _, exam_repo = service
    other_teacher = make_test_teacher(OTHER_TEACHER_ID)
    exam = make_exam(teacher_id=TEACHER_ID, status=ExaminationStatus.PUBLISHED)
    exam_repo.seed(exam)

    pdf_bytes = create_blank_pdf(1)
    with pytest.raises(IngestionError) as exc_info:
        srv.ingest_answer_sheet(
            examination_id=exam.id,
            uploader=other_teacher,
            filename="answers.pdf",
            content_type="application/pdf",
            data=pdf_bytes,
        )
    assert exc_info.value.status_code == 403
    assert "permission" in str(exc_info.value)


def test_student_can_only_access_own_document(service):
    srv, doc_repo, _, _, exam_repo = service
    student_1 = make_test_student(STUDENT_ID)
    student_2 = make_test_student(OTHER_STUDENT_ID)

    exam = make_exam(teacher_id=TEACHER_ID, status=ExaminationStatus.PUBLISHED)
    exam_repo.seed(exam)

    pdf_bytes = create_blank_pdf(1)
    doc, _, _ = srv.ingest_answer_sheet(
        examination_id=exam.id,
        uploader=student_1,
        filename="answers.pdf",
        content_type="application/pdf",
        data=pdf_bytes,
    )

    # Student 1 can retrieve it
    retrieved = srv.get_document_for_user(doc.id, student_1)
    assert retrieved.id == doc.id

    # Student 2 is blocked with 403
    with pytest.raises(IngestionError) as exc_info:
        srv.get_document_for_user(doc.id, student_2)
    assert exc_info.value.status_code == 403
    assert "only access your own documents" in str(exc_info.value)


def test_list_documents_filtering(service):
    srv, _, _, _, exam_repo = service
    student_1 = make_test_student(STUDENT_ID)
    student_2 = make_test_student(OTHER_STUDENT_ID)
    teacher = make_test_teacher(TEACHER_ID)

    exam = make_exam(teacher_id=teacher.id, status=ExaminationStatus.PUBLISHED)
    exam_repo.seed(exam)

    pdf_bytes = create_blank_pdf(1)
    srv.ingest_answer_sheet(exam.id, student_1, "s1.pdf", "application/pdf", pdf_bytes)
    srv.ingest_answer_sheet(exam.id, student_2, "s2.pdf", "application/pdf", pdf_bytes)

    # Student 1 only sees 1 document
    s1_docs, s1_total = srv.list_documents_for_examination(exam.id, student_1)
    assert s1_total == 1
    assert len(s1_docs) == 1
    assert s1_docs[0].student_id == student_1.id

    # Teacher sees both documents
    t_docs, t_total = srv.list_documents_for_examination(exam.id, teacher)
    assert t_total == 2
    assert len(t_docs) == 2


def test_retry_processing_workflow(service):
    srv, doc_repo, page_repo, job_repo, exam_repo = service
    student = make_test_student(STUDENT_ID)
    exam = make_exam(status=ExaminationStatus.PUBLISHED)
    exam_repo.seed(exam)

    pdf_bytes = create_blank_pdf(2)
    doc, job, pages = srv.ingest_answer_sheet(exam.id, student, "sheet.pdf", "application/pdf", pdf_bytes)

    # Retrying a successful document raises 400
    with pytest.raises(IngestionError) as exc_info:
        srv.retry_processing(doc.id, student)
    assert exc_info.value.status_code == 400
    assert "Only failed documents can be retried" in str(exc_info.value)

    # Mark document as failed
    doc_repo.update(doc.id, {"status": DocumentStatus.FAILED})
    doc.status = DocumentStatus.FAILED

    # Retry should now succeed
    retried_doc, retried_job, retried_pages = srv.retry_processing(doc.id, student)
    assert retried_doc.status == DocumentStatus.PROCESSED
    assert retried_job.status == JobStatus.COMPLETED
    assert retried_job.retry_count == 1
    assert len(retried_pages) == 2


def test_delete_document_cascades(service):
    srv, doc_repo, page_repo, job_repo, exam_repo = service
    student = make_test_student(STUDENT_ID)
    exam = make_exam(status=ExaminationStatus.PUBLISHED)
    exam_repo.seed(exam)

    pdf_bytes = create_blank_pdf(2)
    doc, job, pages = srv.ingest_answer_sheet(exam.id, student, "sheet.pdf", "application/pdf", pdf_bytes)

    assert doc_repo.find_by_id(doc.id) is not None
    assert len(page_repo.list_by_document(doc.id)) == 2

    # Delete
    deleted = srv.delete_document(doc.id, student)
    assert deleted is True

    assert doc_repo.find_by_id(doc.id) is None
    assert len(page_repo.list_by_document(doc.id)) == 0
    assert len(job_repo.list_by_document(doc.id)) == 0


def test_ingest_single_page_pdf_success(service):
    srv, doc_repo, page_repo, job_repo, exam_repo = service
    student = make_test_student()
    exam = make_exam(status=ExaminationStatus.PUBLISHED)
    exam_repo.seed(exam)

    pdf_bytes = create_blank_pdf(num_pages=1)
    doc, job, pages = srv.ingest_answer_sheet(
        examination_id=exam.id,
        uploader=student,
        filename="single_page.pdf",
        content_type="application/pdf",
        data=pdf_bytes,
    )
    assert doc.status == DocumentStatus.PROCESSED
    assert doc.page_count == 1
    assert len(pages) == 1
    assert pages[0].page_number == 1
    assert pages[0].original_width > 0
    assert pages[0].original_height > 0
    assert job.status == JobStatus.COMPLETED
    assert job.processed_pages == 1


def test_ingest_unsupported_file_type_fails(service):
    srv, _, _, _, exam_repo = service
    student = make_test_student()
    exam = make_exam(status=ExaminationStatus.PUBLISHED)
    exam_repo.seed(exam)

    with pytest.raises(IngestionError) as exc_info:
        srv.ingest_answer_sheet(
            examination_id=exam.id,
            uploader=student,
            filename="document.docx",
            content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            data=b"PK\x03\x04fake docx content",
        )
    assert exc_info.value.status_code == 400
    assert "extension" in str(exc_info.value).lower() or "content type" in str(exc_info.value).lower()


def test_ingest_invalid_image_signature_fails(service):
    srv, _, _, _, exam_repo = service
    student = make_test_student()
    exam = make_exam(status=ExaminationStatus.PUBLISHED)
    exam_repo.seed(exam)

    fake_png = b"NOT_A_PNG_HEADER"
    with pytest.raises(IngestionError) as exc_info:
        srv.ingest_answer_sheet(
            examination_id=exam.id,
            uploader=student,
            filename="fake.png",
            content_type="image/png",
            data=fake_png,
        )
    assert exc_info.value.status_code == 400
    assert "signature" in str(exc_info.value).lower()


def test_ingest_oversized_file_fails(service):
    srv, _, _, _, exam_repo = service
    student = make_test_student()
    exam = make_exam(status=ExaminationStatus.PUBLISHED)
    exam_repo.seed(exam)

    from app.utils.storage import MAX_FILE_SIZE_BYTES
    oversized_data = b"x" * (MAX_FILE_SIZE_BYTES + 10)
    with pytest.raises(IngestionError) as exc_info:
        srv.ingest_answer_sheet(
            examination_id=exam.id,
            uploader=student,
            filename="oversized.pdf",
            content_type="application/pdf",
            data=oversized_data,
        )
    assert exc_info.value.status_code == 400
    assert "too large" in str(exc_info.value).lower()


def test_student_cannot_tamper_student_id(service):
    srv, doc_repo, _, _, exam_repo = service
    student = make_test_student(STUDENT_ID)
    exam = make_exam(status=ExaminationStatus.PUBLISHED)
    exam_repo.seed(exam)

    pdf_bytes = create_blank_pdf(1)
    # Student attempts to pass a different student_id (victim's id)
    doc, _, _ = srv.ingest_answer_sheet(
        examination_id=exam.id,
        uploader=student,
        filename="test.pdf",
        content_type="application/pdf",
        data=pdf_bytes,
        student_id=OTHER_STUDENT_ID,
    )
    # Must be forced to uploader's authenticated ID
    assert doc.student_id == student.id
    assert doc.student_id != OTHER_STUDENT_ID


def test_partial_page_failure_marks_document_failed_not_processed(service, monkeypatch):
    srv, doc_repo, page_repo, job_repo, exam_repo = service
    student = make_test_student(STUDENT_ID)
    exam = make_exam(status=ExaminationStatus.PUBLISHED)
    exam_repo.seed(exam)

    pdf_bytes = create_blank_pdf(3)

    # Simulate extraction failure during page rendering
    def fail_extract(*args, **kwargs):
        raise RuntimeError("Simulated corruption on page 2 rendering")

    monkeypatch.setattr(srv, "_extract_pdf_pages", fail_extract)

    with pytest.raises(IngestionError) as exc_info:
        srv.ingest_answer_sheet(
            examination_id=exam.id,
            uploader=student,
            filename="answers.pdf",
            content_type="application/pdf",
            data=pdf_bytes,
        )
    assert exc_info.value.status_code == 500

    # Ensure document was NOT marked PROCESSED
    docs = doc_repo.list_by_examination(exam.id)
    assert len(docs) == 1
    doc = docs[0]
    assert doc.status == DocumentStatus.FAILED
    assert "Simulated corruption" in (doc.processing_error or "")

    # Ensure job was marked FAILED
    job = job_repo.find_latest_by_document(doc.id)
    assert job is not None
    assert job.status == JobStatus.FAILED

    # Ensure no orphaned pages were left in page repository
    pages = page_repo.list_by_document(doc.id)
    assert len(pages) == 0


def test_retry_limit_exceeded_fails(service):
    srv, doc_repo, page_repo, job_repo, exam_repo = service
    student = make_test_student(STUDENT_ID)
    exam = make_exam(status=ExaminationStatus.PUBLISHED)
    exam_repo.seed(exam)

    pdf_bytes = create_blank_pdf(1)
    doc, job, _ = srv.ingest_answer_sheet(exam.id, student, "sheet.pdf", "application/pdf", pdf_bytes)

    # Set document as failed and job retry_count to 3
    doc_repo.update(doc.id, {"status": DocumentStatus.FAILED.value})
    job_repo.update(job.id, {"retry_count": 3})

    with pytest.raises(IngestionError) as exc_info:
        srv.retry_processing(doc.id, student)
    assert exc_info.value.status_code == 400
    assert "Maximum retry attempts reached" in str(exc_info.value)

