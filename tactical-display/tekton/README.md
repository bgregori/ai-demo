# Tekton Pipeline for Tactical Display

Automated build pipeline using OpenShift Pipelines (Tekton) to build the backend and frontend container images.

## Prerequisites

1. **OpenShift Pipelines Operator** installed on your cluster
   ```bash
   # Install from OperatorHub in OpenShift Console
   # Or via CLI:
   oc apply -f https://storage.googleapis.com/tekton-releases/pipeline/latest/release.yaml
   ```

2. **Tekton CLI (tkn)** installed locally
   ```bash
   # macOS:
   brew install tektoncd-cli

   # Linux:
   # Download from https://github.com/tektoncd/cli/releases
   ```

3. **Logged into OpenShift** with `oc` CLI

## Quick Start

### Option 1: Automated Script (Recommended)

```bash
cd tekton
./run-pipeline.sh
```

This script will:
1. Install all Tekton resources (Tasks, Pipeline, RBAC)
2. Create a workspace PVC
3. Upload your local source code to the workspace
4. Start the pipeline
5. Stream the logs in real-time
6. Report the final status

### Option 2: Manual Steps

#### 1. Install Tekton Resources

```bash
# Install RBAC, ServiceAccount, and ImageStreams
oc apply -f 00-setup.yaml

# Install Tasks
oc apply -f 01-backend-task.yaml
oc apply -f 02-frontend-task.yaml

# Install Pipeline
oc apply -f 03-pipeline.yaml
```

#### 2. Create Workspace and Upload Source

```bash
# Create PVC for workspace
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

# Create temporary pod to upload source
oc run source-upload --image=registry.access.redhat.com/ubi9/ubi-minimal:latest \
  --command -- sleep 3600 \
  -n demo

# Wait for pod
oc wait --for=condition=Ready pod/source-upload -n demo

# Copy source code (from ai-demo root directory)
cd ../../
oc rsync . demo/source-upload:/workspace/source/ \
  --exclude='.git' --exclude='node_modules' --exclude='target'

# Delete upload pod
oc delete pod source-upload -n demo
```

#### 3. Run the Pipeline

```bash
# Create PipelineRun
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
EOF

# Watch logs
tkn pipelinerun logs -f -n demo
```

## Pipeline Overview

```
┌─────────────────────┐
│  fetch-repository   │  (Skipped - using local source upload)
└──────────┬──────────┘
           │
     ┌─────┴──────┐
     │            │
┌────▼────┐  ┌───▼─────┐
│ build-  │  │ build-  │  (Run in parallel)
│ backend │  │frontend │
└─────────┘  └─────────┘
     │            │
     └─────┬──────┘
           │
     ┌─────▼────────┐
     │report-status │  (Finally block)
     └──────────────┘
```

## Tasks

### 1. build-backend
- **Step 1:** Build JAR with Maven (openjdk-17 container)
- **Step 2:** Build container image with Buildah
- **Output:** `image-registry.openshift-image-registry.svc:5000/demo/tactical-backend:latest`

### 2. build-frontend
- **Step 1:** Multi-stage Docker build (Node.js build + Nginx runtime)
- **Output:** `image-registry.openshift-image-registry.svc:5000/demo/tactical-frontend:latest`

## Monitoring

### View Pipeline Runs

```bash
# List all pipeline runs
tkn pipelinerun list -n demo

# Get status
tkn pipelinerun describe <pipelinerun-name> -n demo

# View logs
tkn pipelinerun logs <pipelinerun-name> -f -n demo
```

### View in OpenShift Console

1. Navigate to **Pipelines** → **PipelineRuns**
2. Select your PipelineRun to view:
   - Task status
   - Logs
   - YAML definition
   - Events

## Troubleshooting

### Pipeline fails with "insufficient privileges"

```bash
# Ensure privileged SCC is granted
oc adm policy add-scc-to-user privileged -z pipeline-sa -n demo
```

### Backend build fails - Maven errors

