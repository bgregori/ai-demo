# Tactical Satellite Analysis Demo

AI-powered satellite imagery analysis using YOLO object detection on xView dataset, deployed on OpenShift with Red Hat OpenShift AI (RHOAI).

![Architecture](docs/architecture.png)

## Overview

This demo showcases a tactical display system for analyzing satellite imagery in real-time. It uses a YOLOv8 Medium model trained on the xView dataset to detect 60 different object classes including aircraft, vehicles, ships, and buildings.

**Key Features:**
- 🛰️ **Real-time satellite image analysis** with YOLOv8 object detection
- 🎯 **60 object classes** from xView dataset (aircraft, vehicles, ships, buildings, etc.)
- 📊 **Interactive tactical display** with zoom, pan, and detection filtering
- ⚡ **Live processing animation** showing analysis progress
- 🎚️ **Dynamic confidence filtering** to show/hide detections in real-time
- 📈 **Summary dashboard** with detection statistics and class distribution
- 🔄 **Re-analyze functionality** to test different model configurations
- 🖼️ **Image upload** for analyzing custom satellite imagery

## Quick Start

### Prerequisites
- OpenShift cluster with RHOAI 3 installed
- `oc` CLI, `helm`, and `mc` (MinIO client) installed
- Cluster admin access

### Automated Deployment

```bash
# 1. Clone repository
git clone <repo-url>
cd ai-demo

# 2. Login to OpenShift
oc login --token=<your-token> --server=<your-server>

# 3. Run automated deployment script
./deploy.sh

# 4. Follow post-deployment steps to:
#    - Upload YOLO model to MinIO
#    - Deploy model in RHOAI
#    - Upload sample xView images
```

