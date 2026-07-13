# Local Testing Guide

The tactical display can run locally using **mock services** instead of connecting to OpenShift cluster services.

## Mock Services

When `tactical.mock.enabled=true`, the application uses:

1. **MockInferenceService** - Generates fake object detections (buildings, aircraft, vehicles, ships)
2. **MockMinioService** - Reads sample xView images from local filesystem

## Quick Start

### 1. Start Backend in Dev Mode (with mocks)

```bash
cd backend
./mvnw quarkus:dev
```

The backend will start on `http://localhost:8080` with **mocks enabled automatically** in dev mode.

### 2. Start Frontend

```bash
cd frontend
npm run dev
```

The frontend will start on `http://localhost:5173`

### 3. Test the Application

1. Open browser to `http://localhost:5173`
2. Click "Browse Images" - should see 8 sample xView images
3. Click any image - should see fake detections (buildings, aircraft, vehicles, ships)
4. Upload a new image - mock will generate random detections

## Configuration

### Enable/Disable Mocks

**application.properties:**
```properties
# Mock mode (default: false in prod, true in dev)
tactical.mock.enabled=false
%dev.tactical.mock.enabled=true
```

**Override in dev mode:**
```bash
# Force mocks OFF in dev mode
./mvnw quarkus:dev -Dtactical.mock.enabled=false

# Force mocks ON in prod mode
java -jar target/quarkus-app/quarkus-run.jar -Dtactical.mock.enabled=true
```

### Sample Images Location

Mock MinIO service reads from:
```
backend/src/main/resources/sample-images/*.png
```

Currently contains 8 xView satellite images copied from frontend.

## Mock Behavior

### MockInferenceService
- Returns 5-20 random detections per image
- Class distribution:
  - 40% Buildings (class 48)
  - 15% Aircraft (classes 0-3)
  - 20% Vehicles (classes 4-16)
  - 15% Ships (classes 23-32)
  - 10% Other rare classes
- Confidence: 0.3-0.95 (random)
- Bounding boxes: Random locations, 5-20% of image size
- Simulates 100-300ms processing delay

### MockMinioService
- Lists images from `sample-images/` directory
- Returns image bytes from local filesystem
- Upload operations are logged but not saved

## Switching to Real Services

To test against actual OpenShift cluster services:

### Option 1: Port-Forward (Recommended)

```bash
# Terminal 1: Port-forward MinIO
oc port-forward -n minio svc/minio-service 9000:9000

# Terminal 2: Port-forward Model Server
oc port-forward -n demo svc/ai-demo-predictor 8888:80

# Terminal 3: Start backend with custom URLs
./mvnw quarkus:dev \
  -Dtactical.mock.enabled=false \
  -Dtactical.model.url=http://localhost:8888 \
  -Dtactical.minio.endpoint=http://localhost:9000
```

### Option 2: Direct Cluster Access

If your machine can reach cluster DNS:

```bash
./mvnw quarkus:dev -Dtactical.mock.enabled=false
```

Uses cluster URLs from `application.properties`.

## Troubleshooting

### "Sample image not found"
- Check: `backend/src/main/resources/sample-images/` contains PNG files
- Run: `ls backend/src/main/resources/sample-images/*.png`

### "No detections shown"
- Check browser console for errors
- Check backend logs: should see "Using MOCK inference"
- Verify: `tactical.mock.enabled=true` in dev mode

### Frontend can't reach backend
- Backend should be on `http://localhost:8080`
- Frontend `.env` should have `VITE_API_URL=/api`
- Check CORS is enabled in `application.properties`

## Sample Images

The mock service includes these xView satellite images:
- `10.png` - Airport with buildings
- `102.png` - Urban area
- `104.png` - Industrial facility
- `950.png` - Port/harbor
- `1036.png` - Mixed urban/rural
- `1037.png` - Residential area
- `1038.png` - Airport/airfield
- `1040.png` - Mixed infrastructure

To add more images, copy PNG files to:
```
backend/src/main/resources/sample-images/
```