```bash
# Check Maven build logs
tkn pipelinerun logs <pipelinerun-name> -n demo | grep -A 20 "build-maven-jar"

# Common issues:
# - Missing dependencies: Check pom.xml
# - Network issues: Verify Maven Central is accessible
```

### Frontend build fails - npm errors

```bash
# Check npm build logs
tkn pipelinerun logs <pipelinerun-name> -n demo | grep -A 20 "build-image"

# Common issues:
# - Node version mismatch: Check Dockerfile base image
# - Package lock out of sync: Regenerate package-lock.json
```

### Buildah push fails

```bash
# Verify ImageStreams exist
oc get imagestream -n demo

# Check registry is accessible
oc get route -n openshift-image-registry

# Verify service account has push permissions
oc describe sa pipeline-sa -n demo
```

### Source code not found

```bash
# Verify workspace PVC exists
oc get pvc pipeline-workspace -n demo

# Check if source was uploaded
oc run debug --image=registry.access.redhat.com/ubi9/ubi-minimal:latest \
  --rm -it -- ls /workspace/source/
```

## Advanced Usage

### Using Git Repository Instead of Local Upload

Modify the PipelineRun to use the actual git-clone task:

```yaml
apiVersion: tekton.dev/v1
kind: PipelineRun
metadata:
  generateName: build-tactical-display-git-
  namespace: demo
spec:
  serviceAccountName: pipeline-sa
  pipelineRef:
    name: build-tactical-display
  params:
    - name: git-url
      value: https://github.com/your-org/ai-demo.git
    - name: git-revision
      value: main
  workspaces:
    - name: shared-workspace
      volumeClaimTemplate:
        spec:
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 5Gi
```

### Building Specific Tags

Modify the Task parameters:

```yaml
apiVersion: tekton.dev/v1
kind: PipelineRun
metadata:
  name: build-tactical-display-v1.0.0
  namespace: demo
spec:
  serviceAccountName: pipeline-sa
  pipelineRef:
    name: build-tactical-display
  params:
    - name: backend-image-tag
      value: v1.0.0
    - name: frontend-image-tag
      value: v1.0.0
  # ... workspaces ...
```

### Triggering Builds Automatically

Set up EventListeners and Triggers:

```bash
# Install Tekton Triggers
oc apply -f https://storage.googleapis.com/tekton-releases/triggers/latest/release.yaml

# Create EventListener to trigger on GitHub webhook
# See: https://tekton.dev/docs/triggers/
```

## Cleanup

```bash
# Delete PipelineRuns
oc delete pipelinerun --all -n demo

# Delete Pipeline and Tasks
oc delete -f 03-pipeline.yaml
oc delete -f 01-backend-task.yaml
oc delete -f 02-frontend-task.yaml

# Delete RBAC and resources
oc delete -f 00-setup.yaml

# Delete workspace PVC
oc delete pvc pipeline-workspace -n demo
```

## File Structure

```
tekton/
├── README.md                    # This file
├── 00-setup.yaml                # RBAC, ServiceAccount, ImageStreams
├── 01-backend-task.yaml         # Backend build task
├── 02-frontend-task.yaml        # Frontend build task
├── 03-pipeline.yaml             # Main pipeline definition
├── 04-pipelinerun-local.yaml    # Example PipelineRun (local source)
└── run-pipeline.sh              # Automated build script
```

## Resources

- **Tekton Documentation:** https://tekton.dev/docs/
- **OpenShift Pipelines:** https://docs.openshift.com/pipelines/
- **Tekton CLI:** https://github.com/tektoncd/cli
- **Buildah:** https://buildah.io/

## Next Steps

After the pipeline completes:

1. **Verify images were built:**
   ```bash
   oc get imagestream -n demo
   ```

2. **Deploy with Helm:**
   ```bash
   cd ..
   helm install tactical-display ./helm/tactical-display --namespace demo
   ```

3. **Access the application:**
   ```bash
   oc get route tactical-display-frontend -n demo
   ```
