
import cv2


def main():
    camera = None

    try:
        # DirectShow is generally suitable for Windows webcams.
        camera = cv2.VideoCapture(0, cv2.CAP_DSHOW)

        # Fallback to the default backend if necessary.
        if not camera.isOpened():
            camera.release()
            camera = cv2.VideoCapture(0)

        if not camera.isOpened():
            print("ERROR: Could not open the webcam.")
            return

        camera.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        camera.set(cv2.CAP_PROP_BUFFERSIZE, 1)

        print("Camera opened successfully.")
        print("Press Q in the camera window to quit.")

        while True:
            success, frame = camera.read()

            if not success or frame is None:
                print("ERROR: Could not read a camera frame.")
                break

            cv2.putText(
                frame,
                "ElectroHire Camera Test - Press Q to quit",
                (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (0, 255, 0),
                2
            )

            cv2.imshow("ElectroHire Camera Test", frame)

            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

    except KeyboardInterrupt:
        print("\nCamera test interrupted.")

    except Exception as error:
        print(f"Camera error: {type(error).__name__}: {error}")

    finally:
        if camera is not None:
            camera.release()

        cv2.destroyAllWindows()
        print("Camera test closed.")


if __name__ == "__main__":
    main()
