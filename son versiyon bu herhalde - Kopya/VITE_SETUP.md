# Vite Build Configuration Setup

This document describes the Vite build configuration for the Akılda Kal application.

## Overview

Task 1.1 has been completed, implementing a modern build system with:
- ✅ Vite 5.0 with ES6 module support
- ✅ Development server with Hot Module Replacement (HMR)
- ✅ Optimized production build configuration
- ✅ Organized output directory structure
- ✅ Path aliases for cleaner imports
- ✅ Source maps for debugging

## Installation

To install the required dependencies, run:

```bash
npm install
```

This will install:
- `vite@^5.0.0` - Modern build tool with ES6 module support
- `netlify-cli@^17.0.0` - Netlify deployment CLI

## Available Scripts

### Development

```bash
npm run dev
```

Starts the Vite development server with:
- Hot Module Replacement (HMR) for instant updates
- Port 3000 (auto-increments if busy)
- Proxy for Netlify functions at `/.netlify/functions`
- Error overlay for build issues

### Production Build

```bash
npm run build
```

Creates an optimized production build:
- Minified JavaScript and CSS
- Source maps for debugging
- Organized asset structure in `dist/`
- Code splitting for optimal loading

### Preview Build

```bash
npm run preview
```

Preview the production build locally on port 4173.

### Netlify Development

```bash
npm run netlify:dev
```

Run Netlify Dev server (includes functions).

### Deploy

```bash
npm run deploy
```

Deploy to Netlify production.

## Build Output Structure

After running `npm run build`, the output structure will be:

```
dist/
├── index.html                 # Main HTML file
├── manifest.json              # PWA manifest
├── sw.js                      # Service Worker
└── assets/
    ├── js/
    │   ├── main-[hash].js    # Main bundle
    │   └── [chunk]-[hash].js # Code-split chunks
    ├── css/
    │   └── [name]-[hash].css # Stylesheets
    └── images/
        └── [name]-[hash].[ext] # Images and icons
```

## Configuration Details

### vite.config.js

The Vite configuration includes:

**Build Settings:**
- Output directory: `dist/`
- Minification: Terser
- Source maps: Enabled
- Target: ES2015 (modern browsers)
- Chunk size warning: 500KB

**Development Server:**
- Port: 3000
- HMR: Enabled with error overlay
- CORS: Enabled
- Proxy: Netlify functions to `http://localhost:8888`

**Path Aliases:**
```javascript
'@' → './src'
'@modules' → './src/modules'
'@data' → './src/modules/data'
'@business' → './src/modules/business'
'@ui' → './src/modules/ui'
'@infrastructure' → './src/modules/infrastructure'
```

**Asset Organization:**
- JavaScript: `assets/js/[name]-[hash].js`
- CSS: `assets/css/[name]-[hash].css`
- Images: `assets/images/[name]-[hash].[ext]`

### netlify.toml

Updated to work with Vite:
- Build command: `npm run build`
- Publish directory: `dist`
- Security headers maintained
- Cache headers for hashed assets

### package.json

Updated with:
- `"type": "module"` for ES6 module support
- Vite scripts for dev, build, and preview
- Vite 5.0 as dev dependency

## Path Aliases Usage

Import modules using clean paths:

```javascript
// Instead of: import { StorageManager } from '../../modules/data/storage';
import { StorageManager } from '@data/storage';

// Instead of: import { QuizEngine } from '../../modules/business/quiz-engine';
import { QuizEngine } from '@business/quiz-engine';

// Instead of: import { Modal } from '../../modules/ui/components/modal';
import { Modal } from '@ui/components/modal';
```

## Hot Module Replacement (HMR)

Vite's HMR provides instant feedback during development:

- **JavaScript**: Modules are hot-reloaded without full page refresh
- **CSS**: Styles update instantly without reload
- **State Preservation**: Application state is maintained when possible
- **Error Overlay**: Build errors appear in the browser

## Environment Variables

Environment variables must be prefixed with `VITE_` to be exposed to the client:

**.env file:**
```bash
VITE_API_ENDPOINT=/.netlify/functions/api
VITE_APP_VERSION=2.0.0
```

**Usage in code:**
```javascript
const apiEndpoint = import.meta.env.VITE_API_ENDPOINT;
const version = import.meta.env.VITE_APP_VERSION;
```

## Migration Notes

### Current State

The application currently uses:
- Single `script.js` file (monolithic)
- Direct script tag in HTML
- No module bundling

### After Refactoring

The application will use:
- Modular ES6 imports/exports
- Vite for bundling and HMR
- Organized module structure

### Transition Plan

1. ✅ **Phase 1** (Current): Vite configuration created
2. **Phase 2**: Create module structure (`src/modules/`)
3. **Phase 3**: Extract modules from `script.js`
4. **Phase 4**: Update imports to use path aliases
5. **Phase 5**: Remove monolithic `script.js`

## Requirements Satisfied

This configuration satisfies the following requirements from the spec:

- ✅ **Requirement 13.1**: Module bundler implemented (Vite)
- ✅ **Requirement 13.2**: Development server with hot module replacement
- ✅ **Requirement 13.6**: Source maps generated for debugging

## Troubleshooting

### Port Already in Use

If port 3000 is in use, Vite will automatically try the next available port (3001, 3002, etc.).

### Build Errors

Check the error overlay in the browser or terminal output for detailed error messages with stack traces.

### HMR Not Working

Ensure:
- Browser supports ES modules
- WebSocket connections not blocked by firewall
- No browser extensions interfering with HMR

### Module Resolution Issues

If imports fail:
1. Check path aliases in `vite.config.js`
2. Verify file extensions (`.js` required for relative imports)
3. Ensure `"type": "module"` in `package.json`

### __dirname Not Defined

In ES modules, use:
```javascript
import { fileURLToPath } from 'url';
const __dirname = fileURLToPath(new URL('.', import.meta.url));
```

## Next Steps

After running `npm install`:

1. **Start Development**: `npm run dev`
2. **Make Changes**: Edit files and see instant updates
3. **Test Build**: `npm run build` to verify production build
4. **Preview**: `npm run preview` to test built files
5. **Deploy**: `npm run deploy` when ready

## Performance Benefits

Vite provides significant performance improvements:

- **Fast Cold Start**: Native ESM for instant server start
- **Lightning HMR**: Updates in milliseconds
- **Optimized Builds**: Rollup for production bundling
- **Code Splitting**: Automatic chunking for better caching
- **Tree Shaking**: Remove unused code automatically

## Additional Resources

- [Vite Documentation](https://vitejs.dev/)
- [Vite Configuration Reference](https://vitejs.dev/config/)
- [Rollup Options](https://rollupjs.org/configuration-options/)
- [ES Modules Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)

## Support

For issues or questions:
1. Check Vite documentation
2. Review error messages in browser/terminal
3. Verify configuration matches this guide
4. Check that Node.js version >= 18.0.0
