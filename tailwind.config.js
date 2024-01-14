/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        "ruler-color": '#42424e',
        "background-color": '#151519',
        "background-color-lighter": '#2c2c2f',
        "text-color": '#c2c2c2'
      }
    },
  },
  plugins: [],
}

