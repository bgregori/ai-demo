# Tactical Satellite Analysis Display - Frontend

React-based tactical display interface for satellite image analysis using YOLO object detection.

## Features

- **Tactical Dark Theme** - Military-style interface with monospace fonts
- **Live Image Feed** - Auto-cycling analysis with configurable interval
- **Real-time Detections** - Bounding boxes overlaid on satellite imagery
- **Detection Feed** - Sortable list of detected objects with confidence scores
- **Summary Dashboard** - Aggregate statistics and top detections
- **Confidence Filter** - Adjustable threshold slider
- **Drag & Drop Upload** - Easy image upload capability

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

Frontend runs on http://localhost:5173

## Configuration

Create `.env` file:
```
VITE_API_URL=http://localhost:8080/api
```

## Architecture

```
App.jsx (Main container)
  ├─> ImageQueue (Left sidebar)
  ├─> TacticalMap (Center - canvas with detections)
  ├─> DetectionFeed (Right sidebar)
  ├─> SummaryDashboard (Top stats)
  ├─> LiveFeedToggle (Header control)
  └─> ConfidenceSlider (Header control)
```

## Tech Stack

- React 18
- Vite 8
- Native Canvas API for detection overlay
- CSS-in-JS for tactical styling
- No UI framework dependencies
