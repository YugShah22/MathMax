"""Document upload API routes."""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse

from app.api.dependencies.auth import require_teacher
from app.api.dependencies.phase2 import get_document_repo, get_exam_repo
from app.models.document import Document, DocumentType
from app.models.user import User
from app.repositories.document_repository import DocumentRepository
from app.repositories.examination_repository import ExaminationRepository
from app.schemas.document import DocumentResponse
from app.utils.storage import delete_file, resolve_file_path, save_file, validate_upload

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Documents"])


def _to_response(doc: Document) -> DocumentResponse:
    return DocumentResponse(
        id=doc.id,
        examination_id=doc.examination_id,
        teacher_id=doc.teacher_id,
        original_filename=doc.original_filename,
        stored_filename=doc.stored_filename,
        content_type=doc.content_type,
        file_size=doc.file_size,
        document_type=doc.document_type,
        uploaded_at=doc.uploaded_at,
    )


async def _handle_upload(
    examination_id: str,
    teacher_id: str,
    file: UploadFile,
    doc_type: DocumentType,
    exam_repo: ExaminationRepository,
    doc_repo: DocumentRepository,
) -> DocumentResponse:
    # Ownership check
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
    )
    try:
        saved = doc_repo.create(document)
    except Exception as e:
        # Compensating action: delete the file if DB write fails
        delete_file(storage_key)
        logger.error("DB write failed after file upload, cleaned up: %s", e)
        raise HTTPException(status_code=500, detail="Failed to save document metadata.")

    # Link back to examination
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


@router.get("/documents/{file_id}", response_model=DocumentResponse, summary="Get document metadata")
def get_document(
    file_id: str,
    teacher: User = Depends(require_teacher),
    doc_repo: DocumentRepository = Depends(get_document_repo),
):
    doc = doc_repo.find_by_id_and_teacher(file_id, teacher.id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    return _to_response(doc)


@router.get("/documents/{file_id}/download", summary="Download document")
def download_document(
    file_id: str,
    teacher: User = Depends(require_teacher),
    doc_repo: DocumentRepository = Depends(get_document_repo),
):
    doc = doc_repo.find_by_id_and_teacher(file_id, teacher.id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    path = resolve_file_path(doc.storage_key)
    if not path:
        raise HTTPException(status_code=404, detail="File not found on storage.")
    return FileResponse(str(path), filename=doc.original_filename, media_type=doc.content_type)


@router.delete("/documents/{file_id}", status_code=204, summary="Delete document")
def delete_document(
    file_id: str,
    teacher: User = Depends(require_teacher),
    doc_repo: DocumentRepository = Depends(get_document_repo),
    exam_repo: ExaminationRepository = Depends(get_exam_repo),
):
    doc = doc_repo.find_by_id_and_teacher(file_id, teacher.id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    delete_file(doc.storage_key)
    doc_repo.delete(file_id, teacher.id)
    exam = exam_repo.find_by_id_and_teacher(doc.examination_id, teacher.id)
    if exam:
        updates = {}
        if exam.question_paper_ref == doc.id:
            updates["question_paper_ref"] = None
        if exam.answer_key_ref == doc.id:
            updates["answer_key_ref"] = None
        if updates:
            exam_repo.update(doc.examination_id, teacher.id, updates)

