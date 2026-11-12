import type { Config } from "tailwindcss";

/** Resolve CSS custom-property colors with optional opacity (e.g. border-brand-from/20). */
const withCssVar =
  (cssVar: string) =>
  ({ opacityValue }: { opacityValue?: string }) => {
    if (opacityValue === undefined) return `var(${cssVar})`;
    return `color-mix(in srgb, var(${cssVar}) ${Number(opacityValue) * 100}%, transparent)`;
  };

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(to right, var(--brand-from), var(--brand-to))",
        "brand-tile": "linear-gradient(135deg, var(--brand-tile-from) 0%, var(--brand-tile-via) 50%, var(--brand-tile-to) 100%)",
        "nt-gradient": "linear-gradient(to right, var(--nt-primary), var(--nt-accent))",
        "nt-tile": "linear-gradient(135deg, var(--nt-muted) 0%, var(--nt-bg) 50%, var(--nt-border) 100%)",
      },
      colors: {
        brand: {
          from: withCssVar("--brand-from"),
          to: withCssVar("--brand-to"),
          deep: withCssVar("--brand-deep"),
          muted: withCssVar("--brand-muted"),
          "hover-from": withCssVar("--brand-hover-from"),
          "hover-to": withCssVar("--brand-hover-to"),
          "tile-from": withCssVar("--brand-tile-from"),
          "tile-via": withCssVar("--brand-tile-via"),
          "tile-to": withCssVar("--brand-tile-to"),
        },
        nt: {
          primary: withCssVar("--nt-primary"),
          "primary-hover": withCssVar("--nt-primary-hover"),
          accent: withCssVar("--nt-accent"),
          "accent-hover": withCssVar("--nt-accent-hover"),
          bg: withCssVar("--nt-bg"),
          surface: withCssVar("--nt-surface"),
          elevated: withCssVar("--nt-elevated"),
          text: withCssVar("--nt-text"),
          "text-secondary": withCssVar("--nt-text-secondary"),
          border: withCssVar("--nt-border"),
          muted: withCssVar("--nt-muted"),
          soft: withCssVar("--nt-soft"),
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          hover: "hsl(var(--primary-hover))",
          pressed: "hsl(var(--primary-pressed))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
          bg: "hsl(var(--destructive-bg))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          bg: "hsl(var(--success-bg))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          bg: "hsl(var(--warning-bg))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
          bg: "hsl(var(--info-bg))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
          "6": "hsl(var(--chart-6))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
        button: "var(--radius-button)",
        input: "var(--radius-input)",
      },
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "float-slow": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(12px, -16px) scale(1.03)" },
          "66%": { transform: "translate(-8px, 8px) scale(0.97)" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "float-slow": "float-slow 8s ease-in-out infinite",
        "fade-in-up": "fade-in-up 0.45s ease-out forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
