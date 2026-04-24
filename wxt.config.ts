import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';
import pkg from './package.json' with { type: 'json' };

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  runner: {
    chromiumArgs: ['--user-data-dir=.wxt/chrome-data'],
  },
  vite: () => ({
    plugins: [tailwindcss()],
    define: {
      __API_URL__: JSON.stringify(process.env.API_URL || 'https://res.metahub-ai.com'),
    },
  }),
  manifest: {
    name: 'Metahub Wallet',
    description: 'A Simple to Use EOS Web Wallet',
    version: pkg.version,
    permissions: ['storage', 'unlimitedStorage', 'scripting', 'alarms'],
    host_permissions: ['<all_urls>'],
    web_accessible_resources: [
      {
        resources: ['injected.js'],
        matches: ['<all_urls>'],
      },
    ],
  },
});
