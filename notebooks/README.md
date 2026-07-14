# Training Notebooks for Tactical Display

This directory contains Jupyter notebooks for training and testing the YOLOv8 model on xView satellite imagery.

## Notebooks

- **prepare-xview-dataset.ipynb** - Convert xView dataset to YOLO format
- **train-yolo-xview.ipynb** - Train YOLOv8m model on xView data
- **train_with_class_weights.py** - Helper script for handling class imbalance
- **test-yolo-inference.ipynb** - Test trained model inference
- **verify-minio.ipynb** - Verify MinIO connectivity and data

## Usage in RHOAI Workbench

These notebooks are automatically cloned when you deploy the RHOAI workbench:

```bash
oc apply -f deployment/rhoai-workbench.yaml
```

The workbench will:
- Clone these notebooks from GitHub
- Provide PyTorch environment with GPU access
- Connect to MinIO for data storage
- Allow interactive model training and testing

## Requirements

- GPU access (1x NVIDIA GPU)
- MinIO connection with xView dataset
- 16GB RAM minimum
- 20GB persistent storage

## Training the Model

1. Open the RHOAI workbench
2. Navigate to notebooks/
3. Start with `prepare-xview-dataset.ipynb` to prepare data
4. Use `train-yolo-xview.ipynb` to train the model
5. Test with `test-yolo-inference.ipynb`

The trained model can then be exported and deployed to the tactical display application.
