import { theme } from '../utils/theme';

export function SummaryDashboard({ summary }) {
  if (!summary) {
    return null;
  }

  const topClasses = Object.entries(summary.detectionsByClass || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        padding: '16px',
        backgroundColor: theme.colors.backgroundSecondary,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: '4px',
      }}
    >
      {/* Total Images */}
      <div
        style={{
          padding: '16px',
          backgroundColor: theme.colors.backgroundTertiary,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: '4px',
        }}
      >
        <div
          style={{
            fontSize: '12px',
            color: theme.colors.textSecondary,
            fontFamily: 'monospace',
            marginBottom: '8px',
          }}
        >
          IMAGES ANALYZED
        </div>
        <div
          style={{
            fontSize: '32px',
            color: theme.colors.info,
            fontFamily: 'monospace',
            fontWeight: 'bold',
          }}
        >
          {summary.totalImagesAnalyzed}
        </div>
      </div>

      {/* Total Detections */}
      <div
        style={{
          padding: '16px',
          backgroundColor: theme.colors.backgroundTertiary,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: '4px',
        }}
      >
        <div
          style={{
            fontSize: '12px',
            color: theme.colors.textSecondary,
            fontFamily: 'monospace',
            marginBottom: '8px',
          }}
        >
          TOTAL DETECTIONS
        </div>
        <div
          style={{
            fontSize: '32px',
            color: theme.colors.success,
            fontFamily: 'monospace',
            fontWeight: 'bold',
          }}
        >
          {summary.totalDetections}
        </div>
      </div>

      {/* Average Confidence */}
      <div
        style={{
          padding: '16px',
          backgroundColor: theme.colors.backgroundTertiary,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: '4px',
        }}
      >
        <div
          style={{
            fontSize: '12px',
            color: theme.colors.textSecondary,
            fontFamily: 'monospace',
            marginBottom: '8px',
          }}
        >
          AVG CONFIDENCE
        </div>
        <div
          style={{
            fontSize: '32px',
            color:
              summary.averageConfidence >= 0.8
                ? theme.colors.success
                : summary.averageConfidence >= 0.5
                ? theme.colors.warning
                : theme.colors.danger,
            fontFamily: 'monospace',
            fontWeight: 'bold',
          }}
        >
          {(summary.averageConfidence * 100).toFixed(1)}%
        </div>
      </div>

      {/* Top Classes */}
      {topClasses.length > 0 && (
        <div
          style={{
            padding: '16px',
            backgroundColor: theme.colors.backgroundTertiary,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: '4px',
            gridColumn: 'span 2',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              color: theme.colors.textSecondary,
              fontFamily: 'monospace',
              marginBottom: '12px',
            }}
          >
            TOP DETECTIONS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {topClasses.map(([className, count]) => {
              const color = theme.getClassColor(className);
              const percent = ((count / summary.totalDetections) * 100).toFixed(1);

              return (
                <div key={className}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '4px',
                      fontFamily: 'monospace',
                      fontSize: '11px',
                    }}
                  >
                    <span style={{ color: theme.colors.text }}>{className}</span>
                    <span style={{ color: theme.colors.textSecondary }}>
                      {count} ({percent}%)
                    </span>
                  </div>
                  <div
                    style={{
                      height: '6px',
                      backgroundColor: theme.colors.backgroundSecondary,
                      borderRadius: '3px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${percent}%`,
                        height: '100%',
                        backgroundColor: color,
                        transition: 'width 0.3s',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
