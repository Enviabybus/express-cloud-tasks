export declare type CloudTasksConfig = {
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
export declare const validateConfig: (config: CloudTasksConfig) => void;
//# sourceMappingURL=config.d.ts.map