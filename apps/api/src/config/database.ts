import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDatabase(options?: mongoose.ConnectOptions): Promise<void> {
  mongoose.set('strictQuery', true);

  const uri = env.mongodbUri;
  if (uri.includes('localhost') || uri.includes('127.0.0.1')) {
    console.warn(
      '[MongoDB] AVISO: MONGODB_URI apunta a localhost. Este proyecto usa MongoDB Atlas — configurá tu cluster en apps/api/.env'
    );
  }

  await mongoose.connect(uri, options);

  const cluster =
    uri.match(/@([^/]+)/)?.[1] ??
    (uri.includes('localhost') ? 'localhost' : 'cluster remoto');
  console.log(`[MongoDB] Conectado — ${cluster}`);
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  console.log('[MongoDB] Desconectado');
}
