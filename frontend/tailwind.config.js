/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Claude Brand Colors - Integrated from claude_palette.md
        claude: {
          // BACKGROUNDS (Paper Feel)
          bg: '#F5F2EB',          // Main background (Warm Beige)
          paper: '#FFFFFF',       // Card background (Off-white, barely warm)
          surface: '#EBE8E0',     // Secondary background / Sidebar

          // TYPOGRAPHY
          text: '#2D2926',        // Primary text (Warm Black / Charcoal)
          muted: '#66605B',       // Secondary text (Stone Gray)
          subtle: '#99948D',      // Placeholders

          // ACCENTS & ACTIONS
          accent: '#DA7756',      // Claude Orange (Terracotta) - Buttons/Highlights
          accentHover: '#C66545', // Hover state
          border: '#DEDBD2',      // Subtle borders

          // STATUS COLORS (Pastel/Organic)
          success: '#4A7A68',     // Organic Green
          warning: '#D4A353',     // Mustard Yellow
          error: '#C95D5D',       // Muted Red
        },
        
        // DARK MODE (Warm Night)
        // Claude's dark mode is a deep warm gray, not true black.
        darkClaude: {
          bg: '#1A1918',          // Deep warm gray
          paper: '#242220',       // Cards
          text: '#EAE6DF',        // Off-white text
          muted: '#A19D96',       // Secondary text
          border: '#3A3836',      // Borders
        }
      },
      fontFamily: {
        serif: ['Merriweather', 'serif'], // Use for Headings
        sans: ['Inter', 'sans-serif'],    // Use for Body text
      }
    }
  },
  plugins: [],
}
