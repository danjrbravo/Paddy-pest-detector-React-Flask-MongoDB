from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_pymongo import PyMongo
import os
import uuid
import base64
from ultralytics import YOLO
import numpy as np
import cv2
from collections import Counter
from datetime import datetime
from bson import ObjectId

app = Flask(__name__)
CORS(app)

# ============================
# CONFIG MONGODB
# ============================
app.config["MONGO_URI"] = os.environ.get(
    "MONGO_URI", "mongodb://localhost:27017/pest_detector"
)
mongo = PyMongo(app)

# ============================
# MODELO YOLO (lazy load)
# ============================
MODEL_PATH = os.environ.get("MODEL_PATH", "best.pt")
_model = None

def get_model():
    global _model
    if _model is None:
        _model = YOLO(MODEL_PATH)
    return _model

# ============================
# COLORES BGR (generación dinámica por clase)
# ============================
PREDEFINED_COLORS = {
    "Brown Planthopper": (19, 69, 139),   # #8B4513 → BGR
    "Water weevil":      (246, 130, 59),  # #3b82f6 → BGR
    "Army worm":         (68, 68, 239),   # #ef4444 → BGR
    "Leaf hopper":       (94, 197, 34),   # #22c55e → BGR
}

def get_color(class_name, cls_index):
    if class_name in PREDEFINED_COLORS:
        return PREDEFINED_COLORS[class_name]
    hue = (cls_index * 47) % 180
    hsv = np.array([[[hue, 220, 220]]], dtype=np.uint8)
    bgr = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)[0][0]
    return (int(bgr[0]), int(bgr[1]), int(bgr[2]))

# ============================
# CARPETAS ESTÁTICAS
# ============================
UPLOAD_FOLDER = "static/uploads"
RESULT_FOLDER = "static/results"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESULT_FOLDER, exist_ok=True)

# ============================
# HELPER: dibujar bounding boxes
# ============================
def draw_boxes(img_path, yolo_results):
    img = cv2.imread(img_path)
    if img is None:
        raise ValueError("No se pudo leer la imagen")

    h_img, w_img, _ = img.shape
    scale  = w_img / 1000
    fscale = max(0.5, 1.2 * scale)
    thick  = max(1, int(4 * scale))
    bthick = max(2, int(6 * scale))
    pad    = int(20 * scale)
    off    = int(10 * scale)

    output = img.copy()
    r      = yolo_results[0]
    counts = Counter()
    detections = []

    if r.boxes and len(r.boxes) > 0:
        for box in r.boxes:
            cls        = int(box.cls[0])
            conf       = float(box.conf[0])
            class_name = r.names[cls]
            color      = get_color(class_name, cls)
            counts[class_name] += 1

            x1, y1, x2, y2 = map(int, box.xyxy[0])
            cv2.rectangle(output, (x1, y1), (x2, y2), color, bthick)

            label = f"{class_name} {conf:.2f}"
            (tw, th), _ = cv2.getTextSize(
                label, cv2.FONT_HERSHEY_SIMPLEX, fscale, thick
            )
            cv2.rectangle(
                output,
                (x1, y1 - th - pad), (x1 + tw + pad, y1),
                color, -1
            )
            cv2.putText(
                output, label,
                (x1 + off, y1 - off),
                cv2.FONT_HERSHEY_SIMPLEX,
                fscale, (255, 255, 255), thick
            )

            detections.append({
                "class":      class_name,
                "confidence": round(conf * 100, 2),
                "bbox":       [int(x1), int(y1), int(x2), int(y2)]
            })

    return output, dict(counts), detections


def serialize(doc):
    doc["_id"] = str(doc["_id"])
    return doc

# ============================
# RUTAS ESTÁTICAS
# ============================
@app.route("/static/<path:filename>")
def static_files(filename):
    return send_from_directory("static", filename)

# ============================
# POST /api/analyze
# ============================
@app.route("/api/analyze", methods=["POST"])
def analyze():
    filename     = f"{uuid.uuid4()}.jpg"
    upload_path  = os.path.join(UPLOAD_FOLDER, filename)
    result_path  = os.path.join(RESULT_FOLDER, filename)
    analysis_name = ""

    if "image" in request.files:
        request.files["image"].save(upload_path)
        analysis_name = request.form.get("name", "")
    elif request.is_json and "image_b64" in request.json:
        _, encoded = request.json["image_b64"].split(",", 1)
        with open(upload_path, "wb") as f:
            f.write(base64.b64decode(encoded))
        analysis_name = request.json.get("name", "")
    else:
        return jsonify({"error": "No se envió imagen"}), 400

    model = get_model()
    yolo_res = model(upload_path)
    out_img, counts, detections = draw_boxes(upload_path, yolo_res)
    cv2.imwrite(result_path, out_img)

    doc = {
        "name":          analysis_name or f"Análisis {datetime.utcnow().strftime('%d/%m/%Y %H:%M')}",
        "filename":      filename,
        "upload_url":    f"/static/uploads/{filename}",
        "result_url":    f"/static/results/{filename}",
        "counts":        counts,
        "detections":    detections,
        "total_objects": sum(counts.values()),
        "created_at":    datetime.utcnow().isoformat()
    }
    res = mongo.db.analyses.insert_one(doc)
    doc["_id"] = str(res.inserted_id)

    return jsonify(doc), 200

# ============================
# GET /api/history
# ============================
@app.route("/api/history", methods=["GET"])
def history():
    page     = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 12))
    skip     = (page - 1) * per_page
    total    = mongo.db.analyses.count_documents({})
    docs     = list(
        mongo.db.analyses.find()
        .sort("created_at", -1)
        .skip(skip)
        .limit(per_page)
    )
    return jsonify({
        "total":   total,
        "page":    page,
        "pages":   (total + per_page - 1) // per_page,
        "results": [serialize(d) for d in docs]
    })

# ============================
# GET /api/history/<id>
# ============================
@app.route("/api/history/<aid>", methods=["GET"])
def get_analysis(aid):
    try:
        doc = mongo.db.analyses.find_one({"_id": ObjectId(aid)})
    except Exception:
        return jsonify({"error": "ID inválido"}), 400
    if not doc:
        return jsonify({"error": "No encontrado"}), 404
    return jsonify(serialize(doc))

# ============================
# DELETE /api/history/<id>
# ============================
@app.route("/api/history/<aid>", methods=["DELETE"])
def delete_analysis(aid):
    try:
        mongo.db.analyses.delete_one({"_id": ObjectId(aid)})
    except Exception:
        return jsonify({"error": "ID inválido"}), 400
    return jsonify({"message": "Eliminado"})

# ============================
# GET /api/stats
# ============================
@app.route("/api/stats", methods=["GET"])
def stats():
    total    = mongo.db.analyses.count_documents({})
    pipeline = [
        {"$unwind": "$detections"},
        {"$group": {"_id": "$detections.class", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    dist = list(mongo.db.analyses.aggregate(pipeline))
    return jsonify({
        "total_analyses":     total,
        "class_distribution": [{"class": c["_id"], "count": c["count"]} for c in dist]
    })

if __name__ == "__main__":
    app.run(debug=True, port=5001)