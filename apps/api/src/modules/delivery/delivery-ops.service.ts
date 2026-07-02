import type { Job } from 'bullmq';
import type {
  DeliveryFailedJobPublic,
  DeliveryOpsSnapshot,
  DeliveryQueueCounts,
  DeliveryRecentJobPublic,
} from '@bistro/shared-types';
import type { DeliveryJobData } from '../../services/queue.service.js';
import { getDeliveryQueue } from '../../services/queue.service.js';
import { isDeliveryWorkerActive } from '../../workers/delivery.worker.js';

const EMPTY_COUNTS: DeliveryQueueCounts = {
  waiting: 0,
  active: 0,
  completed: 0,
  failed: 0,
  delayed: 0,
};

export function jobDurationMs(job: Pick<Job, 'processedOn' | 'finishedOn'>): number | null {
  if (!job.processedOn || !job.finishedOn) return null;
  return Math.max(0, job.finishedOn - job.processedOn);
}

export function computeLatencyStats(durations: number[]): DeliveryOpsSnapshot['latencyMs'] {
  if (durations.length === 0) {
    return { avg: null, p95: null, sampleSize: 0 };
  }

  const sorted = [...durations].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, n) => acc + n, 0);
  const p95Index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);

  return {
    avg: Math.round(sum / sorted.length),
    p95: sorted[p95Index] ?? null,
    sampleSize: sorted.length,
  };
}

function messagePreview(data: DeliveryJobData): string | null {
  if (data.text?.trim()) return data.text.trim().slice(0, 120);
  if (data.type === 'image') return '[imagen]';
  return null;
}

function toFailedJob(job: Job<DeliveryJobData>): DeliveryFailedJobPublic {
  return {
    id: String(job.id),
    platform: job.data.platform,
    from: job.data.from,
    messagePreview: messagePreview(job.data),
    failedReason: job.failedReason ?? 'Error desconocido',
    attemptsMade: job.attemptsMade,
    finishedAt: new Date(job.finishedOn ?? job.timestamp).toISOString(),
  };
}

function toRecentJob(
  job: Job<DeliveryJobData>,
  status: DeliveryRecentJobPublic['status']
): DeliveryRecentJobPublic {
  return {
    id: String(job.id),
    platform: job.data.platform,
    status,
    durationMs: jobDurationMs(job),
    finishedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
    messagePreview: messagePreview(job.data),
  };
}

function filterTenantJobs(jobs: Job<DeliveryJobData>[], tenantId: string): Job<DeliveryJobData>[] {
  return jobs.filter((job) => job.data?.tenantId === tenantId);
}

function unavailableSnapshot(): DeliveryOpsSnapshot {
  return {
    redisAvailable: false,
    workerRunning: isDeliveryWorkerActive(),
    counts: { ...EMPTY_COUNTS },
    latencyMs: { avg: null, p95: null, sampleSize: 0 },
    failedJobs: [],
    recentJobs: [],
    lastUpdated: new Date().toISOString(),
  };
}

export class DeliveryOpsService {
  static async getSnapshot(tenantId: string): Promise<DeliveryOpsSnapshot> {
    try {
      const queue = getDeliveryQueue();
      const counts = await queue.getJobCounts();

      const [failedRaw, completedRaw, activeRaw, waitingRaw, delayedRaw] = await Promise.all([
        queue.getFailed(0, 99),
        queue.getCompleted(0, 99),
        queue.getActive(0, 49),
        queue.getWaiting(0, 49),
        queue.getDelayed(0, 49),
      ]);

      const failed = filterTenantJobs(failedRaw, tenantId);
      const completed = filterTenantJobs(completedRaw, tenantId);
      const active = filterTenantJobs(activeRaw, tenantId);
      const waiting = filterTenantJobs(waitingRaw, tenantId);
      const delayed = filterTenantJobs(delayedRaw, tenantId);

      const durations = completed
        .map((job) => jobDurationMs(job))
        .filter((ms): ms is number => ms !== null);

      const recentJobs: DeliveryRecentJobPublic[] = [
        ...active.map((job) => toRecentJob(job, 'active')),
        ...waiting.map((job) => toRecentJob(job, 'waiting')),
        ...delayed.map((job) => toRecentJob(job, 'delayed')),
        ...completed.slice(0, 15).map((job) => toRecentJob(job, 'completed')),
        ...failed.slice(0, 10).map((job) => toRecentJob(job, 'failed')),
      ]
        .sort((a, b) => {
          const ta = a.finishedAt ? new Date(a.finishedAt).getTime() : 0;
          const tb = b.finishedAt ? new Date(b.finishedAt).getTime() : 0;
          return tb - ta;
        })
        .slice(0, 20);

      return {
        redisAvailable: true,
        workerRunning: isDeliveryWorkerActive(),
        counts: {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
          delayed: delayed.length,
        },
        latencyMs: computeLatencyStats(durations),
        failedJobs: failed.slice(0, 20).map(toFailedJob),
        recentJobs,
        lastUpdated: new Date().toISOString(),
      };
    } catch {
      return unavailableSnapshot();
    }
  }
}
