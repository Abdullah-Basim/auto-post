/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        app: '#050505',
        surface: '#121212',
        'surface-glass': 'rgba(255, 255, 255, 0.03)',
        terminal: '#000000',
        accent: {
          primary: '#8B5CF6',
          'primary-hover': '#A855F7',
          secondary: '#0EA5E9',
        },
        'text-primary': '#F8FAFC',
        'text-secondary': '#94A3B8',
        'text-muted': '#475569',
        'neon-glow': 'rgba(139, 92, 246, 0.4)',
      },
      fontFamily: {
        heading: ['Outfit', 'sans-serif'],
        body: ['IBM Plex Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
