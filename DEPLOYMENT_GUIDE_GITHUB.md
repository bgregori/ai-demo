# Tactical Satellite Analysis - GitHub Deployment Guide

Complete guide to deploy the Tactical Display demo on OpenShift with RHOAI 3 **from GitHub**.

## Prerequisites

- OpenShift cluster with RHOAI 3 installed
- OpenShift Pipelines Operator installed
- `oc` CLI and `tkn` CLI installed
- Cluster admin access
- GitHub repository with this code

## Quick Start

```bash
# 1. Login to OpenShift
oc login --token=<your-token> --server=<your-server>

# 2. Clone repository
git clone https://github.com/YOUR_ORG/tactical-satellite-demo.git
cd tactical-satellite-demo

# 3. Run setup script
./setup-github.sh

# 4. The script will:
#    - Create namespaces (demo, minio)
#    - Deploy MinIO
#    - Install Tekton pipeline
#    - Build images from GitHub
#    - Deploy with Helm
```

---

## Step-by-Step Instructions

### Step 1: Create Namespaces

```bash
# Login to OpenShift
oc login --token=<your-token> --server=<your-server>

# Create projects
oc new-project demo
oc new-project minio
```

---

### Step 2: Deploy MinIO

```bash
# Deploy MinIO for object storage
oc apply -f - <<EOF
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

# Wait for MinIO to be ready
oc wait --for=condition=available --timeout=300s deployment/minio -n minio
```

---

### Step 3: Upload Models and Images to MinIO

```bash
# Install MinIO client
brew install minio/stable/mc

# Port-forward MinIO
oc port-forward -n minio svc/minio-service 9000:9000 &
sleep 3

# Configure MinIO client
mc alias set demo-minio http://localhost:9000 minio minio123

# Create bucket
mc mb demo-minio/demo

# Upload trained YOLO model
cd models
mc cp -r yolov8m-xview/ demo-minio/demo/models/

# Upload sample xView images (you'll need to provide these)
mc cp sample-images/*.png demo-minio/demo/xview-images/

# Verify uploads
mc ls demo-minio/demo/models/yolov8m-xview/1/
mc ls demo-minio/demo/xview-images/

# Stop port-forward
pkill -f "port-forward.*minio"
```

---

### Step 4: Build Images with Tekton

#### 4.1 Update Git URL

Edit `tactical-display/tekton/05-pipelinerun-git.yaml`:

```yaml
params:
  - name: git-url
    value: https://github.com/YOUR_ORG/tactical-satellite-demo.git  # Update this!
  - name: git-revision
    value: main
```

#### 4.2 Install Tekton Resources

```bash
cd tactical-display/tekton

# Install RBAC and setup
oc apply -f 00-setup.yaml

# Install tasks
oc apply -f 01-backend-task.yaml
oc apply -f 02-frontend-task.yaml

# Install pipeline
oc apply -f 03-pipeline.yaml
```

#### 4.3 Run Pipeline from GitHub

```bash
# Create PipelineRun (builds from GitHub)
oc create -f 05-pipelinerun-git.yaml

# Watch pipeline logs
tkn pipelinerun logs -f -n demo

# Or watch in OpenShift Console:
# Pipelines → PipelineRuns
```

#### 4.4 Verify Images Built

```bash
# Check that images were created
oc get imagestream -n demo

# Should show:
# NAME                TYPE     IMAGE REPOSITORY
# tactical-backend    Docker   image-registry.openshift-image-registry.svc:5000/demo/tactical-backend
# tactical-frontend   Docker   image-registry.openshift-image-registry.svc:5000/demo/tactical-frontend
```

---

### Step 5: Deploy Model with RHOAI

#### 5.1 Create Data Connection

In RHOAI Dashboard:

1. Navigate to **Data Science Projects** → **demo**
2. Click **Add data connection**:
   - **Name:** `minio-models`
   - **Access key:** `minio`
   - **Secret key:** `minio123`
   - **Endpoint:** `http://minio-service.minio.svc.cluster.local:9000`
   - **Bucket:** `demo`
3. Click **Add**

#### 5.2 Deploy Model Server

1. Go to **Models** → **Model Servers**
2. Click **Add model server**:
   - **Name:** `ai-demo-predictor`
   - **Runtime:** `OpenVINO Model Server`
   - **Replicas:** `1`
   - **Size:** `Medium` (4GB RAM minimum)
3. Click **Add**

4. Click **Deploy model**:
   - **Name:** `ai-demo`
   - **Framework:** `onnx - 1`
   - **Location:**
     - **Data connection:** `minio-models`
     - **Path:** `models/yolov8m-xview`
   - **Route:** Enable external route
5. Click **Deploy**

#### 5.3 Verify Model

```bash
# Wait for model to be ready
oc get pods -n demo | grep predictor

# Test model endpoint
curl -k http://ai-demo-predictor-predictor.demo.svc.cluster.local:8080/v2/models/ai-demo
```

---

### Step 6: Deploy Application with Helm

```bash
cd tactical-display

# Install with Helm
helm install tactical-display ./helm/tactical-display \
  --namespace demo \
  --wait

# Verify deployment
oc get pods -n demo

# Get application URL
oc get route tactical-display-frontend -n demo -o jsonpath='{.spec.host}'
```

---

## Automated Setup Script

Save this as `setup-github.sh` in the repository root:

