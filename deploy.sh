#!/bin/bash
set -e

# Tactical Display Demo - Automated Deployment Script
# For OpenShift with RHOAI 3

COLOR_BLUE='\033[0;34m'
COLOR_GREEN='\033[0;32m'
COLOR_RED='\033[0;31m'
COLOR_YELLOW='\033[0;33m'
COLOR_RESET='\033[0m'

echo -e "${COLOR_BLUE}======================================"
echo "Tactical Display - Automated Deploy"
echo -e "======================================${COLOR_RESET}"
echo ""

# Check prerequisites
command -v oc >/dev/null 2>&1 || { echo -e "${COLOR_RED}Error: oc CLI is required but not installed.${COLOR_RESET}" >&2; exit 1; }
command -v helm >/dev/null 2>&1 || { echo -e "${COLOR_RED}Error: helm is required but not installed.${COLOR_RESET}" >&2; exit 1; }
command -v mc >/dev/null 2>&1 || { echo -e "${COLOR_YELLOW}Warning: mc (MinIO client) not found. You'll need to install it manually.${COLOR_RESET}" >&2; }

# Check if logged in to OpenShift
if ! oc whoami &> /dev/null; then
    echo -e "${COLOR_RED}Error: Not logged in to OpenShift. Run 'oc login' first.${COLOR_RESET}"
    exit 1
fi

echo -e "${COLOR_GREEN}Connected to OpenShift as: $(oc whoami)${COLOR_RESET}"
echo ""

# Step 1: Create namespaces
echo -e "${COLOR_BLUE}Step 1: Creating namespaces...${COLOR_RESET}"
oc new-project demo --display-name="Tactical Display Demo" --description="AI-powered satellite image analysis" 2>/dev/null || oc project demo
oc new-project minio --display-name="MinIO Storage" --description="S3-compatible object storage for images and models" 2>/dev/null || true
echo -e "${COLOR_GREEN}✓ Namespaces created${COLOR_RESET}"
echo ""

# Step 2: Deploy MinIO
echo -e "${COLOR_BLUE}Step 2: Deploying MinIO...${COLOR_RESET}"
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

echo "Waiting for MinIO to be ready..."
oc wait --for=condition=available --timeout=300s deployment/minio -n minio
echo -e "${COLOR_GREEN}✓ MinIO deployed${COLOR_RESET}"
MINIO_CONSOLE_URL="https://$(oc get route minio-console -n minio -o jsonpath='{.spec.host}')"
echo -e "${COLOR_GREEN}MinIO Console: ${MINIO_CONSOLE_URL}${COLOR_RESET}"
echo ""

# Step 3: Build application images
echo -e "${COLOR_BLUE}Step 3: Building application images...${COLOR_RESET}"

# Navigate to tactical-display directory
cd tactical-display

# Build backend
echo "Building backend JAR..."
cd backend
./mvnw clean package -DskipTests
cd ..

# Create BuildConfigs and ImageStreams
echo "Creating BuildConfigs..."
oc new-build --binary=true --name=tactical-backend \
  --docker-image=registry.access.redhat.com/ubi9/openjdk-17-runtime:1.20 \
  -n demo 2>/dev/null || true

oc create imagestream tactical-frontend -n demo 2>/dev/null || true

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

echo "Building backend image..."
oc start-build tactical-backend --from-dir=backend --follow -n demo

echo "Building frontend image..."
oc start-build tactical-frontend --from-dir=frontend --follow -n demo

echo -e "${COLOR_GREEN}✓ Images built${COLOR_RESET}"
echo ""

# Step 4: Deploy with Helm
echo -e "${COLOR_BLUE}Step 4: Deploying with Helm...${COLOR_RESET}"
if helm list -n demo | grep -q tactical-display; then
    echo "Upgrading existing deployment..."
    helm upgrade tactical-display ./helm/tactical-display --namespace demo --wait
else
    echo "Installing new deployment..."
    helm install tactical-display ./helm/tactical-display --namespace demo --wait
fi
echo -e "${COLOR_GREEN}✓ Helm deployment complete${COLOR_RESET}"
echo ""

# Step 5: Verify deployment
echo -e "${COLOR_BLUE}Step 5: Verifying deployment...${COLOR_RESET}"
echo "Pod status:"
oc get pods -n demo

echo ""
echo -e "${COLOR_GREEN}======================================"
echo "Deployment Complete!"
echo -e "======================================${COLOR_RESET}"
echo ""
echo -e "${COLOR_YELLOW}Next Steps:${COLOR_RESET}"
echo ""
echo "1. Upload the YOLO model to MinIO:"
echo "   cd /path/to/models"
echo "   oc port-forward -n minio svc/minio-service 9000:9000 &"
echo "   mc alias set demo-minio http://localhost:9000 minio minio123"
echo "   mc cp -r yolov8m-xview/ demo-minio/demo/models/"
echo ""
echo "2. Deploy model in RHOAI:"
echo "   - Create data connection to MinIO"
echo "   - Deploy OpenVINO model server"
echo "   - Point to: s3://demo/models/yolov8m-xview"
echo ""
echo "3. Upload sample xView images:"
echo "   mc cp sample-images/*.png demo-minio/demo/xview-images/"
echo ""
echo "4. Access the application:"
APP_URL="https://$(oc get route tactical-display-frontend -n demo -o jsonpath='{.spec.host}' 2>/dev/null || echo 'pending...')"
echo -e "   ${COLOR_GREEN}${APP_URL}${COLOR_RESET}"
echo ""
echo "5. Access MinIO Console:"
echo -e "   ${COLOR_GREEN}${MINIO_CONSOLE_URL}${COLOR_RESET}"
echo "   Credentials: minio / minio123"
echo ""
echo "For detailed instructions, see DEPLOYMENT_GUIDE.md"
echo ""
