import logging
import time

from flask import Blueprint, current_app, request

from utils.http import error_response, success_response

student_registration_bp = Blueprint("student_registration", __name__)
logger = logging.getLogger(__name__)

@student_registration_bp.route('/api/register-student', methods=['POST'])
def register_student():
    data = request.get_json(silent=True) or {}
    if not data:
        return error_response("Invalid JSON data")

    db = current_app.config.get("DB")
    students_col = db.students
    recognition_service = current_app.config.get("FACE_RECOGNITION_SERVICE")
    if not recognition_service or not recognition_service.ensure_ready():
        return error_response("Face recognition models not initialized", 503)

    required_fields = ['studentName', 'studentId', 'department', 'year', 'division', 'semester', 'email', 'phoneNumber', 'images']
    for field in required_fields:
        if not data.get(field):
            return error_response(f"{field} is required")

    if students_col.find_one({'studentId': data['studentId']}):
        return error_response("Student ID already exists")
    if students_col.find_one({'email': data['email']}):
        return error_response("Email already registered")

    images = data.get('images')
    if not isinstance(images, list) or len(images) != 5:
        return error_response("Exactly 5 images are required")

    embeddings = []
    for idx, img_b64 in enumerate(images):
        try:
            rgb = recognition_service.read_image(img_b64)
        except Exception:
            return error_response(f"Invalid image data at index {idx + 1}")

        faces = recognition_service.detect_faces(rgb)
        if len(faces) != 1:
            return error_response(f"Ensure exactly one face in each image (failed at image {idx + 1})")

        emb = recognition_service.extract_embedding(faces[0]['face'])
        if emb is None:
            return error_response(f"Failed to extract face features for image {idx + 1}", 500)
        embeddings.append(emb.tolist())

    student_data = {
        "studentId": data['studentId'],
        "studentName": data['studentName'],
        "department": data['department'],
        "year": data['year'],
        "division": data['division'],
        "semester": data['semester'],
        "email": data['email'],
        "phoneNumber": data['phoneNumber'],
        "status": "active",
        "embeddings": embeddings,
        "face_registered": True,
        "created_at": time.time(),
        "updated_at": time.time()
    }

    result = students_col.insert_one(student_data)
    recognition_service.cache.invalidate()
    return success_response({"studentId": data['studentId'], "record_id": str(result.inserted_id)})

@student_registration_bp.route('/api/students/count', methods=['GET'])
def get_student_count():
    db = current_app.config.get("DB")
    return success_response({"count": db.students.count_documents({})})

@student_registration_bp.route('/api/students/departments', methods=['GET'])
def get_departments():
    db = current_app.config.get("DB")
    departments = db.students.distinct("department")
    return success_response({"departments": departments, "count": len(departments)})
