"""Document upload and ingestion API routes."""
from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse

from app.api.dependencies.auth import get_current_user, require_student, require_teacher
from app.api.dependencies.phase2 import get_document_repo, get_exam_repo
from app.api.dependencies.phase3 import get_document_page_repo, get_ingestion_service, get_processing_job_repo
from app.models.document import Document, DocumentStatus, DocumentType
from app.models.document_page import DocumentPage
from app.models.processing_job import ProcessingJob
from app.models.user import User, UserRole
from app.repositories.document_page_repository import DocumentPageRepository
from app.repositories.document_repository import DocumentRepository
from app.repositories.examination_repository import ExaminationRepository
from app.repositories.processing_job_repository import ProcessingJobRepository
from app.schemas.document import DocumentListResponse, DocumentResponse
from app.schemas.document_page import DocumentPageListResponse, DocumentPageResponse
from app.schemas.processing_job import ProcessingJobResponse, ProcessingStatusResponse
from app.services.ingestion_service import IngestionError, IngestionService
from app.utils.storage import delete_file, resolve_file_path, save_file, validate_upload

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Documents"])


def _to_response(doc: Document) -> DocumentResponse:
    return DocumentResponse(
        id=doc.id,
        examination_id=doc.examination_id,
        teacher_id=doc.teacher_id,
        student_id=doc.student_id,
        submission_id=doc.submission_id,
        original_filename=doc.original_filename,
        stored_filename=doc.stored_filename,
        content_type=doc.content_type,
        file_size=doc.file_size,
        document_type=doc.document_type,
        status=doc.status,
        page_count=doc.page_count,
        processing_error=doc.processing_error,
        processing_started_at=doc.processing_started_at,
        processing_completed_at=doc.processing_completed_at,
        uploaded_at=doc.uploaded_at,
        updated_at=doc.updated_at,
    )


def _to_page_response(page: DocumentPage) -> DocumentPageResponse:
    return DocumentPageResponse(
        id=page.id,
        document_id=page.document_id,
        examination_id=page.examination_id,
        student_id=page.student_id,
        page_number=page.page_number,
        original_width=page.original_width,
        original_height=page.original_height,
        image_format=page.image_format,
        file_size=page.file_size,
        status=page.status,
        error_message=page.error_message,
        processing_started_at=page.processing_started_at,
        processing_completed_at=page.processing_completed_at,
        created_at=page.created_at,
        updated_at=page.updated_at,
    )


def _to_job_response(job: ProcessingJob) -> ProcessingJobResponse:
    return ProcessingJobResponse(
        id=job.id,
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
        created_at=job.created_at,
        started_at=job.started_at,
        completed_at=job.completed_at,
    )


# ── Teacher Question Paper & Answer Key uploads (Phase 2 preserved) ───────────

