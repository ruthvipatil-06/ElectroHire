
import cv2
import mediapipe as mp
import time
import math
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "face_landmarker.task"

WARNING_SECONDS = 2.0

# Initial thresholds. These need testing and calibration.
GAZE_LEFT_THRESHOLD = 0.25
GAZE_RIGHT_THRESHOLD = 0.75


def distance(point_a, point_b):
    return math.hypot(
        point_a.x - point_b.x,
        point_a.y - point_b.y
    )


def get_eye_ratio(landmarks, outer_index, inner_index, iris_index):
    outer = landmarks[outer_index]
    inner = landmarks[inner_index]
    iris = landmarks[iris_index]

    width = distance(outer, inner)

    if width < 1e-6:
        return None

    # Horizontal iris position relative to the eye corners.
    # This is a rough gaze signal, not an exact gaze angle.
    return (
        distance(outer, iris) / width
    )


def main():
    camera = None
    landmarker = None
    away_start = None
    last_timestamp_ms = -1
    start_time = time.monotonic()

    try:
        if not MODEL_PATH.exists() or MODEL_PATH.stat().st_size == 0:
            print(f"ERROR: Model missing or empty: {MODEL_PATH}")
            print("Place face_landmarker.task beside this script.")
            return

        BaseOptions = mp.tasks.BaseOptions
        FaceLandmarker = mp.tasks.vision.FaceLandmarker
        FaceLandmarkerOptions = mp.tasks.vision.FaceLandmarkerOptions
        RunningMode = mp.tasks.vision.RunningMode

        options = FaceLandmarkerOptions(
            base_options=BaseOptions(
                model_asset_path=str(MODEL_PATH)
            ),
            running_mode=RunningMode.VIDEO,
            num_faces=2
        )

        landmarker = FaceLandmarker.create_from_options(options)
        print("MediaPipe Face Landmarker loaded.")

        camera = cv2.VideoCapture(0, cv2.CAP_DSHOW)

        if not camera.isOpened():
            camera.release()
            camera = cv2.VideoCapture(0)

        if not camera.isOpened():
            print("ERROR: Could not open webcam.")
            return

        camera.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        camera.set(cv2.CAP_PROP_BUFFERSIZE, 1)

        print("Eye and face monitoring started. Press Q to quit.")

        while True:
            success, frame = camera.read()

            if not success or frame is None:
                print("ERROR: Could not read webcam frame.")
                break

            frame = cv2.flip(frame, 1)
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

            mp_image = mp.Image(
                image_format=mp.ImageFormat.SRGB,
                data=rgb_frame
            )

            timestamp_ms = int(
                (time.monotonic() - start_time) * 1000
            )
            timestamp_ms = max(
                timestamp_ms,
                last_timestamp_ms + 1
            )
            last_timestamp_ms = timestamp_ms

            result = landmarker.detect_for_video(
                mp_image,
                timestamp_ms
            )

            face_count = len(result.face_landmarks)
            status = ""
            color = (0, 200, 0)

            if face_count == 0:
                away_start = None
                status = "WARNING: Face not detected"
                color = (0, 165, 255)

            elif face_count > 1:
                away_start = None
                status = "WARNING: Multiple faces detected"
                color = (0, 0, 255)

            else:
                landmarks = result.face_landmarks[0]

                # Iris landmarks are expected in a 478-point
                # face mesh model. Verify the supplied model.
                if len(landmarks) >= 478:
                    left_ratio = get_eye_ratio(
                        landmarks, 33, 133, 468
                    )
                    right_ratio = get_eye_ratio(
                        landmarks, 263, 362, 473
                    )

                    if (
                        left_ratio is None
                        or right_ratio is None
                    ):
                        away_start = None
                        status = "Unable to estimate gaze"
                        color = (0, 165, 255)
                    else:
                        gaze_ratio = (
                            left_ratio + right_ratio
                        ) / 2.0

                        looking_away = (
                            gaze_ratio < GAZE_LEFT_THRESHOLD
                            or gaze_ratio > GAZE_RIGHT_THRESHOLD
                        )

                        if looking_away:
                            if away_start is None:
                                away_start = time.monotonic()

                            elapsed = (
                                time.monotonic() - away_start
                            )

                            if elapsed >= WARNING_SECONDS:
                                status = (
                                    "Possible sustained gaze deviation"
                                )
                                color = (0, 0, 255)
                            else:
                                status = "Gaze movement detected"
                                color = (0, 165, 255)
                        else:
                            away_start = None
                            status = "One face detected"
                            color = (0, 200, 0)

                else:
                    away_start = None
                    status = (
                        f"One face detected; "
                        f"{len(landmarks)} landmarks, "
                        "iris tracking unavailable"
                    )
                    color = (0, 165, 255)

            cv2.putText(
                frame,
                status,
                (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.55,
                color,
                2
            )

            cv2.imshow("ElectroHire Face and Eye Monitoring", frame)

            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

    except KeyboardInterrupt:
        print("\nEye monitoring interrupted.")

    except Exception as error:
        print(f"Monitoring error: {type(error).__name__}: {error}")

    finally:
        if camera is not None:
            camera.release()

        if landmarker is not None:
            landmarker.close()

        cv2.destroyAllWindows()
        print("Eye monitoring closed.")


if __name__ == "__main__":
    main()
