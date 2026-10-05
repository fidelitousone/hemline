import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: required('DATABASE_URL'),
  openRouterApiKey: required('OPENROUTER_API_KEY'),
  openRouterModel: process.env.OPENROUTER_MODEL ?? 'anthropic/claude-sonnet-4.5',
  candidateName: process.env.CANDIDATE_NAME ?? 'Candidate',
  storageDir: process.env.STORAGE_DIR ?? './storage',
  tectonicBin: process.env.TECTONIC_BIN ?? 'tectonic',
  recheckCron: process.env.RECHECK_CRON ?? '0 */6 * * *',
};
