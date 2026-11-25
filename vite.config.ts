import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';
import {createSeedDatabase} from './server/seed.ts';

export default defineConfig(() => {
  const rootDir = import.meta.dirname;
  const rawBase = process.env.VITE_BASE_PATH || '/';
  const base = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;

  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        // Manifest is injected dynamically ONLY on /admin routes so PWA installability applies solely to /admin
        manifest: false,
        injectRegister: null,
        scope: base,
        workbox: {
          importScripts: [`${base}sw-notifications.js`],
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          navigateFallback: null,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
      {
        name: 'github-pages-static-compat',
        apply: 'build',
        transformIndexHtml(html: string): string {
          return html
            .replace(/href="\/assets\//g, `href="${base}assets/`)
            .replace(/content="\/assets\//g, `content="${base}assets/`);
        },
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(rootDir, 'dist');
          const srcAssets = path.resolve(rootDir, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }

          if (fs.existsSync(distDir)) {
            // 1. Write static catalog seed for static hosts (GitHub Pages)
            const seed = createSeedDatabase();
            const publicSeed = {
              ...seed,
              orders: [],
              adminCredential: null,
            };
            fs.writeFileSync(
              path.join(distDir, 'store-seed.json'),
              JSON.stringify(publicSeed),
              'utf8'
            );

            // 2. Copy index.html -> 404.html so SPA deep routes (/product/*, /admin) work on GitHub Pages
            const indexPath = path.join(distDir, 'index.html');
            if (fs.existsSync(indexPath)) {
              fs.copyFileSync(indexPath, path.join(distDir, '404.html'));
            }

            // 3. Rewrite admin-manifest.webmanifest paths for subpath deployments
            const manifestPath = path.join(distDir, 'admin-manifest.webmanifest');
            if (fs.existsSync(manifestPath) && base !== '/') {
              try {
                const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
                manifest.id = `${base}admin`;
                manifest.start_url = `${base}admin`;
                manifest.scope = `${base}admin`;
                if (Array.isArray(manifest.icons)) {
                  manifest.icons = manifest.icons.map((ic: {src: string}) => ({
                    ...ic,
                    src: ic.src.startsWith('/') ? `${base}${ic.src.slice(1)}` : ic.src,
                  }));
                }
                fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
              } catch {
                // ignore malformed manifest
              }
            }
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(rootDir, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
