"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudTasksQueue = void 0;
/* eslint-disable no-underscore-dangle */
const tasks_1 = require("@google-cloud/tasks");
const config_1 = require("./config");
const error_1 = require("./error");
class CloudTasksQueue {
    constructor(name, config) {
        this.handlers = {};
        config_1.validateConfig(config);
        this.config = config;
        this.name = name;
    }
    addHandler(handlerId, handler) {
        this.handlers[handlerId] = handler;
    }
    getHandler(id) {
        const handler = this.handlers[id];
        if (!handler) {
            throw new error_1.CloudTasksError(`Handler '${id}' not found`);
        }
        return handler;
    }
    addTask(handlerId, args = [], { dispatchDeadline, // https://cloud.google.com/tasks/docs/reference/rest/v2beta3/projects.locations.queues.tasks#Task.FIELDS.dispatch_deadline
    scheduleTime, } = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            const { handlerPath, project, serviceAccount, serviceUrl, } = this.config;
            const cloudTasksQueue = yield this.getCloudTaskQueue();
            const payload = { handlerId, args };
            const oidcToken = serviceAccount
                ? { oidcToken: { serviceAccountEmail: `${serviceAccount}@${project}.iam.gserviceaccount.com` } }
                : {};
            yield this.cloudTasksClient.createTask({
                parent: cloudTasksQueue.name,
                task: Object.assign(Object.assign({ httpRequest: Object.assign({ httpMethod: 'POST', url: new URL(handlerPath, serviceUrl).href, headers: {
                            'Content-Type': 'application/octet-stream',
                        }, body: Buffer.from(JSON.stringify(payload)).toString('base64') }, oidcToken) }, (dispatchDeadline ? { dispatchDeadline: this.buildGoogleDuration(dispatchDeadline) } : {})), (scheduleTime ? { scheduleTime: this.buildGoogleTimestamp(scheduleTime) } : {})),
            });
        });
    }
    get cloudTasksClient() {
        if (this._cloudTasksClient) {
            return this._cloudTasksClient;
        }
        this._cloudTasksClient = new tasks_1.CloudTasksClient({ projectId: this.config.project });
        return this._cloudTasksClient;
    }
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    buildCloudTasksQueueRetryConfig() {
        if (!this.config.retryConfig) {
            return {};
        }
        const { maxRetryDuration, minBackoff, maxBackoff, } = this.config.retryConfig;
        return Object.assign(Object.assign({}, this.config.retryConfig), { maxRetryDuration: maxRetryDuration ? { seconds: maxRetryDuration / 1000 } : null, minBackoff: minBackoff ? { seconds: minBackoff / 1000 } : null, maxBackoff: maxBackoff ? { seconds: maxBackoff / 1000 } : null });
    }
    buildGoogleDuration(milliseconds) {
        return { seconds: milliseconds / 1000 };
    }
    buildGoogleTimestamp(date) {
        return { seconds: date.getTime() / 1000 };
    }
    getCloudTaskQueue() {
        return __awaiter(this, void 0, void 0, function* () {
            const { project, location } = this.config;
            const queuePath = this.cloudTasksClient.queuePath(project, location, this.name);
            try {
                const response = yield this.cloudTasksClient.getQueue({ name: queuePath });
                return this.updateQueue(response[0]);
            }
            catch (e) {
                return this.createQueue();
            }
        });
    }
    createQueue() {
        return __awaiter(this, void 0, void 0, function* () {
            const { project, location } = this.config;
            const queuePath = this.cloudTasksClient.queuePath(project, location, this.name);
            const locationPath = this.cloudTasksClient.locationPath(project, location);
            const response = yield this.cloudTasksClient.createQueue({
                parent: locationPath,
                queue: {
                    name: queuePath,
                    rateLimits: Object.assign({}, this.config.rateLimits || {}),
                    retryConfig: Object.assign({}, this.buildCloudTasksQueueRetryConfig()),
                },
            });
            console.log(`[express-cloud-tasks] Created queue: ${queuePath}`);
            return response[0];
        });
    }
    didQueueChanged(queue) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        const { rateLimits, retryConfig } = this.config;
        if (rateLimits) {
            const { maxBurstSize, maxConcurrentDispatches, maxDispatchesPerSecond } = rateLimits;
            if (maxBurstSize && maxBurstSize !== ((_a = queue.rateLimits) === null || _a === void 0 ? void 0 : _a.maxBurstSize)) {
                return true;
            }
            if (maxConcurrentDispatches && maxConcurrentDispatches !== ((_b = queue.rateLimits) === null || _b === void 0 ? void 0 : _b.maxConcurrentDispatches)) {
                return true;
            }
            if (maxDispatchesPerSecond && maxDispatchesPerSecond !== ((_c = queue.rateLimits) === null || _c === void 0 ? void 0 : _c.maxDispatchesPerSecond)) {
                return true;
            }
        }
        if (retryConfig) {
            const { maxAttempts, maxBackoff, maxDoublings, maxRetryDuration, minBackoff } = retryConfig;
            if (maxAttempts && maxAttempts !== ((_d = queue.retryConfig) === null || _d === void 0 ? void 0 : _d.maxAttempts)) {
                return true;
            }
            if (maxDoublings && maxDoublings !== ((_e = queue.retryConfig) === null || _e === void 0 ? void 0 : _e.maxDoublings)) {
                return true;
            }
            if (maxRetryDuration && ((_f = queue.retryConfig) === null || _f === void 0 ? void 0 : _f.maxRetryDuration)) {
                if (maxRetryDuration !== this.parseGoogleDuration(queue.retryConfig.maxRetryDuration)) {
                    return true;
                }
            }
            if (minBackoff && ((_g = queue.retryConfig) === null || _g === void 0 ? void 0 : _g.minBackoff)) {
                if (minBackoff !== this.parseGoogleDuration(queue.retryConfig.minBackoff)) {
                    return true;
                }
            }
            if (maxBackoff && ((_h = queue.retryConfig) === null || _h === void 0 ? void 0 : _h.maxBackoff)) {
                if (maxBackoff !== this.parseGoogleDuration(queue.retryConfig.maxBackoff)) {
                    return true;
                }
            }
        }
        return false;
    }
    parseGoogleDuration(duration) {
        if (duration.nanos) {
            return duration.nanos / 1000 / 1000;
        }
        if (duration.seconds) {
            return +duration.seconds * 1000;
        }
        return 0;
    }
    updateQueue(queue) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.didQueueChanged(queue)) {
                return queue;
            }
            const { rateLimits, retryConfig } = queue;
            if (rateLimits) {
                queue.rateLimits = rateLimits;
            }
            if (retryConfig) {
                queue.retryConfig = this.buildCloudTasksQueueRetryConfig();
            }
            const response = yield this.cloudTasksClient.updateQueue({ queue });
            console.log(`[express-cloud-tasks] Updated queue: ${queue.name}`);
            return response[0];
        });
    }
}
exports.CloudTasksQueue = CloudTasksQueue;
//# sourceMappingURL=queue.js.map