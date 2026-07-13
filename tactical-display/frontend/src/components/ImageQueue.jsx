import { theme } from '../utils/theme';

export function ImageQueue({ images, selectedImageKey, onSelectImage, onUpload, onReanalyze }) {
  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: `1px solid ${theme.colors.border}`,
          backgroundColor: theme.colors.backgroundTertiary,
        }}
      >
        <div style={{ fontFamily: 'monospace', fontSize: '14px', color: theme.colors.text, marginBottom: '12px' }}>
          IMAGE QUEUE ({images.length})
        </div>

        {/* Upload button */}
        <label
          style={{
            display: 'block',
            width: '100%',
            padding: '8px',
            backgroundColor: theme.colors.primary,
            color: theme.colors.text,
            border: 'none',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '12px',
            fontWeight: 'bold',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#4a8be5';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = theme.colors.primary;
          }}
        >
          ↑ UPLOAD IMAGE
          <input
            type="file"
            accept="image/png,image/jpeg"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      {/* Image list */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '8px',
        }}
      >
        {images.map((image) => {
          const isSelected = image.key === selectedImageKey;

          return (
            <div
              key={image.key}
              onClick={() => onSelectImage(image.key)}
              style={{
                padding: '10px 12px',
                marginBottom: '6px',
                backgroundColor: isSelected
                  ? theme.colors.backgroundTertiary
                  : theme.colors.backgroundSecondary,
                border: `1px solid ${
                  isSelected ? theme.colors.borderActive : theme.colors.border
                }`,
                borderRadius: '4px',
                cursor: 'pointer',
                fontFamily: 'monospace',
                fontSize: '12px',
                transition: 'all 0.2s',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = theme.colors.backgroundTertiary;
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
                }
              }}
            >
              <div
                style={{
                  color: theme.colors.text,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                }}
              >
                {image.name}
              </div>

              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                {image.analyzed && (
                  <>
                    <div
                      style={{
                        padding: '2px 6px',
                        backgroundColor: theme.colors.success,
                        color: theme.colors.background,
                        borderRadius: '3px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                      }}
                    >
                      ✓
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Don't trigger image selection
                        onReanalyze(image.key);
                      }}
                      style={{
                        padding: '3px 8px',
                        backgroundColor: theme.colors.warning,
                        color: theme.colors.background,
                        border: 'none',
                        borderRadius: '3px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        fontFamily: 'monospace',
                      }}
                      title="Re-analyze this image"
                    >
                      ↻
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
