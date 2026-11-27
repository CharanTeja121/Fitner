# Optional pose sequence extraction utility.
# Usage: python pose_pipeline.py path/to/video.mp4 output.npy
import sys, cv2, numpy as np
try:
    import mediapipe as mp
except ImportError:
    raise SystemExit("Install optional vision packages: pip install -r requirements-vision.txt")
def extract(video_path, out_path, max_frames=60):
    cap = cv2.VideoCapture(video_path)
    pose = mp.solutions.pose.Pose(static_image_mode=False, model_complexity=1)
    rows = []
    while cap.isOpened() and len(rows) < max_frames:
        ok, frame = cap.read()
        if not ok: break
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        result = pose.process(rgb)
        if result.pose_landmarks:
            rows.append([[p.x,p.y,p.z,p.visibility] for p in result.pose_landmarks.landmark])
    cap.release(); pose.close()
    if len(rows) < 10: raise ValueError("Not enough frames with detected pose landmarks.")
    arr = np.asarray(rows, dtype=np.float32)
    # Pad or sample to fixed 60 frames.
    indices = np.linspace(0, len(arr)-1, 60).astype(int)
    np.save(out_path, arr[indices])
    print("Saved", out_path, "shape", arr[indices].shape)
if __name__ == "__main__":
    if len(sys.argv) != 3: raise SystemExit("Usage: python pose_pipeline.py input_video.mp4 output.npy")
    extract(sys.argv[1], sys.argv[2])
