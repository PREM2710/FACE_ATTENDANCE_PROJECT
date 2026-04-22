# app.py - OPTIMIZED VERSION
import logging
import os
import sys
import threading
import time

import numpy as np
from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from pymongo import MongoClient
from pymongo.errors import PyMongoError, ServerSelectionTimeoutError

# Keep DeepFace artifacts inside the project so Windows permissions do not
# block startup when the library initializes its home directory.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEEPFACE_HOME = os.path.join(BASE_DIR, ".deepface")
os.environ.setdefault("DEEPFACE_HOME", DEEPFACE_HOME)
os.makedirs(DEEPFACE_HOME, exist_ok=True)
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# Blueprint imports
from auth.routes import auth_bp, bcrypt as auth_bcrypt
from services.attendance_service import AttendanceService
from services.face_recognition_service import FaceRecognitionService

# Optional student/teacher blueprints
try:
    from student.registration import student_registration_bp
except ImportError:
    student_registration_bp = None

try:
    from student.updatedetails import student_update_bp
except ImportError:
    student_update_bp = None

try:
    from student.demo_session import demo_session_bp
except ImportError:
    demo_session_bp = None

try:
    from student.view_attendance import attendance_bp
except ImportError:
    attendance_bp = None

try:
    from teacher.attendance_records import attendance_session_bp
except ImportError:
    attendance_session_bp = None

# Logging setup
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

load_dotenv()

DEFAULT_MONGODB_URI = (
    "mongodb://127.0.0.1:27017/facerecognition"
)

# MongoDB setup
MONGODB_URI = os.getenv("MONGODB_URI", DEFAULT_MONGODB_URI)
DB_NAME = os.getenv("DATABASE_NAME", "facerecognition")
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "students")
THRESHOLD = float(os.getenv("THRESHOLD", "0.6"))

client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
db = client[DB_NAME]
students_collection = db[COLLECTION_NAME]
attendance_db = client["facerecognition_db"]
attendance_collection = attendance_db["attendance_records"]


def is_mongodb_available():
    """Check whether MongoDB is reachable before handling database-backed APIs."""
    try:
        client.admin.command("ping")
        return True
    except ServerSelectionTimeoutError:
        return False
    except PyMongoError:
        return False

# OPTIMIZED MODEL MANAGER CLASS
class ModelManager:
    """
    Singleton class to manage face recognition models
    Ensures models are loaded only once and shared across all requests
    """
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialize_models()
        return cls._instance

    def _initialize_models(self):
        """Initialize all face recognition models with proper error handling"""
        logger.info("🤖 Starting model initialization...")
        start_time = time.time()

        self.models_ready = False
        self.detector = None
        self.deepface_ready = False

        try:
            # 1. Initialize MTCNN detector with optimized parameters
            from mtcnn import MTCNN
            logger.info("Loading MTCNN detector...")
            self.detector = MTCNN()
            logger.info("✅ MTCNN detector loaded successfully")

            # 2. Preload DeepFace model properly
            from deepface import DeepFace
            logger.info("Warming up DeepFace Facenet512 model...")

            # Force model download and initialization with dummy prediction
            dummy_img = np.zeros((160, 160, 3), dtype=np.uint8)

            # This forces the model to be downloaded and cached
            _ = DeepFace.represent(
                dummy_img, 
                model_name='Facenet512', 
                detector_backend='skip',
                enforce_detection=False
            )

            # Additional warm-up with different image size
            dummy_img_2 = np.ones((224, 224, 3), dtype=np.uint8) * 128
            _ = DeepFace.represent(
                dummy_img_2, 
                model_name='Facenet512', 
                detector_backend='skip',
                enforce_detection=False
            )

            self.deepface_ready = True
            logger.info("✅ DeepFace Facenet512 model warmed up successfully")

            self.models_ready = True

            initialization_time = time.time() - start_time
            logger.info(f"🎉 All models initialized successfully in {initialization_time:.2f} seconds")

        except Exception as e:
            logger.error(f"❌ Model initialization failed: {e}")
            self.models_ready = False
            raise e

    def get_detector(self):
        """Get the MTCNN detector instance"""
        if not self.models_ready:
            raise RuntimeError("Models not properly initialized")
        return self.detector

    def is_ready(self):
        """Check if all models are ready"""
        return self.models_ready and self.deepface_ready

    def health_check(self):
        """Perform model health check"""
        try:
            if not self.models_ready:
                return False

            # Test MTCNN
            test_img = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
            _ = self.detector.detect_faces(test_img)

            # Test DeepFace
            from deepface import DeepFace
            test_face = np.random.randint(0, 255, (160, 160, 3), dtype=np.uint8)
            _ = DeepFace.represent(
                test_face, 
                model_name='Facenet512', 
                detector_backend='skip',
                enforce_detection=False
            )

            return True

        except Exception as e:
            logger.error(f"Model health check failed: {e}")
            return False

