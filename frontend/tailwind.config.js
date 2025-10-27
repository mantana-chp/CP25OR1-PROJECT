/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: process.env.DARK_MODE ? process.env.DARK_MODE : 'class',
  content: [
    './app/**/*.{html,js,jsx,ts,tsx,mdx}',
    './components/**/*.{html,js,jsx,ts,tsx,mdx}',
    './utils/**/*.{html,js,jsx,ts,tsx,mdx}',
    './*.{html,js,jsx,ts,tsx,mdx}',
    './src/**/*.{html,js,jsx,ts,tsx,mdx}'
  ],
  presets: [require('nativewind/preset')],
  important: 'html',
  safelist: [
    {
      pattern:
        /(bg|border|text|stroke|fill)-(primary|secondary|tertiary|error|success|warning|info|typography|outline|background|indicator)-(0|50|100|200|300|400|500|600|700|800|900|950|white|gray|black|error|warning|muted|success|info|light|dark|primary)/
    }
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#d8edf9',
          100: '#b8dcf1',
          200: '#9bcbe7',
          300: '#80b9da',
          400: '#5fa7d1',
          500: '#559cc5',
          600: '#4b90b7',
          700: '#4a81a1',
          800: '#49738b',
          900: '#225877'
        },
        secondary: {
          100: '#fffcf9',
          200: '#fff9f1', // Light secondary background
          300: '#fff6ea',
          400: '#fff4e5'
        },
        accent: {
          50: '#7313e8',
          100: '#4f1794',
          200: '#2a0c4e',
          300: '#150924'
        },
        error: {
          50: '#fedde3',
          100: '#fbb8c5',
          200: '#f696a7',
          300: '#ee768c',
          400: '#ea526f',
          500: '#e14461',
          600: '#d63754',
          700: '#c4314c',
          800: '#ab3349',
          900: '#933445'
        },
        success: {
          50: '#65fce0',
          100: '#44f5d5',
          200: '#25ecc8',
          300: '#1ad0ae',
          400: '#15ad90',
          500: '#18927c',
          600: '#197a68',
          700: '#196355',
          800: '#174d43',
          900: '#143832'
        },
        warning: {
          50: '#ffe8d2',
          100: '#ffd3aa',
          200: '#ffbf83',
          300: '#ffaa5b',
          400: '#ff9531',
          500: '#f88a22',
          600: '#f07e13',
          700: '#d67215',
          800: '#ba6719',
          900: '#a05c1c'
        },
        info: {
          50: '#dcedff',
          100: '#b5d9ff',
          200: '#8dc4ff',
          300: '#69b0fb',
          400: '#449dfa',
          500: '#328ff3',
          600: '#2383eb',
          700: '#1c78d9',
          800: '#206cbe',
          900: '#2361a4'
        },
        grey: {
          50: '#F2F2F2',
          100: '#D9D9D9',
          200: '#A6A6A6',
          300: '#737373'
        },
        typography: {
          0: 'rgb(var(--color-typography-0)/<alpha-value>)',
          50: 'rgb(var(--color-typography-50)/<alpha-value>)',
          100: 'rgb(var(--color-typography-100)/<alpha-value>)',
          200: 'rgb(var(--color-typography-200)/<alpha-value>)',
          300: 'rgb(var(--color-typography-300)/<alpha-value>)',
          400: 'rgb(var(--color-typography-400)/<alpha-value>)',
          500: 'rgb(var(--color-typography-500)/<alpha-value>)',
          600: 'rgb(var(--color-typography-600)/<alpha-value>)',
          700: 'rgb(var(--color-typography-700)/<alpha-value>)',
          800: 'rgb(var(--color-typography-800)/<alpha-value>)',
          900: 'rgb(var(--color-typography-900)/<alpha-value>)',
          950: 'rgb(var(--color-typography-950)/<alpha-value>)',
          white: '#FFFFFF',
          gray: '#D4D4D4',
          black: '#181718'
        },
        outline: {
          0: 'rgb(var(--color-outline-0)/<alpha-value>)',
          50: 'rgb(var(--color-outline-50)/<alpha-value>)',
          100: 'rgb(var(--color-outline-100)/<alpha-value>)',
          200: 'rgb(var(--color-outline-200)/<alpha-value>)',
          300: 'rgb(var(--color-outline-300)/<alpha-value>)',
          400: 'rgb(var(--color-outline-400)/<alpha-value>)',
          500: 'rgb(var(--color-outline-500)/<alpha-value>)',
          600: 'rgb(var(--color-outline-600)/<alpha-value>)',
          700: 'rgb(var(--color-outline-700)/<alpha-value>)',
          800: 'rgb(var(--color-outline-800)/<alpha-value>)',
          900: 'rgb(var(--color-outline-900)/<alpha-value>)',
          950: 'rgb(var(--color-outline-950)/<alpha-value>)'
        },
        background: {
          0: 'rgb(var(--color-background-0)/<alpha-value>)',
          50: 'rgb(var(--color-background-50)/<alpha-value>)',
          100: 'rgb(var(--color-background-100)/<alpha-value>)',
          200: 'rgb(var(--color-background-200)/<alpha-value>)',
          300: 'rgb(var(--color-background-300)/<alpha-value>)',
          400: 'rgb(var(--color-background-400)/<alpha-value>)',
          500: 'rgb(var(--color-background-500)/<alpha-value>)',
          600: 'rgb(var(--color-background-600)/<alpha-value>)',
          700: 'rgb(var(--color-background-700)/<alpha-value>)',
          800: 'rgb(var(--color-background-800)/<alpha-value>)',
          900: 'rgb(var(--color-background-900)/<alpha-value>)',
          950: 'rgb(var(--color-background-950)/<alpha-value>)',
          error: 'rgb(var(--color-background-error)/<alpha-value>)',
          warning: 'rgb(var(--color-background-warning)/<alpha-value>)',
          muted: 'rgb(var(--color-background-muted)/<alpha-value>)',
          success: 'rgb(var(--color-background-success)/<alpha-value>)',
          info: 'rgb(var(--color-background-info)/<alpha-value>)',
          light: '#FBFBFB',
          dark: '#181719'
        },
        indicator: {
          primary: 'rgb(var(--color-indicator-primary)/<alpha-value>)',
          info: 'rgb(var(--color-indicator-info)/<alpha-value>)',
          error: 'rgb(var(--color-indicator-error)/<alpha-value>)'
        }
      },
      fontFamily: {
        prompt: ['Prompt_400Regular', 'Prompt_500Medium', 'Prompt_700Bold']
      },
      fontWeight: {
        extrablack: '950'
      },
      fontSize: {
        '2xs': '10px'
      },
      boxShadow: {
        'hard-1': '-2px 2px 8px 0px rgba(38, 38, 38, 0.20)',
        'hard-2': '0px 3px 10px 0px rgba(38, 38, 38, 0.20)',
        'hard-3': '2px 2px 8px 0px rgba(38, 38, 38, 0.20)',
        'hard-4': '0px -3px 10px 0px rgba(38, 38, 38, 0.20)',
        'hard-5': '0px 2px 10px 0px rgba(38, 38, 38, 0.10)',
        'soft-1': '0px 0px 10px rgba(38, 38, 38, 0.1)',
        'soft-2': '0px 0px 20px rgba(38, 38, 38, 0.2)',
        'soft-3': '0px 0px 30px rgba(38, 38, 38, 0.1)',
        'soft-4': '0px 0px 40px rgba(38, 38, 38, 0.1)'
      }
    }
  }
}
