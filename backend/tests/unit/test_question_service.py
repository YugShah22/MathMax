"""Unit tests — QuestionService."""
from __future__ import annotations

import pytest

from tests.conftest_phase2 import (
    TEACHER_ID, OTHER_TEACHER_ID, MockExaminationRepository, MockQuestionRepository,
    MockAnswerKeyRepository, MockRubricRepository,
    make_exam, make_question, make_rubric,
)
from app.models.answer_key import AnswerKey
from app.schemas.question import QuestionCreate, QuestionReorderRequest, QuestionReorderItem, QuestionUpdate
from app.services.question_service import QuestionError, QuestionService


def make_service(exam_repo=None, q_repo=None, ak_repo=None, r_repo=None) -> QuestionService:
    return QuestionService(
        exam_repo or MockExaminationRepository(),
        q_repo or MockQuestionRepository(),
        ak_repo or MockAnswerKeyRepository(),
        r_repo or MockRubricRepository(),
    )


def create_body(**kwargs) -> QuestionCreate:
    defaults = dict(question_number=1, question_text="Solve 2x + 4 = 10.", maximum_marks=5.0)
    defaults.update(kwargs)
    return QuestionCreate(**defaults)


# ── Add ───────────────────────────────────────────────────────────────────────

def test_add_question():
    erepo = MockExaminationRepository()
    qrepo = MockQuestionRepository()
    exam = make_exam()
    erepo.seed(exam)
    svc = make_service(erepo, qrepo)
    q = svc.add(exam.id, TEACHER_ID, create_body())
    assert q.question_number == 1
    assert q.maximum_marks == 5.0


def test_add_question_duplicate_number_raises():
    erepo = MockExaminationRepository()
    qrepo = MockQuestionRepository()
    exam = make_exam()
    erepo.seed(exam)
    svc = make_service(erepo, qrepo)
    svc.add(exam.id, TEACHER_ID, create_body(question_number=1))
    with pytest.raises(QuestionError) as exc:
        svc.add(exam.id, TEACHER_ID, create_body(question_number=1))
    assert exc.value.status_code == 409


def test_add_question_unauthorized_exam_raises():
    erepo = MockExaminationRepository()
    qrepo = MockQuestionRepository()
    exam = make_exam(teacher_id=OTHER_TEACHER_ID)
    erepo.seed(exam)
    svc = make_service(erepo, qrepo)
    with pytest.raises(QuestionError) as exc:
        svc.add(exam.id, TEACHER_ID, create_body())
    assert exc.value.status_code == 404


# ── Update ────────────────────────────────────────────────────────────────────

def test_update_question():
    erepo = MockExaminationRepository()
    qrepo = MockQuestionRepository()
    exam = make_exam()
    erepo.seed(exam)
    svc = make_service(erepo, qrepo)
    q = svc.add(exam.id, TEACHER_ID, create_body())
    updated = svc.update(q.id, TEACHER_ID, QuestionUpdate(question_text="New text"))
    assert updated.question_text == "New text"


def test_update_question_invalid_owner_raises():
    erepo = MockExaminationRepository()
    qrepo = MockQuestionRepository()
    exam = make_exam()
    erepo.seed(exam)
    svc = make_service(erepo, qrepo)
    q = svc.add(exam.id, TEACHER_ID, create_body())
    with pytest.raises(QuestionError) as exc:
        svc.update(q.id, OTHER_TEACHER_ID, QuestionUpdate(question_text="Hack"))
    assert exc.value.status_code == 404


# ── Delete ────────────────────────────────────────────────────────────────────

def test_delete_question():
    erepo = MockExaminationRepository()
    qrepo = MockQuestionRepository()
    exam = make_exam()
    erepo.seed(exam)
    svc = make_service(erepo, qrepo)
    q = svc.add(exam.id, TEACHER_ID, create_body())
    svc.delete(q.id, TEACHER_ID)
    assert qrepo.find_by_id(q.id) is None


def test_delete_question_cascades_answer_key_and_rubric():
    erepo = MockExaminationRepository()
    qrepo = MockQuestionRepository()
    akrepo = MockAnswerKeyRepository()
    rrepo = MockRubricRepository()
    exam = make_exam()
    erepo.seed(exam)
    svc = make_service(erepo, qrepo, akrepo, rrepo)
    q = svc.add(exam.id, TEACHER_ID, create_body())

    ak = AnswerKey(id="ak1", question_id=q.id, examination_id=exam.id, teacher_id=TEACHER_ID, expected_answer="x=5")
    akrepo.seed(ak)
    rubric = make_rubric(q.id, exam.id, TEACHER_ID)
    rrepo.seed(rubric)

    svc.delete(q.id, TEACHER_ID)

    assert qrepo.find_by_id(q.id) is None
    assert akrepo.find_by_question(q.id) is None
    assert len(rrepo.list_by_question(q.id)) == 0


# ── Reorder ───────────────────────────────────────────────────────────────────

def test_reorder_questions():
    erepo = MockExaminationRepository()
    qrepo = MockQuestionRepository()
    exam = make_exam()
    erepo.seed(exam)
    svc = make_service(erepo, qrepo)
    q1 = svc.add(exam.id, TEACHER_ID, create_body(question_number=1))
    q2 = svc.add(exam.id, TEACHER_ID, create_body(question_number=2, question_text="Q2"))
    reorder = QuestionReorderRequest(questions=[
        QuestionReorderItem(question_id=q1.id, question_number=2),
        QuestionReorderItem(question_id=q2.id, question_number=1),
    ])
    result = svc.reorder(exam.id, TEACHER_ID, reorder)
    numbers = [q.question_number for q in result]
    assert sorted(numbers) == [1, 2]


def test_reorder_duplicate_numbers_raises():
    erepo = MockExaminationRepository()
    qrepo = MockQuestionRepository()
    exam = make_exam()
    erepo.seed(exam)
    svc = make_service(erepo, qrepo)
    q1 = svc.add(exam.id, TEACHER_ID, create_body(question_number=1))
    q2 = svc.add(exam.id, TEACHER_ID, create_body(question_number=2, question_text="Q2"))
    reorder = QuestionReorderRequest(questions=[
        QuestionReorderItem(question_id=q1.id, question_number=1),
        QuestionReorderItem(question_id=q2.id, question_number=1),  # duplicate
    ])
    with pytest.raises(QuestionError):
        svc.reorder(exam.id, TEACHER_ID, reorder)


# ── Duplicate ─────────────────────────────────────────────────────────────────

def test_duplicate_question():
    erepo = MockExaminationRepository()
    qrepo = MockQuestionRepository()
    exam = make_exam()
    erepo.seed(exam)
    svc = make_service(erepo, qrepo)
    q = svc.add(exam.id, TEACHER_ID, create_body(question_number=1))
    dup = svc.duplicate(q.id, TEACHER_ID, new_number=2)
    assert dup.question_text == q.question_text
    assert dup.question_number == 2
    assert dup.id != q.id

