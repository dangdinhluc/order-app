import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: '0.0.0.0', // Allow external access
    proxy: {
      '/api': {
        target: 'http://192.168.128.159:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://192.168.128.159:3001',
        ws: true,
      },
    },
  },
})
