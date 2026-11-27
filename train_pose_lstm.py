# Train only after collecting labeled pose sequences.
# Expected: pose_data/<class_name>/*.npy, each shaped (60, 33, 4).
from pathlib import Path
import numpy as np
try:
    from tensorflow.keras import Sequential
    from tensorflow.keras.layers import Input, LSTM, Dense, Dropout
    from tensorflow.keras.utils import to_categorical
    from sklearn.model_selection import train_test_split
except ImportError:
    raise SystemExit("Install optional packages: pip install -r requirements-vision.txt")
root = Path(__file__).parent / "pose_data"
classes = sorted(p.name for p in root.iterdir() if p.is_dir()) if root.exists() else []
X, y = [], []
for label, name in enumerate(classes):
    for f in (root/name).glob("*.npy"):
        arr = np.load(f)
        if arr.shape == (60,33,4):
            X.append(arr.reshape(60,132)); y.append(label)
if len(X) < 30 or len(set(y)) < 2:
    raise SystemExit("Need at least 30 valid labeled sequences across at least 2 exercise classes. No fake pretrained model is supplied.")
X=np.asarray(X,dtype=np.float32); y=to_categorical(np.asarray(y), num_classes=len(classes))
X_train,X_val,y_train,y_val=train_test_split(X,y,test_size=0.2,random_state=42,stratify=np.argmax(y,axis=1))
model=Sequential([Input(shape=(60,132)),LSTM(64,return_sequences=True),Dropout(0.25),LSTM(32),Dense(32,activation="relu"),Dense(len(classes),activation="softmax")])
model.compile(optimizer="adam",loss="categorical_crossentropy",metrics=["accuracy"])
model.fit(X_train,y_train,validation_data=(X_val,y_val),epochs=30,batch_size=8)
model.save(Path(__file__).parent/"exercise_lstm.keras")
print("Classes:",classes,"Validation:",model.evaluate(X_val,y_val,verbose=0))
