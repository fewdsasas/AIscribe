import type { Config } from 'tailwindcss'

export default {
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx}', './src/renderer/index.html'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 暖金 — 品牌色，替代之前的 Indigo
        amber: {
          50: '#fef8ee',
          100: '#fdefd4',
          200: '#fbdba7',
          300: '#f5c376',
          400: '#e8a84a',
          500: '#d48a2a',
          600: '#b06e20',
          700: '#8c551b',
          800: '#6d4117',
          900: '#533214'
        },
        // 墨色 — "墨分五色"：焦浓重淡清
        ink: {
          50: '#fcfbf9',
          100: '#f5f0eb',
          200: '#e8dfd3',
          300: '#d4c5b3',
          400: '#b8a48c',
          500: '#9a8369',
          600: '#7a654e',
          700: '#5c4a36',
          800: '#3d3224',
          900: '#211b13'
        },
        // 语义色 — 克制使用
        success: { DEFAULT: '#4d7c2b', light: '#f2f9ec' },
        warning: { DEFAULT: '#d48a2a', light: '#fef8ee' },
        danger: { DEFAULT: '#c2410c', light: '#fef2ee' }
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
        serif: ['"Noto Serif SC"', '"Source Han Serif SC"', 'Georgia', 'serif'],
        calligraphy: ['"Ma Shan Zheng"', '"ZCOOL XiaoWei"', '"KaiTi"', '"楷体"', 'cursive'],
        number: ['"Ma Shan Zheng"', '"ZCOOL XiaoWei"', 'serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace']
      },
      borderRadius: {
        DEFAULT: '8px',
        sm: '6px',
        md: '10px',
        lg: '16px'
      },
      boxShadow: {
        'card': '0 1px 2px rgba(33,27,19,0.04)',
        'card-hover': '0 4px 12px rgba(33,27,19,0.06)',
        'modal': '0 16px 40px rgba(33,27,19,0.1)'
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' }
        }
      },
      animation: {
        shimmer: 'shimmer 1.5s infinite'
      }
    }
  },
  plugins: [require('@tailwindcss/typography'), require('tailwindcss-animate')]
} satisfies Config
