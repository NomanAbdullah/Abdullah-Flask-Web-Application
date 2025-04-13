# predict.py ----------------------------------------------------
import io
import numpy as np
import onnxruntime as ort
from PIL import Image

# load once at import time
SESSION = ort.InferenceSession("mnist_cnn.onnx", providers=["CPUExecutionProvider"])

def preprocess(img_pil: Image.Image) -> np.ndarray:
    """Resize->grayscale->[0,1] & add batch/chan dims -> (1,1,28,28) float32"""
    img = img_pil.convert("L").resize((28, 28))
    arr = np.asarray(img, dtype=np.float32) / 255.0      # (28,28)
    arr = arr[np.newaxis, np.newaxis, :, :]              # (1,1,28,28)
    return arr

def predict_digit(file_bytes: bytes):
    """Return (predicted_digit, confidence, full_probabilities)"""
    img = Image.open(io.BytesIO(file_bytes))
    inp = preprocess(img)
    logits = SESSION.run(None, {"input": inp})[0]        # (1,10)
    probs  = np.exp(logits) / np.exp(logits).sum()       # softmax
    digit  = int(probs.argmax())
    conf   = float(probs.max())
    return digit, conf, probs.flatten().tolist()
