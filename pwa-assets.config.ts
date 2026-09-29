import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Erzeugt aus public/icon.svg die App-Icons: npm run icons
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#fbfbfa' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#fbfbfa' } },
  },
  images: ['public/icon.svg'],
});
