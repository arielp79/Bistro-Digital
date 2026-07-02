import { Queue } from 'bullmq';
import { env } from '../config/env.js';

export interface DeliveryJobData {
  platform: 'whatsapp' | 'instagram' | 'simulate';
  tenantId: string;
  messageId: string;
  from: string;
  type: 'text' | 'image';
  text: string | null;
  imageId: string | null;
  imageUrl?: string | null;
  timestamp: string;
}

const connection = { url: env.redisUrl };

let deliveryQueue: Queue<DeliveryJobData> | null = null;

export function getDeliveryQueue(): Queue<DeliveryJobData> {
  if (!deliveryQueue) {
    deliveryQueue = new Queue<DeliveryJobData>('delivery-messages', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });
  }
  return deliveryQueue;
}

export function getQueueConnection() {
  return connection;
}
