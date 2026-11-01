"""Phase 3 dependency injection — repositories and services for document ingestion & processing."""
from __future__ import annotations

from fastapi import Depends

from app.api.dependencies.phase2 import get_document_repo, get_exam_repo
from app.db.client import get_database
from app.repositories.document_page_repository import DocumentPageRepository
from app.repositories.document_repository import DocumentRepository
from app.repositories.examination_repository import ExaminationRepository
from app.repositories.processing_job_repository import ProcessingJobRepository
from app.services.ingestion_service import IngestionService


def get_document_page_repo() -> DocumentPageRepository:
    return DocumentPageRepository(get_database())


def get_processing_job_repo() -> ProcessingJobRepository:
    return ProcessingJobRepository(get_database())


def get_ingestion_service(
    doc_repo: DocumentRepository = Depends(get_document_repo),
    page_repo: DocumentPageRepository = Depends(get_document_page_repo),
    job_repo: ProcessingJobRepository = Depends(get_processing_job_repo),
    exam_repo: ExaminationRepository = Depends(get_exam_repo),
) -> IngestionService:
    return IngestionService(doc_repo, page_repo, job_repo, exam_repo)

