import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base must match the GitHub Pages subpath; './' produces relative asset paths.
export default defineConfig({
  base: './',
  plugins: [react()],
});
