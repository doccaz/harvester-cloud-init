import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // FIX: Cast process to any to resolve TS error "Property 'cwd' does not exist on type 'Process'"
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    // IMPORTANT: This must match your GitHub repository name for Pages to work
    base: '/harvester-cloud-init/', 
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  };
});