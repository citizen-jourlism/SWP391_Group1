import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Địa chỉ backend. Mặc định cổng 8080; có thể đổi bằng biến môi trường API_TARGET
// (ví dụ khi chạy thêm một backend thử nghiệm ở cổng khác).
const apiTarget = process.env.API_TARGET ?? 'http://localhost:8080'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react({ include: /\.[jt]sx?$/ })],
  server: {
    port: 5173,
    // Chuyển tiếp các đường dẫn này sang backend Spring Boot (apiTarget, mặc định cổng 8080):
    //   /api     -> các API
    //   /uploads -> file người dùng tải lên (ảnh đại diện...), backend phục vụ trong WebConfig.java
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/uploads': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
})
