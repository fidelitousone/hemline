import { desc, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import type { UploadResumeRequest } from '@hemline/shared-types';
import { db } from '../db/client.js';
import { resumeBaseVersions } from '../db/schema.js';

export default async function resumeRoutes(app: FastifyInstance) {
  app.post<{ Body: UploadResumeRequest }>('/api/resume', async (req, reply) => {
    const { texContent } = req.body;
    if (!texContent || !texContent.trim()) {
      return reply.code(400).send({ error: 'texContent is required' });
    }

    const [latest] = await db
      .select()
      .from(resumeBaseVersions)
      .orderBy(desc(resumeBaseVersions.versionNumber))
      .limit(1);

    await db
      .update(resumeBaseVersions)
      .set({ isCurrent: false })
      .where(eq(resumeBaseVersions.isCurrent, true));

    const [created] = await db
      .insert(resumeBaseVersions)
      .values({
        versionNumber: (latest?.versionNumber ?? 0) + 1,
        texContent,
        isCurrent: true,
      })
      .returning();

    return reply.code(201).send(created);
  });

  app.get('/api/resume/current', async (_req, reply) => {
    const [current] = await db
      .select()
      .from(resumeBaseVersions)
      .where(eq(resumeBaseVersions.isCurrent, true));
    if (!current) {
      return reply.code(404).send({ error: 'No resume uploaded yet' });
    }
    return current;
  });

  app.get('/api/resume/versions', async () => {
    return db
      .select()
      .from(resumeBaseVersions)
      .orderBy(desc(resumeBaseVersions.versionNumber));
  });
}
