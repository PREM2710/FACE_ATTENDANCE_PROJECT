from flask import Blueprint, current_app, request

from utils.http import error_response, success_response

attendance_bp = Blueprint("attendance", __name__)

@attendance_bp.route('/api/attendance', methods=['GET'])
def get_attendance():
    attendance_service = current_app.config.get("ATTENDANCE_SERVICE")
    try:
        filters = {key: request.args.get(key) for key in ("date", "department", "year", "division", "subject", "student_id")}
        data = attendance_service.get_attendance_records(filters)
        return success_response(data)
    except Exception as exc:
        return error_response(str(exc), 500)


@attendance_bp.route('/api/attendance/export', methods=['GET'])
def export_attendance():
    attendance_service = current_app.config.get("ATTENDANCE_SERVICE")
    try:
        filters = {key: request.args.get(key) for key in ("date", "department", "year", "division", "subject")}
        data = attendance_service.get_attendance_records(filters)
        export_rows = [
            {
                "studentId": row["studentId"],
                "name": row["studentName"],
                "subject": row["subject"],
                "date": row["date"],
                "status": row["status"],
                "markedAt": row["markedAt"] or "",
            }
            for row in data["attendance"]
        ]
        return success_response({"data": export_rows})
    except Exception as exc:
        return error_response(str(exc), 500)


@attendance_bp.route('/api/attendance/history', methods=['GET'])
def attendance_history():
    attendance_service = current_app.config.get("ATTENDANCE_SERVICE")
    try:
        filters = {key: request.args.get(key) for key in ("date", "department", "year", "division", "subject", "student_id")}
        data = attendance_service.get_attendance_records(filters)
        return success_response({"history": data["history"]})
    except Exception as exc:
        return error_response(str(exc), 500)
