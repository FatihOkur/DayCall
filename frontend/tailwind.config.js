/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./app/**/*.{js,jsx,ts,tsx}",
        "./components/**/*.{js,jsx,ts,tsx}",
    ],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                claude: {
                    bg: "#F5F2EB",
                    text: "#2D2926",
                    accent: "#DA7756",
                    "accent-light": "#E8956F",
                    muted: "#A69B8D",
                    card: "#FFFFFF",
                    border: "#E5DFD5",
                },
            },
            fontFamily: {
                serif: ["Georgia", "serif"],
                sans: ["System", "sans-serif"],
            },
        },
    },
    plugins: [],
};
