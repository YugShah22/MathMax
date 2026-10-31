"""Unit tests — ExaminationService."""
from __future__ import annotations

import pytest

from tests.conftest_phase2 import (
    TEACHER_ID, OTHER_TEACHER_ID, MockExaminationRepository,
    MockQuestionRepository, MockAnswerKeyRepository, MockRubricRepository,
    MockDocumentRepository, make_exam, make_question, make_rubric,
)
from app.models.answer_key import AnswerKey
from app.models.document import Document, DocumentType
from app.models.examination import ExaminationStatus
from app.models.rubric import RubricStatus
from app.schemas.examination import ExaminationCreate, ExaminationUpdate
from app.services.examination_service import ExaminationError, ExaminationService


def make_service(exam_repo=None, q_repo=None, ak_repo=None, r_repo=None, doc_repo=None) -> ExaminationService:
    return ExaminationService(
        exam_repo or MockExaminationRepository(),
        q_repo or MockQuestionRepository(),
        ak_repo or MockAnswerKeyRepository(),
        r_repo or MockRubricRepository(),
        doc_repo or MockDocumentRepository(),
    )


def create_body(**kwargs) -> ExaminationCreate:
    defaults = dict(title="Algebra Test", subject="Maths", total_marks=20.0, duration_minutes=60)
    defaults.update(kwargs)
    return ExaminationCreate(**defaults)


# ── Create ────────────────────────────────────────────────────────────────────

def test_create_examination():
    svc = make_service()
    exam = svc.create(TEACHER_ID, create_body())
    assert exam.title == "Algebra Test"
    assert exam.teacher_id == TEACHER_ID
    assert exam.status == ExaminationStatus.DRAFT


def test_create_sets_draft_status():
    svc = make_service()
    exam = svc.create(TEACHER_ID, create_body())
    assert exam.status == ExaminationStatus.DRAFT


# ── Read ──────────────────────────────────────────────────────────────────────

def test_get_own_examination():
    repo = MockExaminationRepository()
    svc = make_service(exam_repo=repo)
    exam = svc.create(TEACHER_ID, create_body())
    fetched = svc.get_for_teacher(exam.id, TEACHER_ID)
    assert fetched.id == exam.id


def test_get_another_teachers_examination_raises():
    repo = MockExaminationRepository()
    svc = make_service(exam_repo=repo)
    exam = svc.create(TEACHER_ID, create_body())
    with pytest.raises(ExaminationError) as exc:
        svc.get_for_teacher(exam.id, OTHER_TEACHER_ID)
    assert exc.value.status_code == 404


def test_list_only_own_examinations():
    repo = MockExaminationRepository()
    svc = make_service(exam_repo=repo)
    svc.create(TEACHER_ID, create_body(title="Mine"))
    svc.create(OTHER_TEACHER_ID, create_body(title="Theirs"))
    exams, total = svc.list_for_teacher(TEACHER_ID)
    assert total == 1
    assert exams[0].title == "Mine"


# ── Update ────────────────────────────────────────────────────────────────────

def test_update_examination():
    repo = MockExaminationRepository()
    svc = make_service(exam_repo=repo)
    exam = svc.create(TEACHER_ID, create_body())
    updated = svc.update(exam.id, TEACHER_ID, ExaminationUpdate(title="Updated Title"))
    assert updated.title == "Updated Title"


def test_update_archived_examination_raises():
    repo = MockExaminationRepository()
    svc = make_service(exam_repo=repo)
    exam = svc.create(TEACHER_ID, create_body())
    repo.update(exam.id, TEACHER_ID, {"status": ExaminationStatus.ARCHIVED})
    with pytest.raises(ExaminationError):
        svc.update(exam.id, TEACHER_ID, ExaminationUpdate(title="New"))


# ── Publish ───────────────────────────────────────────────────────────────────

def test_publish_fails_without_questions():
    repo = MockExaminationRepository()
    svc = make_service(exam_repo=repo)
    exam = svc.create(TEACHER_ID, create_body())
    with pytest.raises(ExaminationError) as exc:
        svc.publish(exam.id, TEACHER_ID)
    assert exc.value.status_code == 422


def test_publish_fails_with_mark_mismatch():
    exam_repo = MockExaminationRepository()
    q_repo = MockQuestionRepository()
    svc = make_service(exam_repo=exam_repo, q_repo=q_repo)
    exam = svc.create(TEACHER_ID, create_body(total_marks=20.0))
    q = make_question(exam.id, TEACHER_ID, 1, marks=10.0)  # only 10, not 20
    q_repo.seed(q)
    with pytest.raises(ExaminationError) as exc:
        svc.publish(exam.id, TEACHER_ID)
    assert "marks" in str(exc.value).lower()


