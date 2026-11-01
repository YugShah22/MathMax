"""
Document ingestion service — processes handwritten answer sheets and extracts pages.
"""
from __future__ import annotations

import io
import logging
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image
import pypdfium2

from app.models.document import Document, DocumentStatus, DocumentType
from app.models.document_page import DocumentPage, PageStatus
from app.models.examination import ExaminationStatus
from app.models.processing_job import JobStatus, ProcessingJob, ProcessingStage
from app.models.user import User, UserRole
from app.repositories.document_page_repository import DocumentPageRepository
from app.repositories.document_repository import DocumentRepository
from app.repositories.examination_repository import ExaminationRepository
from app.repositories.processing_job_repository import ProcessingJobRepository
from app.utils.storage import (
    delete_file,
    resolve_file_path,
    save_document_file,
    save_page_image,
    validate_image_content,
    validate_pdf_content,
    validate_upload,
)

logger = logging.getLogger(__name__)


class IngestionError(Exception):
    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.status_code = status_code


class IngestionService:
    def __init__(
        self,
        doc_repo: DocumentRepository,
        page_repo: DocumentPageRepository,
        job_repo: ProcessingJobRepository,
        exam_repo: ExaminationRepository,
    ) -> None:
        self._doc_repo = doc_repo
        self._page_repo = page_repo
        self._job_repo = job_repo
        self._exam_repo = exam_repo

    # ── Permission helpers ────────────────────────────────────────────────────

    def _verify_exam_access(self, examination_id: str, user: User) -> None:
        """Verify user is authorized to interact with the examination."""
        exam = self._exam_repo.find_by_id(examination_id)
        if not exam:
            raise IngestionError("Examination not found.", 404)

        if user.role == UserRole.TEACHER:
            if exam.teacher_id != user.id:
                raise IngestionError("You do not have permission to manage this examination.", 403)
        elif user.role == UserRole.STUDENT:
            if exam.status not in (ExaminationStatus.PUBLISHED, ExaminationStatus.READY):
                raise IngestionError("Examination is not available for submissions.", 400)

    def _verify_document_access(self, doc: Document, user: User) -> None:
        """Verify user has permission to view or retrieve the document."""
        if user.role == UserRole.ADMIN:
            return

        if user.role == UserRole.STUDENT:
            if doc.student_id != user.id:
                raise IngestionError("Access denied: You can only access your own documents.", 403)
            return

        if user.role == UserRole.TEACHER:
            exam = self._exam_repo.find_by_id(doc.examination_id)
            if not exam or exam.teacher_id != user.id:
                raise IngestionError("Access denied: You do not own the examination for this document.", 403)

    # ── Ingest Answer Sheet ───────────────────────────────────────────────────

    def ingest_answer_sheet(
        self,
        examination_id: str,
        uploader: User,
        filename: str,
        content_type: str,
        data: bytes,
        student_id: str | None = None,
        submission_id: str | None = None,
    ) -> tuple[Document, ProcessingJob, list[DocumentPage]]:
        self._verify_exam_access(examination_id, uploader)

        effective_student_id = student_id if (uploader.role == UserRole.TEACHER and student_id) else (
            uploader.id if uploader.role == UserRole.STUDENT else None
        )
        effective_teacher_id = uploader.id if uploader.role == UserRole.TEACHER else None

        # 1. Basic validation (file size, mime, extension, magic bytes, traversal)
        try:
            validate_upload(filename, content_type, len(data), data=data)
        except ValueError as e:
            raise IngestionError(str(e), 400)

        ext = Path(filename).suffix.lower()
        is_pdf = (ext == ".pdf" or content_type == "application/pdf")

        # 2. Document-specific structural validation
        if is_pdf:
            try:
                page_count = validate_pdf_content(data)
            except ValueError as e:
                raise IngestionError(str(e), 400)
        else:
            try:
                validate_image_content(data)
                page_count = 1
            except ValueError as e:
                raise IngestionError(str(e), 400)

        # 3. Save original file
        stored_name, storage_key = save_document_file(data, filename, examination_id, "documents")

        # 4. Create Document record in MongoDB
        now = datetime.now(timezone.utc)
        document = Document(
            id="",
            examination_id=examination_id,
            teacher_id=effective_teacher_id,
            student_id=effective_student_id,
            submission_id=submission_id,
            original_filename=filename,
            stored_filename=stored_name,
            content_type=content_type,
            file_size=len(data),
            storage_key=storage_key,
            document_type=DocumentType.STUDENT_ANSWER_SHEET,
            status=DocumentStatus.PROCESSING,
            page_count=page_count,
            processing_started_at=now,
        )

        try:
            saved_doc = self._doc_repo.create(document)
        except Exception as e:
            delete_file(storage_key)
            logger.error("Failed to insert document into MongoDB: %s", e)
            raise IngestionError("Failed to persist document metadata.", 500)

        # 5. Create initial ProcessingJob
        job = ProcessingJob(
            id="",
            document_id=saved_doc.id,
            examination_id=examination_id,
            student_id=effective_student_id,
            stage=ProcessingStage.PAGE_EXTRACTION,
            status=JobStatus.PROCESSING,
            total_pages=page_count,
            started_at=now,
        )
        saved_job = self._job_repo.create(job)

        # 6. Extract individual pages into image representations
        extracted_pages: list[DocumentPage] = []
        try:
            if is_pdf:
                extracted_pages = self._extract_pdf_pages(data, saved_doc)
            else:
                extracted_pages = [self._register_image_page(data, saved_doc, ext)]

            # Page extraction succeeded
            completed_time = datetime.now(timezone.utc)
            self._page_repo.create_many(extracted_pages)

            self._doc_repo.update(saved_doc.id, {
                "status": DocumentStatus.PROCESSED.value,
                "page_count": len(extracted_pages),
                "processing_completed_at": completed_time,
            })
            saved_doc.status = DocumentStatus.PROCESSED
            saved_doc.page_count = len(extracted_pages)
            saved_doc.processing_completed_at = completed_time

            self._job_repo.update(saved_job.id, {
                "status": JobStatus.COMPLETED.value,
                "processed_pages": len(extracted_pages),
                "completed_at": completed_time,
            })
            saved_job.status = JobStatus.COMPLETED
            saved_job.processed_pages = len(extracted_pages)
            saved_job.completed_at = completed_time

            logger.info("Successfully ingested document %s with %d pages", saved_doc.id, len(extracted_pages))
            return saved_doc, saved_job, extracted_pages

        except Exception as e:
            logger.error("Page extraction failed for document %s: %s", saved_doc.id, e, exc_info=True)
            # Cleanup any extracted page image files
            for p in extracted_pages:
                delete_file(p.storage_key)

            err_msg = f"Page extraction failed: {str(e)}"
            self._doc_repo.update(saved_doc.id, {
                "status": DocumentStatus.FAILED.value,
                "processing_error": err_msg,
                "processing_completed_at": datetime.now(timezone.utc),
            })
            saved_doc.status = DocumentStatus.FAILED
            saved_doc.processing_error = err_msg

            self._job_repo.update(saved_job.id, {
                "status": JobStatus.FAILED.value,
                "error_message": err_msg,
                "failed_pages": page_count,
                "completed_at": datetime.now(timezone.utc),
            })
            saved_job.status = JobStatus.FAILED
            saved_job.error_message = err_msg

            raise IngestionError(f"Document ingestion failed: {str(e)}", 500)

    # ── Page extraction helpers ───────────────────────────────────────────────

    def _extract_pdf_pages(self, pdf_bytes: bytes, doc: Document) -> list[DocumentPage]:
        """Render each PDF page to a PNG image and create DocumentPage records."""
        pages: list[DocumentPage] = []
        pdf = pypdfium2.PdfDocument(pdf_bytes)
        try:
            for i in range(len(pdf)):
                page_obj = pdf[i]
                # Render at 1.5x scale (approx 108 DPI, crisp and fast)
                bitmap = page_obj.render(scale=1.5)
                pil_img = bitmap.to_pil()

                buf = io.BytesIO()
                pil_img.save(buf, format="PNG")
                img_data = buf.getvalue()

                stored_name, page_key = save_page_image(
                    img_data,
                    doc.examination_id,
                    doc.id,
                    i + 1,
                    ".png",
                )

                now = datetime.now(timezone.utc)
                dp = DocumentPage(
                    id="",
                    document_id=doc.id,
                    examination_id=doc.examination_id,
                    student_id=doc.student_id,
                    page_number=i + 1,
                    original_width=pil_img.width,
                    original_height=pil_img.height,
                    image_format="PNG",
                    file_size=len(img_data),
                    storage_key=page_key,
                    status=PageStatus.PROCESSED,
                    processing_started_at=now,
                    processing_completed_at=now,
                )
                pages.append(dp)
        finally:
            pdf.close()

        return pages

    def _register_image_page(self, img_bytes: bytes, doc: Document, ext: str) -> DocumentPage:
        """Register an uploaded single image as Page 1."""
        w, h, fmt = validate_image_content(img_bytes)
        stored_name, page_key = save_page_image(
            img_bytes,
            doc.examination_id,
            doc.id,
            1,
            ext,
        )
        now = datetime.now(timezone.utc)
        return DocumentPage(
            id="",
            document_id=doc.id,
            examination_id=doc.examination_id,
            student_id=doc.student_id,
            page_number=1,
            original_width=w,
            original_height=h,
            image_format=fmt,
            file_size=len(img_bytes),
            storage_key=page_key,
            status=PageStatus.PROCESSED,
            processing_started_at=now,
            processing_completed_at=now,
        )

    # ── Read methods ──────────────────────────────────────────────────────────

    def get_document_for_user(self, document_id: str, user: User) -> Document:
        doc = self._doc_repo.find_by_id(document_id)
        if not doc:
            raise IngestionError("Document not found.", 404)
        self._verify_document_access(doc, user)
        return doc

    def list_documents_for_examination(
        self,
        examination_id: str,
        user: User,
        doc_type: DocumentType | None = None,
        page: int = 1,
        page_size: int = 50,
    ) -> tuple[list[Document], int]:
        self._verify_exam_access(examination_id, user)

        if user.role == UserRole.STUDENT:
            # Student can only see their own documents for this exam
            items = self._doc_repo.list_by_student(user.id, examination_id=examination_id, page=page, page_size=page_size)
            total = self._doc_repo.count_by_student(user.id, examination_id=examination_id)
            return items, total

        items = self._doc_repo.list_by_examination(examination_id, doc_type=doc_type, page=page, page_size=page_size)
        total = self._doc_repo.count_by_examination(examination_id, doc_type=doc_type)
        return items, total

    def list_documents_for_student(
        self,
        student_id: str,
        user: User,
        examination_id: str | None = None,
        page: int = 1,
        page_size: int = 50,
    ) -> tuple[list[Document], int]:
        if user.role == UserRole.STUDENT and user.id != student_id:
            raise IngestionError("Access denied: You cannot view another student's documents.", 403)

        items = self._doc_repo.list_by_student(student_id, examination_id=examination_id, page=page, page_size=page_size)
        total = self._doc_repo.count_by_student(student_id, examination_id=examination_id)
        return items, total

    def list_pages_for_document(self, document_id: str, user: User) -> list[DocumentPage]:
        doc = self.get_document_for_user(document_id, user)
        return self._page_repo.list_by_document(doc.id)

    def get_page_for_user(self, page_id: str, user: User) -> tuple[DocumentPage, Document]:
        page = self._page_repo.find_by_id(page_id)
        if not page:
            raise IngestionError("Document page not found.", 404)
        doc = self.get_document_for_user(page.document_id, user)
        return page, doc

    def get_processing_status(self, document_id: str, user: User) -> dict:
        doc = self.get_document_for_user(document_id, user)
        pages = self._page_repo.list_by_document(doc.id)
        job = self._job_repo.find_latest_by_document(doc.id)
        is_failed = (doc.status in (DocumentStatus.FAILED, DocumentStatus.FAILED.value))

        doc_status_val = doc.status.value if hasattr(doc.status, "value") else str(doc.status)

        return {
            "document_id": doc.id,
            "examination_id": doc.examination_id,
            "document_status": doc_status_val,
            "page_count": doc.page_count,
            "active_job": job,
            "pages": pages,
            "can_retry": is_failed,
        }

    # ── Retry ─────────────────────────────────────────────────────────────────

    def retry_processing(self, document_id: str, user: User) -> tuple[Document, ProcessingJob, list[DocumentPage]]:
        doc = self.get_document_for_user(document_id, user)
        if doc.status not in (DocumentStatus.FAILED, DocumentStatus.FAILED.value):
            raise IngestionError("Only failed documents can be retried.", 400)
        if doc.status != DocumentStatus.FAILED:
            raise IngestionError("Only failed documents can be retried.", 400)

        # Resolve original file
        file_path = resolve_file_path(doc.storage_key)
        if not file_path or not file_path.exists():
            raise IngestionError("Original document file is no longer on storage.", 404)

        data = file_path.read_bytes()
        ext = Path(doc.original_filename).suffix.lower()
        is_pdf = (ext == ".pdf" or doc.content_type == "application/pdf")

        # Clean up any partial pages from prior attempts
        existing_pages = self._page_repo.list_by_document(doc.id)
        for p in existing_pages:
            delete_file(p.storage_key)
        self._page_repo.delete_by_document(doc.id)

        # Create new retry job
        latest_job = self._job_repo.find_latest_by_document(doc.id)
        retry_num = (latest_job.retry_count + 1) if latest_job else 1
        if retry_num > 3:
            raise IngestionError("Maximum retry attempts reached (3).", 400)

        now = datetime.now(timezone.utc)
        self._doc_repo.update(doc.id, {
            "status": DocumentStatus.PROCESSING.value,
            "processing_error": None,
            "processing_started_at": now,
        })
        doc.status = DocumentStatus.PROCESSING
        doc.processing_error = None
        doc.processing_started_at = now

        job = ProcessingJob(
            id="",
            document_id=doc.id,
            examination_id=doc.examination_id,
            student_id=doc.student_id,
            stage=ProcessingStage.PAGE_EXTRACTION,
            status=JobStatus.PROCESSING,
            total_pages=doc.page_count,
            retry_count=retry_num,
            started_at=now,
        )
        saved_job = self._job_repo.create(job)

        extracted_pages: list[DocumentPage] = []
        try:
            if is_pdf:
                extracted_pages = self._extract_pdf_pages(data, doc)
            else:
                extracted_pages = [self._register_image_page(data, doc, ext)]

            self._page_repo.create_many(extracted_pages)
            completed_time = datetime.now(timezone.utc)

            self._doc_repo.update(doc.id, {
                "status": DocumentStatus.PROCESSED.value,
                "page_count": len(extracted_pages),
                "processing_completed_at": completed_time,
            })
            doc.status = DocumentStatus.PROCESSED
            doc.page_count = len(extracted_pages)
            doc.processing_completed_at = completed_time

            self._job_repo.update(saved_job.id, {
                "status": JobStatus.COMPLETED.value,
                "processed_pages": len(extracted_pages),
                "completed_at": completed_time,
            })
            saved_job.status = JobStatus.COMPLETED
            saved_job.processed_pages = len(extracted_pages)
            saved_job.completed_at = completed_time

            return doc, saved_job, extracted_pages
        except Exception as e:
            err_msg = f"Retry page extraction failed: {str(e)}"
            self._doc_repo.update(doc.id, {
                "status": DocumentStatus.FAILED.value,
                "processing_error": err_msg,
                "processing_completed_at": datetime.now(timezone.utc),
            })
            doc.status = DocumentStatus.FAILED
            doc.processing_error = err_msg

            self._job_repo.update(saved_job.id, {
                "status": JobStatus.FAILED.value,
                "error_message": err_msg,
                "completed_at": datetime.now(timezone.utc),
            })
            saved_job.status = JobStatus.FAILED
            saved_job.error_message = err_msg
            raise IngestionError(err_msg, 500)

    # ── Deletion ──────────────────────────────────────────────────────────────

    def delete_document(self, document_id: str, user: User) -> bool:
        doc = self.get_document_for_user(document_id, user)

        # Remove page image files from storage
        pages = self._page_repo.list_by_document(doc.id)
        for p in pages:
            delete_file(p.storage_key)

        # Remove original document file from storage
        delete_file(doc.storage_key)

        # Remove records from MongoDB
        self._page_repo.delete_by_document(doc.id)
        self._job_repo.delete_by_document(doc.id)
        return self._doc_repo.delete(doc.id)

