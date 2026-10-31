"""Phase 2 dependency injection — repository and service factories."""
from __future__ import annotations

from fastapi import Depends

from app.api.dependencies.auth import get_current_user, require_teacher
from app.db.client import get_database
from app.models.user import User
from app.repositories.answer_key_repository import AnswerKeyRepository
from app.repositories.document_repository import DocumentRepository
from app.repositories.examination_repository import ExaminationRepository
from app.repositories.question_repository import QuestionRepository
from app.repositories.rubric_repository import RubricRepository
from app.services.answer_key_service import AnswerKeyService
from app.services.examination_service import ExaminationService
from app.services.question_service import QuestionService
from app.services.rubric_service import RubricService


def get_exam_repo() -> ExaminationRepository:
    return ExaminationRepository(get_database())


def get_question_repo() -> QuestionRepository:
    return QuestionRepository(get_database())


def get_answer_key_repo() -> AnswerKeyRepository:
    return AnswerKeyRepository(get_database())


def get_rubric_repo() -> RubricRepository:
    return RubricRepository(get_database())


def get_document_repo() -> DocumentRepository:
    return DocumentRepository(get_database())


def get_exam_service(
    exam_repo: ExaminationRepository = Depends(get_exam_repo),
    q_repo: QuestionRepository = Depends(get_question_repo),
    ak_repo: AnswerKeyRepository = Depends(get_answer_key_repo),
    r_repo: RubricRepository = Depends(get_rubric_repo),
    doc_repo: DocumentRepository = Depends(get_document_repo),
) -> ExaminationService:
    return ExaminationService(exam_repo, q_repo, ak_repo, r_repo, doc_repo)


def get_question_service(
    exam_repo: ExaminationRepository = Depends(get_exam_repo),
    q_repo: QuestionRepository = Depends(get_question_repo),
    ak_repo: AnswerKeyRepository = Depends(get_answer_key_repo),
    r_repo: RubricRepository = Depends(get_rubric_repo),
) -> QuestionService:
    return QuestionService(exam_repo, q_repo, ak_repo, r_repo)


def get_answer_key_service(
    ak_repo: AnswerKeyRepository = Depends(get_answer_key_repo),
    q_repo: QuestionRepository = Depends(get_question_repo),
) -> AnswerKeyService:
    return AnswerKeyService(ak_repo, q_repo)


def get_rubric_service(
    r_repo: RubricRepository = Depends(get_rubric_repo),
    q_repo: QuestionRepository = Depends(get_question_repo),
) -> RubricService:
    return RubricService(r_repo, q_repo)

