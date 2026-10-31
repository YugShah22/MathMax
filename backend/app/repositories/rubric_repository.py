"""
Rubric repository.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from bson import ObjectId
from pymongo.database import Database

from app.models.rubric import (
    AlternativeMethod, ErrorInstruction, ErrorType, EvaluationCriteria,
    EvaluationType, FollowThroughConfig, MarkingPolicy, NumericalTolerance,
    PartialMarkingConfig, Rubric, RubricStatus, RubricStep,
)

COLLECTION = "rubrics"


def _step_from_doc(s: dict) -> RubricStep:
    pm_doc = s.get("partial_marks_config", {})
    ft_doc = pm_doc.get("follow_through", {})
    nt_doc = pm_doc.get("numerical_tolerance", {})
    alt_methods = [AlternativeMethod(**a) for a in pm_doc.get("alternative_methods", [])]
    err_instrs = [
        ErrorInstruction(
            error_type=ErrorType(e["error_type"]),
            instruction=e["instruction"],
            marking_policy=MarkingPolicy(e.get("marking_policy", "partial_marks")),
            max_marks_deducted=e.get("max_marks_deducted", 0.0),
        )
        for e in pm_doc.get("error_instructions", [])
    ]
    return RubricStep(
        step_id=s.get("step_id", str(uuid.uuid4())),
        step_number=s["step_number"],
        title=s.get("title", ""),
        description=s.get("description", ""),
        maximum_marks=s["maximum_marks"],
        evaluation_criteria=EvaluationCriteria(s.get("evaluation_criteria", "mathematical_equivalence")),
        expected_expression=s.get("expected_expression", ""),
        expected_result=s.get("expected_result", ""),
        accepted_alternatives=s.get("accepted_alternatives", []),
        error_tolerance=s.get("error_tolerance", 0.0),
        required=s.get("required", True),
        dependency_step_ids=s.get("dependency_step_ids", []),
        marking_policy=MarkingPolicy(s.get("marking_policy", "full_marks")),
        partial_marks_config=PartialMarkingConfig(
            follow_through=FollowThroughConfig(**ft_doc) if ft_doc else FollowThroughConfig(),
            numerical_tolerance=NumericalTolerance(**nt_doc) if nt_doc else NumericalTolerance(),
            alternative_methods=alt_methods,
            error_instructions=err_instrs,
            requires_teacher_review=pm_doc.get("requires_teacher_review", False),
        ),
    )


def _pm_to_doc(pm: PartialMarkingConfig) -> dict:
    return {
        "follow_through": {
            "enabled": pm.follow_through.enabled,
            "applicable_steps": pm.follow_through.applicable_steps,
            "conditions": pm.follow_through.conditions,
            "max_eligible_marks": pm.follow_through.max_eligible_marks,
            "teacher_explanation": pm.follow_through.teacher_explanation,
        },
        "numerical_tolerance": {
            "absolute_tolerance": pm.numerical_tolerance.absolute_tolerance,
            "relative_tolerance": pm.numerical_tolerance.relative_tolerance,
            "decimal_precision": pm.numerical_tolerance.decimal_precision,
            "rounding_rule": pm.numerical_tolerance.rounding_rule,
        },
        "alternative_methods": [
            {"description": a.description, "expected_result": a.expected_result, "accepted_expressions": a.accepted_expressions}
            for a in pm.alternative_methods
        ],
        "error_instructions": [
            {
                "error_type": e.error_type.value if hasattr(e.error_type, 'value') else e.error_type,
                "instruction": e.instruction,
                "marking_policy": e.marking_policy.value if hasattr(e.marking_policy, 'value') else e.marking_policy,
                "max_marks_deducted": e.max_marks_deducted,
            }
            for e in pm.error_instructions
        ],
        "requires_teacher_review": pm.requires_teacher_review,
    }


def _step_to_doc(s: RubricStep) -> dict:
    return {
        "step_id": s.step_id,
        "step_number": s.step_number,
        "title": s.title,
        "description": s.description,
        "maximum_marks": s.maximum_marks,
        "evaluation_criteria": s.evaluation_criteria.value if hasattr(s.evaluation_criteria, 'value') else s.evaluation_criteria,
        "expected_expression": s.expected_expression,
        "expected_result": s.expected_result,
        "accepted_alternatives": s.accepted_alternatives,
        "error_tolerance": s.error_tolerance,
        "required": s.required,
        "dependency_step_ids": s.dependency_step_ids,
        "marking_policy": s.marking_policy.value if hasattr(s.marking_policy, 'value') else s.marking_policy,
        "partial_marks_config": _pm_to_doc(s.partial_marks_config),
    }


def _doc_to_rubric(doc: dict) -> Rubric:
    steps = [_step_from_doc(s) for s in doc.get("steps", [])]
    pm_doc = doc.get("partial_marking", {})
    pm = PartialMarkingConfig()
    if pm_doc:
        ft_doc = pm_doc.get("follow_through", {})
        nt_doc = pm_doc.get("numerical_tolerance", {})
        pm = PartialMarkingConfig(
            follow_through=FollowThroughConfig(**ft_doc) if ft_doc else FollowThroughConfig(),
            numerical_tolerance=NumericalTolerance(**nt_doc) if nt_doc else NumericalTolerance(),
            alternative_methods=[AlternativeMethod(**a) for a in pm_doc.get("alternative_methods", [])],
            error_instructions=[
                ErrorInstruction(
                    error_type=ErrorType(e["error_type"]),
                    instruction=e["instruction"],
                    marking_policy=MarkingPolicy(e.get("marking_policy", "partial_marks")),
                    max_marks_deducted=e.get("max_marks_deducted", 0.0),
                )
                for e in pm_doc.get("error_instructions", [])
            ],
            requires_teacher_review=pm_doc.get("requires_teacher_review", False),
        )
    total = sum(s.maximum_marks for s in steps)
    return Rubric(
        id=str(doc["_id"]),
        teacher_id=str(doc["teacher_id"]),
        examination_id=str(doc["examination_id"]),
        question_id=str(doc["question_id"]),
        title=doc["title"],
        total_marks=total,
        steps=steps,
        description=doc.get("description", ""),
        evaluation_type=EvaluationType(doc.get("evaluation_type", "step_wise")),
        instructions=doc.get("instructions", ""),
        status=RubricStatus(doc.get("status", "draft")),
        version=doc.get("version", 1),
        parent_rubric_id=doc.get("parent_rubric_id"),
        partial_marking=pm,
        created_at=doc.get("created_at", datetime.now(timezone.utc)),
        updated_at=doc.get("updated_at", datetime.now(timezone.utc)),
    )


class RubricRepository:
    def __init__(self, db: Database) -> None:
        self._col = db[COLLECTION]

    def find_by_id(self, rubric_id: str) -> Rubric | None:
        try:
            doc = self._col.find_one({"_id": ObjectId(rubric_id)})
        except Exception:
            return None
        return _doc_to_rubric(doc) if doc else None

    def find_by_id_and_teacher(self, rubric_id: str, teacher_id: str) -> Rubric | None:
        try:
            doc = self._col.find_one({"_id": ObjectId(rubric_id), "teacher_id": ObjectId(teacher_id)})
        except Exception:
            return None
        return _doc_to_rubric(doc) if doc else None

    def list_by_question(self, question_id: str) -> list[Rubric]:
        docs = list(self._col.find({"question_id": ObjectId(question_id)}).sort("version", -1))
        return [_doc_to_rubric(d) for d in docs]

    def count_active_for_examination(self, examination_id: str) -> int:
        return self._col.count_documents({"examination_id": ObjectId(examination_id), "status": "active"})

    def create(self, rubric: Rubric) -> Rubric:
        now = datetime.now(timezone.utc)
        doc = {
            "teacher_id": ObjectId(rubric.teacher_id),
            "examination_id": ObjectId(rubric.examination_id),
            "question_id": ObjectId(rubric.question_id),
            "title": rubric.title,
            "description": rubric.description,
            "evaluation_type": rubric.evaluation_type.value if hasattr(rubric.evaluation_type, 'value') else rubric.evaluation_type,
            "instructions": rubric.instructions,
            "steps": [_step_to_doc(s) for s in rubric.steps],
            "status": rubric.status.value if hasattr(rubric.status, 'value') else rubric.status,
            "version": rubric.version,
            "parent_rubric_id": rubric.parent_rubric_id,
            "partial_marking": _pm_to_doc(rubric.partial_marking),
            "created_at": now,
            "updated_at": now,
        }
        result = self._col.insert_one(doc)
        doc["_id"] = result.inserted_id
        return _doc_to_rubric(doc)

    def update(self, rubric_id: str, teacher_id: str, updates: dict) -> Rubric | None:
        updates["updated_at"] = datetime.now(timezone.utc)
        result = self._col.find_one_and_update(
            {"_id": ObjectId(rubric_id), "teacher_id": ObjectId(teacher_id)},
            {"$set": updates},
            return_document=True,
        )
        return _doc_to_rubric(result) if result else None

    def delete_by_question(self, question_id: str) -> int:
        result = self._col.delete_many({"question_id": ObjectId(question_id)})
        return result.deleted_count

    def delete_by_examination(self, examination_id: str) -> int:
        result = self._col.delete_many({"examination_id": ObjectId(examination_id)})
        return result.deleted_count

