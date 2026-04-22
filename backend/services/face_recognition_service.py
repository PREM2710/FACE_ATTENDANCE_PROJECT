from __future__ import annotations

import base64
import io
import logging
import threading
import time

import numpy as np
from PIL import Image
from deepface import DeepFace
from scipy.spatial.distance import cosine

logger = logging.getLogger(__name__)


class EmbeddingCache:
    def __init__(self, ttl_seconds: int = 300):
        self.ttl_seconds = ttl_seconds
        self._cache = {}
        self._timestamps = {}
        self._lock = threading.Lock()

    def get(self, key):
        with self._lock:
            ts = self._timestamps.get(key)
            if ts and (time.time() - ts) < self.ttl_seconds:
                return self._cache.get(key)
            return None

    def set(self, key, value):
        with self._lock:
            self._cache[key] = value
            self._timestamps[key] = time.time()

    def invalidate(self):
        with self._lock:
            self._cache.clear()
            self._timestamps.clear()


class FaceRecognitionService:
    def __init__(self, model_manager, students_collection, threshold: float = 0.6):
        self.model_manager = model_manager
        self.students_collection = students_collection
        self.threshold = threshold
        self.cache = EmbeddingCache(ttl_seconds=300)

    def ensure_ready(self):
        return bool(self.model_manager and self.model_manager.is_ready())

    def read_image(self, image_b64: str, target_size=(960, 720)):
        if image_b64.startswith("data:"):
            image_b64 = image_b64.split(",", 1)[1]

        image_bytes = base64.b64decode(image_b64)
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        if image.width > target_size[0] or image.height > target_size[1]:
            image.thumbnail(target_size, Image.Resampling.LANCZOS)
        return np.array(image)

    def detect_faces(self, rgb_image):
        detector = self.model_manager.get_detector()
        if rgb_image.shape[0] < 60 or rgb_image.shape[1] < 60:
            return []

        faces = []
        for detection in detector.detect_faces(rgb_image):
            confidence = detection.get("confidence", 0)
            x, y, w, h = detection.get("box", [0, 0, 0, 0])
            x, y = max(0, x), max(0, y)
            if confidence < 0.9 or w < 48 or h < 48:
                continue

            cropped = rgb_image[y : y + h, x : x + w]
            if cropped.size == 0:
                continue

            faces.append(
                {
                    "box": (x, y, w, h),
                    "face": cropped,
                    "confidence": round(float(confidence), 4),
                }
            )

        return faces

    def extract_embedding(self, face_rgb):
        try:
            normalized_face = Image.fromarray(face_rgb.astype("uint8")).resize((160, 160))
            representation = DeepFace.represent(
                np.array(normalized_face),
                model_name="Facenet512",
                detector_backend="skip",
                enforce_detection=False,
            )
            return np.array(representation[0]["embedding"], dtype=np.float32)
        except Exception as exc:
            logger.error("Embedding extraction failed: %s", exc)
            return None

    def _cache_key(self, student_filter: dict):
        return str(sorted(student_filter.items()))

    def load_student_embeddings(self, student_filter: dict | None = None):
        student_filter = dict(student_filter or {})
        student_filter["embeddings"] = {"$exists": True, "$ne": None}
        cache_key = self._cache_key(student_filter)
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached

        students = list(
            self.students_collection.find(
                student_filter,
                {
                    "studentId": 1,
                    "studentName": 1,
                    "department": 1,
                    "year": 1,
                    "division": 1,
                    "embeddings": 1,
                    "embedding": 1,
                },
            )
        )

        normalized_students = []
        for student in students:
            raw_embeddings = student.get("embeddings") or student.get("embedding")
            if not raw_embeddings:
                continue

            if isinstance(raw_embeddings, list) and raw_embeddings and isinstance(raw_embeddings[0], list):
                embedding = np.mean(raw_embeddings, axis=0).astype(np.float32)
            else:
                embedding = np.array(raw_embeddings, dtype=np.float32)

            normalized_students.append(
                {
                    "studentId": student.get("studentId"),
                    "studentName": student.get("studentName"),
                    "department": student.get("department"),
                    "year": student.get("year"),
                    "division": student.get("division"),
                    "embedding": embedding,
                }
            )

        self.cache.set(cache_key, normalized_students)
        return normalized_students

    def match_face(self, embedding, student_filter: dict | None = None):
        best_match = None
        minimum_distance = float("inf")

        for student in self.load_student_embeddings(student_filter):
            distance = cosine(embedding, student["embedding"])
            if distance < minimum_distance:
                minimum_distance = distance
                best_match = student

        if best_match and minimum_distance < self.threshold:
            return best_match, float(minimum_distance)
        return None, float(minimum_distance)

    def recognize_faces(self, image_b64: str, student_filter: dict | None = None):
        rgb_image = self.read_image(image_b64)
        detections = self.detect_faces(rgb_image)
        results = []

        for face in detections:
            embedding = self.extract_embedding(face["face"])
            if embedding is None:
                results.append(
                    {
                        "box": face["box"],
                        "match": None,
                        "status": "embedding_failed",
                        "message": "Face detected but features could not be extracted",
                    }
                )
                continue

            match, distance = self.match_face(embedding, student_filter)
            confidence = None if distance == float("inf") else round((1 - distance) * 100, 1)
            if match:
                results.append(
                    {
                        "box": face["box"],
                        "match": {"user_id": match["studentId"], "name": match["studentName"]},
                        "distance": round(distance, 4),
                        "confidence": confidence,
                        "status": "recognized",
                        "message": f"{match['studentName']} recognized",
                    }
                )
            else:
                results.append(
                    {
                        "box": face["box"],
                        "match": None,
                        "distance": None if distance == float("inf") else round(distance, 4),
                        "confidence": confidence,
                        "status": "unknown",
                        "message": "Face not recognized",
                    }
                )

        return results

