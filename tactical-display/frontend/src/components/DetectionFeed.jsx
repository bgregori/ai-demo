import { useState } from 'react';
import { theme } from '../utils/theme';

export function DetectionFeed({ detections, confidenceThreshold }) {
  const [sortBy, setSortBy] = useState('confidence'); // 'confidence' | 'class'

  if (!detections || detections.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: theme.colors.textMuted,
          fontFamily: 'monospace',
          fontSize: '14px',
        }}
      >
        No detections
      </div>
    );
  }

  const filtered = detections.filter((d) => d.confidence >= confidenceThreshold);

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'confidence') {
      return b.confidence - a.confidence;
    } else {
      return a.className.localeCompare(b.className);
    }
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
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
          DETECTIONS ({filtered.length})
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{
            backgroundColor: theme.colors.backgroundSecondary,
            color: theme.colors.text,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: '4px',
            padding: '4px 8px',
            fontFamily: 'monospace',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          <option value="confidence">By Confidence</option>
          <option value="class">By Class</option>
        </select>
      </div>

      {/* Detection list */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '8px',
        }}
      >
        {sorted.map((detection, index) => {
          const color = theme.getClassColor(detection.className);
          const confidencePercent = (detection.confidence * 100).toFixed(1);

          return (
            <div
              key={index}
              style={{
                padding: '12px',
                marginBottom: '8px',
                backgroundColor: theme.colors.backgroundSecondary,
                border: `1px solid ${theme.colors.border}`,
                borderLeft: `4px solid ${color}`,
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.backgroundTertiary;
                e.currentTarget.style.borderColor = color;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
                e.currentTarget.style.borderColor = theme.colors.border;
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '6px',
                }}
              >
                <div style={{ color: theme.colors.text, fontWeight: 'bold' }}>
                  {detection.className}
                </div>
                <div
                  style={{
                    color:
                      detection.confidence >= 0.8
                        ? theme.colors.success
                        : detection.confidence >= 0.5
                        ? theme.colors.warning
                        : theme.colors.danger,
                    fontWeight: 'bold',
                  }}
                >
                  {confidencePercent}%
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  color: theme.colors.textSecondary,
                  fontSize: '11px',
                }}
              >
                <div>
                  X: {detection.box.x.toFixed(0)} Y: {detection.box.y.toFixed(0)}
                </div>
                <div>
                  W: {detection.box.width.toFixed(0)} H: {detection.box.height.toFixed(0)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
