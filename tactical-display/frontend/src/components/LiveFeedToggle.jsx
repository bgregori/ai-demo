import { theme } from '../utils/theme';

export function LiveFeedToggle({ isActive, onToggle }) {
  return (
    <button
      onClick={onToggle}
      style={{
        padding: '10px 20px',
        backgroundColor: isActive ? theme.colors.danger : theme.colors.success,
        color: theme.colors.text,
        border: 'none',
        borderRadius: '4px',
        fontFamily: 'monospace',
        fontSize: '14px',
        fontWeight: 'bold',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.2s',
        boxShadow: theme.shadows.md,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)';
        e.currentTarget.style.boxShadow = theme.shadows.lg;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = theme.shadows.md;
      }}
    >
      <div
        style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          backgroundColor: theme.colors.text,
          animation: isActive ? 'pulse 1.5s infinite' : 'none',
        }}
      />
      {isActive ? 'STOP LIVE FEED' : 'START LIVE FEED'}

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
        }
      `}</style>
    </button>
  );
}
