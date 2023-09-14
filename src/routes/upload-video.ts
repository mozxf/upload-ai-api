import { FastifyInstance } from 'fastify';
import { fastifyMultipart } from '@fastify/multipart';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { pipeline } from 'node:stream';
import { promisify } from 'node:util';
import { prisma } from '../lib/prisma';

export async function uploadVideoRoute(app: FastifyInstance) {
  const pump = promisify(pipeline);
  app.register(fastifyMultipart, {
    limits: {
      fileSize: 1_048_576 * 25, //25mb
    },
  });

  app.post('/videos', async (request, response) => {
    const data = await request.file();

    if (!data) {
      return response.status(400).send({ error: 'Missing File Input!' });
    }
    const extension = path.extname(data.filename);

    if (extension !== '.mp3') {
      return response
        .status(400)
        .send({ error: 'invalid Input Type, upload  a .mp3 file' });
    }

    const fileBaseName = path.basename(data.filename, extension);
    const fileUploadName = `${fileBaseName}-${randomUUID()}${extension}`;

    const uploadDestination = path.resolve(
      __dirname,
      '../../tmp',
      fileUploadName
    );

    await pump(data.file, fs.createWriteStream(uploadDestination));

    const audio = await prisma.video.create({
      data: {
        name: data.filename,
        path: uploadDestination,
      },
    });

    return { audio };
  });
}
