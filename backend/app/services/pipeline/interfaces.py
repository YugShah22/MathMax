"""
Processing pipeline interfaces and contracts.

These abstract base classes define the integration contracts for teammate-owned
modules (OpenCV Preprocessing, Gemini/Pix2Text Dual OCR, SymPy Parsing, Evaluation Engine).
They allow team modules to be plugged in without refactoring our ingestion/API architecture.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass
class PageReference:
    """Immutable reference to an ingested document page."""
    page_id: str
    document_id: str
    examination_id: str
    page_number: int
    storage_key: str
    image_format: str
    width: int
    height: int


@dataclass
class PreprocessingResult:
    """Result contract for teammate-owned image preprocessing."""
    page_id: str
    processed_storage_key: str
    deskew_angle: float = 0.0
    contrast_enhanced: bool = False
    noise_removed: bool = False
    metadata: dict[str, Any] = field(default_factory=dict)


class IImagePreprocessor(ABC):
    """Contract for image preprocessing module (OpenCV deskew, noise removal, etc.)."""

    @abstractmethod
    async def preprocess(self, page: PageReference) -> PreprocessingResult:
        """Preprocess a single document page image."""
        raise NotImplementedError


@dataclass
class OCRResult:
    """Result contract for teammate-owned Dual OCR engine (Gemini + Pix2Text)."""
    page_id: str
    raw_text: str
    confidence: float
    blocks: list[dict[str, Any]] = field(default_factory=list)
    ocr_engine: str = "placeholder"


class IOCREngine(ABC):
    """Contract for OCR engine (Gemini 4.2 / Pix2Text)."""

    @abstractmethod
    async def extract_text(self, page: PageReference, preprocessed_key: str | None = None) -> OCRResult:
        """Extract text and math blocks from a page image."""
        raise NotImplementedError


@dataclass
class MathExtractionResult:
    """Result contract for mathematical parsing and SymPy representation."""
    page_id: str
    expressions: list[str] = field(default_factory=list)
    latex_map: dict[str, str] = field(default_factory=dict)
    syntax_tree: dict[str, Any] = field(default_factory=dict)


class IMathExtractor(ABC):
    """Contract for mathematical expression parsing & SymPy conversion."""

    @abstractmethod
    async def extract_expressions(self, ocr_result: OCRResult) -> MathExtractionResult:
        """Parse raw text/LaTeX into mathematical structures."""
        raise NotImplementedError


@dataclass
class EvaluationResult:
    """Result contract for grading and rubric matching engine."""
    question_id: str
    score: float
    max_score: float
    feedback: str = ""
    step_results: list[dict[str, Any]] = field(default_factory=list)


class IMathEvaluator(ABC):
    """Contract for step-wise evaluation and partial marking."""

    @abstractmethod
    async def evaluate(
        self,
        math_result: MathExtractionResult,
        rubric_data: dict[str, Any],
        answer_key_data: dict[str, Any],
    ) -> EvaluationResult:
        """Grade mathematical steps according to rubric."""
        raise NotImplementedError


# ── Clean placeholders (No fabrication of results) ───────────────────────────

class NoopImagePreprocessor(IImagePreprocessor):
    """Placeholder preprocessor: preserves original page image without fabricated edits."""

    async def preprocess(self, page: PageReference) -> PreprocessingResult:
        return PreprocessingResult(
            page_id=page.page_id,
            processed_storage_key=page.storage_key,
            metadata={"status": "ingested_ready_for_teammate_cv_module"},
        )


class PlaceholderOCREngine(IOCREngine):
    """Placeholder OCR: clearly indicates awaiting teammate OCR integration."""

    async def extract_text(self, page: PageReference, preprocessed_key: str | None = None) -> OCRResult:
        return OCRResult(
            page_id=page.page_id,
            raw_text="",
            confidence=0.0,
            ocr_engine="awaiting_teammate_implementation",
        )

