"""Unit tests — RubricService."""
from __future__ import annotations

import pytest

from tests.conftest_phase2 import (
    TEACHER_ID, OTHER_TEACHER_ID, MockQuestionRepository, MockRubricRepository,
    make_exam, make_question, make_rubric,
)
from app.models.rubric import RubricStatus
from app.schemas.rubric import RubricCreate, RubricStepCreate, RubricUpdate
from app.services.rubric_service import RubricError, RubricService


def make_service(r_repo=None, q_repo=None) -> RubricService:
    return RubricService(r_repo or MockRubricRepository(), q_repo or MockQuestionRepository())


def step_body(marks: float = 2.0) -> RubricStepCreate:
    return RubricStepCreate(step_number=1, title="Step 1", description="Subtract 4", maximum_marks=marks)


def create_body(marks: float = 2.0) -> RubricCreate:
    return RubricCreate(title="Test Rubric", steps=[step_body(marks)])


# ── Create ────────────────────────────────────────────────────────────────────

def test_create_rubric():
    qrepo = MockQuestionRepository()
    rrepo = MockRubricRepository()
    exam = make_exam()
    q = make_question(exam.id, TEACHER_ID, marks=10.0)
    qrepo.seed(q)
    svc = make_service(rrepo, qrepo)
    rubric = svc.create(q.id, TEACHER_ID, create_body(2.0))
    assert rubric.title == "Test Rubric"
    assert rubric.status == RubricStatus.DRAFT
    assert rubric.total_marks == 2.0


def test_create_rubric_marks_exceed_question_raises():
    qrepo = MockQuestionRepository()
    rrepo = MockRubricRepository()
    exam = make_exam()
    q = make_question(exam.id, TEACHER_ID, marks=3.0)
    qrepo.seed(q)
    svc = make_service(rrepo, qrepo)
    with pytest.raises(RubricError) as exc:
        svc.create(q.id, TEACHER_ID, create_body(marks=5.0))
    assert exc.value.status_code == 422


def test_create_rubric_unauthorized_question_raises():
    qrepo = MockQuestionRepository()
    rrepo = MockRubricRepository()
    exam = make_exam()
    q = make_question(exam.id, OTHER_TEACHER_ID, marks=10.0)
    qrepo.seed(q)
    svc = make_service(rrepo, qrepo)
    with pytest.raises(RubricError) as exc:
        svc.create(q.id, TEACHER_ID, create_body(2.0))
    assert exc.value.status_code == 404


# ── Activate ──────────────────────────────────────────────────────────────────

def test_activate_rubric():
    qrepo = MockQuestionRepository()
    rrepo = MockRubricRepository()
    exam = make_exam()
    q = make_question(exam.id, TEACHER_ID, marks=10.0)
    qrepo.seed(q)
    rubric = make_rubric(q.id, exam.id, TEACHER_ID)
    rrepo.seed(rubric)
    svc = make_service(rrepo, qrepo)
    activated = svc.activate(rubric.id, TEACHER_ID)
    assert activated.status == RubricStatus.ACTIVE


def test_activate_rubric_without_steps_raises():
    qrepo = MockQuestionRepository()
    rrepo = MockRubricRepository()
    from app.models.rubric import Rubric, PartialMarkingConfig
    exam = make_exam()
    q = make_question(exam.id, TEACHER_ID, marks=10.0)
    qrepo.seed(q)
    empty_rubric = Rubric(
        id="r" * 24, teacher_id=TEACHER_ID, examination_id=exam.id,
        question_id=q.id, title="Empty", total_marks=0.0, steps=[],
    )
    rrepo.seed(empty_rubric)
    svc = make_service(rrepo, qrepo)
    with pytest.raises(RubricError) as exc:
        svc.activate(empty_rubric.id, TEACHER_ID)
    assert exc.value.status_code == 422


# ── Archive ───────────────────────────────────────────────────────────────────

def test_archive_rubric():
    qrepo = MockQuestionRepository()
    rrepo = MockRubricRepository()
    exam = make_exam()
    q = make_question(exam.id, TEACHER_ID, marks=10.0)
    qrepo.seed(q)
    rubric = make_rubric(q.id, exam.id, TEACHER_ID)
    rrepo.seed(rubric)
    svc = make_service(rrepo, qrepo)
    archived = svc.archive(rubric.id, TEACHER_ID)
    assert archived.status == RubricStatus.ARCHIVED


def test_update_archived_rubric_raises():
    qrepo = MockQuestionRepository()
    rrepo = MockRubricRepository()
    exam = make_exam()
    q = make_question(exam.id, TEACHER_ID, marks=10.0)
    qrepo.seed(q)
    rubric = make_rubric(q.id, exam.id, TEACHER_ID)
    object.__setattr__(rubric, "status", RubricStatus.ARCHIVED)
    rrepo.seed(rubric)
    svc = make_service(rrepo, qrepo)
    with pytest.raises(RubricError):
        svc.update(rubric.id, TEACHER_ID, RubricUpdate(title="New"))


# ── Duplicate ─────────────────────────────────────────────────────────────────

def test_duplicate_rubric():
    qrepo = MockQuestionRepository()
    rrepo = MockRubricRepository()
    exam = make_exam()
    q1 = make_question(exam.id, TEACHER_ID, number=1, marks=10.0)
    q2 = make_question(exam.id, TEACHER_ID, number=2, marks=10.0)
    qrepo.seed(q1)
    qrepo.seed(q2)
    rubric = make_rubric(q1.id, exam.id, TEACHER_ID)
    rrepo.seed(rubric)
    svc = make_service(rrepo, qrepo)
    dup = svc.duplicate(rubric.id, TEACHER_ID, q2.id)
    assert dup.id != rubric.id
    assert "Copy of" in dup.title
    assert dup.question_id == q2.id
    assert dup.parent_rubric_id == rubric.id


def test_duplicate_rubric_marks_exceed_target_raises():
    qrepo = MockQuestionRepository()
    rrepo = MockRubricRepository()
    exam = make_exam()
    q1 = make_question(exam.id, TEACHER_ID, number=1, marks=10.0)
    q2 = make_question(exam.id, TEACHER_ID, number=2, marks=2.0)  # lower limit
    qrepo.seed(q1)
    qrepo.seed(q2)
    rubric = make_rubric(q1.id, exam.id, TEACHER_ID)  # total_marks=5.0
    rrepo.seed(rubric)
    svc = make_service(rrepo, qrepo)
    with pytest.raises(RubricError) as exc:
        svc.duplicate(rubric.id, TEACHER_ID, q2.id)
    assert exc.value.status_code == 422

