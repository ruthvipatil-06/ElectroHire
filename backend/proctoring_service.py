
import math
import threading
import time
from pathlib import Path

import cv2
import mediapipe as mp
import numpy as np
from ultralytics import YOLO


BASE_DIR = Path(__file__).resolve().parent
YOLO_MODEL_PATH = BASE_DIR / "yolov8n.pt"
FACE_MODEL_PATH = BASE_DIR / "face_landmarker.task"

PHONE_CONFIDENCE = 0.40
GAZE_LEFT_THRESHOLD = 0.25
GAZE_RIGHT_THRESHOLD = 0.75

# Load the models once when the service is initialized.
_yolo_model = None
_face_landmarker = None
_model_lock = threading.Lock()
_analysis_lock = threading.Lock()
_last_timestamp_ms = 0


def initialize_models():
    """Initialize detection models once, not on every camera frame."""
    global _yolo_model, _face_landmarker

    with _model_lock:
        if _yolo_model is None:
            if not YOLO_MODEL_PATH.is_file():
                raise FileNotFoundError(
                    f"YOLO model not found: {YOLO_MODEL_PATH}"
                )
            _yolo_model = YOLO(str(YOLO_MODEL_PATH))

        if _face_landmarker is None:
            if not FACE_MODEL_PATH.is_file():
                raise FileNotFoundError(
                    f"MediaPipe model not found: {FACE_MODEL_PATH}"
                )

            options = mp.tasks.vision.FaceLandmarkerOptions(
                base_options=mp.tasks.BaseOptions(
                    model_asset_path=str(FACE_MODEL_PATH)
                ),
                running_mode=mp.tasks.vision.RunningMode.VIDEO,
                num_faces=2,
            )

            _face_landmarker = (
                mp.tasks.vision.FaceLandmarker.create_from_options(options)
            )


def eye_ratio(landmarks, outer_index, inner_index, iris_index):
    outer = landmarks[outer_index]
    inner = landmarks[inner_index]
    iris = landmarks[iris_index]

    eye_width = math.hypot(
        outer.x - inner.x,
        outer.y - inner.y,
    )

    if eye_width < 1e-6:
        return None

    iris_offset = math.hypot(
        outer.x - iris.x,
        outer.y - iris.y,
    )

    return iris_offset / eye_width


def analyze_frame(frame_bytes: bytes):
    """
    Accept JPEG/PNG bytes from the browser.
    Return phone, face and approximate gaze analysis.
    """
    global _last_timestamp_ms

    initialize_models()

    image_array = np.frombuffer(frame_bytes, dtype=np.uint8)
    frame = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

    if frame is None:
        raise ValueError("Invalid image frame received")

    # Limit image size to reduce CPU processing time.
    height, width = frame.shape[:2]
    max_dimension = 960

    if max(height, width) > max_dimension:
        scale = max_dimension / max(height, width)
        frame = cv2.resize(
            frame,
            (int(width * scale), int(height * scale)),
            interpolation=cv2.INTER_AREA,
        )

    with _analysis_lock:
        # YOLO phone detection.
        predictions = _yolo_model.predict(
            source=frame,
            imgsz=640,
            conf=PHONE_CONFIDENCE,
            verbose=False,
        )

        phone_detections = []

        for result in predictions:
            if result.boxes is None:
                continue

            for box in result.boxes:
                class_id = int(box.cls[0].item())
                confidence = float(box.conf[0].item())
                class_name = str(
                    _yolo_model.names[class_id]
                ).lower()

                if class_name in {"cell phone", "mobile phone", "phone"}:
                    phone_detections.append({
                        "label": class_name,
                        "confidence": round(confidence, 3),
                    })

        # MediaPipe face and iris analysis.
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(
            image_format=mp.ImageFormat.SRGB,
            data=np.ascontiguousarray(rgb_frame),
        )

        timestamp_ms = max(
            int(time.monotonic() * 1000),
            _last_timestamp_ms + 1,
        )
        _last_timestamp_ms = timestamp_ms

        face_result = _face_landmarker.detect_for_video(
            mp_image,
            timestamp_ms,
        )

    faces = face_result.face_landmarks
    face_count = len(faces)

    gaze_status = "unknown"

    if face_count == 0:
        face_status = "no_face_detected"
    elif face_count > 1:
        face_status = "multiple_faces_detected"
    else:
        face_status = "one_face_detected"
        landmarks = faces[0]

        # Iris landmark indices are available in compatible
        # Face Mesh models that output 478 or more landmarks.
        if len(landmarks) >= 478:
            left_ratio = eye_ratio(landmarks, 33, 133, 468)
            right_ratio = eye_ratio(landmarks, 263, 362, 473)

            if left_ratio is not None and right_ratio is not None:
                average_ratio = (left_ratio + right_ratio) / 2

                if average_ratio < GAZE_LEFT_THRESHOLD:
                    gaze_status = "possible_looking_left"
                elif average_ratio > GAZE_RIGHT_THRESHOLD:
                    gaze_status = "possible_looking_right"
                else:
                    gaze_status = "approximately_forward"

    return {
        "face_count": face_count,
        "face_status": face_status,
        "gaze_status": gaze_status,
        "phone_detected": len(phone_detections) > 0,
        "phone_detections": phone_detections,
        "message": (
            "Phone detected"
            if phone_detections
            else "No phone detected in this frame"
        ),
    }


def close_models():
    """Call when shutting down the application."""
    global _face_landmarker, _yolo_model

    with _model_lock:
        if _face_landmarker is not None:
            _face_landmarker.close()
            _face_landmarker = None

        _yolo_model = None