# Initialize the model manager (singleton)
logger.info("Initializing Model Manager...")
model_manager = ModelManager()

# Flask app
app = Flask(__name__)
CORS(app)

# Configure Flask app with database and model instances
app.config["DB"] = db
app.config["COLLECTION_NAME"] = COLLECTION_NAME
app.config["THRESHOLD"] = THRESHOLD
app.config["ATTENDANCE_COLLECTION"] = attendance_collection

# CRITICAL: Pass model manager to Flask config so blueprints can access it
app.config["MODEL_MANAGER"] = model_manager
app.config["MTCNN_DETECTOR"] = model_manager.get_detector()
app.config["FACE_RECOGNITION_SERVICE"] = FaceRecognitionService(
    model_manager=model_manager,
    students_collection=students_collection,
    threshold=THRESHOLD,
)
app.config["ATTENDANCE_SERVICE"] = AttendanceService(
    attendance_collection=attendance_collection,
    students_collection=students_collection,
    recognition_service=app.config["FACE_RECOGNITION_SERVICE"],
)

auth_bcrypt.init_app(app)

# Health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint to verify model status"""
    model_status = model_manager.is_ready()
    model_health = model_manager.health_check()
    mongodb_status = is_mongodb_available()

    return {
        "status": "healthy" if model_status and model_health and mongodb_status else "unhealthy",
        "models_ready": model_status,
        "models_healthy": model_health,
        "mongodb_available": mongodb_status,
        "mongodb_uri": MONGODB_URI,
        "timestamp": time.time()
    }


@app.errorhandler(ServerSelectionTimeoutError)
def handle_mongodb_timeout(_error):
    logger.error("MongoDB is not available for the incoming request")
    return jsonify({
        "success": False,
        "error": "MongoDB is not available. Please make sure your local MongoDB server is running."
    }), 503


@app.errorhandler(PyMongoError)
def handle_mongodb_error(error):
    logger.error("MongoDB request failed: %s", error)
    return jsonify({
        "success": False,
        "error": "Database request failed. Please check your local MongoDB connection and try again."
    }), 500

# Register blueprints
app.register_blueprint(auth_bp)

if student_registration_bp:
    app.register_blueprint(student_registration_bp)
    logger.info("✅ Student registration blueprint registered")

if student_update_bp:
    app.register_blueprint(student_update_bp)
    logger.info("✅ Student update blueprint registered")

if demo_session_bp:
    app.register_blueprint(demo_session_bp)
    logger.info("✅ Demo session blueprint registered")

if attendance_bp:
    app.register_blueprint(attendance_bp)
    logger.info("✅ Attendance blueprint registered")

if attendance_session_bp:
    app.register_blueprint(attendance_session_bp)
    logger.info("✅ Attendance session blueprint registered")

# List all registered routes
logger.info("\nRegistered Flask Routes:")
for rule in app.url_map.iter_rules():
    logger.info(f"  {rule}")

if __name__ == "__main__":
    logger.info("🚀 Starting Flask server...")

    # Final model verification before starting
    if model_manager.is_ready():
        logger.info("🎯 All systems ready! Server starting on http://0.0.0.0:5000")
        app.run(host="0.0.0.0", port=5000, debug=False)  # Set debug=False for production
    else:
        logger.error("❌ Cannot start server - models not ready")
        exit(1)
