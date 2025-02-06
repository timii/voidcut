
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    fontSize: {
      xxxs: '9px',
      xxs: '10px'
    },
    extend: {
      colors: {
        "ruler-color": '#dfdfdf66',

        "background-color": '#151519',
        "background-highlight": '#212127',
        "background-progress": '#111114',
        "background-button": '#E6E6E6',
        "background-button-hover": '#F2F2F2',
        "background-icon-button": "#434346",
        "background-tooltip": "#434346",
        "background-timeline-row": "#2c2c35",
        "background-timeline-row-element-hover": "#0369a1", // dark accent color
        "background-timeline-divider": "#0369a1", // dark accent color
        "background-media-pool-element": "#2c2c2f",
        "background-media-pool-time": "#151519",

        "accent-color": '#0284c7',

        "text-color": '#c2c2c2',
        "text-info": '#6b7280',
        "text-button": '#151519',
        "text-button-hover": '#0E0E11',
        "text-media-pool-time": "#aeaeae",

        "backdrop-color": "#111114",



        // "background-color-darker": '#111114',
        // "background-color-light": '#2c2c2f',
        // "background-color-lighter": '#434346',
        // "background-color-lightest": '#5b5b5e',

        "text-color-dark": '#b8b8b8',
        "text-color-darker": '#aeaeae',
        "text-color-darkest": '#6b7280',
        "text-color-light": '#cccccc',
        "text-color-lighter": '#d6d6d6',
        "text-color-lightest": '#dfdfdf',

        "accent-color-darker": '#0369a1',
        "accent-color-lighter": '#0ea5e9',
        "accent-color-lightest": '#38bdf8',

        "button-background": "#212127",
        "button-background2": "#E6E6E6",
        "button-background-hover": "#2c2c35",

        // palettes

        "text": {
          50: "#FAFAFA",
          100: "#F2F2F2",
          200: "#E6E6E6",
          300: "#DBDBDB",
          400: "#CFCFCF",
          500: "#C2C2C2", // used as default text color
          600: "#9C9C9C",
          700: "#757575",
          800: "#4D4D4D",
          900: "#262626",
          950: "#141414"
        },

        // alternative palette for the text color
        "text2": {
          50: "#FDFDFC",
          100: "#FCFBF8",
          200: "#FAF9F5",
          300: "#F7F6EE",
          400: "#F5F4EA",
          500: "#F2F0E3", // used as default text color
          600: "#D5CEA4",
          700: "#B6AB62",
          800: "#81783C",
          900: "#3F3A1D",
          950: "#1F1D0F"
        },

        "background": {
          50: "#EEEEF1",
          100: "#DBDBE1",
          200: "#B7B7C2",
          300: "#9393A4",
          400: "#707085",
          500: "#515161",
          600: "#33333D",
          700: "#151519", // used as default background color
          800: "#0E0E11",
          900: "#070708",
          950: "#050506"
        },

        "accent": {
          50: "#E1F5FF",
          100: "#C2EAFE",
          200: "#86D6FE",
          300: "#49C1FD",
          400: "#0DADFD",
          500: "#0284C7", // used as default accent color
          600: "#026CA2",
          700: "#015179",
          800: "#013651",
          900: "#001B28",
          950: "#000E14"
        },
      }
    },
  },
  plugins: [],
}

