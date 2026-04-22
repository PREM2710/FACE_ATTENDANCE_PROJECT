from __future__ import annotations

from datetime import datetime


def build_student_entry(student_id: str, student_name: str, present: bool = False, marked_at=None):
    return {
        "student_id": student_id,
        "student_name": student_name,
        "present": present,
        "marked_at": marked_at,
    }


def build_session_document(payload: dict, students: list[dict]):
    return {
        "date": payload.get("date"),
        "subject": payload.get("subject"),
        "department": payload.get("department"),
        "year": payload.get("year"),
        "division": payload.get("division"),
        "created_at": datetime.utcnow(),
        "finalized": False,
        "ended_at": None,
        "students": students,
    }

