# Tactical Satellite Analysis - Deployment Guide

Complete guide to deploy the Tactical Display demo on OpenShift with Red Hat OpenShift AI (RHOAI) 3.

## Prerequisites

- OpenShift cluster with RHOAI 3 installed
- `oc` CLI installed and configured
- Cluster admin access
- At least 50GB storage available
- Trained YOLOv8m ONNX model (located in `models/yolov8m-xview/1/model.onnx`)

## Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│    Backend       │────▶│  OpenVINO       │
│   (React)       │     │   (Quarkus)      │     │  Model Server   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                              │                           │
                              ▼                           ▼
                        ┌──────────────────┐     ┌─────────────────┐
                        │     MinIO        │     │   YOLO Model    │
                        │  (S3 Storage)    │     │   (ONNX)        │
                        └──────────────────┘     └─────────────────┘
```

---

## Step 1: Create Project Namespace

```bash
# Login to OpenShift cluster
oc login --token=<your-token> --server=<your-server>

# Create demo namespace
oc new-project demo

# Set as current project
oc project demo
```

---

## Step 2: Deploy MinIO for Object Storage

MinIO will store the xView satellite images and trained models.

### 2.1 Deploy MinIO

```bash
# Create MinIO namespace
oc new-project minio

# Deploy MinIO
cat <<EOF | oc apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: minio-pvc
  namespace: minio
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: minio
  namespace: minio
spec:
  replicas: 1
  selector:
    matchLabels:
      app: minio
  template:
    metadata:
      labels:
        app: minio
    spec:
      containers:
      - name: minio
        image: quay.io/minio/minio:latest
        args:
        - server
        - /data
        - --console-address
        - :9090
        env:
        - name: MINIO_ROOT_USER
          value: minio
        - name: MINIO_ROOT_PASSWORD
          value: minio123
        ports:
        - containerPort: 9000
        - containerPort: 9090
        volumeMounts:
        - name: data
          mountPath: /data
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: minio-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: minio-service
  namespace: minio
spec:
  ports:
  - name: api
    port: 9000
    targetPort: 9000
  - name: console
    port: 9090
    targetPort: 9090
  selector:
    app: minio
---
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: minio-console
  namespace: minio
spec:
  port:
    targetPort: console
  to:
    kind: Service
    name: minio-service
  tls:
    termination: edge
    insecureEdgeTerminationPolicy: Redirect
EOF
```

### 2.2 Wait for MinIO to be ready

```bash
# Wait for deployment
oc wait --for=condition=available --timeout=300s deployment/minio -n minio

# Get MinIO console URL
echo "MinIO Console: https://$(oc get route minio-console -n minio -o jsonpath='{.spec.host}')"
```

### 2.3 Configure MinIO Client

```bash
# Install MinIO client (if not already installed)
# macOS:
brew install minio/stable/mc

# Linux:
# wget https://dl.min.io/client/mc/release/linux-amd64/mc
# chmod +x mc
# sudo mv mc /usr/local/bin/

# Port-forward MinIO service
oc port-forward -n minio svc/minio-service 9000:9000 &

# Wait a moment for port-forward to establish
sleep 3

# Configure MinIO alias
mc alias set demo-minio http://localhost:9000 minio minio123

# Create bucket
mc mb demo-minio/demo

# Verify
mc ls demo-minio/
```

---

## Step 3: Upload xView Dataset and Models

### 3.1 Upload the trained YOLO model

```bash
# Navigate to the models directory
cd models

# Upload the YOLOv8m ONNX model
mc cp -r yolov8m-xview/ demo-minio/demo/models/

# Verify upload
mc ls demo-minio/demo/models/yolov8m-xview/1/
```

### 3.2 Upload sample xView images

You'll need to download xView satellite imagery dataset. For the demo, upload at least 10 sample images:

```bash
# Create local directory for sample images
mkdir -p xview-sample-images

# Download or copy sample xView images to this directory
# Images should be PNG format from the xView dataset

