from __future__ import annotations

import logging
from datetime import datetime

from bson import ObjectId

from models.attendance import build_session_document, build_student_entry

logger = logging.getLogger(__name__)


class AttendanceService:
    def __init__(self, attendance_collection, students_collection, recognition_service):
        self.attendance_collection = attendance_collection
        self.students_collection = students_collection
        self.recognition_service = recognition_service

    def build_class_filter(self, payload: dict):
        return {
            key: payload.get(key)
            for key in ("department", "year", "division")
            if payload.get(key)
        }

    def create_session(self, payload: dict):
        required_fields = ["date", "subject", "department", "year", "division"]
        missing = [field for field in required_fields if not payload.get(field)]
        if missing:
            raise ValueError(f"Missing required fields: {', '.join(missing)}")

        session_query = {
            "date": payload["date"],
            "subject": payload["subject"],
            **self.build_class_filter(payload),
            "finalized": False,
        }
        existing_session = self.attendance_collection.find_one(session_query)
        if existing_session:
            return str(existing_session["_id"]), existing_session.get("students", []), True

        roster = list(
            self.students_collection.find(
                self.build_class_filter(payload),
                {"studentId": 1, "studentName": 1},
            ).sort("studentName", 1)
        )
        students = [
            build_student_entry(student.get("studentId"), student.get("studentName"))
            for student in roster
            if student.get("studentId")
        ]

        session_doc = build_session_document(payload, students)
        session_id = self.attendance_collection.insert_one(session_doc).inserted_id
        return str(session_id), students, False

    def mark_attendance(self, session_id: str, image_b64: str):
        session = self.attendance_collection.find_one({"_id": ObjectId(session_id)})
        if not session:
            raise LookupError("Session not found")
        if session.get("finalized"):
            raise RuntimeError("Session already finalized")

        class_filter = self.build_class_filter(session)
        recognized_faces = self.recognition_service.recognize_faces(image_b64, class_filter)

        already_present = {
            student["student_id"]
            for student in session.get("students", [])
            if student.get("present") and student.get("student_id")
        }

        results = []
        new_marks = 0
        for face in recognized_faces:
            match = face.get("match")
            if not match:
                results.append(face)
                continue

            student_id = match["user_id"]
            student_name = match["name"]
            if student_id in already_present:
                face.update(
                    {
                        "status": "duplicate",
                        "already_marked": True,
                        "message": f"{student_name} is already marked for today",
                    }
                )
                results.append(face)
                continue

            update = self.attendance_collection.update_one(
                {"_id": ObjectId(session_id), "students.student_id": student_id},
                {"$set": {"students.$.present": True, "students.$.marked_at": datetime.utcnow()}},
            )

            if update.matched_count == 0:
                self.attendance_collection.update_one(
                    {"_id": ObjectId(session_id)},
                    {
                        "$push": {
                            "students": build_student_entry(
                                student_id,
                                student_name,
                                present=True,
                                marked_at=datetime.utcnow(),
                            )
                        }
                    },
                )

            already_present.add(student_id)
            new_marks += 1
            face.update(
                {
                    "status": "marked_present",
                    "already_marked": False,
                    "message": f"{student_name} marked present",
                }
            )
            results.append(face)

        return {
            "faces": results,
            "new_marks": new_marks,
            "present_count": len(already_present),
            "duplicates_prevented": sum(1 for face in results if face.get("status") == "duplicate"),
        }

    def end_session(self, session_id: str):
        session = self.attendance_collection.find_one({"_id": ObjectId(session_id)})
        if not session:
            raise LookupError("Session not found")

        class_filter = self.build_class_filter(session)
        roster = list(self.students_collection.find(class_filter, {"studentId": 1, "studentName": 1}))
        present_ids = {
            student["student_id"]
            for student in session.get("students", [])
            if student.get("present") and student.get("student_id")
        }

        for student in roster:
            student_id = student.get("studentId")
            if not student_id or student_id in present_ids:
                continue
            self.attendance_collection.update_one(
                {"_id": ObjectId(session_id), "students.student_id": {"$ne": student_id}},
                {
                    "$push": {
                        "students": build_student_entry(
                            student_id,
                            student.get("studentName"),
                            present=False,
                            marked_at=None,
                        )
                    }
                },
            )

        self.attendance_collection.update_one(
            {"_id": ObjectId(session_id)},
            {"$set": {"finalized": True, "ended_at": datetime.utcnow()}},
        )

        total_students = len(roster)
        present_count = len(present_ids)
        return {
            "present_count": present_count,
            "absent_count": max(total_students - present_count, 0),
            "total_students": total_students,
        }

    def get_attendance_records(self, filters: dict):
        query = {
            key: filters.get(key)
            for key in ("date", "department", "year", "division", "subject")
            if filters.get(key)
        }

        student_id_filter = filters.get("student_id")
        history_records = list(
            self.attendance_collection.find(query).sort([("date", -1), ("created_at", -1)])
        )

        attendance_rows = []
        for session in history_records:
            for student in session.get("students", []):
                student_id = student.get("student_id")
                if student_id_filter and student_id != student_id_filter:
                    continue

                marked_at = student.get("marked_at")
                attendance_rows.append(
                    {
                        "studentId": student_id,
                        "studentName": student.get("student_name"),
                        "date": session.get("date"),
                        "subject": session.get("subject"),
                        "department": session.get("department"),
                        "year": session.get("year"),
                        "division": session.get("division"),
                        "status": "present" if student.get("present") else "absent",
                        "markedAt": marked_at.isoformat() if hasattr(marked_at, "isoformat") else marked_at,
                    }
                )

        total_students = len(attendance_rows)
        present_count = sum(1 for row in attendance_rows if row["status"] == "present")
        absent_count = total_students - present_count
        attendance_rate = round((present_count / total_students * 100) if total_students else 0, 1)

        return {
            "attendance": attendance_rows,
            "history": [
                {
                    "sessionId": str(session["_id"]),
                    "date": session.get("date"),
                    "subject": session.get("subject"),
                    "department": session.get("department"),
                    "year": session.get("year"),
                    "division": session.get("division"),
                    "finalized": session.get("finalized", False),
                    "presentCount": sum(1 for student in session.get("students", []) if student.get("present")),
                    "studentCount": len(session.get("students", [])),
                }
                for session in history_records
            ],
            "stats": {
                "totalStudents": total_students,
                "presentToday": present_count,
                "absentToday": absent_count,
                "attendanceRate": attendance_rate,
            },
        }
