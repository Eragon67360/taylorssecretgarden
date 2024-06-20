import {nextui} from '@nextui-org/theme'

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-geist-mono)"],
        impact: ['Impact', 'sans-serif'],
      },
      backgroundImage: {
        'custom-gradient': 'linear-gradient(180deg, rgba(217, 217, 217, 0.00) 0%, rgba(79, 79, 79, 0.58) 36.4%, #000 100%)',
        'tours':'url(\'/img/eras.jpg\')',
        'home':'url(\'/img/bg_ts.jpg\')',
      },
    },
  },
  variants: {
    extend: {
      borderColor: ['active'],
    },
  },
  darkMode: "class",
  plugins: [nextui()],
}
