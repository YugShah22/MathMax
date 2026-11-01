"""
Phase 2 shared fixtures and in-memory mock repositories.
All Phase 2 tests import from here.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest

from app.models.examination import Examination, ExaminationStatus, ExaminationType
from app.models.question import DifficultyLevel, Question, QuestionType
from app.models.answer_key import AnswerKey, ExpectedStep
from app.models.rubric import (
    EvaluationCriteria, EvaluationType, MarkingPolicy,
    PartialMarkingConfig, Rubric, RubricStatus, RubricStep,
)
from app.models.document import Document, DocumentStatus, DocumentType
from app.models.document_page import DocumentPage, PageStatus
from app.models.processing_job import JobStatus, ProcessingJob, ProcessingStage


def _id() -> str:
    return uuid.uuid4().hex[:24]


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ── In-memory repositories ────────────────────────────────────────────────────

class MockExaminationRepository:
    def __init__(self):
        self._store: dict[str, Examination] = {}

    def find_by_id(self, exam_id: str) -> Examination | None:
        return self._store.get(exam_id)

    def find_by_id_and_teacher(self, exam_id: str, teacher_id: str) -> Examination | None:
        e = self._store.get(exam_id)
        return e if e and e.teacher_id == teacher_id else None

    def list_by_teacher(self, teacher_id, status=None, search=None, page=1, page_size=20):
        items = [e for e in self._store.values() if e.teacher_id == teacher_id]
        if status:
            items = [e for e in items if e.status == status or e.status == status.value]
        if search:
            items = [e for e in items if search.lower() in e.title.lower() or search.lower() in e.subject.lower()]
        total = len(items)
        return items[(page - 1) * page_size: page * page_size], total

    def count_by_teacher_and_status(self, teacher_id: str, status: ExaminationStatus) -> int:
        return sum(1 for e in self._store.values() if e.teacher_id == teacher_id and (e.status == status or e.status == status.value))

    def create(self, exam: Examination) -> Examination:
        new_id = _id()
        saved = Examination(
            id=new_id, teacher_id=exam.teacher_id, title=exam.title,
            subject=exam.subject, total_marks=exam.total_marks,
            duration_minutes=exam.duration_minutes, description=exam.description,
            academic_year=exam.academic_year, examination_type=exam.examination_type,
            scheduled_at=exam.scheduled_at, status=exam.status,
            created_at=_now(), updated_at=_now(),
        )
        self._store[new_id] = saved
        return saved

    def update(self, exam_id: str, teacher_id: str, updates: dict) -> Examination | None:
        e = self.find_by_id_and_teacher(exam_id, teacher_id)
        if not e:
            return None
        for k, v in updates.items():
            if hasattr(e, k):
                object.__setattr__(e, k, v)
        return e

    def delete(self, exam_id: str, teacher_id: str) -> bool:
        if exam_id in self._store and self._store[exam_id].teacher_id == teacher_id:
            del self._store[exam_id]
            return True
        return False

    def seed(self, exam: Examination) -> None:
        self._store[exam.id] = exam


class MockQuestionRepository:
    def __init__(self):
        self._store: dict[str, Question] = {}

    def find_by_id(self, qid: str) -> Question | None:
        return self._store.get(qid)

    def find_by_id_and_teacher(self, qid: str, teacher_id: str) -> Question | None:
        q = self._store.get(qid)
        return q if q and q.teacher_id == teacher_id else None

    def list_by_examination(self, exam_id: str) -> list[Question]:
        return sorted(
            [q for q in self._store.values() if q.examination_id == exam_id],
            key=lambda q: q.question_number,
        )

    def number_exists_in_exam(self, exam_id: str, num: int, exclude_id: str | None = None) -> bool:
        return any(
            q.examination_id == exam_id and q.question_number == num and q.id != exclude_id
            for q in self._store.values()
        )

    def create(self, q: Question) -> Question:
        new_id = _id()
        saved = Question(
            id=new_id, examination_id=q.examination_id, teacher_id=q.teacher_id,
            question_number=q.question_number, question_text=q.question_text,
            maximum_marks=q.maximum_marks, question_type=q.question_type,
            topic=q.topic, difficulty=q.difficulty,
            created_at=_now(), updated_at=_now(),
        )
        self._store[new_id] = saved
        return saved

    def update(self, qid: str, teacher_id: str, updates: dict) -> Question | None:
        q = self.find_by_id_and_teacher(qid, teacher_id)
        if not q:
            return None
        for k, v in updates.items():
            if hasattr(q, k):
                object.__setattr__(q, k, v)
        return q

    def delete(self, qid: str, teacher_id: str) -> bool:
        if qid in self._store and self._store[qid].teacher_id == teacher_id:
            del self._store[qid]
            return True
        return False

    def delete_by_examination(self, exam_id: str) -> int:
        keys = [k for k, v in self._store.items() if v.examination_id == exam_id]
        for k in keys:
            del self._store[k]
        return len(keys)

    def sum_marks_for_examination(self, exam_id: str) -> float:
        return sum(q.maximum_marks for q in self._store.values() if q.examination_id == exam_id)

    def seed(self, q: Question) -> None:
        self._store[q.id] = q


class MockAnswerKeyRepository:
    def __init__(self):
        self._store: dict[str, AnswerKey] = {}

    def find_by_question(self, question_id: str) -> AnswerKey | None:
        return next((a for a in self._store.values() if a.question_id == question_id), None)

    def find_by_id(self, ak_id: str) -> AnswerKey | None:
        return self._store.get(ak_id)

    def find_by_id_and_teacher(self, ak_id: str, teacher_id: str) -> AnswerKey | None:
        a = self._store.get(ak_id)
        return a if a and a.teacher_id == teacher_id else None

    def list_by_examination(self, exam_id: str) -> list[AnswerKey]:
        return [a for a in self._store.values() if a.examination_id == exam_id]

    def create(self, ak: AnswerKey) -> AnswerKey:
        new_id = _id()
        saved = AnswerKey(
            id=new_id, question_id=ak.question_id, examination_id=ak.examination_id,
            teacher_id=ak.teacher_id, expected_answer=ak.expected_answer,
            expected_steps=ak.expected_steps, mathematical_expression=ak.mathematical_expression,
            expected_final_answer=ak.expected_final_answer,
            accepted_alternatives=ak.accepted_alternatives, marking_notes=ak.marking_notes,
            created_at=_now(), updated_at=_now(),
        )
        self._store[new_id] = saved
        return saved

    def update(self, ak_id: str, teacher_id: str, updates: dict) -> AnswerKey | None:
        a = self.find_by_id_and_teacher(ak_id, teacher_id)
        if not a:
            return None
        for k, v in updates.items():
            if hasattr(a, k):
                object.__setattr__(a, k, v)
        return a

    def count_for_examination(self, exam_id: str) -> int:
        return sum(1 for a in self._store.values() if a.examination_id == exam_id)

    def delete_by_question(self, question_id: str) -> int:
        keys = [k for k, v in self._store.items() if v.question_id == question_id]
        for k in keys:
            del self._store[k]
        return len(keys)

    def delete_by_examination(self, exam_id: str) -> int:
        keys = [k for k, v in self._store.items() if v.examination_id == exam_id]
        for k in keys:
            del self._store[k]
        return len(keys)

    def seed(self, ak: AnswerKey) -> None:
        self._store[ak.id] = ak


class MockRubricRepository:
    def __init__(self):
        self._store: dict[str, Rubric] = {}

    def find_by_id(self, rid: str) -> Rubric | None:
        return self._store.get(rid)

    def find_by_id_and_teacher(self, rid: str, teacher_id: str) -> Rubric | None:
        r = self._store.get(rid)
        return r if r and r.teacher_id == teacher_id else None

    def list_by_question(self, question_id: str) -> list[Rubric]:
        return [r for r in self._store.values() if r.question_id == question_id]

    def count_active_for_examination(self, exam_id: str) -> int:
        return sum(1 for r in self._store.values() if r.examination_id == exam_id and r.status == RubricStatus.ACTIVE)

    def create(self, rubric: Rubric) -> Rubric:
        new_id = _id()
        from dataclasses import replace
        saved = Rubric(
            id=new_id, teacher_id=rubric.teacher_id, examination_id=rubric.examination_id,
            question_id=rubric.question_id, title=rubric.title, total_marks=rubric.total_marks,
            steps=list(rubric.steps), description=rubric.description,
            evaluation_type=rubric.evaluation_type, instructions=rubric.instructions,
            status=rubric.status, version=rubric.version, parent_rubric_id=rubric.parent_rubric_id,
            partial_marking=rubric.partial_marking,
            created_at=_now(), updated_at=_now(),
        )
        self._store[new_id] = saved
        return saved

    def update(self, rid: str, teacher_id: str, updates: dict) -> Rubric | None:
        r = self.find_by_id_and_teacher(rid, teacher_id)
        if not r:
            return None
        for k, v in updates.items():
            if hasattr(r, k):
                object.__setattr__(r, k, v)
        return r

    def delete_by_question(self, question_id: str) -> int:
        keys = [k for k, v in self._store.items() if v.question_id == question_id]
        for k in keys:
            del self._store[k]
        return len(keys)

    def delete_by_examination(self, exam_id: str) -> int:
        keys = [k for k, v in self._store.items() if v.examination_id == exam_id]
        for k in keys:
            del self._store[k]
        return len(keys)

    def seed(self, r: Rubric) -> None:
        self._store[r.id] = r


class MockDocumentRepository:
    def __init__(self):
        self._store: dict[str, Document] = {}

    def find_by_id(self, doc_id: str) -> Document | None:
        return self._store.get(doc_id)

    def find_by_id_and_teacher(self, doc_id: str, teacher_id: str) -> Document | None:
        d = self._store.get(doc_id)
        return d if d and d.teacher_id == teacher_id else None

    def find_by_id_and_student(self, doc_id: str, student_id: str) -> Document | None:
        d = self._store.get(doc_id)
        return d if d and d.student_id == student_id else None

    def create(self, document: Document) -> Document:
        new_id = getattr(document, "id", None) or _id()
        saved = Document(
            id=new_id,
            examination_id=document.examination_id,
            teacher_id=document.teacher_id,
            student_id=document.student_id,
            submission_id=document.submission_id,
            original_filename=document.original_filename,
            stored_filename=document.stored_filename,
            content_type=document.content_type,
            file_size=document.file_size,
            storage_key=document.storage_key,
            document_type=document.document_type,
            status=document.status if hasattr(document, "status") else DocumentStatus.UPLOADED,
            page_count=document.page_count,
            processing_error=document.processing_error,
            processing_started_at=document.processing_started_at,
            processing_completed_at=document.processing_completed_at,
            uploaded_at=document.uploaded_at or _now(),
            updated_at=_now(),
        )
        self._store[new_id] = saved
        return saved

    def update(self, doc_id: str, updates: dict) -> Document | None:
        d = self._store.get(doc_id)
        if not d:
            return None
        for k, v in updates.items():
            if hasattr(d, k):
                object.__setattr__(d, k, v)
        object.__setattr__(d, "updated_at", _now())
        return d

    def delete(self, doc_id: str, teacher_id: str | None = None) -> bool:
        d = self._store.get(doc_id)
        if not d:
            return False
        if teacher_id and d.teacher_id != teacher_id:
            return False
        del self._store[doc_id]
        return True

    def list_by_examination(
        self, exam_id: str, doc_type: DocumentType | None = None, page: int = 1, page_size: int = 50
    ) -> list[Document]:
        items = [d for d in self._store.values() if d.examination_id == exam_id]
        if doc_type:
            items = [d for d in items if d.document_type == doc_type or d.document_type == doc_type.value]
        items.sort(key=lambda d: d.uploaded_at, reverse=True)
        return items[(page - 1) * page_size: page * page_size]

    def count_by_examination(self, exam_id: str, doc_type: DocumentType | None = None) -> int:
        items = [d for d in self._store.values() if d.examination_id == exam_id]
        if doc_type:
            items = [d for d in items if d.document_type == doc_type or d.document_type == doc_type.value]
        return len(items)

    def list_by_student(
        self, student_id: str, examination_id: str | None = None, page: int = 1, page_size: int = 50
    ) -> list[Document]:
        items = [d for d in self._store.values() if d.student_id == student_id]
        if examination_id:
            items = [d for d in items if d.examination_id == examination_id]
        items.sort(key=lambda d: d.uploaded_at, reverse=True)
        return items[(page - 1) * page_size: page * page_size]

    def count_by_student(self, student_id: str, examination_id: str | None = None) -> int:
        items = [d for d in self._store.values() if d.student_id == student_id]
        if examination_id:
            items = [d for d in items if d.examination_id == examination_id]
        return len(items)

    def delete_by_examination(self, exam_id: str) -> int:
        keys = [k for k, v in self._store.items() if v.examination_id == exam_id]
        for k in keys:
            del self._store[k]
        return len(keys)

    def seed(self, d: Document) -> None:
        self._store[d.id] = d


class MockDocumentPageRepository:
    def __init__(self):
        self._store: dict[str, DocumentPage] = {}

    def find_by_id(self, page_id: str) -> DocumentPage | None:
        return self._store.get(page_id)

    def list_by_document(self, document_id: str) -> list[DocumentPage]:
        pages = [p for p in self._store.values() if p.document_id == document_id]
        pages.sort(key=lambda p: p.page_number)
        return pages

    def list_by_examination(self, examination_id: str) -> list[DocumentPage]:
        pages = [p for p in self._store.values() if p.examination_id == examination_id]
        pages.sort(key=lambda p: (p.document_id, p.page_number))
        return pages

    def create(self, page: DocumentPage) -> DocumentPage:
        new_id = getattr(page, "id", None) or _id()
        saved = DocumentPage(
            id=new_id,
            document_id=page.document_id,
            examination_id=page.examination_id,
            student_id=page.student_id,
            page_number=page.page_number,
            original_width=page.original_width,
            original_height=page.original_height,
            image_format=page.image_format,
            file_size=page.file_size,
            storage_key=page.storage_key,
            status=page.status,
            error_message=page.error_message,
            processing_started_at=page.processing_started_at,
            processing_completed_at=page.processing_completed_at,
            created_at=_now(),
            updated_at=_now(),
        )
        self._store[new_id] = saved
        return saved

    def create_many(self, pages: list[DocumentPage]) -> list[DocumentPage]:
        return [self.create(p) for p in pages]

    def update_status(
        self,
        page_id: str,
        status: PageStatus,
        error_message: str | None = None,
        started_at: datetime | None = None,
        completed_at: datetime | None = None,
    ) -> DocumentPage | None:
        page = self._store.get(page_id)
        if not page:
            return None
        object.__setattr__(page, "status", status)
        if error_message is not None:
            object.__setattr__(page, "error_message", error_message)
        if started_at is not None:
            object.__setattr__(page, "processing_started_at", started_at)
        if completed_at is not None:
            object.__setattr__(page, "processing_completed_at", completed_at)
        object.__setattr__(page, "updated_at", _now())
        return page

    def delete_by_document(self, document_id: str) -> int:
        keys = [k for k, v in self._store.items() if v.document_id == document_id]
        for k in keys:
            del self._store[k]
        return len(keys)

    def delete_by_examination(self, examination_id: str) -> int:
        keys = [k for k, v in self._store.items() if v.examination_id == examination_id]
        for k in keys:
            del self._store[k]
        return len(keys)

    def seed(self, page: DocumentPage) -> None:
        self._store[page.id] = page


class MockProcessingJobRepository:
    def __init__(self):
        self._store: dict[str, ProcessingJob] = {}

    def find_by_id(self, job_id: str) -> ProcessingJob | None:
        return self._store.get(job_id)

    def find_latest_by_document(self, document_id: str) -> ProcessingJob | None:
        jobs = [j for j in self._store.values() if j.document_id == document_id]
        if not jobs:
            return None
        jobs.sort(key=lambda j: j.created_at, reverse=True)
        return jobs[0]

    def list_by_document(self, document_id: str) -> list[ProcessingJob]:
        jobs = [j for j in self._store.values() if j.document_id == document_id]
        jobs.sort(key=lambda j: j.created_at, reverse=True)
        return jobs

    def list_by_examination(self, examination_id: str) -> list[ProcessingJob]:
        jobs = [j for j in self._store.values() if j.examination_id == examination_id]
        jobs.sort(key=lambda j: j.created_at, reverse=True)
        return jobs

    def create(self, job: ProcessingJob) -> ProcessingJob:
        new_id = getattr(job, "id", None) or _id()
        saved = ProcessingJob(
            id=new_id,
            document_id=job.document_id,
            examination_id=job.examination_id,
            student_id=job.student_id,
            stage=job.stage,
            status=job.status,
            total_pages=job.total_pages,
            processed_pages=job.processed_pages,
            failed_pages=job.failed_pages,
            error_message=job.error_message,
            retry_count=job.retry_count,
            max_retries=job.max_retries,
            created_at=_now(),
            started_at=job.started_at,
            completed_at=job.completed_at,
            updated_at=_now(),
        )
        self._store[new_id] = saved
        return saved

    def update(self, job_id: str, updates: dict) -> ProcessingJob | None:
        job = self._store.get(job_id)
        if not job:
            return None
        for k, v in updates.items():
            if hasattr(job, k):
                object.__setattr__(job, k, v)
        object.__setattr__(job, "updated_at", _now())
        return job

    def delete_by_document(self, document_id: str) -> int:
        keys = [k for k, v in self._store.items() if v.document_id == document_id]
        for k in keys:
            del self._store[k]
        return len(keys)

    def delete_by_examination(self, examination_id: str) -> int:
        keys = [k for k, v in self._store.items() if v.examination_id == examination_id]
        for k in keys:
            del self._store[k]
        return len(keys)

    def seed(self, job: ProcessingJob) -> None:
        self._store[job.id] = job


# ── Fixture helpers ───────────────────────────────────────────────────────────

TEACHER_ID = "a" * 24
OTHER_TEACHER_ID = "b" * 24


def make_exam(teacher_id: str = TEACHER_ID, status: ExaminationStatus = ExaminationStatus.DRAFT) -> Examination:
    eid = _id()
    return Examination(
        id=eid, teacher_id=teacher_id, title="Test Exam", subject="Mathematics",
        total_marks=20.0, duration_minutes=60, status=status,
    )


def make_question(exam_id: str, teacher_id: str = TEACHER_ID, number: int = 1, marks: float = 10.0) -> Question:
    qid = _id()
    return Question(
        id=qid, examination_id=exam_id, teacher_id=teacher_id,
        question_number=number, question_text="Solve 2x + 4 = 10.",
        maximum_marks=marks,
    )


def make_rubric(question_id: str, exam_id: str, teacher_id: str = TEACHER_ID) -> Rubric:
    rid = _id()
    step = RubricStep(
        step_id=_id(), step_number=1, title="Step 1",
        description="Subtract 4 from both sides.", maximum_marks=5.0,
        partial_marks_config=PartialMarkingConfig(),
    )
    return Rubric(
        id=rid, teacher_id=teacher_id, examination_id=exam_id, question_id=question_id,
        title="Sample Rubric", total_marks=5.0, steps=[step],
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
    return MockDocumentRepository()


@pytest.fixture
def page_repo():
    return MockDocumentPageRepository()


@pytest.fixture
def job_repo():
    return MockProcessingJobRepository()


