import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  // Root directory for the project
  root: '.',
  
  // Base public path
  base: '/',
  
  // Build configuration
  build: {
    // Output directory
    outDir: 'dist',
    
    // Generate source maps for debugging
    sourcemap: true,
    
    // Minify production builds
    minify: 'terser',
    
    // Target modern browsers for ES6 module support
    target: 'es2015',
    
    // Rollup options
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      },
      output: {
        // Output directory structure
        entryFileNames: 'assets/js/[name]-[hash].js',
        chunkFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          // Organize assets by type
          if (assetInfo.name.endsWith('.css')) {
            return 'assets/css/[name]-[hash][extname]';
          }
          if (/\.(png|jpe?g|svg|gif|webp|ico)$/.test(assetInfo.name)) {
            return 'assets/images/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    },
    
    // Chunk size warning limit (500kb)
    chunkSizeWarningLimit: 500
  },
  
  // Development server configuration
  server: {
    // Port for development server
    port: 3000,
    
    // Automatically open browser
    open: false,
    
    // Enable hot module replacement
    hmr: {
      overlay: true
    },
    
    // CORS configuration
    cors: true,
    
    // Proxy configuration for Netlify functions
    proxy: {
      '/.netlify/functions': {
        target: 'http://localhost:8888',
        changeOrigin: true
      }
    }
  },
  
  // Preview server configuration (for production builds)
  preview: {
    port: 4173,
    open: false
  },
  
  // Resolve configuration
  resolve: {
    // Path aliases for cleaner imports
    alias: {
      '@': resolve(__dirname, './src'),
      '@modules': resolve(__dirname, './src/modules'),
      '@data': resolve(__dirname, './src/modules/data'),
      '@business': resolve(__dirname, './src/modules/business'),
      '@ui': resolve(__dirname, './src/modules/ui'),
      '@infrastructure': resolve(__dirname, './src/modules/infrastructure')
    }
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: []
  },
  
  // Environment variables prefix
  envPrefix: 'VITE_'
});
