import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'Hemline',
  description: 'An extension to quickly tailor a resume using AI',
  version: '0.1.0',
  permissions: ['activeTab', 'storage', 'tabs', 'scripting'],
  action: {
    default_popup: 'index.html',
    default_icon: 'placeholder.png',
  },
  content_scripts: [
    {
      matches: [
        'https://boards.greenhouse.io/*',
        'https://job-boards.greenhouse.io/*',
        'https://jobs.ashbyhq.com/*',
        // TODO: confirm Otta/Welcome to the Jungle's real job-posting domain.
        'https://otta.com/*',
      ],
      js: ['src/content/highlighter.ts'],
      run_at: 'document_idle',
    },
  ],
});
