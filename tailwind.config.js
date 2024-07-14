/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        "ruler-color": '#42424e',
        "background-color": '#151519',
        "background-color-light": '#2c2c2f',
        "background-color-lighter": '#434346',
        "background-color-lightest": '#5b5b5e',
        "text-color": '#c2c2c2'
      }
    },
  },
  plugins: [],
}

