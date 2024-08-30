/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    fontSize: {
      xxs: '10px'
    },
    extend: {
      colors: {
        "ruler-color": '#42424e',
        "background-color-darker": '#111114',
        "background-color": '#151519',
        "background-color-light": '#2c2c2f',
        "background-color-lighter": '#434346',
        "background-color-lightest": '#5b5b5e',
        "text-color-dark": '#b8b8b8',
        "text-color-darker": '#aeaeae',
        "text-color-darkest": '#6b7280',
        "text-color": '#c2c2c2',
        "text-color-light": '#cccccc',
        "text-color-lighter": '#d6d6d6',
        "text-color-lightest": '#dfdfdf',
        "accent-color-darker": '#0369a1',
        "accent-color": '#0284c7',
        "accent-color-lighter": '#0ea5e9',
        "accent-color-lightest": '#38bdf8',
      }
    },
  },
  plugins: [],
}

