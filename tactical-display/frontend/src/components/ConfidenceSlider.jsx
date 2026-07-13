import { theme } from '../utils/theme';

export function ConfidenceSlider({ value, onChange }) {
  const percent = (value * 100).toFixed(0);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        minWidth: '200px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: 'monospace',
          fontSize: '12px',
        }}
      >
        <span style={{ color: theme.colors.textSecondary }}>CONFIDENCE FILTER</span>
        <span style={{ color: theme.colors.text, fontWeight: 'bold' }}>{percent}%</span>
      </div>

      <input
        type="range"
        min="0"
        max="100"
        value={value * 100}
        onChange={(e) => onChange(parseFloat(e.target.value) / 100)}
        style={{
          width: '100%',
          height: '6px',
          borderRadius: '3px',
          outline: 'none',
          WebkitAppearance: 'none',
          appearance: 'none',
          background: `linear-gradient(to right, ${theme.colors.primary} 0%, ${theme.colors.primary} ${percent}%, ${theme.colors.backgroundTertiary} ${percent}%, ${theme.colors.backgroundTertiary} 100%)`,
        }}
      />

      <style>{`
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: ${theme.colors.text};
          cursor: pointer;
          border: 2px solid ${theme.colors.primary};
        }

        input[type='range']::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: ${theme.colors.text};
          cursor: pointer;
          border: 2px solid ${theme.colors.primary};
        }
      `}</style>
    </div>
  );
}
