import { useState, useEffect } from 'react';
import { TacticalMap } from './components/TacticalMap';
import { DetectionFeed } from './components/DetectionFeed';
import { ImageQueue } from './components/ImageQueue';
import { SummaryDashboard } from './components/SummaryDashboard';
import { LiveFeedToggle } from './components/LiveFeedToggle';
import { ConfidenceSlider } from './components/ConfidenceSlider';
import { useLiveFeed } from './hooks/useLiveFeed';
import { api } from './utils/api';
import { theme } from './utils/theme';

function App() {
  const [images, setImages] = useState([]);
  const [selectedImageKey, setSelectedImageKey] = useState(null);
  const [analysisResults, setAnalysisResults] = useState({});
  const [summary, setSummary] = useState(null);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.25);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Live feed hook
  const { isActive: isLiveFeedActive, toggle: toggleLiveFeed } = useLiveFeed(
    images,
    handleAnalyzeImage,
    8000
  );

  // Load images on mount
  useEffect(() => {
    loadImages();
    loadSummary();
  }, []);

  async function loadImages() {
    try {
      const data = await api.listImages();
      setImages(data);
      setError(null);
    } catch (err) {
      setError('Failed to load images: ' + err.message);
    }
  }

  async function loadSummary() {
    try {
      const data = await api.getSummary();
      setSummary(data);
    } catch (err) {
      // Summary might fail if no images analyzed yet
      console.log('No summary available yet');
    }
  }

  async function handleAnalyzeImage(imageKey) {
    // Switch to the image immediately (even if not analyzed yet)
    setSelectedImageKey(imageKey);

    // Check if already analyzed
    if (analysisResults[imageKey]) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await api.analyzeImage(imageKey);
      setAnalysisResults((prev) => ({
        ...prev,
        [imageKey]: result,
      }));

      // Mark image as analyzed
      setImages((prev) =>
        prev.map((img) => (img.key === imageKey ? { ...img, analyzed: true } : img))
      );

      // Reload summary
      await loadSummary();
    } catch (err) {
      setError('Failed to analyze image: ' + err.message);
      setSelectedImageKey(null); // Clear selection on error
    } finally {
      setIsLoading(false);
    }
  }

  async function handleReanalyzeImage(imageKey) {
    setIsLoading(true);
    setError(null);

    try {
      // Force re-analysis by calling API again
      const result = await api.analyzeImage(imageKey);
      setAnalysisResults((prev) => ({
        ...prev,
        [imageKey]: result,
      }));
      setSelectedImageKey(imageKey);

      // Reload summary
      await loadSummary();
    } catch (err) {
      setError('Failed to re-analyze image: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUploadImage(file) {
    setIsLoading(true);
    setError(null);

    try {
      const result = await api.uploadImage(file);
      await loadImages();

      // Auto-analyze the uploaded image
      const imageKey = result.imageKey;
      const analysisResult = await api.analyzeImage(imageKey);
      setAnalysisResults((prev) => ({
        ...prev,
        [imageKey]: analysisResult,
      }));

      // Switch to the uploaded image
      setSelectedImageKey(imageKey);

      // Mark as analyzed and reload summary
      setImages((prev) =>
        prev.map((img) => (img.key === imageKey ? { ...img, analyzed: true } : img))
      );
      await loadSummary();

      setError(null);
    } catch (err) {
      setError('Failed to upload image: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }

  const currentAnalysis = selectedImageKey ? analysisResults[selectedImageKey] : null;

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: theme.colors.background,
        color: theme.colors.text,
        fontFamily: 'monospace',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: '16px 24px',
          backgroundColor: theme.colors.backgroundTertiary,
          borderBottom: `2px solid ${theme.colors.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: '24px',
              fontWeight: 'bold',
              color: theme.colors.primary,
              letterSpacing: '2px',
            }}
          >
            ⬢ TACTICAL SATELLITE ANALYSIS
          </h1>
          <div style={{ fontSize: '12px', color: theme.colors.textSecondary, marginTop: '4px' }}>
            YOLO Object Detection System
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <ConfidenceSlider value={confidenceThreshold} onChange={setConfidenceThreshold} />
          <LiveFeedToggle isActive={isLiveFeedActive} onToggle={toggleLiveFeed} />
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div
          style={{
            padding: '12px 24px',
            backgroundColor: theme.colors.danger,
            color: theme.colors.text,
            fontSize: '14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>⚠ {error}</span>
          <button
            onClick={() => setError(null)}
            style={{
              background: 'none',
              border: 'none',
              color: theme.colors.text,
              cursor: 'pointer',
              fontSize: '18px',
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div
          style={{
            padding: '8px 24px',
            backgroundColor: theme.colors.info,
            color: theme.colors.text,
            fontSize: '14px',
            textAlign: 'center',
          }}
        >
          PROCESSING...
        </div>
      )}

      {/* Summary Dashboard */}
      {summary && (
        <div style={{ padding: '16px 24px' }}>
          <SummaryDashboard summary={summary} />
        </div>
      )}

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', gap: '16px', padding: '16px 24px', overflow: 'hidden' }}>
        {/* Left: Image Queue */}
        <div
          style={{
            width: '280px',
            backgroundColor: theme.colors.backgroundSecondary,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: '4px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <ImageQueue
            images={images}
            selectedImageKey={selectedImageKey}
            onSelectImage={handleAnalyzeImage}
            onUpload={handleUploadImage}
            onReanalyze={handleReanalyzeImage}
          />
        </div>

        {/* Center: Tactical Map */}
        <TacticalMap
          analysisResult={currentAnalysis}
          confidenceThreshold={confidenceThreshold}
          isProcessing={isLoading && selectedImageKey && !currentAnalysis}
          selectedImageKey={selectedImageKey}
        />

        {/* Right: Detection Feed */}
        <div
          style={{
            width: '350px',
            backgroundColor: theme.colors.backgroundSecondary,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: '4px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <DetectionFeed
            detections={currentAnalysis?.detections}
            confidenceThreshold={confidenceThreshold}
          />
        </div>
      </div>

      {/* Footer */}
      <footer
        style={{
          padding: '12px 24px',
          backgroundColor: theme.colors.backgroundTertiary,
          borderTop: `1px solid ${theme.colors.border}`,
          fontSize: '11px',
          color: theme.colors.textMuted,
          textAlign: 'center',
        }}
      >
        Tactical Display Demo | YOLO26n on xView Dataset | {images.length} images available
      </footer>
    </div>
  );
}

export default App;
