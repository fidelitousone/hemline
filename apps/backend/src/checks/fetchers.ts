import * as cheerio from 'cheerio';
import type { SourceAts } from '@hemline/shared-types';
import { ATS_TITLE_SELECTORS, REMOVED_PHRASES } from './selectors.js';

export type CheckMethod = 'fetch' | 'headless';
export type CheckOutcome = 'live' | 'removed' | 'ambiguous';

export function outcomeToIsLive(outcome: CheckOutcome): boolean | null {
  if (outcome === 'live') return true;
  if (outcome === 'removed') return false;
  return null;
}

export interface CheckResult {
  outcome: CheckOutcome;
  method: CheckMethod;
  httpStatus?: number;
  notes?: string;
}

function textLooksRemoved(text: string): boolean {
  const lower = text.toLowerCase();
  return REMOVED_PHRASES.some((phrase) => lower.includes(phrase));
}

export async function fetchCheck(url: string, sourceAts: SourceAts): Promise<CheckResult> {
  const response = await fetch(url, { redirect: 'follow' });
  if (response.status === 404 || response.status === 410) {
    return { outcome: 'removed', method: 'fetch', httpStatus: response.status };
  }
  if (!response.ok) {
    return {
      outcome: 'ambiguous',
      method: 'fetch',
      httpStatus: response.status,
      notes: `Non-OK status ${response.status}`,
    };
  }

  const html = await response.text();
  if (textLooksRemoved(html)) {
    return { outcome: 'removed', method: 'fetch', httpStatus: response.status };
  }

  const selector = ATS_TITLE_SELECTORS[sourceAts];
  if (!selector) {
    return { outcome: 'ambiguous', method: 'fetch', httpStatus: response.status };
  }

  const $ = cheerio.load(html);
  const found = $(selector).length > 0;
  return {
    outcome: found ? 'live' : 'ambiguous',
    method: 'fetch',
    httpStatus: response.status,
  };
}

export async function headlessCheck(url: string, sourceAts: SourceAts): Promise<CheckResult> {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    const bodyText = await page.innerText('body').catch(() => '');
    if (textLooksRemoved(bodyText)) {
      return { outcome: 'removed', method: 'headless', httpStatus: response?.status() };
    }

    const selector = ATS_TITLE_SELECTORS[sourceAts];
    if (selector) {
      const found = await page
        .locator(selector)
        .first()
        .isVisible()
        .catch(() => false);
      if (found) {
        return { outcome: 'live', method: 'headless', httpStatus: response?.status() };
      }
    }

    return {
      outcome: 'ambiguous',
      method: 'headless',
      httpStatus: response?.status(),
      notes: 'Selector not found after render',
    };
  } finally {
    await browser.close();
  }
}

export async function checkJobLiveness(url: string, sourceAts: SourceAts): Promise<CheckResult> {
  const quick = await fetchCheck(url, sourceAts);
  if (quick.outcome !== 'ambiguous') {
    return quick;
  }
  return headlessCheck(url, sourceAts);
}
