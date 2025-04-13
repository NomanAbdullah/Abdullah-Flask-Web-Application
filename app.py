# app.py --------------------------------------------------------
from flask import Flask, render_template, request, jsonify
from werkzeug.utils import secure_filename
from predict import predict_digit
import os, tempfile
from PIL import Image

ALLOWED = {"png", "jpg", "jpeg", "bmp", "gif"}

app = Flask(__name__)
UPLOAD_DIR = tempfile.gettempdir()

def allowed(filename):                     # small helper
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED

@app.route("/", methods=["GET"])
def index():
    return render_template("index.html")

@app.route("/predict", methods=["POST"])
def predict():
    if "file" not in request.files or request.files["file"].filename == "":
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    if not allowed(file.filename):
        return jsonify({"error": "File extension not allowed"}), 400

    try:                                  # extra safety: verify the bytes
        Image.open(file.stream).verify()
        file.stream.seek(0)               # rewind so we can read it later
    except Exception:
        return jsonify({"error": "File is not a valid image"}), 400

    fname = secure_filename(file.filename)
    path  = os.path.join(UPLOAD_DIR, fname)
    file.save(path)

    with open(path, "rb") as f:
        digit, conf, probs = predict_digit(f.read())

    os.remove(path)  # housekeeping

    return jsonify({
        "digit": digit,
        "confidence": round(conf * 100, 2),  # percentage
        "probs": probs
    })


# ------------------------------------------------------------------
# Return a JSON manifest of all *.png files we actually have
# Example response:
# {"0": ["2.png", "5.png", "100.png"], "1": ["7.png", "42.png"], ...}
# ------------------------------------------------------------------
import glob
from pathlib import Path

@app.route("/samples", methods=["GET"])
def list_samples():
    base = Path(app.static_folder) / "samples"
    data = {}
    for digit in range(10):
        files = glob.glob(str(base / str(digit) / "*.png"))
        data[str(digit)] = [Path(f).name for f in files]
    return jsonify(data)

    
if __name__ == "__main__":
    app.run(debug=True)
