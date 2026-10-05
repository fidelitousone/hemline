import Fastify from 'fastify';
import cors from '@fastify/cors';
import { env } from './env.js';
import { startQueue } from './pipeline/queue.js';
import { registerTailoringWorkers } from './pipeline/worker.js';
import { registerRecheckWorker } from './checks/recheck-worker.js';
import healthRoutes from './routes/health.js';
import resumeRoutes from './routes/resume.js';
import jobRoutes from './routes/jobs.js';
import tailoringRoutes from './routes/tailoring.js';

const app = Fastify({ logger: true });

// The extension's popup calls this API directly from a chrome-extension:// origin, which
// browsers always CORS-preflight. The dashboard's own calls are same-origin via its Vite
// proxy / production static serving, so they don't need this.
await app.register(cors, {
  origin: (origin, callback) => {
    callback(null, !origin || origin.startsWith('chrome-extension://'));
  },
});

await app.register(healthRoutes);
await app.register(resumeRoutes);
await app.register(jobRoutes);
await app.register(tailoringRoutes);

await startQueue();
await registerTailoringWorkers();
await registerRecheckWorker();

await app.listen({ port: env.port, host: '0.0.0.0' });
