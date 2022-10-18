import { CloudTasksConfig } from './config';
declare type CloudTasksHandler = (...args: unknown[]) => unknown;
export interface CloudTasksPayload {
    handlerId: string;
    args: any[];
}
export declare class CloudTasksQueue {
    config: CloudTasksConfig;
    name: string;
    handlers: Record<string, CloudTasksHandler>;
    private _cloudTasksClient?;
    constructor(name: string, config: CloudTasksConfig);
    addHandler(handlerId: string, handler: CloudTasksHandler): void;
    getHandler(id: string): CloudTasksHandler;
    addTask(handlerId: string, args?: unknown[], { dispatchDeadline, // https://cloud.google.com/tasks/docs/reference/rest/v2beta3/projects.locations.queues.tasks#Task.FIELDS.dispatch_deadline
    scheduleTime, }?: {
        dispatchDeadline?: number;
        scheduleTime?: Date;
    }): Promise<void>;
    private get cloudTasksClient();
    private buildCloudTasksQueueRetryConfig;
    private buildGoogleDuration;
    private buildGoogleTimestamp;
    private getCloudTaskQueue;
    private createQueue;
    private didQueueChanged;
    private parseGoogleDuration;
    private updateQueue;
}
export {};
//# sourceMappingURL=queue.d.ts.map