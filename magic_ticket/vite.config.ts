import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from "path";

// ใน Docker, Vite รันใน container ดังนั้นต้องใช้ชื่อ service "api"
// ตอนรัน local ใช้ localhost แทน
const API_TARGET = process.env.NODE_ENV === 'development' && process.env.DOCKER_ENV
  ? "http://api:5001"
  : "http://localhost:5001";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ["leaflet", "react-leaflet"],
  },
  server: {
    host: true,
    port: 3000,
    allowedHosts: ["magicticket.panplay-itgoeasy.xyz"],
    watch: {
      usePolling: true,
    },
    proxy: {
      "/api": {
        target: API_TARGET,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
      "/email":                   { target: API_TARGET, changeOrigin: true },
      "/auth":                    { target: API_TARGET, changeOrigin: true },
      "/organizer":               { target: API_TARGET, changeOrigin: true },
      "/users":                   { target: API_TARGET, changeOrigin: true },
      "/events":                  { target: API_TARGET, changeOrigin: true },
      "/admin":                   { target: API_TARGET, changeOrigin: true },
      "/sysadmin":                { target: API_TARGET, changeOrigin: true },
      // proxy เฉพาะ API endpoints ของ /payment
      // /payment/return และ /payment/cancel (frontend page) จะ serve โดย React SPA
      "^/payment/checkout":       { target: API_TARGET, changeOrigin: true },
      "^/payment/confirm":        { target: API_TARGET, changeOrigin: true },
      "^/payment/cancel":         { target: API_TARGET, changeOrigin: true },
      "^/payment/my-tickets":     { target: API_TARGET, changeOrigin: true },
      "/checkin":                 { target: API_TARGET, changeOrigin: true },
      "/uploads":                 { target: API_TARGET, changeOrigin: true },
    },
  },
})
