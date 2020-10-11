import { CloudTasksApi } from './api';
import { CloudTasksConfig, QueueOptions } from './config';
import { CloudTasksError } from './error';
import { CloudTasksQueue } from './queue';

export const CloudTasks = (config: CloudTasksConfig) => {
  const queues: Record<string, CloudTasksQueue> = {};

  const api = CloudTasksApi(config, async (queueName, handlerId, args) => {
    const queue = queues[queueName];
    if (!queue) { throw new CloudTasksError(`Queue '${queueName}' not found`); }
    const handler = queue.getHandler(handlerId);
    await handler(...args);
  });

  return {
    api,

    addQueue(queueName: string, options: QueueOptions = {}): CloudTasksQueue {
      const queueConfig = {
        ...config,
        ...options,
      }
      const queue = new CloudTasksQueue(queueName, queueConfig);
      queues[queueName] = queue;

      return queue;
    },
  };
};

export default CloudTasks;
export { CloudTasksApi } from './api';
export { CloudTasksConfig, QueueOptions } from './config';
export { CloudTasksQueue } from './queue';
