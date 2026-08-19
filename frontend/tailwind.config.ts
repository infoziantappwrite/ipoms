import type { Config } from 'tailwindcss';

/**
 * iPOMS Design System — Tailwind bridge.
 *
 * Layer 1 (primitive) lives in Tailwind's default palette — slate-*, blue-* etc.
 * Layer 2 (semantic) is defined as CSS variables in src/app/globals.css and
 * surfaced here as utilities: bg-surface, text-fg-subtle, border-border.
 * Layer 3 (component) is the height/width scale at the bottom of this file.
 *
 * Components must only ever use Layer 2 and Layer 3.
 */

/** Wraps a channel-triplet CSS var so `bg-primary/20` keeps working. */
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        /* ── Surfaces ─────────────────────────────────────────────────── */
        background: token('background'),
        surface: {
          DEFAULT: token('surface'),
          raised: token('surface-raised'),
          sunken: token('surface-sunken'),
        },
        overlay: token('overlay'),

        /* ── Foreground ───────────────────────────────────────────────── */
        foreground: token('foreground'),
        fg: {
          DEFAULT: token('foreground'),
          muted: token('fg-muted'),
          subtle: token('fg-subtle'),
          disabled: token('fg-disabled'),
        },

        /* ── Brand ────────────────────────────────────────────────────── */
        primary: {
          DEFAULT: token('primary'),
          hover: token('primary-hover'),
          subtle: token('primary-subtle'),
          foreground: token('primary-foreground'),
        },
        accent: {
          DEFAULT: token('accent'),
          foreground: token('accent-foreground'),
        },

        /* ── Status ───────────────────────────────────────────────────── */
        success: {
          DEFAULT: token('success'),
          subtle: token('success-subtle'),
          foreground: token('success-foreground'),
        },
        warning: {
          DEFAULT: token('warning'),
          subtle: token('warning-subtle'),
          foreground: token('warning-foreground'),
        },
        destructive: {
          DEFAULT: token('destructive'),
          subtle: token('destructive-subtle'),
          foreground: token('destructive-foreground'),
        },
        info: {
          DEFAULT: token('info'),
          subtle: token('info-subtle'),
          foreground: token('info-foreground'),
        },

        /* ── Categorical (module identity + chart series) ─────────────── */
        module: {
          1: token('module-1'),
          2: token('module-2'),
          3: token('module-3'),
          4: token('module-4'),
          5: token('module-5'),
          6: token('module-6'),
          7: token('module-7'),
          8: token('module-8'),
        },

        /* ── Lines ────────────────────────────────────────────────────── */
        border: {
          DEFAULT: token('border'),
          strong: token('border-strong'),
        },
        input: token('input'),
        ring: token('ring'),

        /* ── shadcn/ui compatibility aliases ──────────────────────────── */
        card: {
          DEFAULT: token('card'),
          foreground: token('card-foreground'),
        },
        popover: {
          DEFAULT: token('popover'),
          foreground: token('card-foreground'),
        },
        muted: {
          DEFAULT: token('muted'),
          foreground: token('muted-foreground'),
        },
      },

      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'SF Mono', 'Menlo', 'monospace'],
      },

      /**
       * Four-step scale with a hard 12px floor.
       * Replaces text-[10px] (114 uses) and text-[11px] (91 uses).
       */
      fontSize: {
        micro: ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.01em' }],   // 12 — badges, meta
        body: ['0.875rem', { lineHeight: '1.25rem' }],                          // 14 — cells, inputs
        title: ['1rem', { lineHeight: '1.5rem' }],                              // 16 — card titles
        display: ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }], // 20 — page titles
        'display-lg': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.02em' }], // 24 — KPI numbers
      },

      /** Three radii. Current usage is already 72% concentrated in two. */
      borderRadius: {
        control: '0.375rem', // 6px  — inputs, buttons, badges
        panel: '0.625rem',   // 10px — cards, modals, tables
      },

      /** Elevation via tokens so dark mode gets its own shadow ramp. */
      boxShadow: {
        1: 'var(--elevation-1)',
        2: 'var(--elevation-2)',
        3: 'var(--elevation-3)',
        4: 'var(--elevation-4)',
      },

      /** Layer 3 — component dimensions. */
      spacing: {
        control: '2.25rem', // 36px — button / input height
        row: '2.5rem',      // 40px — data table row
        toolbar: '3rem',    // 48px — table toolbar
        header: '4rem',     // 64px — app header
      },

      transitionDuration: {
        DEFAULT: '150ms',
      },

      zIndex: {
        base: '0',
        raised: '10',
        sticky: '20',
        header: '30',
        overlay: '40',
        modal: '50',
        toast: '60',
      },
    },
  },
  plugins: [],
};

export default config;
