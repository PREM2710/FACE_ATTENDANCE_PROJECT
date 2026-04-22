import logging
import time
from flask import Blueprint, current_app, request

from utils.http import error_response, success_response

logger = logging.getLogger(__name__)

attendance_session_bp = Blueprint(
    "attendance_session",
    __name__,
    url_prefix="/api/attendance"
)

@attendance_session_bp.route("/create_session", methods=["POST"])
def create_session():
    attendance_service = current_app.config.get("ATTENDANCE_SERVICE")
    data = request.get_json(silent=True) or {}
    try:
        session_id, students, reused = attendance_service.create_session(data)
        return success_response(
            {
                "session_id": session_id,
                "students_count": len(students),
                "reused_existing": reused,
                "message": "Existing session reused for this class and date" if reused else "Session created successfully",
            }
        )
    except ValueError as exc:
        return error_response(str(exc))
    except Exception as exc:
        logger.exception("Failed to create attendance session")
        return error_response(str(exc), 500)

@attendance_session_bp.route("/end_session", methods=["POST"])
def end_session():
    attendance_service = current_app.config.get("ATTENDANCE_SERVICE")
    data = request.get_json(silent=True) or {}
    session_id = data.get("session_id")
    if not session_id:
        return error_response("Missing session_id")

    try:
        statistics = attendance_service.end_session(session_id)
        return success_response({"statistics": statistics, "message": "Session finalized successfully"})
    except LookupError as exc:
        return error_response(str(exc), 404)
    except Exception as exc:
        logger.exception("Failed to end session")
        return error_response(str(exc), 500)

@attendance_session_bp.route("/real-mark", methods=["POST"])
def mark_attendance():
    start_time = time.time()
    recognition_service = current_app.config.get("FACE_RECOGNITION_SERVICE")
    attendance_service = current_app.config.get("ATTENDANCE_SERVICE")
    if not recognition_service or not recognition_service.ensure_ready():
        return error_response("Face recognition models not initialized", 503)

    data = request.get_json(silent=True) or {}
    session_id = data.get("session_id")
    image_b64 = data.get("image")

    if not session_id or not image_b64:
        return error_response("Missing session_id or image")

    try:
        result = attendance_service.mark_attendance(session_id, image_b64)
        return success_response(
            {
                "message": "Recognition processed",
                "faces": result["faces"],
                "processing_time": round(time.time() - start_time, 3),
                "session_info": {
                    "session_id": session_id,
                    "total_present_now": result["present_count"],
                    "duplicates_prevented": result["duplicates_prevented"],
                    "new_marks": result["new_marks"],
                },
            }
        )
    except LookupError as exc:
        return error_response(str(exc), 404)
    except RuntimeError as exc:
        return error_response(str(exc))
    except Exception as exc:
        logger.exception("Attendance marking failed")
        return error_response(str(exc), 500)

@attendance_session_bp.route("/models/status", methods=["GET"])
def attendance_model_status():
    model_manager = current_app.config.get("MODEL_MANAGER")
    if not model_manager:
        return error_response("Model manager not available", 500)

    return success_response(
        {
            "models_ready": model_manager.is_ready(),
            "health_check": model_manager.health_check(),
            "timestamp": time.time(),
        }
    )
