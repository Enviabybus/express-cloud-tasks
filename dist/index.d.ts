/// <reference types="express" />
import { CloudTasksConfig, QueueOptions } from './config';
import { CloudTasksQueue } from './queue';
export declare const CloudTasks: (config: CloudTasksConfig) => {
    api: import("express").Router;
    addQueue(queueName: string, options?: QueueOptions): CloudTasksQueue;
};
export default CloudTasks;
export { CloudTasksApi } from './api';
export { CloudTasksConfig, QueueOptions } from './config';
export { CloudTasksQueue } from './queue';
//# sourceMappingURL=index.d.ts.map