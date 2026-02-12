/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: 'var(--primary)',
                secondary: 'var(--secondary)',
                accent: 'var(--accent)',
                card: 'var(--card-bg)',
                'text-main': 'var(--text-main)',
                'text-muted': 'var(--text-muted)',
            },
            fontFamily: {
                sans: ['Inter', 'ui-sans-serif', 'system-ui'],
            }
        },
    },
    darkMode: 'class',
    plugins: [],
}
