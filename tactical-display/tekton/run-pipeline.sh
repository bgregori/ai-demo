#!/bin/bash
set -e

COLOR_BLUE='\033[0;34m'
COLOR_GREEN='\033[0;32m'
COLOR_RED='\033[0;31m'
COLOR_YELLOW='\033[0;33m'
COLOR_RESET='\033[0m'

echo -e "${COLOR_BLUE}======================================"
echo "Tekton Pipeline - Build Images"
echo -e "======================================${COLOR_RESET}"
echo ""

# Check if Tekton is installed
if ! oc get pipelines -n demo &>/dev/null; then
    echo -e "${COLOR_RED}Error: Tekton Pipelines not found in 'demo' namespace.${COLOR_RESET}"
    echo "Install OpenShift Pipelines Operator first."
    exit 1
fi

# Step 1: Install Tekton resources
echo -e "${COLOR_BLUE}Step 1: Installing Tekton resources...${COLOR_RESET}"
oc apply -f 00-setup.yaml
oc apply -f 01-backend-task.yaml
oc apply -f 02-frontend-task.yaml
oc apply -f 03-pipeline.yaml
echo -e "${COLOR_GREEN}✓ Tekton resources installed${COLOR_RESET}"
echo ""

# Step 2: Create PVC for source code
echo -e "${COLOR_BLUE}Step 2: Creating workspace PVC...${COLOR_RESET}"
cat <<EOF | oc apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: pipeline-workspace
  namespace: demo
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
EOF
echo -e "${COLOR_GREEN}✓ Workspace PVC created${COLOR_RESET}"
echo ""

# Step 3: Create a pod to upload source code
echo -e "${COLOR_BLUE}Step 3: Uploading source code to workspace...${COLOR_RESET}"
cat <<EOF | oc apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: source-upload
  namespace: demo
spec:
  restartPolicy: Never
  containers:
  - name: uploader
    image: registry.access.redhat.com/ubi9/ubi-minimal:latest
    command: ["sleep", "3600"]
    volumeMounts:
    - name: workspace
      mountPath: /workspace
  volumes:
  - name: workspace
    persistentVolumeClaim:
      claimName: pipeline-workspace
EOF

# Wait for pod to be ready
echo "Waiting for upload pod to be ready..."
oc wait --for=condition=Ready pod/source-upload -n demo --timeout=120s

# Copy source code
echo "Copying source code..."
cd ../../
oc rsync . demo/source-upload:/workspace/source/ \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='target' \
  --exclude='dist' \
  --exclude='.DS_Store' \
  --no-perms=true

echo -e "${COLOR_GREEN}✓ Source code uploaded${COLOR_RESET}"
echo ""

# Clean up upload pod
oc delete pod source-upload -n demo

# Step 4: Run the pipeline
echo -e "${COLOR_BLUE}Step 4: Starting Tekton pipeline...${COLOR_RESET}"
cat <<EOF | oc create -f -
apiVersion: tekton.dev/v1
kind: PipelineRun
metadata:
  generateName: build-tactical-display-
  namespace: demo
spec:
  serviceAccountName: pipeline-sa
  pipelineRef:
    name: build-tactical-display

  workspaces:
    - name: shared-workspace
      persistentVolumeClaim:
        claimName: pipeline-workspace

  # Skip git clone since we uploaded source
  taskRunSpecs:
    - pipelineTaskName: fetch-repository
      taskSpec:
        workspaces:
          - name: output
        steps:
          - name: skip-clone
            image: registry.access.redhat.com/ubi9/ubi-minimal:latest
            script: |
              #!/bin/bash
              echo "Using uploaded source code from workspace"
              ls -la \$(workspaces.output.path)/source/
EOF

# Get the PipelineRun name
PIPELINERUN=$(oc get pipelinerun -n demo --sort-by=.metadata.creationTimestamp -o name | tail -1)
echo -e "${COLOR_GREEN}✓ Pipeline started: ${PIPELINERUN}${COLOR_RESET}"
echo ""

# Step 5: Watch pipeline logs
echo -e "${COLOR_BLUE}Step 5: Watching pipeline logs...${COLOR_RESET}"
echo -e "${COLOR_YELLOW}Press Ctrl+C to stop watching (pipeline will continue running)${COLOR_RESET}"
echo ""

tkn pipelinerun logs ${PIPELINERUN#pipelinerun.tekton.dev/} -f -n demo || true

# Check final status
echo ""
echo -e "${COLOR_BLUE}Pipeline Status:${COLOR_RESET}"
oc get ${PIPELINERUN} -n demo

echo ""
echo -e "${COLOR_GREEN}======================================"
echo "Pipeline Complete!"
echo -e "======================================${COLOR_RESET}"
echo ""
echo "View pipeline runs:"
echo "  tkn pipelinerun list -n demo"
echo ""
echo "View logs:"
echo "  tkn pipelinerun logs ${PIPELINERUN#pipelinerun.tekton.dev/} -n demo"
echo ""
echo "Built images:"
echo "  - image-registry.openshift-image-registry.svc:5000/demo/tactical-backend:latest"
echo "  - image-registry.openshift-image-registry.svc:5000/demo/tactical-frontend:latest"
echo ""
