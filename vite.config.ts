import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' — работает и на GitHub Pages (подпапка), и на Vercel
export default defineConfig({ base: './', plugins: [react()] });
