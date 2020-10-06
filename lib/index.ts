import { CloudTasksApi } from './api';
import { CloudTasksConfig } from './config';
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

    addQueue(queueName: string): CloudTasksQueue {
      const queue = new CloudTasksQueue(queueName, config);
      queues[queueName] = queue;

      return queue;
    },
  };
};

export default CloudTasks;
export { CloudTasksApi } from './api';
export { CloudTasksQueue } from './queue';
