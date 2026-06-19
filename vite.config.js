import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// هذا الإعداد يضمن أن الـ Vite يبحث في المجلد الصحيح
export default defineConfig({
  plugins: [react()],
  root: './', // التأكد أن الجذر هو المجلد الحالي
  server: {
    port: 5173,
    open: true // يفتح المتصفح تلقائياً
  },
  build: {
    outDir: 'dist'
  }
});