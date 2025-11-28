import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const envDir = path.resolve(__dirname, '..');
  const env = loadEnv(mode, envDir, '');

  let viteApiUrl = env.VITE_API_URL;
  let viteBasePath = env.VITE_BASE_PATH;

  if (viteApiUrl && viteApiUrl.includes('Program Files')) {
    viteApiUrl = '';
  }
  if (viteBasePath && viteBasePath.includes('Program Files')) {
    viteBasePath = '';
  }

  const serverHost = env.SERVER_HOST;
  const serverPort = env.SERVER_PORT;

  if (mode === 'development') {
    console.log('🔧 Frontend Build Configuration:');
    console.log('   Mode:', mode);
    console.log('   Env Dir:', envDir);
    console.log('   VITE_API_URL:', viteApiUrl ? '***' : '(empty)');
    console.log('   VITE_BASE_PATH:', viteBasePath ? '***' : '(empty)');
    console.log('   SERVER_HOST:', serverHost ? '***' : '(empty)');
    console.log('   SERVER_PORT:', serverPort ? '***' : '(empty)');
  }

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
        '/health': {
          target: backendUrl,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: mode !== 'production',
      minify: mode === 'production' ? 'esbuild' : false,
      target: 'es2015',
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
    },
  };
});
