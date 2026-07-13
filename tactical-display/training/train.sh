#!/bin/bash
# Training script for xView YOLO model with class balancing

set -e

echo "=========================================="
echo "xView YOLO Training - Balanced Dataset"
echo "=========================================="

# Install dependencies
echo "Installing YOLOv8..."
pip install ultralytics
pip install opencv-python
pip install pillow

# Optional: Install SAHI for better small object detection
# pip install sahi

# Check GPU availability
echo ""
echo "Checking GPU availability..."
python -c "import torch; print(f'CUDA available: {torch.cuda.is_available()}'); print(f'GPU count: {torch.cuda.device_count()}')"

# Train the model
echo ""
echo "Starting training..."
echo "Model: YOLOv8s"
echo "Image size: 1280x1280"
echo "Epochs: 300"
echo "Batch: 16"
echo "Class weights: ENABLED (critical for rare classes)"
echo "Focal loss: ENABLED (gamma=2.0)"
echo ""

yolo train \
  model=yolov8s.pt \
  data=xview_data.yaml \
  epochs=300 \
  imgsz=1280 \
  batch=16 \
  device=0 \
  workers=8 \
  patience=50 \
  optimizer=AdamW \
  fl_gamma=2.0 \
  mosaic=1.0 \
  copy_paste=0.3 \
  flipud=0.5 \
  fliplr=0.5 \
  project=runs/train \
  name=xview_balanced \
  exist_ok=True

echo ""
echo "=========================================="
echo "Training Complete!"
echo "=========================================="
echo "Best weights: runs/train/xview_balanced/weights/best.pt"
echo "Last weights: runs/train/xview_balanced/weights/last.pt"
echo ""
echo "To validate:"
echo "  yolo val model=runs/train/xview_balanced/weights/best.pt data=xview_data.yaml imgsz=1280"
echo ""
echo "To export to ONNX for OpenVINO:"
echo "  yolo export model=runs/train/xview_balanced/weights/best.pt format=onnx imgsz=640 simplify=True"
echo ""
