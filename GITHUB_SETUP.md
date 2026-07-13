# GitHub Repository Setup

Quick guide to initialize this repository and push to GitHub.

## Prerequisites

- GitHub account
- Git CLI installed
- Repository files ready (already in place)

## Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `tactical-satellite-demo` (or your choice)
3. **Do NOT** initialize with README, .gitignore, or license (we already have these)
4. Make it **Public** or **Private** based on your needs
5. Click **Create repository**

## Step 2: Initialize Local Repository

```bash
cd /Users/bgregori/src/claude-projects/ai-demo

# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Tactical satellite analysis demo

- YOLOv8m model trained on xView dataset (60 classes)
- Quarkus backend with OpenVINO inference
- React frontend with tactical UI
- OpenShift deployment with Helm
- Tekton CI/CD pipeline
- Red Hat UBI hardened images"
```

## Step 3: Handle Large Model File (99MB)

You have two options:

### Option A: Use Git LFS (Recommended for tracking models in Git)

```bash
# Install Git LFS
brew install git-lfs
git lfs install

# Track ONNX models
git lfs track "*.onnx"
git add .gitattributes

# Commit LFS configuration
git commit -m "Configure Git LFS for model files"

# Model file is already added, just verify
git lfs ls-files
# Should show: models/yolov8m-xview/1/model.onnx
```

### Option B: Don't Track Model in Git (Alternative)

```bash
# Add model to .gitignore
echo "models/**/*.onnx" >> .gitignore

# Remove model from staging
git rm --cached models/yolov8m-xview/1/model.onnx

# Commit change
git commit -m "Exclude large model files from Git

Models should be downloaded separately or uploaded directly to MinIO.
See models/README.md for instructions."
```

## Step 4: Push to GitHub

```bash
# Add remote (replace YOUR_ORG with your GitHub username or org)
git remote add origin https://github.com/YOUR_ORG/tactical-satellite-demo.git

# Push to GitHub
git branch -M main
git push -u origin main
```

If using Git LFS, the first push will upload the model file to LFS storage (may take a few minutes for 99MB).

## Step 5: Update Tekton Pipeline

After pushing to GitHub, update the Tekton PipelineRun to use your actual repository:

```bash
cd tactical-display/tekton

# Edit the file
vi 05-pipelinerun-git.yaml

# Change line 14:
# FROM: value: https://github.com/YOUR_ORG/tactical-satellite-demo.git
# TO:   value: https://github.com/<your-actual-org>/tactical-satellite-demo.git

# Commit and push
git add 05-pipelinerun-git.yaml
git commit -m "Update Tekton pipeline with actual GitHub URL"
git push
```

## Step 6: Verify Repository

Visit your repository on GitHub:
```
https://github.com/YOUR_ORG/tactical-satellite-demo
```

You should see:
- ✅ README.md rendered on the homepage
- ✅ All source code in `tactical-display/`
- ✅ Deployment guides (DEPLOYMENT_GUIDE.md, DEPLOYMENT_GUIDE_GITHUB.md)
- ✅ Tekton pipeline files
- ✅ Helm charts
- ✅ Model file (if using Git LFS) or instructions to download (if excluded)

## Repository Structure

```
tactical-satellite-demo/
├── README.md                      # Project overview with architecture
├── DEPLOYMENT_GUIDE.md            # Original deployment guide
├── DEPLOYMENT_GUIDE_GITHUB.md     # GitHub-based deployment guide
├── GITHUB_SETUP.md                # This file
├── .gitignore                     # Ignore rules
├── .gitattributes                 # Git LFS configuration (if using LFS)
├── setup-github.sh                # Automated setup script
│
├── models/                        # Trained models
│   ├── README.md
│   └── yolov8m-xview/
│       └── 1/
│           └── model.onnx         # 99MB (Git LFS or excluded)
│
├── deployment/                    # Kubernetes manifests
│   └── minio.yaml                 # MinIO deployment
│
└── tactical-display/              # Application
    ├── backend/                   # Quarkus Java backend
    ├── frontend/                  # React frontend
    ├── helm/                      # Helm charts
    └── tekton/                    # CI/CD pipeline
```

## Next Steps

Now that the repository is on GitHub:

1. **Deploy to new cluster:**
   ```bash
   git clone https://github.com/YOUR_ORG/tactical-satellite-demo.git
   cd tactical-satellite-demo
   ./setup-github.sh
   ```

2. **Enable GitHub Actions (Optional):**
   - Create `.github/workflows/build.yaml` to trigger builds on push
   - See DEPLOYMENT_GUIDE_GITHUB.md for GitHub Actions example

3. **Create Release (Optional):**
   ```bash
   git tag -a v1.0.0 -m "Release v1.0.0 - Initial tactical display demo"
   git push origin v1.0.0
   ```

4. **Share with Team:**
   - Add collaborators in GitHub repository settings
   - Document any cluster-specific configuration in GitHub wiki

## Troubleshooting

### Push rejected: file too large

If you didn't set up Git LFS and the model file is too large:
```bash
# Use Option B above to exclude model from Git
# Then force push (be careful!)
git push -f origin main
```

### Git LFS quota exceeded

GitHub Free has 1GB LFS storage. If exceeded:
- Use Option B to exclude models from Git
- Document how to download models in `models/README.md`
- Store models in GitHub Releases or external storage

### Authentication failed

Use GitHub Personal Access Token:
```bash
# Generate token at: https://github.com/settings/tokens
# Use token as password when prompted
git push origin main
```

Or use SSH:
```bash
git remote set-url origin git@github.com:YOUR_ORG/tactical-satellite-demo.git
git push origin main
```

## Git Cheat Sheet

```bash
# Check status
git status

# See what's being tracked
git ls-files

# See file sizes
git ls-files | xargs ls -lh

# Check LFS files
git lfs ls-files

# View commit history
git log --oneline

# Create new branch
git checkout -b feature-branch

# Undo last commit (keep changes)
git reset --soft HEAD~1

# View remote URL
git remote -v
```

## Resources

- **Git LFS:** https://git-lfs.github.com/
- **GitHub Docs:** https://docs.github.com/
- **Large Files:** https://docs.github.com/en/repositories/working-with-files/managing-large-files
