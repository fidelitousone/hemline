import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execa } from 'execa';
import { env } from '../env.js';

export interface CompileResult {
  success: boolean;
  pdf?: Buffer;
  error?: string;
}

export async function compileTex(texContent: string): Promise<CompileResult> {
  const dir = await mkdtemp(join(tmpdir(), 'hemline-tex-'));
  const texPath = join(dir, 'resume.tex');
  const pdfPath = join(dir, 'resume.pdf');

  try {
    await writeFile(texPath, texContent, 'utf-8');
    await execa(env.tectonicBin, ['--outdir', dir, texPath], { timeout: 60_000 });
    const pdf = await readFile(pdfPath);
    return { success: true, pdf };
  } catch (err) {
    const message =
      err && typeof err === 'object' && 'stderr' in err
        ? String((err as { stderr?: string }).stderr)
        : String(err);
    return { success: false, error: message };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
