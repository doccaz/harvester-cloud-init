/*
 * Copyright (C) 2026 Erico Mendonca
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Use a safer cwd check for environments where process might be restricted
  const cwd = typeof process !== 'undefined' && (process as any).cwd ? (process as any).cwd() : '.';
  
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, cwd, '');
  
  return {
    base: './', // Ensures assets are linked relatively for GitHub Pages compatibility
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