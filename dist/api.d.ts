import { Router } from 'express';
import { CloudTasksConfig } from './config';
export declare const CloudTasksApi: (config: CloudTasksConfig, loader: (queueName: string, handlerId: string, args: any[]) => Promise<void>) => Router;
//# sourceMappingURL=api.d.ts.map