For detailed step-by-step instructions, see **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)**.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       Frontend (React + Vite)                   │
│  - Tactical dark theme UI                                       │
│  - Real-time detection visualization with bounding boxes        │
│  - Zoom/pan controls for high-resolution images                 │
│  - Confidence threshold slider for dynamic filtering            │
└────────────────────┬────────────────────────────────────────────┘
                     │ REST API (/api/*)
┌────────────────────▼────────────────────────────────────────────┐
│                   Backend (Quarkus + Java 17)                   │
│  - Image preprocessing (resize to 960x960)                      │
│  - OpenVINO model inference calls                               │
│  - Post-processing (NMS, coordinate scaling)                    │
│  - LRU cache (10 most recent analyses)                          │
│  - MinIO integration for image storage                          │
└──────────┬─────────────────────────┬────────────────────────────┘
           │                         │
           │ HTTP                    │ S3 API
           ▼                         ▼
┌──────────────────────┐   ┌─────────────────────┐
│  OpenVINO Model      │   │      MinIO          │
│  Server (RHOAI)      │   │  Object Storage     │
│  - YOLOv8m ONNX      │   │  - xView images     │
│  - 960x960 input     │   │  - YOLO models      │
│  - 60 object classes │   │  - S3-compatible    │
└──────────────────────┘   └─────────────────────┘
```

## Components

### Frontend (React)
- **Framework:** React 18 + Vite 8
- **Styling:** Tactical dark theme with monospace fonts
- **Canvas:** HTML5 Canvas for image rendering and detection visualization
- **Features:**
  - Interactive image queue with upload
  - Live processing animation with scanning effect
  - Zoom (0.5x-10x) and pan controls
  - Dynamic confidence filtering
  - Detection feed with class breakdown

### Backend (Quarkus)
- **Framework:** Quarkus 3.36.3 on Java 17
- **Container:** Red Hat UBI 9 OpenJDK 17 runtime
- **Memory:** 2GB limit (handles large satellite images)
- **Features:**
  - Image resizing to 960x960 for YOLO input
  - OpenVINO inference via HTTP/2
  - NMS (Non-Maximum Suppression) post-processing
  - Coordinate scaling from model space to original image
  - LRU cache for 10 most recent analyses

### Model Server (RHOAI + OpenVINO)
- **Model:** YOLOv8 Medium (25M parameters)
- **Format:** ONNX optimized for OpenVINO
- **Input:** 960x960 RGB images
- **Output:** 60 object classes from xView dataset
- **Classes:** Aircraft (Cargo Plane, Helicopter), Vehicles (Car, Bus, Truck), Ships, Buildings, Infrastructure

### Storage (MinIO)
- **Type:** S3-compatible object storage
- **Buckets:**
  - `demo/xview-images/` - Satellite imagery
  - `demo/models/` - Trained YOLO models

## Model Training

The YOLOv8m model was trained on the xView dataset with the following configuration:

- **Base Model:** YOLOv8m pretrained on COCO
- **Dataset:** xView satellite imagery (60 classes)
- **Image Size:** 960x960 pixels (high resolution for small object detection)
- **Batch Size:** 4
- **Epochs:** 200
- **GPU:** NVIDIA L4 (24GB)
- **Training Time:** ~8 hours
- **Output:** ONNX format for OpenVINO inference

See **[notebooks/train-yolo-xview.ipynb](notebooks/train-yolo-xview.ipynb)** for training details.

## Directory Structure

```
ai-demo/
├── README.md                      # This file
├── DEPLOYMENT_GUIDE.md            # Detailed deployment instructions
├── deploy.sh                      # Automated deployment script
│
├── models/                        # Trained models
│   ├── README.md                  # Model documentation
│   └── yolov8m-xview/
│       └── 1/
│           └── model.onnx         # YOLOv8m ONNX model (99MB)
│
├── notebooks/                     # Training notebooks
│   └── train-yolo-xview.ipynb    # YOLO training on xView
│
└── tactical-display/              # Application code
    ├── backend/                   # Quarkus backend
    │   ├── src/
    │   └── pom.xml
    ├── frontend/                  # React frontend
    │   ├── src/
    │   ├── package.json
    │   └── vite.config.js
    ├── helm/                      # Helm charts
    │   └── tactical-display/
    │       ├── Chart.yaml
    │       ├── values.yaml
    │       └── templates/
    └── build-and-deploy.sh        # Build and deploy script
```

## Usage

### Analyzing Images

1. **Select an image** from the queue on the left
2. Watch the **tactical processing animation** with scanning effect
3. View **detections** with bounding boxes on the image
4. Adjust **confidence threshold** slider to filter detections
5. **Zoom and pan** the image for detailed inspection
6. Click **re-analyze (↻)** to process the image again

### Uploading Custom Images

1. Click **↑ UPLOAD IMAGE** button
2. Select a satellite image (PNG format recommended)
3. The image will be automatically analyzed
4. View results immediately

### Live Feed Mode

1. Click **START LIVE FEED** button
2. Images from the queue are automatically analyzed every 8 seconds
3. Click **STOP LIVE FEED** to pause

## API Endpoints

### Backend REST API

- `GET /api/images` - List available images
- `POST /api/analyze?imageKey=<key>` - Analyze an image
- `GET /api/images/<key>/raw` - Get raw image data
- `POST /api/upload` - Upload new image
- `GET /api/summary` - Get analysis summary statistics
- `GET /api/health` - Health check

### Model Server API

- `GET /v2/models/ai-demo` - Model metadata
- `POST /v2/models/ai-demo/infer` - Run inference

## Configuration

### Helm Values (values.yaml)

```yaml
backend:
  resources:
    limits:
      memory: 2Gi    # Increase if analyzing very large images
      cpu: 1000m
  
  model:
    url: http://ai-demo-predictor.demo.svc.cluster.local:8080
    confidenceThreshold: "0.25"  # Adjust detection sensitivity
    nmsThreshold: "0.45"         # Adjust NMS aggressiveness

  minio:
    endpoint: http://minio-service.minio.svc.cluster.local:9000
    bucket: demo
    imagesPrefix: xview-images/
```

## Performance

### Processing Time
- **Small images** (2000x2000): ~3-5 seconds
- **Large images** (4000x3000): ~6-10 seconds

### Detection Accuracy
- **Buildings:** 75-80% precision
- **Aircraft:** 70-85% precision  
- **Vehicles:** 60-75% precision
- **Ships:** 65-80% precision

### Resource Usage
- **Frontend:** 128Mi memory, 200m CPU
- **Backend:** 2Gi memory, 1000m CPU
- **Model Server:** 4Gi memory, 2000m CPU

## Troubleshooting

### Backend crashes with OOM
- Increase memory limit in `values.yaml` to 3Gi
- Reduce batch processing if multiple concurrent requests

### Images not loading
- Verify MinIO is accessible: `oc get pods -n minio`
- Check bucket exists: `mc ls demo-minio/demo/xview-images/`

### Model inference fails
- Check model server status in RHOAI dashboard
- Verify model path: `s3://demo/models/yolov8m-xview`
- Test model endpoint: `curl http://<model-url>/v2/models/ai-demo`

### Detections in wrong positions
- Verify model input size is 960x960
- Check coordinate scaling in YoloPostProcessor.java

See **[DEPLOYMENT_GUIDE.md#troubleshooting](DEPLOYMENT_GUIDE.md#troubleshooting)** for more details.

## Development

### Local Development

```bash
# Start backend with mocks (no MinIO/Model Server needed)
cd tactical-display/backend
./mvnw quarkus:dev -Dtactical.mock.enabled=true

# Start frontend (in another terminal)
cd tactical-display/frontend
npm install
npm run dev

# Access at http://localhost:5173
```

### Building for Production

```bash
# Build backend JAR
cd tactical-display/backend
./mvnw clean package -DskipTests

# Build frontend
cd tactical-display/frontend
npm run build

# Deploy to OpenShift
cd ..
./build-and-deploy.sh
```

## Technologies

- **Frontend:** React 18, Vite 8, HTML5 Canvas
- **Backend:** Quarkus 3.36.3, Java 17, JAX-RS
- **ML:** YOLOv8 Medium, ONNX, OpenVINO
- **Storage:** MinIO (S3-compatible)
- **Container:** Red Hat UBI 9, OpenJDK 17, Nginx 1.24
- **Orchestration:** OpenShift, Helm 3
- **AI Platform:** Red Hat OpenShift AI (RHOAI) 3

## License

[Your License Here]

## Acknowledgments

- **xView Dataset:** http://xviewdataset.org/
- **Ultralytics YOLOv8:** https://github.com/ultralytics/ultralytics
- **OpenVINO:** https://github.com/openvinotoolkit/openvino
- **Red Hat OpenShift AI:** https://www.redhat.com/en/technologies/cloud-computing/openshift/openshift-ai

## Support

For issues or questions:
1. Check **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** for detailed instructions
2. Review logs: `oc logs deployment/<component> -n demo`
3. Verify configuration: `helm get values tactical-display -n demo`
