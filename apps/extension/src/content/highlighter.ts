import { JOB_DESCRIPTION_SELECTORS } from '../ats-detector';
import {
  bucketYearsOfExperience,
  findYearsOfExperienceMentions,
} from '../lib/years-of-experience';
import { findTechKeywordMentions } from '../lib/tech-keywords';
import './highlighter.css';

const HIGHLIGHT_CLASS = 'hemline-hl';

type Mention =
  | { kind: 'yoe'; start: number; end: number; requiredYears: number }
  | { kind: 'tech'; start: number; end: number };

const processedNodes = new WeakSet<Node>();

function getDescriptionContainer(): HTMLElement | null {
  for (const selector of Object.values(JOB_DESCRIPTION_SELECTORS)) {
    const el = document.querySelector<HTMLElement>(selector);
    if (el) return el;
  }
  return null;
}

function collectTextNodes(root: Node): Text[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parentEl = node.parentElement;
      if (!parentEl) return NodeFilter.FILTER_REJECT;
      if (parentEl.closest(`.${HIGHLIGHT_CLASS}`)) return NodeFilter.FILTER_REJECT;
      if (parentEl.tagName === 'SCRIPT' || parentEl.tagName === 'STYLE') {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes: Text[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    nodes.push(node as Text);
  }
  return nodes;
}

function resolveOverlaps(mentions: Mention[]): Mention[] {
  const sorted = [...mentions].sort((a, b) => a.start - b.start);
  const result: Mention[] = [];
  let lastEnd = -1;
  for (const mention of sorted) {
    if (mention.start >= lastEnd) {
      result.push(mention);
      lastEnd = mention.end;
    }
  }
  return result;
}

function highlightTextNode(node: Text, userYears: number | null): void {
  if (processedNodes.has(node)) return;

  const text = node.textContent ?? '';
  if (!text.trim()) {
    processedNodes.add(node);
    return;
  }

  const yoeMentions: Mention[] =
    userYears !== null
      ? findYearsOfExperienceMentions(text).map((m) => ({
          kind: 'yoe' as const,
          start: m.start,
          end: m.end,
          requiredYears: m.requiredYears,
        }))
      : [];
  const techMentions: Mention[] = findTechKeywordMentions(text).map((m) => ({
    kind: 'tech' as const,
    start: m.start,
    end: m.end,
  }));

  const mentions = resolveOverlaps([...yoeMentions, ...techMentions]);
  if (mentions.length === 0) {
    processedNodes.add(node);
    return;
  }

  const parent = node.parentNode;
  if (!parent) return;

  const fragment = document.createDocumentFragment();
  const newTextNodes: Text[] = [];
  let cursor = 0;

  for (const mention of mentions) {
    if (mention.start > cursor) {
      const before = document.createTextNode(text.slice(cursor, mention.start));
      fragment.appendChild(before);
      newTextNodes.push(before);
    }

    const span = document.createElement('span');
    span.textContent = text.slice(mention.start, mention.end);
    span.className =
      mention.kind === 'yoe'
        ? `${HIGHLIGHT_CLASS} ${HIGHLIGHT_CLASS}-yoe-${bucketYearsOfExperience(mention.requiredYears, userYears as number)}`
        : `${HIGHLIGHT_CLASS} ${HIGHLIGHT_CLASS}-tech`;
    fragment.appendChild(span);
    if (span.firstChild) newTextNodes.push(span.firstChild as Text);

    cursor = mention.end;
  }

  if (cursor < text.length) {
    const after = document.createTextNode(text.slice(cursor));
    fragment.appendChild(after);
    newTextNodes.push(after);
  }

  // Mark every node we just created as processed before replaceChild hands control back to
  // the MutationObserver, so the observer's rescan is a cheap no-op instead of looping.
  for (const textNode of newTextNodes) processedNodes.add(textNode);

  parent.replaceChild(fragment, node);
}

async function getUserYearsOfExperience(): Promise<number | null> {
  const result = await chrome.storage.local.get('yearsOfExperience');
  const value = result.yearsOfExperience;
  return typeof value === 'number' ? value : null;
}

async function highlightContainer(container: HTMLElement): Promise<void> {
  const userYears = await getUserYearsOfExperience();
  for (const node of collectTextNodes(container)) {
    highlightTextNode(node, userYears);
  }
}

function init(): void {
  const container = getDescriptionContainer();
  if (!container) return;

  void highlightContainer(container);

  const observer = new MutationObserver(() => {
    void highlightContainer(container);
  });
  observer.observe(container, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
