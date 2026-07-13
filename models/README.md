# Trained YOLO Models for xView Dataset

This directory contains the trained ONNX models for deployment to new environments.

**⚠️ IMPORTANT:** The model file (`model.onnx`, 99MB) is **NOT included in the Git repository** due to its size. You must obtain it separately before deployment.

## Models

### yolov8m-xview
- **Path**: `yolov8m-xview/1/model.onnx`
- **Size**: 99 MB
- **Architecture**: YOLOv8 Medium (25M parameters)
- **Training Dataset**: xView satellite imagery (60 object classes)
- **Input Size**: 960x960 pixels
- **Format**: ONNX (for OpenVINO Model Server)

## Obtaining the Model

### Option 1: Download from GitHub Release

Download the pre-trained model from the GitHub release:

```bash
cd models

# Download from GitHub Release (replace with actual release URL)
curl -L -o yolov8m-xview-model.tar.gz \
  https://github.com/YOUR_ORG/tactical-satellite-demo/releases/download/v1.0.0/yolov8m-xview-model.tar.gz

# Extract
tar -xzf yolov8m-xview-model.tar.gz

# Verify structure
ls -la yolov8m-xview/1/model.onnx
```

### Option 2: Download from Existing MinIO Instance

If you have access to a deployed instance:

```bash
# Install MinIO client
brew install minio/stable/mc

# Configure access to source instance
mc alias set source-minio https://minio-api-minio.apps.ocp.example.com minio minio123

# Download the model
mc cp -r source-minio/demo/models/yolov8m-xview/ ./
```

### Option 3: Train Your Own Model

Follow the training scripts in `../tactical-display/training/` to train from scratch using the xView dataset.

## Deployment to New Environment

### 1. Upload to MinIO

```bash
# Port-forward to MinIO in new cluster
oc port-forward -n minio svc/minio-service 9000:9000

# Configure MinIO client
mc alias set new-env http://localhost:9000 <access-key> <secret-key>

# Create bucket if needed
mc mb new-env/demo

# Upload model
mc cp -r yolov8m-xview/ new-env/demo/models/
```

### 2. Deploy OpenVINO Model Server

The model server expects this structure:
```
models/
  yolov8m-xview/
    1/
      model.onnx
```

MinIO URL: `s3://demo/models/yolov8m-xview`

### 3. Model Configuration

- **Model Name**: `ai-demo`
- **Confidence Threshold**: 0.25
- **NMS Threshold**: 0.45
- **Input Shape**: (1, 3, 960, 960)
- **Classes**: 60 (see xview-classes.json)

## Training Details

- **Base Model**: YOLOv8m pretrained on COCO
- **Training Epochs**: 200
- **Image Size**: 960x960
- **Batch Size**: 4
- **GPU**: NVIDIA L4 (24GB)
- **Training Time**: ~8 hours
- **Best mAP50**: Check training logs

## Model Performance

Detects 60 object classes from xView dataset:
- Aircraft (Cargo Plane, Helicopter, etc.)
- Vehicles (Small Car, Bus, Truck, etc.)
- Maritime (Ships, Boats, etc.)
- Buildings
- Infrastructure

The model prioritizes high-resolution detection suitable for satellite imagery analysis.
