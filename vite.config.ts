import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Fix: Cast process to any to avoid 'cwd' does not exist on type 'Process' error
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    // Use relative base path so the app works in any subdirectory (GitHub Pages)
    base: './', 
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
    }
  };
});