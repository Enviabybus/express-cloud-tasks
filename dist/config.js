"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateConfig = void 0;
const error_1 = require("./error");
exports.validateConfig = (config) => {
    const { handlerPath, location, project, serviceUrl, } = config;
    if (!handlerPath) {
        throw new error_1.CloudTasksError('Missing handlerPath on config');
    }
    if (!location) {
        throw new error_1.CloudTasksError('Missing location on config');
    }
    if (!project) {
        throw new error_1.CloudTasksError('Missing project on config');
    }
    if (!serviceUrl) {
        throw new error_1.CloudTasksError('Missing serviceUrl on config');
    }
};
//# sourceMappingURL=config.js.map