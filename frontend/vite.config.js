import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: "/", // IMPORTANT: Serve from root when bundled in Spring Boot JAR
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://127.0.0.1:8060',
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: "localhost",
      },
      '/oauth2': {
        target: process.env.VITE_API_TARGET || 'http://127.0.0.1:8060',
        changeOrigin: true,
        secure: false,
      },
      '/login/oauth2': {
        target: process.env.VITE_API_TARGET || 'http://127.0.0.1:8060',
        changeOrigin: true,
        secure: false,
      },
      '/logout': {
        target: process.env.VITE_API_TARGET || 'http://127.0.0.1:8060',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://127.0.0.1:8060',
        changeOrigin: true,
        secure: false,
      },
      '/oauth2': {
        target: process.env.VITE_API_TARGET || 'http://127.0.0.1:8060',
        changeOrigin: true,
        secure: false,
      },
      '/login/oauth2': {
        target: process.env.VITE_API_TARGET || 'http://127.0.0.1:8060',
        changeOrigin: true,
        secure: false,
      },
      '/logout': {
        target: process.env.VITE_API_TARGET || 'http://127.0.0.1:8060',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
