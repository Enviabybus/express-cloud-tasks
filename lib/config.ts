import { CloudTasksError } from './error';

export type CloudTasksConfig = {
  handlerPath: string;
  location: string;
  project: string;
  serviceAccount?: string;
  serviceUrl: string;
} & QueueOptions;

export interface QueueOptions {
  rateLimits?: {
    maxDispatchesPerSecond?: number;
    maxBurstSize?: number;
    maxConcurrentDispatches?: number;
  };
  retryConfig?: {
    maxAttempts?: number;
    maxRetryDuration?: number;
    minBackoff?: number;
    maxBackoff?: number;
    maxDoublings?: number;
  };
}

export const validateConfig = (config: CloudTasksConfig): void => {
  const {
    handlerPath,
    location,
    project,
    serviceUrl,
  } = config;
  if (!handlerPath) { throw new CloudTasksError('Missing handlerPath on config'); }
  if (!location) { throw new CloudTasksError('Missing location on config'); }
  if (!project) { throw new CloudTasksError('Missing project on config'); }
  if (!serviceUrl) { throw new CloudTasksError('Missing serviceUrl on config'); }
};
