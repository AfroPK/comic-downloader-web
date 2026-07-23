# PHASE 04: Create Frontend Configuration Files

## Goal
Create Vite configuration and base frontend files (index.html, vite.config.js, package.json).

## Step 1: Create index.html with exact content

Write this EXACT code to `comic-downloader-web/frontend/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Comic Downloader</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

## Step 2: Create vite.config.js with auto-start backend

Write this EXACT code to `comic-downloader-web/frontend/vite.config.js`:

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
```

## Step 3: Verify vite.config.js was created correctly

Run this command:

```bash
cat comic-downloader-web/frontend/vite.config.js
```

You should see the complete configuration file.

---

**Next phase:** Create the React source files (main.jsx, App.jsx, CSS, components).
