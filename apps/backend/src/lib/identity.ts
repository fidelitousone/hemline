import { createHash } from 'node:crypto';
import type { SourceAts } from '@hemline/shared-types';

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function computeIdentityKey(company: string, title: string): string {
  return createHash('sha256')
    .update(`${normalize(company)}|${normalize(title)}`)
    .digest('hex');
}

export function canonicalizeUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  url.search = '';
  url.hash = '';
  if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.slice(0, -1);
  }
  return `${url.origin}${url.pathname}`;
}

// Greenhouse/Ashby/Otta job URLs embed the company as a URL path segment, so we can
// derive it without needing the extension to scrape a company name from the page.
export function extractCompanySlug(rawUrl: string, sourceAts: SourceAts): string {
  const url = new URL(rawUrl);
  const segments = url.pathname.split('/').filter(Boolean);

  switch (sourceAts) {
    case 'greenhouse':
    case 'ashby':
    case 'otta':
      return segments[0] ?? url.hostname;
    default:
      return url.hostname;
  }
}