async def _handle_upload(
    examination_id: str,
    teacher_id: str,
    file: UploadFile,
    doc_type: DocumentType,
    exam_repo: ExaminationRepository,
    doc_repo: DocumentRepository,
) -> DocumentResponse:
    exam = exam_repo.find_by_id_and_teacher(examination_id, teacher_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found.")

    data = await file.read()
    try:
        validate_upload(file.filename or "upload", file.content_type or "", len(data), data=data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    stored_filename, storage_key = save_file(data, file.filename or "upload", teacher_id, examination_id)

    document = Document(
        id="",
        examination_id=examination_id,
        teacher_id=teacher_id,
        original_filename=file.filename or "upload",
        stored_filename=stored_filename,
        content_type=file.content_type or "application/octet-stream",
        file_size=len(data),
        storage_key=storage_key,
        document_type=doc_type,
        status=DocumentStatus.PROCESSED,
        page_count=1,
    )
    try:
        saved = doc_repo.create(document)
    except Exception as e:
        delete_file(storage_key)
        logger.error("DB write failed after file upload, cleaned up: %s", e)
        raise HTTPException(status_code=500, detail="Failed to save document metadata.")

    field = "question_paper_ref" if doc_type == DocumentType.QUESTION_PAPER else "answer_key_ref"
    exam_repo.update(examination_id, teacher_id, {field: saved.id})
    return _to_response(saved)


@router.post(
    "/examinations/{examination_id}/question-paper",
    response_model=DocumentResponse,
    status_code=201,
    summary="Upload question paper",
)
async def upload_question_paper(
    examination_id: str,
    file: UploadFile = File(...),
    teacher: User = Depends(require_teacher),
    exam_repo: ExaminationRepository = Depends(get_exam_repo),
    doc_repo: DocumentRepository = Depends(get_document_repo),
):
    return await _handle_upload(examination_id, teacher.id, file, DocumentType.QUESTION_PAPER, exam_repo, doc_repo)


@router.post(
    "/examinations/{examination_id}/answer-key-file",
    response_model=DocumentResponse,
    status_code=201,
    summary="Upload answer key file",
)
async def upload_answer_key_file(
    examination_id: str,
    file: UploadFile = File(...),
    teacher: User = Depends(require_teacher),
    exam_repo: ExaminationRepository = Depends(get_exam_repo),
    doc_repo: DocumentRepository = Depends(get_document_repo),
):
    return await _handle_upload(examination_id, teacher.id, file, DocumentType.ANSWER_KEY, exam_repo, doc_repo)


# ── Student Answer Sheet Upload & Ingestion (Phase 3) ─────────────────────────

@router.post(
    "/examinations/{examination_id}/answer-sheets",
    response_model=DocumentResponse,
    status_code=201,
    summary="Upload student answer sheet",
    description="Uploads a handwritten answer sheet (PDF, JPEG, or PNG), extracts pages, and initializes processing.",
)
async def upload_answer_sheet(
    examination_id: str,
    file: UploadFile = File(...),
    student_id: str | None = Form(None),
    submission_id: str | None = Form(None),
    current_user: User = Depends(get_current_user),
    ingestion_service: IngestionService = Depends(get_ingestion_service),
):
    data = await file.read()
    try:
        doc, job, pages = ingestion_service.ingest_answer_sheet(
            examination_id=examination_id,
            uploader=current_user,
            filename=file.filename or "answer_sheet.pdf",
            content_type=file.content_type or "application/octet-stream",
            data=data,
            student_id=student_id,
            submission_id=submission_id,
        )
        return _to_response(doc)
    except IngestionError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))


@router.get(
    "/examinations/{examination_id}/answer-sheets",
    response_model=DocumentListResponse,
    summary="List answer sheets for an examination",
    description="Teachers see all answer sheets for their exam. Students see only their own.",
)
def list_examination_answer_sheets(
    examination_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    ingestion_service: IngestionService = Depends(get_ingestion_service),
):
    try:
        docs, total = ingestion_service.list_documents_for_examination(
            examination_id=examination_id,
            user=current_user,
            doc_type=DocumentType.STUDENT_ANSWER_SHEET,
            page=page,
            page_size=page_size,
        )
        return DocumentListResponse(
            items=[_to_response(d) for d in docs],
            total=total,
            page=page,
            page_size=page_size,
        )
    except IngestionError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))


@router.get(
    "/students/me/documents",
    response_model=DocumentListResponse,
    summary="List current student's uploaded documents",
)
def list_my_documents(
    examination_id: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    student: User = Depends(require_student),
    ingestion_service: IngestionService = Depends(get_ingestion_service),
):
    try:
        docs, total = ingestion_service.list_documents_for_student(
            student_id=student.id,
            user=student,
            examination_id=examination_id,
            page=page,
            page_size=page_size,
        )
        return DocumentListResponse(
            items=[_to_response(d) for d in docs],
            total=total,
            page=page,
            page_size=page_size,
        )
    except IngestionError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))


# ── Document Retrieval & Management ───────────────────────────────────────────

@router.get("/documents/{file_id}", response_model=DocumentResponse, summary="Get document metadata")
def get_document(
    file_id: str,
    current_user: User = Depends(get_current_user),
    ingestion_service: IngestionService = Depends(get_ingestion_service),
):
    try:
        doc = ingestion_service.get_document_for_user(file_id, current_user)
        return _to_response(doc)
    except IngestionError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))


@router.get("/documents/{file_id}/download", summary="Download document")
@router.get("/documents/{file_id}/file", summary="Stream original document file")
def download_document(
    file_id: str,
    current_user: User = Depends(get_current_user),
    ingestion_service: IngestionService = Depends(get_ingestion_service),
):
    try:
        doc = ingestion_service.get_document_for_user(file_id, current_user)
        path = resolve_file_path(doc.storage_key)
        if not path or not path.exists():
            raise HTTPException(status_code=404, detail="File not found on storage.")
        return FileResponse(str(path), filename=doc.original_filename, media_type=doc.content_type)
    except IngestionError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))


