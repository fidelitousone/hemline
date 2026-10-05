import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { env } from '../env.js';

export async function savePdf(revisionId: string, pdf: Buffer): Promise<string> {
  const dir = join(env.storageDir, 'revisions');
  await mkdir(dir, { recursive: true });
  const path = join(dir, `${revisionId}.pdf`);
  await writeFile(path, pdf);
  return path;
}

export function candidateFilename(): string {
  const safeName = env.candidateName.trim().replace(/\s+/g, '_');
  return `${safeName}_Resume.pdf`;
}
