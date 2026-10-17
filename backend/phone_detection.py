
import cv2
from pathlib import Path
from ultralytics import YOLO


BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "yolov8n.pt"

CONFIDENCE_THRESHOLD = 0.35


def main():
    camera = None

    try:
        if not MODEL_PATH.exists():
            print(f"ERROR: YOLO model not found: {MODEL_PATH}")
            return

        print("Loading YOLO model...")
        model = YOLO(str(MODEL_PATH))
        print("YOLO model loaded.")

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

        print("Phone detection started. Press Q to quit.")

        while True:
            success, frame = camera.read()

            if not success or frame is None:
                print("ERROR: Could not read webcam frame.")
                break

            results = model.predict(
                source=frame,
                imgsz=640,
                conf=CONFIDENCE_THRESHOLD,
                verbose=False
            )

            result = results[0]
            display_frame = result.plot()
            phone_found = False

            for box in result.boxes:
                class_id = int(box.cls[0].item())
                class_name = model.names[class_id]

                if class_name.lower() == "cell phone":
                    phone_found = True
                    confidence = float(box.conf[0].item()) * 100

                    print(
                        f"Cell phone detected: {confidence:.1f}% confidence"
                    )

            if phone_found:
                message = "PHONE DETECTED - PLEASE KEEP PHONE AWAY"
                color = (0, 0, 255)
            else:
                message = "No phone detected"
                color = (0, 200, 0)

            cv2.putText(
                display_frame,
                message,
                (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.55,
                color,
                2
            )

            cv2.imshow("ElectroHire Phone Detection", display_frame)

            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

    except KeyboardInterrupt:
        print("\nPhone detection interrupted.")

    except Exception as error:
        print(f"Detection error: {type(error).__name__}: {error}")

    finally:
        if camera is not None:
            camera.release()

        cv2.destroyAllWindows()
        print("Phone detection test closed.")


if __name__ == "__main__":
    main()
