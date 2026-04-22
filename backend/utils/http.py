from flask import jsonify


def success_response(payload=None, status=200):
    body = {"success": True}
    if payload:
        body.update(payload)
    return jsonify(body), status


def error_response(message, status=400, **extra):
    body = {"success": False, "error": message}
    if extra:
        body.update(extra)
    return jsonify(body), status

