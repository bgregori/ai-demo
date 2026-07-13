import { useRef, useEffect, useState } from 'react';
import { theme } from '../utils/theme';
import { api } from '../utils/api';

export function TacticalMap({ analysisResult, confidenceThreshold, isProcessing, selectedImageKey, onDetectionClick }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imageRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [processingImageLoaded, setProcessingImageLoaded] = useState(false);

  // Load image when processing starts (before analysis completes)
  useEffect(() => {
    if (isProcessing && selectedImageKey) {
      setProcessingImageLoaded(false);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const img = new Image();
      imageRef.current = img;

      img.onload = () => {
        const imgWidth = img.naturalWidth || img.width;
        const imgHeight = img.naturalHeight || img.height;

        canvas.width = imgWidth;
        canvas.height = imgHeight;

        // Draw the image
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        setProcessingImageLoaded(true);
      };

      img.onerror = () => {
        console.error('Failed to load processing image');
        setProcessingImageLoaded(false);
      };

      const imageUrl = api.getImageUrl(selectedImageKey);
      img.src = imageUrl + '?v=' + Date.now();
      img.crossOrigin = 'anonymous';
    } else {
      // Reset processing state when not processing
      setProcessingImageLoaded(false);
    }
  }, [isProcessing, selectedImageKey]);

  // Load image when analysisResult changes
  useEffect(() => {
    if (!analysisResult) {
      setImageLoaded(false);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Always load the image fresh to avoid state confusion
    setImageLoaded(false);

    const img = new Image();

    img.onload = () => {
      // Set canvas size to match the actual loaded image dimensions
      const imgWidth = img.naturalWidth || img.width;
      const imgHeight = img.naturalHeight || img.height;

      canvas.width = imgWidth;
      canvas.height = imgHeight;

      // Update ref AFTER image loads
      imageRef.current = img;
      setImageLoaded(true);
    };

    img.onerror = () => {
      console.error('Failed to load image');
      setImageLoaded(false);
    };

    // Load the actual satellite image
    const imageUrl = api.getImageUrl(analysisResult.imageId);

    // Browser will cache this, so no duplicate downloads for the same image
    img.src = imageUrl;
    img.crossOrigin = 'anonymous'; // Allow CORS for canvas drawing
  }, [analysisResult]);

  // Draw canvas whenever image loads or confidence changes
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !analysisResult || !imageLoaded) return;

    const ctx = canvas.getContext('2d');

    // Clear canvas first
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image at full canvas size
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Draw grid overlay on top of the image
    ctx.strokeStyle = 'rgba(58, 123, 213, 0.15)';
    ctx.lineWidth = 1;
    const gridSize = 100;
    for (let x = 0; x <= canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Calculate scale factors between mock dimensions and actual image
    const scaleX = canvas.width / analysisResult.imageWidth;
    const scaleY = canvas.height / analysisResult.imageHeight;

    // Filter detections by confidence threshold
    const filteredDetections = analysisResult.detections.filter(
      (detection) => detection.confidence >= confidenceThreshold
    );

    // Draw detections
    filteredDetections.forEach((detection) => {
      const color = theme.getClassColor(detection.className);

      // Scale box coordinates to match actual image dimensions
      const scaledX = detection.box.x * scaleX;
      const scaledY = detection.box.y * scaleY;
      const scaledWidth = detection.box.width * scaleX;
      const scaledHeight = detection.box.height * scaleY;

      // Draw bounding box
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);

      // Draw label background
      const label = `${detection.className} ${(detection.confidence * 100).toFixed(0)}%`;
      ctx.font = '14px monospace';
      const textMetrics = ctx.measureText(label);
      const labelHeight = 20;
      const labelPadding = 4;

      ctx.fillStyle = color;
      ctx.fillRect(
        scaledX,
        scaledY - labelHeight - labelPadding,
        textMetrics.width + labelPadding * 2,
        labelHeight
      );

      // Draw label text
      ctx.fillStyle = theme.colors.background;
      ctx.fillText(
        label,
        scaledX + labelPadding,
        scaledY - labelPadding - 4
      );
    });
  }, [analysisResult, confidenceThreshold, imageLoaded]);

  // Calculate filtered detections count
  const filteredCount = analysisResult
    ? analysisResult.detections.filter((d) => d.confidence >= confidenceThreshold).length
    : 0;

  // Show processing state if we're analyzing
  if (isProcessing && !analysisResult) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: theme.colors.backgroundSecondary,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: '4px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '12px 16px',
            borderBottom: `1px solid ${theme.colors.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: theme.colors.backgroundTertiary,
          }}
        >
          <div style={{ fontFamily: 'monospace', fontSize: '14px', color: theme.colors.text }}>
            <span style={{ color: theme.colors.textSecondary }}>PROCESSING:</span> {selectedImageKey?.split('/').pop()}
          </div>
        </div>

        <div
          ref={containerRef}
          style={{
            flex: 1,
            overflow: 'hidden',
            position: 'relative',
            backgroundColor: theme.colors.background,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {processingImageLoaded ? (
            <>
              <canvas
                ref={canvasRef}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  boxShadow: theme.shadows.lg,
                  filter: 'brightness(0.6)',
                }}
              />
              {/* Processing Overlay */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                }}
              >
                {/* Scanning animation */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: `linear-gradient(90deg, transparent, ${theme.colors.primary}, transparent)`,
                    animation: 'scan 2s linear infinite',
                  }}
                />
                <style>
                  {`
                    @keyframes scan {
                      0% { transform: translateY(0); }
                      100% { transform: translateY(100vh); }
                    }
                    @keyframes pulse {
                      0%, 100% { opacity: 1; }
                      50% { opacity: 0.4; }
                    }
                    @keyframes rotate {
                      from { transform: rotate(0deg); }
                      to { transform: rotate(360deg); }
                    }
                  `}
                </style>
                {/* Center status */}
                <div
                  style={{
                    padding: '24px 32px',
                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
                    border: `2px solid ${theme.colors.primary}`,
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '16px',
                    boxShadow: `0 0 20px ${theme.colors.primary}80`,
                  }}
                >
                  {/* Spinner */}
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      border: `4px solid ${theme.colors.border}`,
                      borderTop: `4px solid ${theme.colors.primary}`,
                      borderRadius: '50%',
                      animation: 'rotate 1s linear infinite',
                    }}
                  />
                  <div
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '18px',
                      color: theme.colors.primary,
                      fontWeight: 'bold',
                      letterSpacing: '2px',
                      animation: 'pulse 1.5s ease-in-out infinite',
                    }}
                  >
                    ANALYZING TARGET
                  </div>
                  <div
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      color: theme.colors.textSecondary,
                    }}
                  >
                    Running YOLO object detection...
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: '14px',
                color: theme.colors.textMuted,
              }}
            >
              Loading image...
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!analysisResult) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.backgroundSecondary,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: '4px',
          color: theme.colors.textMuted,
          fontFamily: 'monospace',
        }}
      >
        No image selected
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: theme.colors.backgroundSecondary,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: '4px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          borderBottom: `1px solid ${theme.colors.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: theme.colors.backgroundTertiary,
        }}
      >
        <div style={{ fontFamily: 'monospace', fontSize: '14px', color: theme.colors.text }}>
          <span style={{ color: theme.colors.textSecondary }}>IMAGE:</span> {analysisResult.imageName}
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: '12px', color: theme.colors.textSecondary }}>
          {analysisResult.imageWidth} × {analysisResult.imageHeight} | {filteredCount}/{analysisResult.detections.length} DETECTIONS | {analysisResult.processingTimeMs}ms
        </div>
      </div>

      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
          backgroundColor: theme.colors.background,
          cursor: isPanning ? 'grabbing' : 'grab',
        }}
        onWheel={(e) => {
          e.preventDefault();
          const delta = e.deltaY > 0 ? 0.9 : 1.1;
          const newZoom = Math.min(Math.max(zoom * delta, 0.5), 10);
          setZoom(newZoom);
        }}
        onMouseDown={(e) => {
          setIsPanning(true);
          setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        }}
        onMouseMove={(e) => {
          if (isPanning) {
            setPan({
              x: e.clientX - panStart.x,
              y: e.clientY - panStart.y,
            });
          }
        }}
        onMouseUp={() => setIsPanning(false)}
        onMouseLeave={() => setIsPanning(false)}
      >
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px))`,
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              boxShadow: theme.shadows.lg,
              transform: `scale(${zoom})`,
              transformOrigin: 'center center',
            }}
          />
        </div>

        {/* Zoom indicator */}
        <div
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            padding: '6px 12px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: theme.colors.text,
            fontFamily: 'monospace',
            fontSize: '12px',
            borderRadius: '4px',
            pointerEvents: 'none',
          }}
        >
          ZOOM: {(zoom * 100).toFixed(0)}%
        </div>

        {/* Instructions */}
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            padding: '6px 12px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: theme.colors.textSecondary,
            fontFamily: 'monospace',
            fontSize: '11px',
            borderRadius: '4px',
            pointerEvents: 'none',
          }}
        >
          🖱️ Scroll to zoom • Drag to pan
        </div>
      </div>
    </div>
  );
}