def test_publish_succeeds_with_matching_questions():
    exam_repo = MockExaminationRepository()
    q_repo = MockQuestionRepository()
    ak_repo = MockAnswerKeyRepository()
    r_repo = MockRubricRepository()
    svc = make_service(exam_repo=exam_repo, q_repo=q_repo, ak_repo=ak_repo, r_repo=r_repo)
    exam = svc.create(TEACHER_ID, create_body(total_marks=10.0))
    q = make_question(exam.id, TEACHER_ID, 1, marks=10.0)
    q_repo.seed(q)
    ak = AnswerKey(id="ak1", question_id=q.id, examination_id=exam.id, teacher_id=TEACHER_ID, expected_answer="x=5")
    ak_repo.seed(ak)
    rubric = make_rubric(q.id, exam.id, TEACHER_ID)
    rubric.status = RubricStatus.ACTIVE
    rubric.steps[0].maximum_marks = 10.0
    r_repo.seed(rubric)

    published, reasons = svc.publish(exam.id, TEACHER_ID)
    assert published.status == ExaminationStatus.PUBLISHED
    assert reasons == []


def test_publish_fails_missing_answer_key():
    exam_repo = MockExaminationRepository()
    q_repo = MockQuestionRepository()
    r_repo = MockRubricRepository()
    svc = make_service(exam_repo=exam_repo, q_repo=q_repo, r_repo=r_repo)
    exam = svc.create(TEACHER_ID, create_body(total_marks=10.0))
    q = make_question(exam.id, TEACHER_ID, 1, marks=10.0)
    q_repo.seed(q)
    rubric = make_rubric(q.id, exam.id, TEACHER_ID)
    rubric.status = RubricStatus.ACTIVE
    rubric.steps[0].maximum_marks = 10.0
    r_repo.seed(rubric)

    with pytest.raises(ExaminationError) as exc:
        svc.publish(exam.id, TEACHER_ID)
    assert "missing an answer key" in str(exc.value).lower()


def test_publish_fails_missing_rubric():
    exam_repo = MockExaminationRepository()
    q_repo = MockQuestionRepository()
    ak_repo = MockAnswerKeyRepository()
    svc = make_service(exam_repo=exam_repo, q_repo=q_repo, ak_repo=ak_repo)
    exam = svc.create(TEACHER_ID, create_body(total_marks=10.0))
    q = make_question(exam.id, TEACHER_ID, 1, marks=10.0)
    q_repo.seed(q)
    ak = AnswerKey(id="ak1", question_id=q.id, examination_id=exam.id, teacher_id=TEACHER_ID, expected_answer="x=5")
    ak_repo.seed(ak)

    with pytest.raises(ExaminationError) as exc:
        svc.publish(exam.id, TEACHER_ID)
    assert "missing a rubric" in str(exc.value).lower()


def test_publish_fails_rubric_in_draft():
    exam_repo = MockExaminationRepository()
    q_repo = MockQuestionRepository()
    ak_repo = MockAnswerKeyRepository()
    r_repo = MockRubricRepository()
    svc = make_service(exam_repo=exam_repo, q_repo=q_repo, ak_repo=ak_repo, r_repo=r_repo)
    exam = svc.create(TEACHER_ID, create_body(total_marks=10.0))
    q = make_question(exam.id, TEACHER_ID, 1, marks=10.0)
    q_repo.seed(q)
    ak = AnswerKey(id="ak1", question_id=q.id, examination_id=exam.id, teacher_id=TEACHER_ID, expected_answer="x=5")
    ak_repo.seed(ak)
    rubric = make_rubric(q.id, exam.id, TEACHER_ID)
    rubric.status = RubricStatus.DRAFT
    rubric.steps[0].maximum_marks = 10.0
    r_repo.seed(rubric)

    with pytest.raises(ExaminationError) as exc:
        svc.publish(exam.id, TEACHER_ID)
    assert "draft or inactive" in str(exc.value).lower()


def test_publish_fails_rubric_marks_mismatch():
    exam_repo = MockExaminationRepository()
    q_repo = MockQuestionRepository()
    ak_repo = MockAnswerKeyRepository()
    r_repo = MockRubricRepository()
    svc = make_service(exam_repo=exam_repo, q_repo=q_repo, ak_repo=ak_repo, r_repo=r_repo)
    exam = svc.create(TEACHER_ID, create_body(total_marks=10.0))
    q = make_question(exam.id, TEACHER_ID, 1, marks=10.0)
    q_repo.seed(q)
    ak = AnswerKey(id="ak1", question_id=q.id, examination_id=exam.id, teacher_id=TEACHER_ID, expected_answer="x=5")
    ak_repo.seed(ak)
    rubric = make_rubric(q.id, exam.id, TEACHER_ID)
    rubric.status = RubricStatus.ACTIVE
    rubric.steps[0].maximum_marks = 5.0  # Mismatch: 5 vs 10
    r_repo.seed(rubric)

    with pytest.raises(ExaminationError) as exc:
        svc.publish(exam.id, TEACHER_ID)
    assert "do not match question marks" in str(exc.value).lower()


