import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Use a safer cwd check for environments where process might be restricted
  const cwd = typeof process !== 'undefined' && process.cwd ? process.cwd() : '.';
  
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, cwd, '');
  
  return {
    plugins: [react()],
    server: {
      port: 3000
    },
    define: {
      // This defines 'process.env.API_KEY' globally for the bundle, 
      // preventing "ReferenceError: process is not defined" in the local build
      'process.env.API_KEY': JSON.stringify(env.API_KEY || '')
    }
  };
});