import { fontFamily } from 'tailwindcss/defaultTheme';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      white: '#FFFFFF',
      black: '#000000',

      yellow: '#F9FF73',
      blue: '#78DCE8',
      red: '#FF6188',
      bright: '#F0F2DA',
      offwhite: '#F0F2DA',
      brightdark: '#313442',
      primarybright: '#313442',
      dark: '#141721',
      primary: '#141721',
      lightdark: '#1E212B',
      primarydark: '#06080F',
      secondary: '#EEEEEE',
      secondarydark: '#9C9C95',
      lightgrey: '#9D9E91',
      green: '#A9DC76',
    },
    fontFamily: {
      sans: ['Inter', ...fontFamily.sans],
      title: ['New Spirit', ...fontFamily.serif],
    },
    extend: {},
  },
  plugins: [],
};