def test_publish_fails_archived_examination():
    exam_repo = MockExaminationRepository()
    q_repo = MockQuestionRepository()
    svc = make_service(exam_repo=exam_repo, q_repo=q_repo)
    exam = svc.create(TEACHER_ID, create_body(total_marks=10.0))
    exam_repo.update(exam.id, TEACHER_ID, {"status": ExaminationStatus.ARCHIVED.value})

    with pytest.raises(ExaminationError) as exc:
        svc.publish(exam.id, TEACHER_ID)
    assert "archived" in str(exc.value).lower()


def test_delete_cascades_questions_keys_rubrics_documents():
    exam_repo = MockExaminationRepository()
    q_repo = MockQuestionRepository()
    ak_repo = MockAnswerKeyRepository()
    r_repo = MockRubricRepository()
    doc_repo = MockDocumentRepository()
    svc = make_service(exam_repo=exam_repo, q_repo=q_repo, ak_repo=ak_repo, r_repo=r_repo, doc_repo=doc_repo)

    exam = svc.create(TEACHER_ID, create_body(total_marks=10.0))
    q = make_question(exam.id, TEACHER_ID, 1, marks=10.0)
    q_repo.seed(q)
    ak = AnswerKey(id="ak1", question_id=q.id, examination_id=exam.id, teacher_id=TEACHER_ID, expected_answer="x=5")
    ak_repo.seed(ak)
    rubric = make_rubric(q.id, exam.id, TEACHER_ID)
    r_repo.seed(rubric)
    doc = Document(
        id="d1", examination_id=exam.id, teacher_id=TEACHER_ID, original_filename="test.pdf",
        stored_filename="test.pdf", content_type="application/pdf", file_size=100, storage_key="test.pdf",
        document_type=DocumentType.QUESTION_PAPER,
    )
    doc_repo.seed(doc)

    svc.delete(exam.id, TEACHER_ID)

    assert exam_repo.find_by_id(exam.id) is None
    assert len(q_repo.list_by_examination(exam.id)) == 0
    assert len(ak_repo.list_by_examination(exam.id)) == 0
    assert len(r_repo.list_by_question(q.id)) == 0
    assert len(doc_repo.list_by_examination(exam.id)) == 0


def test_duplicate_clones_questions_keys_rubrics():
    exam_repo = MockExaminationRepository()
    q_repo = MockQuestionRepository()
    ak_repo = MockAnswerKeyRepository()
    r_repo = MockRubricRepository()
    svc = make_service(exam_repo=exam_repo, q_repo=q_repo, ak_repo=ak_repo, r_repo=r_repo)

    exam = svc.create(TEACHER_ID, create_body(title="Orig Exam", total_marks=10.0))
    q = make_question(exam.id, TEACHER_ID, 1, marks=10.0)
    q_repo.seed(q)
    ak = AnswerKey(id="ak1", question_id=q.id, examination_id=exam.id, teacher_id=TEACHER_ID, expected_answer="x=5")
    ak_repo.seed(ak)
    rubric = make_rubric(q.id, exam.id, TEACHER_ID)
    rubric.status = RubricStatus.ACTIVE
    r_repo.seed(rubric)

    dup = svc.duplicate(exam.id, TEACHER_ID)
    assert dup.id != exam.id
    assert "Copy of Orig Exam" == dup.title

    dup_questions = q_repo.list_by_examination(dup.id)
    assert len(dup_questions) == 1
    dup_q = dup_questions[0]
    assert dup_q.id != q.id
    assert dup_q.question_text == q.question_text

    dup_ak = ak_repo.find_by_question(dup_q.id)
    assert dup_ak is not None
    assert dup_ak.id != ak.id
    assert dup_ak.expected_answer == "x=5"

    dup_rubrics = r_repo.list_by_question(dup_q.id)
    assert len(dup_rubrics) == 1
    dup_r = dup_rubrics[0]
    assert dup_r.id != rubric.id
    assert dup_r.examination_id == dup.id


# ── Archive ───────────────────────────────────────────────────────────────────

def test_archive_examination():
    repo = MockExaminationRepository()
    svc = make_service(exam_repo=repo)
    exam = svc.create(TEACHER_ID, create_body())
    archived = svc.archive(exam.id, TEACHER_ID)
    assert archived.status == ExaminationStatus.ARCHIVED


# ── Duplicate ─────────────────────────────────────────────────────────────────

def test_duplicate_creates_draft_copy():
    repo = MockExaminationRepository()
    svc = make_service(exam_repo=repo)
    exam = svc.create(TEACHER_ID, create_body(title="Original"))
    dup = svc.duplicate(exam.id, TEACHER_ID)
    assert "Copy of" in dup.title
    assert dup.status == ExaminationStatus.DRAFT
    assert dup.id != exam.id


# ── Dashboard stats ───────────────────────────────────────────────────────────

def test_dashboard_stats():
    repo = MockExaminationRepository()
    svc = make_service(exam_repo=repo)
    svc.create(TEACHER_ID, create_body())
    svc.create(TEACHER_ID, create_body())
    stats = svc.dashboard_stats(TEACHER_ID)
    assert stats["total"] == 2
    assert stats["draft"] == 2

