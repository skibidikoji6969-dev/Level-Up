/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        void: {
          DEFAULT: '#09090B',
          100: '#0F0F12',
          200: '#161619',
          300: '#1D1D21',
          400: '#27272B',
        },
        electric: {
          DEFAULT: '#3B82F6',
          glow: '#60A5FA',
          dim: '#1E3A8A',
        },
        violet: {
          DEFAULT: '#A855F7',
          glow: '#C084FC',
          dim: '#581C87',
        },
        neon: {
          DEFAULT: '#39FF88',
          glow: '#6EFFAA',
          dim: '#0F5C31',
        },
      },
      fontFamily: {
        display: ['"Chakra Petch"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'glow-blue': '0 0 20px rgba(59,130,246,0.35), 0 0 4px rgba(59,130,246,0.5)',
        'glow-purple': '0 0 20px rgba(168,85,247,0.35), 0 0 4px rgba(168,85,247,0.5)',
        'glow-green': '0 0 20px rgba(57,255,136,0.35), 0 0 4px rgba(57,255,136,0.5)',
      },
      backgroundImage: {
        'grid-pattern':
          'linear-gradient(rgba(59,130,246,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.06) 1px, transparent 1px)',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2.5s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
        'scan-line': 'scan-line 4s linear infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'scan-line': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
      },
    },
  },
  plugins: [],
};
