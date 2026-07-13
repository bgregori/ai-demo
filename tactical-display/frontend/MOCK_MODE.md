# Mock Mode for Local Testing

The frontend now supports **mock mode** for local development and testing without needing the backend or cluster services.

## Enabling Mock Mode

Edit `.env`:
```
VITE_USE_MOCK=true
```

Then restart the dev server.

## What's Mocked

### Mock Data Includes:
- **8 xView satellite images** with realistic metadata
- **5-15 detections per image** with random but consistent results
- **14 different object classes** (aircraft, vehicles, buildings, etc.)
- **Realistic confidence scores** (0.4 - 1.0)
- **Processing delays** (800ms for analysis, simulates real inference time)
- **Summary statistics** aggregated from analyzed images

### API Endpoints Mocked:
- `listImages()` - Returns 8 mock xView images
- `analyzeImage(key)` - Returns generated detections with simulated delay
- `uploadImage(file)` - Accepts uploads and adds to mock image list
- `getSummary()` - Returns aggregated statistics
- `getHealth()` - Returns mock health status

## Features You Can Test

✅ **Image Queue** - Select images from the list  
✅ **Analysis** - Click an image to analyze it  
✅ **Detection Overlays** - See bounding boxes drawn on canvas  
✅ **Detection Feed** - View detections sorted by confidence or class  
✅ **Confidence Filter** - Adjust slider to filter low-confidence detections  
✅ **Live Feed Mode** - Toggle auto-cycling through images  
✅ **Summary Dashboard** - See aggregate stats update as you analyze  
✅ **Color Coding** - Different colors for aircraft, vehicles, buildings, etc.  
✅ **Upload** - Drag & drop images (they'll be added to the mock list)

## Switching to Real API

Edit `.env`:
```
VITE_USE_MOCK=false
VITE_API_URL=http://your-backend-url/api
```

## Mock Data Generation

Mock detections are **deterministic** - the same image always produces the same detections. This is achieved by seeding the random number generator with the image index.

### Class Distribution:
The mock data includes a realistic mix of object types:
- Aircraft (fixed-wing, small, helicopter)
- Ground vehicles (cars, trucks, buses)
- Maritime vessels (ships, boats)
- Industrial equipment (cranes, excavators)
- Infrastructure (buildings, tanks, towers)

Each detection has:
- `classId` - Integer index
- `className` - Human-readable name
- `confidence` - Float 0.4-1.0
- `box` - {x, y, width, height} in pixels
