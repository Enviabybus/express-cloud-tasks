/* eslint-disable no-underscore-dangle */
import { CloudTasksClient, v2 } from '@google-cloud/tasks';

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
    { scheduleTime }: { scheduleTime?: number } = {},
  ): Promise<void> {
    const {
      handlerPath,
      project,
      serviceAccount,
      serviceUrl,
    } = this.config;
    const cloudTasksQueue = await this.getCloudTaskQueue();
    const payload: CloudTasksPayload = { handlerId, args };
    const taskScheduleTime = scheduleTime ? { scheduleTime: { seconds: scheduleTime / 1000 } } : {};
    const oidcToken = serviceAccount
      ? { oidcToken: { serviceAccountEmail: `${serviceAccount}@${project}.iam.gserviceaccount.com` } }
      : {};

    await this.cloudTasksClient.createTask({
      parent: cloudTasksQueue.name,
      task: {
        httpRequest: {
          httpMethod: 'POST',
          url: new URL(handlerPath, serviceUrl).href,
          headers: {
            'Content-Type': 'application/octet-stream',
          },
          body: Buffer.from(JSON.stringify(payload)).toString('base64'),
          ...oidcToken,
        },
        ...taskScheduleTime,
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
      maxRetryDuration: maxRetryDuration ? { seconds: maxRetryDuration } : null,
      minBackoff: minBackoff ? { seconds: minBackoff } : null,
      maxBackoff: maxBackoff ? { seconds: maxBackoff } : null,
    };
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  private async getCloudTaskQueue() {
    const { project, location } = this.config;
    const queuePath = this.cloudTasksClient.queuePath(project, location, this.name);

    try {
      const response = await this.cloudTasksClient.getQueue({ name: queuePath });
      return response[0];
    } catch (e) {
      const locationPath = this.cloudTasksClient.locationPath(project, location);
      const response = await this.cloudTasksClient.createQueue({
        parent: locationPath,
        queue: {
          name: queuePath,
          rateLimits: { ...this.config.rateLimits || {} },
          retryConfig: { ...this.buildCloudTasksQueueRetryConfig() },
        },
      });
      return response[0];
    }
  }
}
