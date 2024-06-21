import { nextui } from '@nextui-org/theme'

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
        inter: ["var(--font-inter)"],
        fira: ["var(--font-fira)"],
        dancing: ["var(--font-dancing)"],
        impact: ['Impact', 'sans-serif'],
        playfair: ["var(--font-playfair)"],
        unifraktur: ["var(--font-unifraktur)"],
      },
      backgroundImage: {
        'custom-gradient': 'linear-gradient(180deg, rgba(217, 217, 217, 0.00) 0%, rgba(79, 79, 79, 0.58) 36.4%, #000 100%)',
        'tours': 'url(\'https://res.cloudinary.com/dluezegi8/image/upload/f_auto,q_auto/v1/images/upload/taylorssecretgarden/backgrounds/eras\')',
        'eras': "url('https://res.cloudinary.com/dluezegi8/image/upload/f_auto,q_auto/v1/images/upload/taylorssecretgarden/tours/the-eras-tour/gallery')",
        'home': 'url(\'https://res.cloudinary.com/dluezegi8/image/upload/f_auto,q_auto/v1/images/upload/taylorssecretgarden/backgrounds/home\')',
      },
    },
  },
  variants: {
    extend: {
      borderColor: ['active'],
    },
  },
  darkMode: "class",
  plugins: [
    nextui({
      themes: {
        light: {
          colors: {
            primary: {
              DEFAULT: "#792e3a",
              foreground: "#FFF",
            },
            focus: "#792e3a",
          },
        },
      },
    }),
  ],
}