# Upload sample images to MinIO
mc cp xview-sample-images/*.png demo-minio/demo/xview-images/

# Verify uploads
mc ls demo-minio/demo/xview-images/
```

**Note:** You can download the xView dataset from: https://challenge.xviewdataset.org/

---

## Step 4: Deploy Model with RHOAI 3

### 4.1 Create Data Connection in RHOAI

1. Open RHOAI Dashboard
2. Navigate to **Data Science Projects** → **demo**
3. Click **Add data connection**:
   - **Name:** `minio-models`
   - **Access key:** `minio`
   - **Secret key:** `minio123`
   - **Endpoint:** `http://minio-service.minio.svc.cluster.local:9000`
   - **Bucket:** `demo`
   Click **Add**

### 4.2 Deploy Model Server

1. In RHOAI Dashboard, go to **Models** → **Model Servers**
2. Click **Add model server**:
   - **Model server name:** `ai-demo-predictor`
   - **Serving runtime:** `OpenVINO Model Server`
   - **Number of replicas:** `1`
   - **Model server size:** `Medium` (at least 4GB RAM)
   Click **Add**

3. Click **Deploy model**:
   - **Model name:** `ai-demo`
   - **Model framework:** `onnx - 1`
   - **Model location:**
     - **Data connection:** `minio-models`
     - **Path:** `models/yolov8m-xview`
   - **Model route:** Enable (create external route)
   Click **Deploy**

### 4.3 Verify Model Deployment

```bash
# Wait for model to be ready
oc get pods -n demo | grep predictor

# Get model endpoint
MODEL_URL=$(oc get route -n demo -l modelmesh-service=modelmesh-serving -o jsonpath='{.items[0].spec.host}')
echo "Model URL: https://$MODEL_URL"

# Test model inference (optional)
curl -k https://$MODEL_URL/v2/models/ai-demo
```

---

## Step 5: Deploy Tactical Display Application

### 5.1 Update Helm values for your cluster

```bash
# Navigate to tactical-display directory
cd tactical-display

# Edit helm values
vi helm/tactical-display/values.yaml
```

Update the `model.url` to point to your RHOAI model server:

```yaml
backend:
  # ... other settings ...
  
  model:
    url: http://ai-demo-predictor-predictor.demo.svc.cluster.local:8080
    name: ai-demo
    confidenceThreshold: "0.25"
    nmsThreshold: "0.45"
```

### 5.2 Build Backend Image

```bash
# Build backend JAR
cd backend
./mvnw clean package -DskipTests

# Create BuildConfig for backend
oc new-build --binary=true --name=tactical-backend \
  --docker-image=registry.access.redhat.com/ubi9/openjdk-17-runtime:1.20 \
  -n demo

# Start build
oc start-build tactical-backend --from-dir=. --follow -n demo
```

### 5.3 Build Frontend Image

```bash
# Navigate to frontend
cd ../frontend

# Create multi-stage BuildConfig for frontend
cat <<EOF | oc apply -f -
apiVersion: build.openshift.io/v1
kind: BuildConfig
metadata:
  name: tactical-frontend
  namespace: demo
spec:
  output:
    to:
      kind: ImageStreamTag
      name: tactical-frontend:latest
  source:
    type: Binary
  strategy:
    type: Docker
    dockerStrategy:
      dockerfilePath: Dockerfile
EOF

# Create ImageStream
oc create imagestream tactical-frontend -n demo

# Start build
oc start-build tactical-frontend --from-dir=. --follow -n demo
```

### 5.4 Deploy with Helm

```bash
# Navigate back to tactical-display root
cd ..

# Install Helm chart
helm install tactical-display ./helm/tactical-display \
  --namespace demo \
  --wait

# Or if already installed, upgrade:
helm upgrade tactical-display ./helm/tactical-display \
  --namespace demo \
  --wait
```

---

## Step 6: Verify Deployment

### 6.1 Check Pod Status

```bash
# Check all pods are running
oc get pods -n demo

# Expected output:
# NAME                                         READY   STATUS    RESTARTS   AGE
# ai-demo-predictor-xxxxx                      1/1     Running   0          5m
# tactical-display-backend-xxxxx               1/1     Running   0          2m
# tactical-display-frontend-xxxxx              1/1     Running   0          2m
```

### 6.2 Get Application URL

```bash
# Get frontend route
APP_URL=$(oc get route tactical-display-frontend -n demo -o jsonpath='{.spec.host}')
echo "Tactical Display URL: https://$APP_URL"
```

### 6.3 Test the Application

1. Open the application URL in your browser
2. You should see the **Tactical Satellite Analysis** interface
3. Click on an image from the queue
4. Wait for analysis to complete (~5-10 seconds)
5. Verify:
   - Image displays with bounding boxes
   - Detections appear in the right panel
   - Summary dashboard shows statistics

---

## Step 7: Post-Deployment Configuration

### 7.1 Adjust Memory if Needed

If you see OOM crashes in the backend:

```bash
# Edit values.yaml and increase backend memory
vi helm/tactical-display/values.yaml

# Update to at least 2Gi:
# backend:
#   resources:
#     limits:
#       memory: 2Gi

# Upgrade deployment
helm upgrade tactical-display ./helm/tactical-display --namespace demo
```

### 7.2 Upload More Images

```bash
# Upload additional xView images via MinIO
mc cp additional-images/*.png demo-minio/demo/xview-images/

# Or use the UI upload button in the application
```

---

## Troubleshooting

### Backend can't connect to model server

```bash
# Check model server is running
oc get pods -n demo | grep predictor

# Check model server endpoint
oc get svc -n demo | grep predictor

# Test connection from backend pod
oc exec -it deployment/tactical-display-backend -n demo -- \
  curl http://ai-demo-predictor-predictor.demo.svc.cluster.local:8080/v2/models/ai-demo
```

### Images not loading

```bash
# Check MinIO is accessible
oc exec -it deployment/tactical-display-backend -n demo -- \
  curl http://minio-service.minio.svc.cluster.local:9000/minio/health/live

# Verify bucket exists
mc ls demo-minio/demo/xview-images/
```

### Backend out of memory

```bash
# Check pod logs
oc logs deployment/tactical-display-backend -n demo --tail=100

# Look for "OutOfMemoryError"
# If found, increase memory in values.yaml to 2Gi or 3Gi
```

### Frontend shows errors

```bash
# Check frontend logs
oc logs deployment/tactical-display-frontend -n demo

# Check backend is accessible from frontend
oc exec -it deployment/tactical-display-frontend -n demo -- \
  curl http://tactical-backend:8080/api/images
```

---

## Cleanup

To remove the entire deployment:

```bash
# Delete Helm release
helm uninstall tactical-display -n demo

# Delete MinIO
oc delete project minio

# Delete demo project
oc delete project demo
```

---

## Architecture Details

### Component Specifications

| Component | Image | Memory | CPU | Purpose |
|-----------|-------|--------|-----|---------|
| Frontend | nginx-124 (UBI9) | 128Mi | 200m | React UI |
| Backend | openjdk-17 (UBI9) | 2Gi | 1000m | REST API + Image Processing |
| Model Server | OpenVINO (RHOAI) | 4Gi | 2000m | YOLO Inference |
| MinIO | minio:latest | 1Gi | 500m | Object Storage |

### Network Flow

1. User uploads image via Frontend → Backend
2. Backend stores in MinIO
3. User selects image → Backend retrieves from MinIO
4. Backend resizes to 960x960 → sends to Model Server
5. Model Server runs YOLO inference → returns detections
6. Backend post-processes (NMS, scaling) → caches results
7. Frontend displays image with bounding boxes

### Security

- All services communicate internally via cluster DNS
- Frontend exposed via OpenShift Route (TLS edge termination)
- MinIO credentials stored in environment variables (production: use Secrets)
- Model server can use S3 authentication via data connections

---

## Next Steps

1. **Add more images**: Upload full xView dataset to MinIO
2. **Tune confidence threshold**: Adjust in Helm values (default: 0.25)
3. **Enable live feed**: Use the "START LIVE FEED" button for auto-analysis
4. **Monitor performance**: Check detection accuracy and processing time
5. **Scale**: Increase replicas for frontend/backend if needed

---

## Support

For issues or questions:
- Check logs: `oc logs deployment/<component-name> -n demo`
- Review Helm values: `helm get values tactical-display -n demo`
- Verify MinIO access: `mc ls demo-minio/demo/`
- Test model endpoint: `curl http://<model-server>:8080/v2/models/ai-demo`

**Model Details:**
- Architecture: YOLOv8 Medium (25M parameters)
- Input: 960x960 RGB images
- Output: 60 object classes from xView dataset
- Format: ONNX for OpenVINO
