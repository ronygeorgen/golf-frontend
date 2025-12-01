/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Open Sans', 'Helvetica Neue', 'sans-serif'],
      },
      fontSize: {
        'h1': ['clamp(1.5rem, 2vw + 0.8rem, 2rem)', { lineHeight: '1.1', letterSpacing: '-0.01em', fontWeight: '700' }],
        'h2': ['clamp(1.25rem, 1.5vw + 0.5rem, 1.5rem)', { lineHeight: '1.1', letterSpacing: '-0.01em', fontWeight: '600' }],
        'h3': ['clamp(1.125rem, 1vw + 0.5rem, 1.25rem)', { lineHeight: '1.4', fontWeight: '600' }],
        'body': ['clamp(0.875rem, 0.5vw + 0.7rem, 1rem)', { lineHeight: '1.4', fontWeight: '400' }],
        'small': ['clamp(0.75rem, 0.5vw + 0.5rem, 0.875rem)', { lineHeight: '1.6', fontWeight: '400' }],
      },
      colors: {
        // BRAND COLORS
        brandGreen: {
          DEFAULT: "#0D2B1F",
          light: "#153D2C",
          dark: "#071A12",
        },
        brandOrange: {
          DEFAULT: "#E57C1F",
          light: "#F08D3A",
          dark: "#C7691A",
        },

        // SHORTCUTS
        primary: "#134A34",
        "primary-light": "#1C6147",  // hover
      "primary-dark": "#0D2B1F",

        accent: "#E57C1F",
        "accent-light": "#F08D3A",
        "accent-dark": "#C7691A",

        // BACKGROUND / SURFACE
        background: "#F8F9FA",
        "background-light": "#F7F9F8",
        surface: "#FFFFFF",

        // BORDER
        border: "#E2E8E2",

        // TEXT
        "text-primary": "#111827",
        "text-secondary": "#4B5563",

        // STATUS COLORS
        statusConfirmedBg: "#E6F4EA",
        statusConfirmedText: "#216E39",

        statusPendingBg: "#FEF3C7",
        statusPendingText: "#B45309",

        statusPersonalBg: "#E0E7FF",
        statusPersonalText: "#4338CA",

        statusCancelledBg: "#FEE2E2",
        statusCancelledText: "#991B1B",

        statusCompletedBg: "#DBEAFE",
        statusCompletedText: "#1E40AF",

        statusNoShowBg: "#F3F4F6",
        statusNoShowText: "#374151",

        // DANGER
        danger: "#DC2626",
        "danger-light": "#EF4444",
      },

      borderRadius: {
        card: "12px",
        button: "10px",
        badge: "16px",
      },

      boxShadow: {
        card: "0 2px 4px rgba(0,0,0,0.05)",
        "card-hover": "0 4px 8px rgba(0,0,0,0.08)",
      },
    },
  },
  plugins: [],
};