@router.delete("/documents/{file_id}", status_code=204, summary="Delete document")
def delete_document(
    file_id: str,
    current_user: User = Depends(get_current_user),
    ingestion_service: IngestionService = Depends(get_ingestion_service),
    exam_repo: ExaminationRepository = Depends(get_exam_repo),
):
    try:
        doc = ingestion_service.get_document_for_user(file_id, current_user)
        ingestion_service.delete_document(file_id, current_user)

        # Clear references in examination if matching
        if current_user.role in (UserRole.TEACHER, UserRole.ADMIN):
            exam = exam_repo.find_by_id(doc.examination_id)
            if exam:
                updates = {}
                if exam.question_paper_ref == doc.id:
                    updates["question_paper_ref"] = None
                if exam.answer_key_ref == doc.id:
                    updates["answer_key_ref"] = None
                if updates:
                    exam_repo.update(doc.examination_id, exam.teacher_id, updates)
    except IngestionError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))


# ── Document Pages & Processing Status ────────────────────────────────────────

@router.get(
    "/documents/{file_id}/pages",
    response_model=DocumentPageListResponse,
    summary="List extracted pages for a document",
)
def list_document_pages(
    file_id: str,
    current_user: User = Depends(get_current_user),
    ingestion_service: IngestionService = Depends(get_ingestion_service),
):
    try:
        pages = ingestion_service.list_pages_for_document(file_id, current_user)
        return DocumentPageListResponse(
            items=[_to_page_response(p) for p in pages],
            total=len(pages),
        )
    except IngestionError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))


@router.get(
    "/documents/{file_id}/pages/{page_id}",
    response_model=DocumentPageResponse,
    summary="Get single page metadata",
)
def get_document_page(
    file_id: str,
    page_id: str,
    current_user: User = Depends(get_current_user),
    ingestion_service: IngestionService = Depends(get_ingestion_service),
):
    try:
        page, doc = ingestion_service.get_page_for_user(page_id, current_user)
        if page.document_id != file_id:
            raise HTTPException(status_code=404, detail="Page does not belong to this document.")
        return _to_page_response(page)
    except IngestionError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))


@router.get(
    "/documents/{file_id}/pages/{page_id}/file",
    summary="Stream page image file",
)
def stream_page_image(
    file_id: str,
    page_id: str,
    current_user: User = Depends(get_current_user),
    ingestion_service: IngestionService = Depends(get_ingestion_service),
):
    try:
        page, doc = ingestion_service.get_page_for_user(page_id, current_user)
        if page.document_id != file_id:
            raise HTTPException(status_code=404, detail="Page does not belong to this document.")
        path = resolve_file_path(page.storage_key)
        if not path or not path.exists():
            raise HTTPException(status_code=404, detail="Page image file not found on storage.")
        media_type = "image/png" if page.image_format.upper() == "PNG" else "image/jpeg"
        return FileResponse(str(path), media_type=media_type)
    except IngestionError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))


@router.get(
    "/documents/{file_id}/processing-status",
    response_model=ProcessingStatusResponse,
    summary="Get document processing status and page breakdown",
)
def get_processing_status(
    file_id: str,
    current_user: User = Depends(get_current_user),
    ingestion_service: IngestionService = Depends(get_ingestion_service),
):
    try:
        status_info = ingestion_service.get_processing_status(file_id, current_user)
        job = status_info.get("active_job")
        return ProcessingStatusResponse(
            document_id=status_info["document_id"],
            examination_id=status_info["examination_id"],
            document_status=status_info["document_status"],
            page_count=status_info["page_count"],
            active_job=_to_job_response(job) if job else None,
            pages=[_to_page_response(p) for p in status_info["pages"]],
            can_retry=status_info["can_retry"],
        )
    except IngestionError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))


@router.post(
    "/documents/{file_id}/retry",
    response_model=DocumentResponse,
    summary="Retry failed processing job",
)
def retry_processing(
    file_id: str,
    current_user: User = Depends(get_current_user),
    ingestion_service: IngestionService = Depends(get_ingestion_service),
):
    try:
        doc, job, pages = ingestion_service.retry_processing(file_id, current_user)
        return _to_response(doc)
    except IngestionError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))
