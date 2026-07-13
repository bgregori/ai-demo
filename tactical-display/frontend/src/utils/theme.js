export const theme = {
  colors: {
    background: '#0a0e14',
    backgroundSecondary: '#131921',
    backgroundTertiary: '#1a2332',
    border: '#2a3f5f',
    borderActive: '#3a7bd5',
    text: '#e0e6ed',
    textSecondary: '#9ba3af',
    textMuted: '#6b7280',
    primary: '#3a7bd5',
    success: '#00d084',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#06b6d4',
  },

  classColors: {
    aircraft: '#ef4444',      // red
    vehicle: '#f59e0b',       // orange
    maritime: '#06b6d4',      // cyan
    railway: '#8b5cf6',       // purple
    engineering: '#f97316',   // orange-red
    building: '#10b981',      // green
    infrastructure: '#3b82f6', // blue
    default: '#9ca3af',       // gray
  },

  getClassColor(className) {
    if (!className) return this.classColors.default;

    const lower = className.toLowerCase();
    if (lower.includes('aircraft') || lower.includes('helicopter')) {
      return this.classColors.aircraft;
    }
    if (lower.includes('vehicle') || lower.includes('car') || lower.includes('truck') || lower.includes('bus')) {
      return this.classColors.vehicle;
    }
    if (lower.includes('ship') || lower.includes('vessel') || lower.includes('boat') || lower.includes('yacht') || lower.includes('ferry')) {
      return this.classColors.maritime;
    }
    if (lower.includes('railway') || lower.includes('locomotive') || lower.includes('train')) {
      return this.classColors.railway;
    }
    if (lower.includes('crane') || lower.includes('excavator') || lower.includes('bulldozer') || lower.includes('loader')) {
      return this.classColors.engineering;
    }
    if (lower.includes('building') || lower.includes('hangar') || lower.includes('facility') || lower.includes('shed') || lower.includes('hut')) {
      return this.classColors.building;
    }
    if (lower.includes('tower') || lower.includes('pylon') || lower.includes('tank') || lower.includes('container') || lower.includes('helipad')) {
      return this.classColors.infrastructure;
    }

    return this.classColors.default;
  },

  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.5)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
  },
};
