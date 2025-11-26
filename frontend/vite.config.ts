import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const envDir = path.resolve(__dirname, '..');
  const env = loadEnv(mode, envDir, '');

  let viteApiUrl = env.VITE_API_URL || '';
  let viteBasePath = env.VITE_BASE_PATH || '/pochi-kawaii';

  if (viteApiUrl && viteApiUrl.includes('Program Files')) {
    viteApiUrl = '';
  }
  if (viteBasePath && viteBasePath.includes('Program Files')) {
    viteBasePath = '/pochi-kawaii';
  }

  const serverHost = env.SERVER_HOST || '127.0.0.1';
  const serverPort = env.SERVER_PORT || '4004';

  console.log('🔧 Pochi! Kawaii ne~ Frontend Build Configuration:');
  console.log('   Mode:', mode);
  console.log('   Env Dir:', envDir);
  console.log('   VITE_API_URL:', viteApiUrl);
  console.log('   VITE_BASE_PATH:', viteBasePath);
  console.log('   SERVER_HOST:', serverHost);
  console.log('   SERVER_PORT:', serverPort);

  const backendUrl = `http://${serverHost}:${serverPort}`;

  return {
    plugins: [react()],
    base: viteBasePath,
    envDir: envDir,
    envPrefix: 'VITE_',
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(viteApiUrl),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3004,
      host: true,
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
        },
        '/chat': {
          target: backendUrl,
          changeOrigin: true,
        },
        '/health': {
          target: backendUrl,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist-new',
      // Production: clean dist folder before build
      emptyOutDir: true,
      // Production: no sourcemaps for security
      sourcemap: mode !== 'production',
      // Minify for production
      minify: mode === 'production' ? 'esbuild' : false,
      // Target modern browsers
      target: 'es2015',
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
    },
  };
});