```bash
#!/bin/bash
set -e

echo "======================================"
echo "Tactical Display - GitHub Deployment"
echo "======================================"

# 1. Create namespaces
echo "Creating namespaces..."
oc new-project demo 2>/dev/null || oc project demo
oc new-project minio 2>/dev/null || true

# 2. Deploy MinIO
echo "Deploying MinIO..."
oc apply -f deployment/minio.yaml
oc wait --for=condition=available --timeout=300s deployment/minio -n minio

# 3. Install Tekton resources
echo "Installing Tekton pipeline..."
cd tactical-display/tekton
oc apply -f 00-setup.yaml
oc apply -f 01-backend-task.yaml
oc apply -f 02-frontend-task.yaml
oc apply -f 03-pipeline.yaml

# 4. Update git URL in PipelineRun
GIT_URL=$(git config --get remote.origin.url)
sed "s|https://github.com/YOUR_ORG/tactical-satellite-demo.git|${GIT_URL}|g" \
  05-pipelinerun-git.yaml > /tmp/pipelinerun.yaml

# 5. Run pipeline
echo "Building images from GitHub..."
oc create -f /tmp/pipelinerun.yaml

echo ""
echo "Pipeline started! Watch progress:"
echo "  tkn pipelinerun logs -f -n demo"
echo ""
echo "Next steps:"
echo "1. Upload models to MinIO (see DEPLOYMENT_GUIDE_GITHUB.md)"
echo "2. Deploy model in RHOAI"
echo "3. Deploy app: helm install tactical-display ./helm/tactical-display -n demo"
```

---

## CI/CD: Automated Builds on Git Push

### Option 1: GitHub Actions

Create `.github/workflows/build.yaml`:

```yaml
name: Build and Push Images

on:
  push:
    branches:
      - main
    paths:
      - 'tactical-display/**'

jobs:
  trigger-openshift-build:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger OpenShift Pipeline
        run: |
          oc login --token=${{ secrets.OPENSHIFT_TOKEN }} --server=${{ secrets.OPENSHIFT_SERVER }}
          oc create -f tactical-display/tekton/05-pipelinerun-git.yaml -n demo
```

### Option 2: OpenShift Webhook

```bash
# Create webhook secret
oc create secret generic github-webhook-secret \
  --from-literal=WebHookSecretKey=<random-string> \
  -n demo

# Add webhook trigger to pipeline
# (See Tekton Triggers documentation)
```

---

## Repository Structure

```
tactical-satellite-demo/           # Repository root
├── README.md                      # Project overview
├── DEPLOYMENT_GUIDE_GITHUB.md     # This file
├── .gitignore                     # Git ignore rules
├── setup-github.sh                # Automated setup script
│
├── models/                        # Trained models
│   ├── README.md
│   └── yolov8m-xview/
│       └── 1/
│           └── model.onnx         # Track with Git LFS or upload separately
│
├── deployment/                    # Kubernetes manifests
│   └── minio.yaml                 # MinIO deployment
│
└── tactical-display/              # Application code
    ├── backend/                   # Quarkus backend
    ├── frontend/                  # React frontend
    ├── helm/                      # Helm charts
    │   └── tactical-display/
    └── tekton/                    # Tekton pipeline
        ├── 00-setup.yaml
        ├── 01-backend-task.yaml
        ├── 02-frontend-task.yaml
        ├── 03-pipeline.yaml
        └── 05-pipelinerun-git.yaml  # Git-based build
```

---

## Git Large File Storage (LFS) for Models

The ONNX model file is 99MB. Use Git LFS to track it:

```bash
# Install Git LFS
brew install git-lfs
git lfs install

# Track ONNX models
git lfs track "*.onnx"
git add .gitattributes

# Commit and push
git add models/yolov8m-xview/1/model.onnx
git commit -m "Add trained YOLOv8m model"
git push
```

**Alternative:** Don't commit the model to Git. Instead, document how to download it:

```markdown
# models/README.md

## Download Trained Model

The trained YOLOv8m model is not included in Git due to size (99MB).

Download from:
- Release: https://github.com/YOUR_ORG/tactical-satellite-demo/releases/download/v1.0.0/yolov8m-xview.tar.gz
- Direct upload to MinIO after deployment
```

---

## Benefits of GitHub-Based Deployment

✅ **No local build tools required** - Everything builds in OpenShift  
✅ **Reproducible builds** - Same code = same result  
✅ **Version control** - Tag releases, rollback easily  
✅ **CI/CD ready** - Trigger builds on git push  
✅ **Team collaboration** - Multiple people can deploy  
✅ **Documentation in code** - README travels with the repo  

---

## Troubleshooting

### Pipeline fails to clone repository

```bash
# For private repos, create SSH key secret
oc create secret generic git-ssh-key \
  --from-file=id_rsa=~/.ssh/id_rsa \
  -n demo

# Update PipelineRun to use SSH
# See: https://tekton.dev/docs/pipelines/auth/
```

### Model file too large for Git

**Option 1:** Use Git LFS (recommended)
**Option 2:** Store separately and document download
**Option 3:** Upload directly to MinIO after deployment

---

## Next Steps After Deployment

1. ✅ Access the application at the route URL
2. ✅ Upload sample xView satellite images
3. ✅ Test object detection
4. ✅ Adjust confidence threshold
5. ✅ Configure live feed mode

**Application URL:**
```bash
echo "https://$(oc get route tactical-display-frontend -n demo -o jsonpath='{.spec.host}')"
```

---

## Support

For issues:
1. Check pipeline logs: `tkn pipelinerun logs -f -n demo`
2. Review pod status: `oc get pods -n demo`
3. Check model server: Visit RHOAI dashboard
4. Verify MinIO: `mc ls demo-minio/demo/`

## Repository

GitHub: https://github.com/YOUR_ORG/tactical-satellite-demo

Clone: `git clone https://github.com/YOUR_ORG/tactical-satellite-demo.git`
