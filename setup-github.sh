#!/bin/bash
set -e

COLOR_BLUE='\033[0;34m'
COLOR_GREEN='\033[0;32m'
COLOR_RED='\033[0;31m'
COLOR_YELLOW='\033[0;33m'
COLOR_RESET='\033[0m'

echo -e "${COLOR_BLUE}======================================"
echo "Tactical Display - GitHub Deployment"
echo -e "======================================${COLOR_RESET}"
echo ""

# Verify logged in to OpenShift
if ! oc whoami &>/dev/null; then
    echo -e "${COLOR_RED}Error: Not logged into OpenShift${COLOR_RESET}"
    echo "Run: oc login --token=<your-token> --server=<your-server>"
    exit 1
fi

# 1. Create namespaces
echo -e "${COLOR_BLUE}Step 1: Creating namespaces...${COLOR_RESET}"
oc new-project demo 2>/dev/null || oc project demo
oc new-project minio 2>/dev/null || true
echo -e "${COLOR_GREEN}✓ Namespaces created${COLOR_RESET}"
echo ""

# 2. Deploy MinIO
echo -e "${COLOR_BLUE}Step 2: Deploying MinIO...${COLOR_RESET}"
if [ ! -f deployment/minio.yaml ]; then
    echo -e "${COLOR_YELLOW}Warning: deployment/minio.yaml not found${COLOR_RESET}"
    echo "Creating MinIO deployment inline..."

    cat <<'MINIO_EOF' | oc apply -f -
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
MINIO_EOF
else
    oc apply -f deployment/minio.yaml
fi

echo "Waiting for MinIO to be ready..."
oc wait --for=condition=available --timeout=300s deployment/minio -n minio || true
echo -e "${COLOR_GREEN}✓ MinIO deployed${COLOR_RESET}"
echo ""

# 2.5. Deploy RHOAI Training Workbench
echo -e "${COLOR_BLUE}Step 2.5: Deploying RHOAI Training Workbench...${COLOR_RESET}"
if [ -f deployment/rhoai-workbench.yaml ]; then
    oc apply -f deployment/rhoai-workbench.yaml
    echo -e "${COLOR_GREEN}✓ RHOAI Workbench deployed (will clone notebooks from GitHub)${COLOR_RESET}"
else
    echo -e "${COLOR_YELLOW}Warning: deployment/rhoai-workbench.yaml not found, skipping workbench${COLOR_RESET}"
fi
echo ""

# 3. Install Tekton resources
echo -e "${COLOR_BLUE}Step 3: Installing Tekton pipeline...${COLOR_RESET}"
cd tactical-display/tekton

if ! oc get pipeline build-tactical-display -n demo &>/dev/null 2>&1; then
    oc apply -f 00-setup.yaml
    oc apply -f 01-backend-task.yaml
    oc apply -f 02-frontend-task.yaml
    oc apply -f 03-pipeline.yaml
    echo -e "${COLOR_GREEN}✓ Tekton resources installed${COLOR_RESET}"
else
    echo -e "${COLOR_YELLOW}Tekton pipeline already exists${COLOR_RESET}"
fi
echo ""

# 4. Update git URL in PipelineRun
echo -e "${COLOR_BLUE}Step 4: Preparing PipelineRun...${COLOR_RESET}"
if git config --get remote.origin.url &>/dev/null; then
    GIT_URL=$(git config --get remote.origin.url)
    echo "Using Git URL: ${GIT_URL}"
    sed "s|https://github.com/bgregori/ai-demo.git|${GIT_URL}|g" \
      05-pipelinerun-git.yaml > /tmp/pipelinerun.yaml
else
    echo -e "${COLOR_YELLOW}Note: Using default GitHub URL: https://github.com/bgregori/ai-demo.git${COLOR_RESET}"
    cp 05-pipelinerun-git.yaml /tmp/pipelinerun.yaml
fi
echo ""

# 5. Run pipeline
echo -e "${COLOR_BLUE}Step 5: Starting build pipeline...${COLOR_RESET}"
oc create -f /tmp/pipelinerun.yaml

PIPELINERUN=$(oc get pipelinerun -n demo --sort-by=.metadata.creationTimestamp -o name | tail -1)
echo -e "${COLOR_GREEN}✓ Pipeline started: ${PIPELINERUN}${COLOR_RESET}"
echo ""

echo -e "${COLOR_GREEN}======================================"
echo "Setup Complete!"
echo -e "======================================${COLOR_RESET}"
echo ""
echo -e "${COLOR_YELLOW}Next steps:${COLOR_RESET}"
echo ""
echo "1. Watch pipeline build images:"
echo "   ${COLOR_BLUE}tkn pipelinerun logs -f -n demo${COLOR_RESET}"
echo ""
echo "2. Upload models to MinIO (see DEPLOYMENT_GUIDE_GITHUB.md Step 3)"
echo ""
echo "3. Deploy model in RHOAI (see DEPLOYMENT_GUIDE_GITHUB.md Step 5)"
echo ""
echo "4. Deploy application with Helm:"
echo "   ${COLOR_BLUE}cd .. && helm install tactical-display ./helm/tactical-display -n demo${COLOR_RESET}"
echo ""
echo "MinIO Console:"
MINIO_ROUTE=$(oc get route minio-console -n minio -o jsonpath='{.spec.host}' 2>/dev/null || echo "not available yet")
echo "   https://${MINIO_ROUTE}"
echo "   User: minio / Password: minio123"
echo ""
