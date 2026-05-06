import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'Hemline',
  description: 'An extension to quickly tailor a resume using AI',
  version: '0.1.0',
  permissions: ['activeTab', 'storage', 'tabs'],
  background: {
    service_worker: 'src/background.ts',
    type: 'module',
  },
  action: {
    default_popup: 'index.html',
    default_icon: 'placeholder.png',
  },
  content_scripts: [
    {
      matches: ['https://job-boards.greenhouse.io/*'],
      js: ['src/greenhouse-ats-parsing.ts'],
    },
    {
      matches: ['https://jobs.ashbyhq.com/*'],
      js: ['src/ashby-ats-parsing.ts'],
    },
  ],
});
