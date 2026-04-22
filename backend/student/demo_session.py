import logging
import time

from flask import Blueprint, current_app, request

from utils.http import error_response, success_response

logger = logging.getLogger(__name__)

demo_session_bp = Blueprint("demo_session", __name__)


@demo_session_bp.route("/api/demo/recognize", methods=["POST"])
def demo_recognize():
    started_at = time.time()
    recognition_service = current_app.config.get("FACE_RECOGNITION_SERVICE")
    if not recognition_service or not recognition_service.ensure_ready():
        return error_response("Face recognition models not initialized", 503)

    payload = request.get_json(silent=True) or {}
    image_b64 = payload.get("image")
    if not image_b64:
        return error_response("Image is required")

    try:
        faces = recognition_service.recognize_faces(image_b64)
    except Exception as exc:
        logger.exception("Demo recognition failed")
        return error_response(str(exc), 500)

    return success_response(
        {
            "faces": faces,
            "processing_time": round(time.time() - started_at, 3),
            "message": "Recognition processed",
        }
    )


@demo_session_bp.route("/api/demo/models/status", methods=["GET"])
def model_status():
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
