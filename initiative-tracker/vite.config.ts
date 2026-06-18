import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base must match the GitHub Pages subpath. CI sets VITE_BASE_PATH (e.g.
// "/initiative-tracker/"); locally it defaults to './' for relative asset paths.
export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? './',
  plugins: [react()],
});
