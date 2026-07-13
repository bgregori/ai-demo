# GitOps Deployment with OpenShift GitOps (ArgoCD)

This directory contains the ArgoCD Application manifest for GitOps-based deployment of the Tactical Display demo.

## Overview

**CI/CD Flow:**
```
Code Push → GitHub
    ↓
Tekton Pipeline (triggered manually or webhook)
    ↓
Build Images → Push to OpenShift Registry
    ↓
ArgoCD watches GitHub repo
    ↓
Auto-deploys Helm chart → Application Running
```

## Prerequisites

- OpenShift GitOps (ArgoCD) installed
- Images built by Tekton pipeline in `demo` namespace
- Model deployed in RHOAI (or model server running)
- MinIO deployed in `minio` namespace

## Quick Deploy

### 1. Apply ArgoCD Application

```bash
oc apply -f tactical-display/argocd/application.yaml
```

This creates an ArgoCD Application that:
- Watches `https://github.com/bgregori/ai-demo.git`
- Deploys the Helm chart from `tactical-display/helm/tactical-display`
- Auto-syncs on every Git commit
- Self-heals if resources are modified

### 2. Monitor Deployment

**Via ArgoCD UI:**
```bash
# Get ArgoCD route
oc get route openshift-gitops-server -n openshift-gitops -o jsonpath='{.spec.host}'

# Get admin password
oc get secret openshift-gitops-cluster -n openshift-gitops -o jsonpath='{.data.admin\.password}' | base64 -d
```

Login to ArgoCD UI and watch the `tactical-display` application sync.

**Via CLI:**
```bash
# Check application status
oc get application tactical-display -n openshift-gitops

# Watch sync status
oc get application tactical-display -n openshift-gitops -w

# Check deployed resources
oc get all -n demo -l app.kubernetes.io/instance=tactical-display
```

## How It Works

### Auto-Sync Enabled

The application is configured with `syncPolicy.automated`, which means:

- **Automatic Deployment**: ArgoCD polls GitHub every 3 minutes and auto-deploys changes
- **Self-Healing**: If someone manually modifies resources, ArgoCD reverts them
- **Prune**: Deleted resources in Git are deleted from cluster

### Image Updates

When Tekton builds new images:

1. Tekton pipeline tags images as `latest`
2. ArgoCD detects Helm chart (which references `latest` tag)
3. You can trigger sync manually or wait for auto-sync

For production, you'd:
- Tag images with commit SHA or version
- Update Helm values in Git with new image tag
- ArgoCD automatically deploys new version

## GitOps Best Practices

### Image Tag Strategy

**Current (Development):**
- Using `latest` tag
- Manual sync or 3-minute polling

**Production Recommended:**
- Use immutable tags (commit SHA, semantic version)
- Update image tags in Git via automated PR
- Implement progressive delivery (canary, blue/green)

### Webhook for Instant Sync

Instead of 3-minute polling, configure GitHub webhook:

```bash
# Get ArgoCD webhook URL
ARGOCD_HOST=$(oc get route openshift-gitops-server -n openshift-gitops -o jsonpath='{.spec.host}')
echo "https://${ARGOCD_HOST}/api/webhook"
```

Add webhook in GitHub repo:
- **Payload URL**: `https://<argocd-host>/api/webhook`
- **Content type**: `application/json`
- **Events**: Just the push event

### Environment Separation

For multiple environments (dev, staging, prod):

```
tactical-display/
├── helm/
│   └── tactical-display/          # Base Helm chart
└── argocd/
    ├── dev-application.yaml       # Dev environment
    ├── staging-application.yaml   # Staging environment
    └── prod-application.yaml      # Production environment
```

Each points to same Helm chart but different values:
- Different namespaces
- Different image tags
- Different resource limits
- Different ingress hosts

## Configuration

### Update Image Repository

Edit `application.yaml` if using different registry:

```yaml
spec:
  source:
    helm:
      values: |
        backend:
          image:
            repository: quay.io/your-org/tactical-backend  # Change this
```

### Update Model Server Endpoint

If model server is in different namespace or has different name:

```yaml
spec:
  source:
    helm:
      values: |
        backend:
          model:
            url: http://your-model-server.namespace.svc.cluster.local:8080
```

## Troubleshooting

### Application Out of Sync

```bash
# Check what's different
oc describe application tactical-display -n openshift-gitops

# Force sync
oc patch application tactical-display -n openshift-gitops \
  --type merge -p '{"operation":{"initiatedBy":{"username":"admin"},"sync":{"revision":"main"}}}'
```

### Sync Failed

```bash
# Check sync status
oc get application tactical-display -n openshift-gitops -o yaml | grep -A 20 status

# View sync logs in ArgoCD UI
# Or check events:
oc get events -n demo --sort-by='.lastTimestamp' | tail -20
```

### Health Status Degraded

```bash
# Check pod status
oc get pods -n demo -l app.kubernetes.io/instance=tactical-display

# Check pod logs
oc logs -n demo deployment/tactical-display-backend
oc logs -n demo deployment/tactical-display-frontend
```

## Advanced: Tekton + ArgoCD Integration

### Auto-Deploy on Build

Update Tekton pipeline to trigger ArgoCD sync after build:

```yaml
# Add to pipeline finally block
- name: trigger-argocd-sync
  taskSpec:
    steps:
      - name: sync
        image: registry.redhat.io/openshift-gitops-1/argocd-rhel9:latest
        script: |
          #!/bin/bash
          argocd app sync tactical-display --server openshift-gitops-server.openshift-gitops.svc.cluster.local
```

### Update Image Tag in Git

For production-style deployments:

```yaml
# Add task to update Helm values with new image tag
- name: update-image-tag
  taskSpec:
    params:
      - name: IMAGE_TAG
    steps:
      - name: update-values
        image: alpine/git
        script: |
          #!/bin/sh
          git clone https://github.com/bgregori/ai-demo.git
          cd ai-demo
          
          # Update image tag in values.yaml
          sed -i "s/tag: .*/tag: $(params.IMAGE_TAG)/" \
            tactical-display/helm/tactical-display/values.yaml
          
          git commit -am "Update image tag to $(params.IMAGE_TAG)"
          git push
```

## Benefits of GitOps

✅ **Git as Single Source of Truth**: All config in Git, versioned and auditable  
✅ **Automated Deployments**: Push to Git → Auto-deploy  
✅ **Self-Healing**: Manual changes are reverted automatically  
✅ **Rollback**: `git revert` to roll back any deployment  
✅ **Audit Trail**: Git history shows who changed what and when  
✅ **Declarative**: Describe desired state, ArgoCD makes it happen  

## Clean Up

```bash
# Delete ArgoCD application (also deletes deployed resources due to prune)
oc delete application tactical-display -n openshift-gitops

# Or delete just the application but keep resources
oc delete application tactical-display -n openshift-gitops --cascade=false
```

## Resources

- **ArgoCD Docs**: https://argo-cd.readthedocs.io/
- **OpenShift GitOps**: https://docs.openshift.com/gitops/
- **Helm with ArgoCD**: https://argo-cd.readthedocs.io/en/stable/user-guide/helm/
