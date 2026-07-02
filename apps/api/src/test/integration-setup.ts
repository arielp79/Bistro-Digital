import { afterAll, beforeAll } from 'vitest';
import { connectDatabase, disconnectDatabase } from '../config/database.js';

export let dbReady = false;

beforeAll(async () => {
  try {
    await connectDatabase({ serverSelectionTimeoutMS: 5_000 });
    dbReady = true;
  } catch (err) {
    console.warn(
      '[integración] MongoDB no disponible — tests omitidos. Verificá MONGODB_URI y whitelist en Atlas.',
      err instanceof Error ? err.message : err
    );
    dbReady = false;
  }
}, 60_000);

afterAll(async () => {
  if (dbReady) {
    await disconnectDatabase();
  }
});

export function skipIfNoDb(context: { skip: () => void }) {
  if (!dbReady) context.skip();
}
