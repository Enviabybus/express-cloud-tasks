/* eslint-disable no-underscore-dangle */
import { CloudTasksClient, v2 } from '@google-cloud/tasks';
import { google } from '@google-cloud/tasks/build/protos/protos';

import { CloudTasksConfig, validateConfig } from './config';
import { CloudTasksError } from './error';

type CloudTasksHandler = (...args: unknown[]) => unknown;

export interface CloudTasksPayload {
  handlerId: string;
  args: any[];
}

export class CloudTasksQueue {
  config: CloudTasksConfig;
  name: string;
  handlers: Record<string, CloudTasksHandler> = {};

  private _cloudTasksClient?: v2.CloudTasksClient;

  constructor(name: string, config: CloudTasksConfig) {
    validateConfig(config);
    this.config = config;
    this.name = name;
  }

  addHandler(handlerId: string, handler: CloudTasksHandler): void {
    this.handlers[handlerId] = handler;
  }

  getHandler(id: string): CloudTasksHandler {
    const handler = this.handlers[id];

    if (!handler) { throw new CloudTasksError(`Handler '${id}' not found`); }

    return handler;
  }

  async addTask(
    handlerId: string,
    args: unknown[] = [],
    {
      dispatchDeadline, // https://cloud.google.com/tasks/docs/reference/rest/v2beta3/projects.locations.queues.tasks#Task.FIELDS.dispatch_deadline
      scheduleTime, // https://cloud.google.com/tasks/docs/reference/rest/v2beta3/projects.locations.queues.tasks#Task.FIELDS.schedule_time
    }: {
      dispatchDeadline?: number, // milliseconds
      scheduleTime?: Date,
    } = {},
  ): Promise<void> {
    const {
      handlerPath,
      project,
      serviceAccount,
      serviceUrl,
    } = this.config;
    const cloudTasksQueue = await this.getCloudTaskQueue();
    const payload: CloudTasksPayload = { handlerId, args };
    const oidcToken = serviceAccount
      ? { oidcToken: { serviceAccountEmail: `${serviceAccount}@${project}.iam.gserviceaccount.com` } }
      : {};

    await this.cloudTasksClient.createTask({
      parent: cloudTasksQueue.name,
      task: { // https://cloud.google.com/tasks/docs/reference/rest/v2beta3/projects.locations.queues.tasks#Task
        httpRequest: {
          httpMethod: 'POST',
          url: new URL(handlerPath, serviceUrl).href,
          headers: {
            'Content-Type': 'application/octet-stream',
          },
          body: Buffer.from(JSON.stringify(payload)).toString('base64'),
          ...oidcToken,
        },
        ...(dispatchDeadline ? { dispatchDeadline: this.buildGoogleDuration(dispatchDeadline) } : {}),
        ...(scheduleTime ? { scheduleTime: this.buildGoogleTimestamp(scheduleTime) } : {}),
      },
    });
  }

  private get cloudTasksClient(): v2.CloudTasksClient {
    if (this._cloudTasksClient) { return this._cloudTasksClient; }

    this._cloudTasksClient = new CloudTasksClient({ projectId: this.config.project });
    return this._cloudTasksClient;
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  private buildCloudTasksQueueRetryConfig() {
    if (!this.config.retryConfig) { return {}; }
    const {
      maxRetryDuration,
      minBackoff,
      maxBackoff,
    } = this.config.retryConfig;

    return {
      ...this.config.retryConfig,
      maxRetryDuration: maxRetryDuration ? { seconds: maxRetryDuration / 1000 } : null,
      minBackoff: minBackoff ? { seconds: minBackoff / 1000 } : null,
      maxBackoff: maxBackoff ? { seconds: maxBackoff / 1000 } : null,
    };
  }

  private buildGoogleDuration(milliseconds: number): google.protobuf.IDuration {
    return { seconds: milliseconds / 1000 };
  }

  private buildGoogleTimestamp(date: Date): google.protobuf.ITimestamp {
    return { seconds: date.getTime() / 1000 };
  }

  private async getCloudTaskQueue(): Promise<google.cloud.tasks.v2.IQueue> {
    const { project, location } = this.config;
    const queuePath = this.cloudTasksClient.queuePath(project, location, this.name);

    try {
      const response = await this.cloudTasksClient.getQueue({ name: queuePath });
      return this.updateQueue(response[0]);
    } catch (e) {
      return this.createQueue();
    }
  }

  private async createQueue(): Promise<google.cloud.tasks.v2.IQueue> {
    const { project, location } = this.config;
    const queuePath = this.cloudTasksClient.queuePath(project, location, this.name);
    const locationPath = this.cloudTasksClient.locationPath(project, location);
    const response = await this.cloudTasksClient.createQueue({
      parent: locationPath,
      queue: {
        name: queuePath,
        rateLimits: { ...this.config.rateLimits || {} },
        retryConfig: { ...this.buildCloudTasksQueueRetryConfig() },
      },
    });
    console.log(`[express-cloud-tasks] Created queue: ${queuePath}`);
    return response[0];
  }

  private didQueueChanged(queue: google.cloud.tasks.v2.IQueue): boolean {
    const { rateLimits, retryConfig } = this.config;

    if (rateLimits) {
      const { maxBurstSize, maxConcurrentDispatches, maxDispatchesPerSecond } = rateLimits;
      if (maxBurstSize && maxBurstSize !== queue.rateLimits?.maxBurstSize) { return true; }
      if (maxConcurrentDispatches && maxConcurrentDispatches !== queue.rateLimits?.maxConcurrentDispatches) { return true; }
      if (maxDispatchesPerSecond && maxDispatchesPerSecond !== queue.rateLimits?.maxDispatchesPerSecond) { return true; }
    }

    if (retryConfig) {
      const { maxAttempts, maxBackoff, maxDoublings, maxRetryDuration, minBackoff } = retryConfig
      if (maxAttempts && maxAttempts !== queue.retryConfig?.maxAttempts) { return true; }
      if (maxDoublings && maxDoublings !== queue.retryConfig?.maxDoublings) { return true; }

      if (maxRetryDuration && queue.retryConfig?.maxRetryDuration) {
        if (maxRetryDuration !== this.parseGoogleDuration(queue.retryConfig.maxRetryDuration)) { return true; }
      }
      if (minBackoff && queue.retryConfig?.minBackoff) {
        if (minBackoff !== this.parseGoogleDuration(queue.retryConfig.minBackoff)) { return true; }
      }
      if (maxBackoff && queue.retryConfig?.maxBackoff) {
        if (maxBackoff !== this.parseGoogleDuration(queue.retryConfig.maxBackoff)) { return true; }
      }
    }

    return false;
  }

  private parseGoogleDuration(duration: google.protobuf.IDuration): number {
    if (duration.nanos) { return duration.nanos / 1000 / 1000; }
    if (duration.seconds) { return +duration.seconds * 1000; }
    return 0;
  }

  private async updateQueue(queue: google.cloud.tasks.v2.IQueue): Promise<google.cloud.tasks.v2.IQueue> {
    if (!this.didQueueChanged(queue)) { return queue; }

    const { rateLimits, retryConfig } = queue;
    if (rateLimits) { queue.rateLimits = rateLimits; }
    if (retryConfig) { queue.retryConfig = this.buildCloudTasksQueueRetryConfig(); }
    const response = await this.cloudTasksClient.updateQueue({ queue });

    console.log(`[express-cloud-tasks] Updated queue: ${queue.name}`);
    return response[0];
  }
}
