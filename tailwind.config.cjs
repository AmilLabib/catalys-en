/** @type {import('tailwindcss').Config} */

// Satu skala warna untuk seluruh aplikasi: navy Catalys.
// Keluarga warna Tailwind lain (merah, hijau, kuning, biru, dst.) dipetakan ke skala ini
// supaya tidak ada warna di luar tone yang ditetapkan. Abu-abu netral tetap dipakai.
const NAVY = {
  50: "#f3f7fa",
  100: "#e1ecf3",
  200: "#c6d8e4",
  300: "#9cb2c1",
  400: "#7193ad",
  500: "#5487ab",
  600: "#2f6b8f",
  700: "#13577d",
  800: "#0a3f5e",
  900: "#012a3d",
  950: "#001a26",
};

const KELUARGA = ["red", "rose", "pink", "fuchsia", "purple", "violet", "indigo", "blue", "sky", "cyan", "teal", "emerald", "green", "lime", "yellow", "amber", "orange"];

module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        poppins: ["Poppins", "ui-sans-serif", "system-ui"],
      },
      colors: {
        ...Object.fromEntries(KELUARGA.map((k) => [k, NAVY])),
        navy: NAVY,
        // Core theme tokens used in components
        primary: "#012a3d",
        bg: "#e1ecf3",
        bgBright: "#f5fbff",
        text: "#486071",
        // Full palette
        brand_dark: "#012a3d",
        brand_mid1: "#486071",
        brand_mid2: "#778d9b",
        brand_mid3: "#9cb2c1",
        brand_light: "#e1ecf3",
      },
    },
  },
  plugins: [],
};
