import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'Hemline',
  description: 'An extension to quickly tailor a resume using AI',
  version: '0.1.0',
  permissions: ['activeTab', 'storage', 'tabs', 'scripting'],
  background: {
    service_worker: 'src/background.ts',
    type: 'module',
  },
  action: {
    default_popup: 'index.html',
    default_icon: 'placeholder.png',
  },
});
