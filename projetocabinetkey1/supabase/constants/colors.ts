export default {
  // Cores Neutras Elegantes
  noir: '#0a0a0a',         // Preto sofisticado
  pearl: '#f8f5f2',       // Branco perolado
  slate: {
    100: '#f3f5f7',
    200: '#e6e8eb',
    300: '#d4dae0',
    400: '#b8c0c9',
    500: '#7d8b9a',
    600: '#58626e',
    700: '#3a4754',
    800: '#1a222d',
    900: '#1a222d'
  },

  // Cores Principais Vibrantes
  neon: {
    aqua: '#0ff0fc',      // Azul neon brilhante
    lime: '#a2ff00',      // Verde limão fluorescente
    magenta: '#ff00f7',   // Rosa elétrico
    gold: '#ffd700'       // Dourado metálico
  },

  // Degradês Premium
  gradients: {
    cyberpunk: ['#ff00f7', '#0ff0fc'] as [string, string], // Tipo explícito
    tropical: ['#a2ff00', '#00ffc2'] as [string, string],
    sunset: ['#ff9a00', '#ff0f7b'] as [string, string],
    galaxy: ['#6e00ff', '#ff00f7'] as [string, string]
  },

  // Efeitos Especiais
  glow: {
    blue: 'rgba(15, 240, 252, 0.7)',
    pink: 'rgba(255, 0, 247, 0.5)',
    green: 'rgba(162, 255, 0, 0.6)'
  },

  // Metálicos & Texturas
  metallic: {
    gold: 'linear-gradient(135deg, #ffd700, #f5b342)',
    silver: 'linear-gradient(135deg, #e6e6e6, #c0c0c0)',
    bronze: 'linear-gradient(135deg, #cd7f32, #a57128)'
  },

  // Cores de Estado
  state: {
    success: '#00ff88',
    error: '#ff3860',
    warning: '#ffdd57',
    info: '#209cee'
  },

  // Efeitos de Transparência
  glass: {
    light: 'rgba(255, 255, 255, 0.15)',
    dark: 'rgba(0, 0, 0, 0.3)'
  }

  
};