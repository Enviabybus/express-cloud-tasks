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
exports.CloudTasksQueue = exports.CloudTasksApi = exports.CloudTasks = void 0;
const api_1 = require("./api");
const error_1 = require("./error");
const queue_1 = require("./queue");
exports.CloudTasks = (config) => {
    const queues = {};
    const api = api_1.CloudTasksApi(config, (queueName, handlerId, args) => __awaiter(void 0, void 0, void 0, function* () {
        const queue = queues[queueName];
        if (!queue) {
            throw new error_1.CloudTasksError(`Queue '${queueName}' not found`);
        }
        const handler = queue.getHandler(handlerId);
        yield handler(...args);
    }));
    return {
        api,
        addQueue(queueName, options = {}) {
            const queueConfig = Object.assign(Object.assign({}, config), options);
            const queue = new queue_1.CloudTasksQueue(queueName, queueConfig);
            queues[queueName] = queue;
            return queue;
        },
    };
};
exports.default = exports.CloudTasks;
var api_2 = require("./api");
Object.defineProperty(exports, "CloudTasksApi", { enumerable: true, get: function () { return api_2.CloudTasksApi; } });
var queue_2 = require("./queue");
Object.defineProperty(exports, "CloudTasksQueue", { enumerable: true, get: function () { return queue_2.CloudTasksQueue; } });
//# sourceMappingURL=index.js.map